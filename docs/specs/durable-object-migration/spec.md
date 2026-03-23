# Durable Object Migration Spec

## Problem

Supabase egress costs are unsustainable (>2GB/day). Every tick (once per minute) reads/writes the full world state via PostgREST HTTP, and every agent API call fetches data from Supabase over the wire. All of this is billable egress.

## Solution

Move all world state and game logic into a Cloudflare Durable Object with SQLite storage. The DO holds the world in-memory/SQLite, ticks via its own alarm, and serves agent requests directly — eliminating Supabase egress for the hot path entirely.

Supabase is retained only for agent authentication (`agent_profiles`, `agent_credentials`), which is low-volume and does not contribute meaningfully to egress costs.

## Architecture

### Before

```
Client → Worker (Hono) → SupabaseWorldRepository → Supabase Postgres
                          (every request = HTTP egress)
```

### After

```
Client → Worker (pass-through) → WorldDurableObject
                                   ├── Hono router (all API routes)
                                   ├── SQLite (world state, logs)
                                   ├── Alarm (tick every 60s)
                                   └── SupabaseAuthClient (credentials only)
```

### Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| HTTP entrypoint | Worker | Resolve DO stub by name `"primary"`, forward request |
| CORS | DO | Middleware in DO's Hono router |
| Auth | DO → Supabase | Validate agent credentials via Supabase PostgREST |
| API routing | DO | Internal Hono router, same route paths as today |
| Game logic | DO | Imports `packages/domain` and `packages/application` |
| World state | DO SQLite | Replaces `world_snapshots`, `cultivator_records` |
| Action/event logs | DO SQLite | Replaces `world_actions`, `world_events` |
| Tick history | DO SQLite | Replaces `tick_runs` |
| Tick scheduling | DO Alarm | Self-managed, 60-second interval. Replaces cron trigger. |
| Tick locking | Eliminated | DO is single-threaded, no concurrent ticks possible |

### Single World, Single DO

There is one world (`"primary"`). The Worker resolves the DO stub via `env.WORLD.get(env.WORLD.idFromName("primary"))`. No multi-world routing needed.

## Repository Structure

```
apps/
├── web/                      # Cloudflare Pages (unchanged)
├── runtime-worker/           # Thin pass-through Worker
│   ├── src/
│   │   └── index.ts          # Re-exports DO class, forwards fetch to DO
│   └── wrangler.jsonc        # DO binding + migration config
└── world-do/                 # WorldDurableObject (workspace package, not a separate deploy target)
    ├── src/
    │   ├── index.ts           # DO class: constructor, fetch, alarm
    │   ├── routes/            # Internal Hono routes (moved from runtime-worker)
    │   └── schema.ts          # SQLite table definitions & migration logic
    ├── package.json           # Workspace dependency of runtime-worker, bundled by wrangler
    └── tsconfig.json

packages/
├── domain/                   # Unchanged — pure game logic
├── application/              # Unchanged — use cases
├── contracts/                # Unchanged — API types
└── persistence/              # Reworked
    ├── sqlite-world-repository.ts   # New — implements WorldRepository via DO SQLite
    ├── supabase-auth-client.ts      # New — credential/profile ops only
    └── world-repository.ts          # Interface — may be reshaped if SQLite calls for it
```

## DO SQLite Schema

Created in `constructor()` via `blockConcurrencyWhile()` using `CREATE TABLE IF NOT EXISTS`.

```sql
-- World state (single row)
CREATE TABLE IF NOT EXISTS world_state (
  world_key TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  tick INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

-- Denormalized cultivator snapshots
CREATE TABLE IF NOT EXISTS cultivator_records (
  cultivator_id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  snapshot TEXT NOT NULL
);

-- Action audit log
CREATE TABLE IF NOT EXISTS world_actions (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  cultivator_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  accepted INTEGER NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_world_actions_tick ON world_actions(tick DESC);
CREATE INDEX IF NOT EXISTS idx_world_actions_cultivator ON world_actions(cultivator_id, created_at DESC);

-- Event log
CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_world_events_tick ON world_events(tick DESC);

-- Tick run history
CREATE TABLE IF NOT EXISTS tick_runs (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  advanced_ticks INTEGER NOT NULL,
  trigger TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tick_runs_recorded_at ON tick_runs(recorded_at DESC);
```

No `world_locks` table. The DO is single-threaded — concurrent tick execution is impossible.

Optimistic locking on `world_state.version` is retained for observability but is not load-bearing.

## DO Lifecycle

1. **Cold start** — `constructor()` runs schema creation inside `blockConcurrencyWhile()`. Checks for existing alarm via `getAlarm()` and sets one if none exists.
2. **`fetch(request)`** — Internal Hono router dispatches to game logic. Auth routes call Supabase for credential validation.
3. **`alarm()`** — Reschedules next alarm first (in `try/finally`), then runs `advanceWorld()`. See failure-safe policy below.

### Alarm Failure-Safe Policy

Cloudflare retries failed alarms up to 6 times, then gives up. If `advanceWorld()` throws and the next alarm was not yet scheduled, the world stops ticking permanently.

To prevent this, the `alarm()` handler **always reschedules before doing work** and **rethrows errors** so Cloudflare's retry logic can attempt the tick again:

```ts
async alarm(): Promise<void> {
  // Always reschedule first — guarantees the world never stops ticking
  // even if all 6 retries are exhausted.
  await this.ctx.storage.setAlarm(Date.now() + 60_000);

  // Rethrow on failure — Cloudflare will retry up to 6 times.
  // This is safe because advanceWorld() is wrapped in a single
  // SQLite transaction (see Tick Atomicity below), so a failed
  // tick leaves no partial state.
  await this.advanceWorld();
}
```

This ensures the world self-heals: even if all retries fail, the pre-scheduled alarm fires 60 seconds later from clean state.

### Tick Atomicity

`advanceWorld()` must wrap all SQLite writes — world state update, cultivator record upserts, world_events inserts, and tick_runs insert — in a **single SQLite transaction**. DO SQLite automatically batches multiple synchronous writes into one transaction (writes between `await` points are coalesced), but `advanceWorld()` must explicitly avoid interleaving `await` calls between its SQLite writes to guarantee this.

If any write fails, the entire transaction rolls back. The next alarm retry (or the next scheduled alarm) sees the pre-tick state and retries cleanly. No partial/corrupted state is possible.

### World Initialization

The world is initialized lazily. The constructor only creates SQLite tables and sets the alarm. The first call to `readWorld()` (whether from `alarm()` or a `fetch()`) checks if the `world_state` table is empty. If so, it seeds the world via `createSeedWorld()` from the domain package. This matches the current Supabase implementation's lazy-seed pattern.

## Worker Configuration

```jsonc
// apps/runtime-worker/wrangler.jsonc
{
  "name": "immortal-claw-runtime-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-10",
  "durable_objects": {
    "bindings": [
      { "name": "WORLD", "class_name": "WorldDurableObject" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["WorldDurableObject"] }
  ],
  "vars": {
    "FRONTEND_ORIGIN": "https://immortal-claw.pages.dev",
    "SUPABASE_URL": "https://hzbhriyqgsoilemdbyzd.supabase.co",
    "WORLD_TICK_STEPS": "1"
  }
}
```

`SUPABASE_SECRET_KEY` remains configured as a Wrangler secret (set via `wrangler secret put`). The DO receives it through `env` bindings, which are passed to the `SupabaseAuthClient`.

Cron trigger removed. Tick scheduling is handled by the DO alarm.

## Worker Entrypoint

```ts
// apps/runtime-worker/src/index.ts
export { WorldDurableObject } from "world-do";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.WORLD.idFromName("primary");
    const stub = env.WORLD.get(id);
    return stub.fetch(request);
  },
};
```

## Request Flow

### Auth-required routes (e.g., `GET /agent/state`, `POST /agent/act`)

1. Client sends request with `Authorization: Bearer immortal_sk_...`
2. Worker forwards to DO
3. DO's Hono auth middleware hashes credential, queries Supabase `agent_credentials`
4. If valid, proceeds to route handler which reads from SQLite
5. Response returned directly to client

### Public routes (e.g., `GET /cultivator/state`, `GET /world/agents`)

1. Client sends request
2. Worker forwards to DO
3. DO's Hono router handles, reads from SQLite
4. Response returned directly to client

### Auth-only routes (e.g., `POST /agent/register`, `POST /agent/credential/reset`)

1. Client sends request
2. Worker forwards to DO
3. DO handles auth via Supabase, writes to Supabase `agent_profiles`/`agent_credentials`
4. For registration, also initializes cultivator in SQLite world state

## Persistence Layer Changes

### Deleted

- `supabase-world-repository.ts` (~930 LOC) — entire PostgREST adapter
- `scheduler.ts` — replaced by DO alarm
- `resolveRepository()` indirection in `env.ts` — DO always uses SQLite
- All lock-related code (`acquireTickLock`, `releaseTickLock`)

### New

- `sqlite-world-repository.ts` — implements `WorldRepository` using DO's `this.ctx.storage.sql` API
- `supabase-auth-client.ts` — handles `authenticateAgent`, `issueAgentCredential`, `resetAgentCredential`, `saveAgentProfile`, `getAgentProfile`, `listAgentProfiles`, `touchAgent`

### WorldRepository Method Disposition

Every method on the current `WorldRepository` interface and its fate:

| Method | Destination | Notes |
|--------|-------------|-------|
| `readWorld()` | `SqliteWorldRepository` | Reads from DO SQLite. Lazy-seeds world if empty. |
| `transactWorld()` | `SqliteWorldRepository` | Read-mutate-write against SQLite. Optimistic locking optional. |
| `getCultivatorState()` | `SqliteWorldRepository` | Reads from SQLite |
| `listAvailableActions()` | `SqliteWorldRepository` | Reads from SQLite |
| `performAction()` | `SqliteWorldRepository` | Mutates world + inserts action log in SQLite |
| `advanceWorld()` | `SqliteWorldRepository` | Tick advancement, inserts tick_runs + world_events in SQLite |
| `getLatestTickRun()` | `SqliteWorldRepository` | Reads from SQLite |
| `getCultivationRegistration()` | `SqliteWorldRepository` | Reads from world state in SQLite (domain-level data) |
| `saveCultivationRegistration()` | **Removed** | Deprecated. Application layer uses `transactWorld()` instead. |
| `sendDirectMessage()` | **Removed** | Deprecated. Application layer uses `transactWorld()` instead. |
| `registerAgent()` | **Removed** | Deprecated. Application layer uses `transactWorld` + `saveAgentProfile` + `issueAgentCredential`. |
| `acquireTickLock()` | **Removed** | DO is single-threaded, no locking needed. |
| `releaseTickLock()` | **Removed** | DO is single-threaded, no locking needed. |
| `listAgentProfiles()` | `SupabaseAuthClient` | Reads from Supabase |
| `getAgentProfile()` | `SupabaseAuthClient` | Reads from Supabase |
| `saveAgentProfile()` | `SupabaseAuthClient` | Writes to Supabase |
| `authenticateAgent()` | `SupabaseAuthClient` | Reads from Supabase (SHA-256 hash lookup) |
| `issueAgentCredential()` | `SupabaseAuthClient` | Writes to Supabase |
| `resetAgentCredential()` | `SupabaseAuthClient` | Writes to Supabase |
| `touchAgent()` | `SupabaseAuthClient` | Writes to Supabase |

The unified `WorldRepository` interface is split into two focused interfaces. Backward compatibility is not required.

### Interface Changes

- `WorldRepository` is split into `WorldRepository` (SQLite, world-state methods only) and `AuthClient` (Supabase, credential/profile methods only)
- Remove `acquireTickLock()` / `releaseTickLock()` — no longer needed
- Remove deprecated methods: `registerAgent()`, `saveCultivationRegistration()`, `sendDirectMessage()`
- Remove `TickLockRecord` type

## Supabase Changes

### Tables Dropped

- `world_snapshots`
- `cultivator_records`
- `world_actions`
- `world_events`
- `tick_runs`
- `world_locks`

### Tables Retained (rows purged)

- `agent_profiles` — table kept, all existing rows deleted
- `agent_credentials` — table kept, all existing rows deleted

### Migration

A new Supabase migration drops the world-state tables and truncates auth tables:

```sql
DROP TABLE IF EXISTS world_locks;
DROP TABLE IF EXISTS world_actions;
DROP TABLE IF EXISTS world_events;
DROP TABLE IF EXISTS tick_runs;
DROP TABLE IF EXISTS cultivator_records;
DROP TABLE IF EXISTS world_snapshots;

TRUNCATE agent_credentials;
TRUNCATE agent_profiles CASCADE;
```

## Data Migration

None. Fresh start. The DO initializes a new world on first alarm tick. All existing agent data is purged.

## CI/CD Changes

**Worker deployment** switches from Cloudflare git integration to explicit `wrangler deploy` in GitHub Actions. This is required because DO migrations are atomic and must be applied via `wrangler deploy`.

New GitHub Actions workflow:
1. On push to `master`: run `npx wrangler deploy` with `CLOUDFLARE_API_TOKEN` secret
2. Pages frontend deployment remains unchanged (Cloudflare git integration)

## Rollout Sequence

Ordered cutover procedure. Each step must succeed before proceeding to the next.

### Step 1: Deploy new Worker + DO

```bash
npx wrangler deploy
```

This deploys the new Worker entrypoint, the `WorldDurableObject` class, and applies the DO SQLite migration (`v1`). The old cron trigger is removed. The DO will wake on first request or when its alarm fires.

**Verify:** Hit `GET /health` — confirms the Worker is up and forwarding to the DO. Hit `GET /world/agents` — confirms the DO is serving requests and SQLite is initialized.

### Step 2: Confirm alarm is ticking

Add a new public operator endpoint as part of this migration:

```
GET /world/status
```

Returns `{ ok: true, tick: <current_tick>, lastTickAt: <timestamp> }` by reading the `world_state` row from SQLite. No auth required — it exposes only the tick number and timestamp, no game state.

Wait ~2 minutes after deploy, then:

```bash
curl https://<worker-url>/world/status
```

Call it twice, 60+ seconds apart. If `tick` has incremented and `lastTickAt` has advanced, the alarm is firing.

Alternatively, verify via `wrangler tail` logs — the alarm handler logs each tick execution.

**Verify:** The `tick` value increments between calls. The `lastTickAt` timestamp advances.

### Step 3: Run Supabase destructive migration

Only after Steps 1 and 2 are confirmed healthy:

```bash
npx supabase db push
```

This drops world-state tables and truncates auth tables. At this point the old Supabase data is no longer needed — the DO is the live system.

**Verify:** Run a direct inspection query against the linked project to confirm the intended schema state:
```bash
npx supabase db query --linked "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```
Expected result: only `agent_profiles` and `agent_credentials` remain. World-state tables are gone.

### Rollback

If Step 1 fails (Worker deploy or DO migration fails):
- The previous Worker version is still live (Cloudflare keeps the last working deploy). No data has been destroyed yet.
- Fix the issue and re-deploy.

If Step 2 fails (alarm not ticking):
- The DO is live but not ticking. Debug via `wrangler tail` logs.
- The old Supabase data is still intact (Step 3 hasn't run).
- Worst case: redeploy the old Worker code to restore the previous system.

If Step 3 fails (Supabase migration fails):
- The DO is already the live system and healthy. Retry the migration or fix the SQL.
- No impact on the running game — Supabase world tables are no longer read by anyone.

## Package Impact

### Unchanged

- `packages/domain` — pure game logic, no runtime dependencies
- `packages/contracts` — shared API types
- `apps/web` — calls the same API endpoints, no changes needed
- `packages/openclaw-immortal-plugin` — agent plugin, unaffected

### Changed: `packages/application`

The interface split (`WorldRepository` → `WorldRepository` + `AuthClient`) breaks application-layer callers that currently depend on a single repository object exposing both world and auth methods. Affected files include:

- `agent-registration.ts` — calls `transactWorld()` (world) + `saveAgentProfile()` / `issueAgentCredential()` (auth)
- `public-agents.ts` — calls `listAgentProfiles()` (auth) + `readWorld()` / `getCultivatorState()` (world)
- `agent-messaging.ts` — calls `authenticateAgent()` (auth) + `transactWorld()` (world)

**Composition plan:** Application use-case factories currently accept `{ repository: WorldRepository }`. After the split, they accept `{ world: WorldRepository, auth: AuthClient }`. Each use case receives both clients and calls whichever it needs. The DO constructs both clients and passes them when creating use cases.

Example:
```ts
// Before
const service = createRuntimeService({ repository });

// After
const service = createRuntimeService({ world, auth });
```

This is a mechanical refactor — every use-case factory signature changes, but the internal logic stays the same. The route layer in `apps/world-do/` wires both clients when constructing use cases.

### Changed: `apps/runtime-worker`

Gutted to a thin pass-through. Routes, middleware, scheduler, and env resolution all move into `apps/world-do/`.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Single DO as bottleneck | Acceptable for single-world, agent-scale traffic (~500 req/s capacity) |
| DO SQLite data loss | Cloudflare provides automatic replication for DO storage. Catastrophic loss means fresh world — acceptable for this project. |
| Cold start latency | SQLite persists across evictions — no hydration needed. Schema `CREATE IF NOT EXISTS` is fast. |
| Supabase auth latency from inside DO | Auth is per-request, not per-tick. Latency is acceptable. Could cache profiles in SQLite if needed later. |
| SQLite storage growth | Append-only logs (actions, events, tick_runs) grow unboundedly. Pruning is out of scope for v1; will be addressed if storage approaches limits. |
| Cross-store registration failure | Agent registration writes to both SQLite (cultivator creation via `transactWorld()`) and Supabase (profile + credential via `saveAgentProfile()` then `issueAgentCredential()`). Two partial-failure shapes exist: **(1)** Supabase profile write fails → orphaned cultivator in SQLite with no agent profile or credential. **(2)** Profile succeeds but credential issuance fails → agent profile exists in Supabase but has no usable credential. Both are existing issues (same sequencing as `agent-registration.ts`). Accepted as operational debt for v1. A future improvement could use a registration-state column or idempotency key to detect and retry incomplete registrations. |
