# Durable Object Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all world state from Supabase Postgres to a Cloudflare Durable Object with SQLite, eliminating >2GB/day egress costs.

**Architecture:** Worker becomes a thin pass-through. A new `WorldDurableObject` in `apps/world-do/` hosts the Hono router, game logic, SQLite persistence, and alarm-based ticks. Supabase is retained only for `agent_profiles` and `agent_credentials`. The `packages/persistence` layer splits into `SqliteWorldRepository` (world state) and `SupabaseAuthClient` (auth).

**Tech Stack:** Cloudflare Workers, Durable Objects (SQLite), Hono, TypeScript, node:test

**Spec:** `docs/specs/durable-object-migration/spec.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `apps/world-do/package.json` | Workspace package metadata, dependencies (hono) |
| `apps/world-do/tsconfig.json` | TypeScript config extending root, cloudflare types |
| `apps/world-do/src/index.ts` | `WorldDurableObject` class: constructor, fetch, alarm |
| `apps/world-do/src/test-helpers.ts` | Test helper for building Hono app with in-memory repos |
| `apps/world-do/src/routes.ts` | Internal Hono router (moved from runtime-worker) |
| `apps/world-do/src/middleware.ts` | CORS + error handling middleware (moved from runtime-worker) |
| `apps/world-do/src/env.ts` | DO env types and helper functions |
| `apps/world-do/src/agent-guides.ts` | Markdown guide content (moved from runtime-worker) |
| `packages/persistence/src/sqlite-world-repository.ts` | `SqliteWorldRepository` implementing `WorldRepository` via DO SQLite |
| `packages/persistence/src/sqlite-world-repository.test.ts` | Tests for SQLite repository |
| `packages/persistence/src/supabase-auth-client.ts` | `SupabaseAuthClient` for credential/profile ops |
| `packages/persistence/src/supabase-auth-client.test.ts` | Tests for auth client |
| `packages/persistence/src/auth-client.ts` | `AuthClient` interface definition |
| `packages/persistence/src/sqlite-schema.ts` | SQLite table creation + index DDL (used by both tests and DO) |
| `supabase/migrations/20260323_drop_world_tables.sql` | Drop world tables, truncate auth tables |

### Modified Files

| File | Change |
|------|--------|
| `packages/persistence/src/world-repository.ts` | Remove auth methods, lock methods, deprecated methods |
| `packages/persistence/src/index.ts` | Export new modules, remove Supabase repository export |
| `packages/application/src/agent-registration.ts` | Accept `{ world, auth }` instead of `{ repository }` |
| `packages/application/src/agent-messaging.ts` | Accept `{ world, auth }` instead of `{ repository }` |
| `packages/application/src/agent-persona.ts` | Accept `{ world, auth }` instead of `{ repository }` |
| `packages/application/src/public-agents.ts` | Accept `{ world, auth }` instead of `{ repository }` |
| `packages/application/src/agent-credential.ts` | Accept `{ auth }` instead of `{ repository }` |
| `apps/runtime-worker/src/index.ts` | Thin pass-through + re-export DO class |
| `apps/runtime-worker/wrangler.jsonc` | Add DO binding, migration, remove cron |
| `apps/runtime-worker/package.json` | Add world-do workspace dependency |
| `package.json` | Add `apps/world-do` to workspaces (already covered by `apps/*` glob) |

### Deleted Files

| File | Reason |
|------|--------|
| `packages/persistence/src/supabase-world-repository.ts` | Replaced by SQLite + auth client |
| `packages/persistence/src/supabase-world-repository.test.ts` | No longer needed |
| `apps/runtime-worker/src/routes.ts` | Moved to world-do |
| `apps/runtime-worker/src/middleware.ts` | Moved to world-do |
| `apps/runtime-worker/src/app.ts` | Moved to world-do |
| `apps/runtime-worker/src/scheduler.ts` | Replaced by DO alarm |
| `apps/runtime-worker/src/env.ts` | Replaced by world-do/src/env.ts |
| `apps/runtime-worker/src/agent-guides.ts` | Moved to world-do |

---

## Task 1: Split WorldRepository Interface

Remove auth, lock, and deprecated methods from `WorldRepository`. Create a new `AuthClient` interface.

**Files:**
- Modify: `packages/persistence/src/world-repository.ts`
- Create: `packages/persistence/src/auth-client.ts`

- [ ] **Step 1: Create AuthClient interface**

Create `packages/persistence/src/auth-client.ts`:

```ts
import type { AgentProfileRecord, AgentProfileWriteInput, AgentCredentialResetResult } from "./world-repository.js";

export interface AuthClient {
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
  getAgentProfile(agentId: string): Promise<AgentProfileRecord | null>;
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
  authenticateAgent(credential: string): Promise<AgentProfileRecord | null>;
  issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult>;
  resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult>;
  touchAgent(agentId: string): Promise<void>;
}
```

- [ ] **Step 2: Trim WorldRepository interface**

Modify `packages/persistence/src/world-repository.ts`:
- Remove all auth methods (they now live on `AuthClient`)
- Remove `acquireTickLock()`, `releaseTickLock()`
- Remove deprecated `registerAgent()`, `saveCultivationRegistration()`, `sendDirectMessage()`
- Remove `TickLockRecord` type
- Keep: `readWorld`, `transactWorld`, `getCultivatorState`, `listAvailableActions`, `performAction`, `advanceWorld`, `getLatestTickRun`, `getCultivationRegistration`
- Add: `getWorldMetadata()` — new method for the `/world/status` rollout verification endpoint

The trimmed interface should be:

```ts
export interface WorldRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  getWorldMetadata(): Promise<{ tick: number; updatedAt: string }>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit -p packages/persistence/tsconfig.json`
Expected: Compilation errors in files that import removed methods (expected — we fix these in later tasks)

- [ ] **Step 4: Commit**

```bash
git add packages/persistence/src/world-repository.ts packages/persistence/src/auth-client.ts
git commit -m "refactor: split WorldRepository into WorldRepository + AuthClient interfaces"
```

---

## Task 2: Update Application Layer for Split Interfaces

Refactor application use-case factories to accept `{ world, auth }` instead of `{ repository }`.

**Files:**
- Modify: `packages/application/src/agent-registration.ts`
- Modify: `packages/application/src/agent-messaging.ts`
- Modify: `packages/application/src/agent-persona.ts`
- Modify: `packages/application/src/public-agents.ts`
- Modify: `packages/application/src/agent-credential.ts`
- Modify: `packages/application/src/agent-onboarding.ts`
- Modify: `packages/application/src/agent-operations.ts`
- Modify: `packages/application/src/agent-insights.ts`
- Modify: `packages/application/src/agent-actions.ts`
- Modify: `packages/application/src/runtime-service.ts`
- Modify: All corresponding `.test.ts` files

- [ ] **Step 1: Identify which use cases need auth vs world vs both**

The application layer already defines narrowed repository interfaces per use case. Map each to the new split:

**World-only** (no change to dependency shape, just rename `repository` → `world`):
- `agent-onboarding.ts`: `AgentOnboardingRepository` uses `getCultivatorState`, `readWorld`
- `agent-actions.ts`: `AgentActionsRepository` uses `listAvailableActions`
- `agent-insights.ts`: `AgentInsightsRepository` uses `readWorld`, `getCultivationRegistration`
- `agent-operations.ts`: `AgentOperationsRepository` uses `transactWorld`, `performAction`, `advanceWorld`
- `runtime-service.ts`: `RuntimeRepository` uses `getCultivatorState`, `listAvailableActions`, `performAction`, `advanceWorld`

**Auth-only** (rename `repository` → `auth`):
- `agent-credential.ts`: `AgentCredentialRepository` uses `resetAgentCredential`

**Both world + auth** (split `repository` into `world` + `auth`):
- `agent-registration.ts`: `AgentRegistrationWorkflowRepository` uses `transactWorld`, `getCultivatorState`, `getCultivationRegistration` (world) + `saveAgentProfile`, `issueAgentCredential` (auth)
- `agent-messaging.ts`: `AgentMessagingRepository` uses `readWorld`, `transactWorld` (world) + `listAgentProfiles` (auth)
- `agent-persona.ts`: `AgentPersonaWorkflowRepository` uses `transactWorld` (world) + `getAgentProfile`, `saveAgentProfile` (auth)
- `public-agents.ts`: `PublicAgentDirectoryRepository` uses `readWorld` (world) + `listAgentProfiles` (auth). `PublicAgentStateRepository` uses `readWorld`, `getCultivatorState` (world) + `getAgentProfile` (auth)

- [ ] **Step 2: Update world-only use cases**

For each world-only file, rename the narrowed interface's parameter from `repository` to `world` in the function signatures. The interface definitions themselves stay the same — they already only declare world methods.

Example for `agent-onboarding.ts`:
```ts
// Before
export async function buildAuthenticatedAgentState(options: {
  repository: AgentOnboardingRepository;
  agent: AgentProfileRecord;
})

// After
export async function buildAuthenticatedAgentState(options: {
  world: AgentOnboardingRepository;
  agent: AgentProfileRecord;
})
```

Apply the same rename to: `agent-actions.ts`, `agent-insights.ts`, `agent-operations.ts`, `runtime-service.ts`.

**Important:** Files with multiple exported functions each have their own `{ repository: Pick<...> }` parameter that needs renaming. Counts:
- `agent-insights.ts`: 6 functions (`buildAuthenticatedAgentEvents`, `readAuthenticatedAgentStrategy`, `readAuthenticatedAgentTribulation`, `readAuthenticatedAgentSectInfo`, `readAuthenticatedAgentDaoLogs`, `readAuthenticatedAgentRegistration`)
- `agent-operations.ts`: 3 functions (`saveAuthenticatedAgentRegistration`, `performAuthenticatedAgentAction`, `advanceAuthenticatedAgentWorld`)
- `agent-messaging.ts`: `listAuthenticatedAgentMessages` is world-only (uses `Pick<AgentMessagingRepository, "readWorld">`), rename its `repository` param to `world`

Update all `options.repository` references to `options.world` in function bodies.

- [ ] **Step 3: Update auth-only use case**

For `agent-credential.ts`, rename `repository` to `auth`:
```ts
// Before
export async function resetAuthenticatedAgentCredential(options: {
  repository: AgentCredentialRepository;
  ...
})

// After
export async function resetAuthenticatedAgentCredential(options: {
  auth: AgentCredentialRepository;
  ...
})
```

- [ ] **Step 4: Update dual-dependency use cases**

For `agent-registration.ts`, split the interface and function signature:
```ts
// Before
export interface AgentRegistrationWorkflowRepository {
  transactWorld<TResult>(...): Promise<TResult>;
  saveAgentProfile(...): Promise<AgentProfileRecord>;
  issueAgentCredential(...): Promise<AgentCredentialResetResult>;
  getCultivatorState(...): Promise<CultivatorStateView>;
  getCultivationRegistration(...): Promise<CultivationRegistrationRecord | null>;
}

export async function registerAgentWorkflow(options: {
  repository: AgentRegistrationWorkflowRepository;
  ...
})

// After
export interface AgentRegistrationWorldRepository {
  transactWorld<TResult>(...): Promise<TResult>;
  getCultivatorState(...): Promise<CultivatorStateView>;
  getCultivationRegistration(...): Promise<CultivationRegistrationRecord | null>;
}

export interface AgentRegistrationAuthClient {
  saveAgentProfile(...): Promise<AgentProfileRecord>;
  issueAgentCredential(...): Promise<AgentCredentialResetResult>;
}

export async function registerAgentWorkflow(options: {
  world: AgentRegistrationWorldRepository;
  auth: AgentRegistrationAuthClient;
  ...
})
```

Apply the same split to: `agent-messaging.ts`, `agent-persona.ts`, `public-agents.ts`.

Update internal references from `options.repository.methodName()` to `options.world.methodName()` or `options.auth.methodName()` as appropriate.

- [ ] **Step 5: Update all application test files**

For each `.test.ts` file in `packages/application/src/`, update the test call sites to match the new signatures. Example:

```ts
// Before
const result = await buildAuthenticatedAgentState({
  repository: createInMemoryWorldRepository(),
  agent: createAgentProfile(),
});

// After — for world-only use cases, pass the same object as `world`
const result = await buildAuthenticatedAgentState({
  world: createInMemoryWorldRepository(),
  agent: createAgentProfile(),
});

// After — for dual-dependency use cases, pass both
const repo = createInMemoryWorldRepository();
const result = await registerAgentWorkflow({
  world: repo,
  auth: repo,  // InMemoryWorldRepository implements both for testing
  ...
});
```

- [ ] **Step 6: Update `packages/application/src/index.ts` barrel exports**

Update type exports to reflect renamed interfaces. For example:
- `AgentRegistrationWorkflowRepository` → export both `AgentRegistrationWorldRepository` and `AgentRegistrationAuthClient`
- Update any other renamed interface exports

- [ ] **Step 7: Run tests to verify**

Run: `npm test`
Expected: All application tests pass. Some runtime-worker tests may fail (routes still reference old signatures — fixed in later tasks).

- [ ] **Step 8: Commit**

```bash
git add packages/application/
git commit -m "refactor: split repository dependency into world + auth across application layer"
```

---

## Task 3: Implement SupabaseAuthClient

Extract auth methods from `SupabaseWorldRepository` into a standalone `SupabaseAuthClient`.

**Files:**
- Create: `packages/persistence/src/supabase-auth-client.ts`
- Create: `packages/persistence/src/supabase-auth-client.test.ts`

- [ ] **Step 1: Write failing test for authenticateAgent**

Create `packages/persistence/src/supabase-auth-client.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { SupabaseAuthClient } from "./supabase-auth-client.js";

// Reuse the FakeSupabaseRestApi pattern from supabase-world-repository.test.ts
// but only with agent_profiles and agent_credentials tables.

test("authenticateAgent returns profile for valid credential", async () => {
  const client = createTestAuthClient();
  // Issue a credential first
  const { credential } = await client.issueAgentCredential("agent-1");
  const profile = await client.authenticateAgent(credential);
  assert.ok(profile);
  assert.equal(profile.agentId, "agent-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test packages/persistence/src/supabase-auth-client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SupabaseAuthClient**

Create `packages/persistence/src/supabase-auth-client.ts`. Extract the following methods from `supabase-world-repository.ts`:
- `authenticateAgent()` — SHA-256 hash lookup against `agent_credentials`
- `issueAgentCredential()` — revoke existing + issue new credential
- `resetAgentCredential()` — validate current + issue new
- `saveAgentProfile()` — upsert to `agent_profiles`
- `getAgentProfile()` — select from `agent_profiles`
- `listAgentProfiles()` — select all from `agent_profiles`
- `touchAgent()` — update `last_seen_at`

Also extract shared helpers: `hashCredential()`, `generateCredential()`, `normalizeProfileRow()`.

```ts
import type { AuthClient } from "./auth-client.js";
import type { AgentProfileRecord, AgentProfileWriteInput, AgentCredentialResetResult } from "./world-repository.js";

export interface SupabaseAuthClientOptions {
  url: string;
  secretKey: string;
  fetch?: typeof fetch;
  now?: () => string;
}

export class SupabaseAuthClient implements AuthClient {
  constructor(
    private readonly fetchImpl: typeof fetch,
    private readonly now: () => string,
    private readonly url: string,
    private readonly secretKey: string,
  ) {}

  // ... methods extracted from SupabaseWorldRepository
}

export function createSupabaseAuthClient(options: SupabaseAuthClientOptions): SupabaseAuthClient {
  return new SupabaseAuthClient(
    options.fetch ?? globalThis.fetch,
    options.now ?? (() => new Date().toISOString()),
    options.url,
    options.secretKey,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test packages/persistence/src/supabase-auth-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/persistence/src/supabase-auth-client.ts packages/persistence/src/supabase-auth-client.test.ts packages/persistence/src/auth-client.ts
git commit -m "feat: implement SupabaseAuthClient extracted from SupabaseWorldRepository"
```

---

## Task 4: Implement SqliteWorldRepository

Build the new repository that implements `WorldRepository` using DO SQLite.

**Files:**
- Create: `packages/persistence/src/sqlite-world-repository.ts`
- Create: `packages/persistence/src/sqlite-world-repository.test.ts`

- [ ] **Step 1: Write failing test for readWorld with lazy seed**

Create `packages/persistence/src/sqlite-world-repository.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { SqliteWorldRepository } from "./sqlite-world-repository.js";

test("readWorld returns seeded world when database is empty", async () => {
  const sql = createFakeSqlStorage();
  const repo = new SqliteWorldRepository(sql);
  const world = await repo.readWorld();
  assert.ok(world);
  assert.ok(world.tick >= 0);
});
```

**SQLite test strategy:** Use `better-sqlite3` as a devDependency to create a real in-memory SQLite database for testing. This gives us actual SQL execution without Cloudflare's runtime. Add `better-sqlite3` and `@types/better-sqlite3` to `packages/persistence/package.json` devDependencies.

**Schema ownership:** The schema DDL (`createSchema()`) lives in `packages/persistence/src/sqlite-schema.ts` — NOT in `apps/world-do/src/schema.ts` as originally planned. This allows Task 4's tests to import and run schema creation without depending on a package that doesn't exist yet. Task 6 (`apps/world-do/src/schema.ts`) is removed — the DO constructor imports `createSchema` directly from `@immortal-claw/persistence`.

The `createFakeSqlStorage()` helper wraps `better-sqlite3` to match the `SqlStorage` interface and runs schema creation:

```ts
import Database from "better-sqlite3";
import { createSchema } from "./sqlite-schema.js";

function createFakeSqlStorage(): SqlStorage {
  const db = new Database(":memory:");
  const sql: SqlStorage = {
    exec(query, ...bindings) {
      const trimmed = query.trimStart().toUpperCase();
      const isQuery = trimmed.startsWith("SELECT");

      if (isQuery) {
        const stmt = db.prepare(query);
        const rows = bindings.length > 0 ? stmt.all(...bindings) : stmt.all();
        return {
          toArray: () => rows,
          one: () => rows[0],
          rowsRead: rows.length,
          rowsWritten: 0,
        };
      }

      // DDL (CREATE TABLE/INDEX) and DML (INSERT/UPDATE/DELETE)
      const stmt = db.prepare(query);
      const info = bindings.length > 0 ? stmt.run(...bindings) : stmt.run();
      return {
        toArray: () => [],
        one: () => undefined as any,
        rowsRead: 0,
        rowsWritten: info.changes,
      };
    },
  };
  createSchema(sql);
  return sql;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Define SqlStorage interface for testability**

In `packages/persistence/src/sqlite-world-repository.ts`, define a minimal interface matching Cloudflare's `SqlStorage`:

```ts
export interface SqlStorage {
  exec<T>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>;
}

export interface SqlStorageCursor<T> {
  toArray(): T[];
  one(): T;
  readonly rowsRead: number;
  readonly rowsWritten: number;
}
```

This allows testing with a fake implementation without importing Cloudflare types.

- [ ] **Step 4: Implement SqliteWorldRepository**

```ts
import type { WorldRepository, TickRunRecord } from "./world-repository.js";
import type { WorldState, CultivatorStateView, AvailableAction, ActionExecutionResult, TickSummary, ActionId } from "../../domain/src/runtime.js";
import type { CultivationRegistrationRecord } from "../../domain/src/model.js";
import { createSeedWorld, advanceWorld, getCultivatorState, listAvailableActions, performAction, getCultivationRegistration } from "../../domain/src/runtime.js";

export class SqliteWorldRepository implements WorldRepository {
  private readonly worldKey = "primary";

  constructor(private readonly sql: SqlStorage) {}

  async readWorld(): Promise<WorldState> {
    const rows = this.sql.exec<{ payload: string }>(
      "SELECT payload FROM world_state WHERE world_key = ?",
      this.worldKey
    ).toArray();

    if (rows.length === 0) {
      const seed = createSeedWorld();
      this.sql.exec(
        "INSERT INTO world_state (world_key, version, tick, updated_at, payload) VALUES (?, 1, 0, ?, ?)",
        this.worldKey, new Date().toISOString(), JSON.stringify(seed)
      );
      return seed;
    }

    return JSON.parse(rows[0].payload);
  }

  async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
    const world = await this.readWorld();
    const result = mutator(world);
    // All writes are synchronous (no await between them) to ensure
    // Cloudflare coalesces them into a single atomic transaction.
    const now = new Date().toISOString();
    this.sql.exec(
      "UPDATE world_state SET version = version + 1, tick = ?, updated_at = ?, payload = ? WHERE world_key = ?",
      world.tick, now, JSON.stringify(world), this.worldKey
    );
    // Upsert cultivator records
    for (const [id, cultivator] of Object.entries(world.cultivators ?? {})) {
      this.sql.exec(
        `INSERT INTO cultivator_records (cultivator_id, tick, updated_at, snapshot)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cultivator_id) DO UPDATE SET tick = excluded.tick, updated_at = excluded.updated_at, snapshot = excluded.snapshot`,
        id, world.tick, now, JSON.stringify(cultivator)
      );
    }
    return result;
  }

  // ... remaining methods follow the same pattern:
  // getCultivatorState, listAvailableActions, performAction, advanceWorld,
  // getLatestTickRun, getCultivationRegistration
}
```

Key implementation notes:
- `advanceWorld()` calls the domain `advanceWorld()` function, then writes world state + tick_runs + world_events in a single synchronous block (no `await` between writes) for atomic transaction.
- `performAction()` calls domain `performAction()` via `transactWorld()`, then inserts into `world_actions`.
- `getCultivatorState()` and `listAvailableActions()` read world state and delegate to domain functions.
- JSON serialization handles `Infinity` values (serialize as `"Infinity"` string, deserialize back).

- [ ] **Step 5: Add tests for transactWorld, advanceWorld, performAction**

Add tests for the critical paths:

```ts
test("transactWorld persists mutations atomically", async () => {
  const sql = createFakeSqlStorage();
  const repo = new SqliteWorldRepository(sql);
  await repo.readWorld(); // seed
  const result = await repo.transactWorld((world) => {
    world.tick = 42;
    return "ok";
  });
  assert.equal(result, "ok");
  const world = await repo.readWorld();
  assert.equal(world.tick, 42);
});

test("advanceWorld inserts tick_runs and world_events", async () => {
  const sql = createFakeSqlStorage();
  const repo = new SqliteWorldRepository(sql);
  const summary = await repo.advanceWorld(1, "scheduled");
  assert.ok(summary);
  const tickRun = await repo.getLatestTickRun();
  assert.ok(tickRun);
  assert.equal(tickRun.trigger, "scheduled");
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/persistence/src/sqlite-world-repository.ts packages/persistence/src/sqlite-world-repository.test.ts
git commit -m "feat: implement SqliteWorldRepository for Durable Object SQLite storage"
```

---

## Task 5: Update Persistence Package Exports

Update the barrel export file and remove the old Supabase repository.

**Files:**
- Modify: `packages/persistence/src/index.ts`
- Delete: `packages/persistence/src/supabase-world-repository.ts`
- Delete: `packages/persistence/src/supabase-world-repository.test.ts`

- [ ] **Step 1: Update index.ts exports**

```ts
// Interfaces
export type { WorldRepository, TickRunRecord, AgentProfileRecord, AgentProfileWriteInput, AgentRegistrationInput, AgentRegistrationResult, AgentCredentialResetResult, AgentPersonaInput } from "./world-repository.js";
export type { AuthClient } from "./auth-client.js";

// SQLite implementation
export { SqliteWorldRepository } from "./sqlite-world-repository.js";
export type { SqlStorage, SqlStorageCursor } from "./sqlite-world-repository.js";
export { createSchema } from "./sqlite-schema.js";

// Supabase auth
export { SupabaseAuthClient, createSupabaseAuthClient } from "./supabase-auth-client.js";
export type { SupabaseAuthClientOptions } from "./supabase-auth-client.js";

// In-memory (for testing)
export { InMemoryWorldRepository, createInMemoryWorldRepository } from "./in-memory-world-repository.js";
```

- [ ] **Step 2: Delete old Supabase repository files**

```bash
rm packages/persistence/src/supabase-world-repository.ts
rm packages/persistence/src/supabase-world-repository.test.ts
```

- [ ] **Step 3: Update InMemoryWorldRepository to match new interfaces**

The `InMemoryWorldRepository` needs to:
1. Drop removed methods from its class: `acquireTickLock`, `releaseTickLock`, `registerAgent`, `saveCultivationRegistration`, `sendDirectMessage`
2. Implement both `WorldRepository` and `AuthClient` (the auth methods already exist on the class)
3. Add the new `getWorldMetadata()` method

Simplest approach: `class InMemoryWorldRepository implements WorldRepository, AuthClient`. Tests that need both can pass the same object to `world` and `auth`.

- [ ] **Step 4: Update in-memory repository tests**

`packages/persistence/src/in-memory-world-repository.test.ts` contains tests for the removed methods:
- `registerAgent` test (~line 108)
- `saveCultivationRegistration` test (~line 148)
- `sendDirectMessage` test (~line 176)

**Delete these tests.** Also delete any tests for `acquireTickLock`/`releaseTickLock`. Add a test for `getWorldMetadata()`. Verify remaining tests still exercise the kept methods (`readWorld`, `transactWorld`, `authenticateAgent`, etc.).

- [ ] **Step 5: Run all persistence tests**

Run: `node --import tsx --test packages/persistence/src/*.test.ts`
Expected: PASS (supabase tests gone, removed-method tests gone, in-memory + sqlite tests pass)

- [ ] **Step 5: Commit**

```bash
git add packages/persistence/src/
git commit -m "refactor: update persistence exports, remove SupabaseWorldRepository"
```

---

## Task 6: Create world-do Package Scaffold

Set up the `apps/world-do/` workspace package. Note: schema DDL lives in `packages/persistence/src/sqlite-schema.ts` (created in Task 4), not here.

**Files:**
- Create: `apps/world-do/package.json`
- Create: `apps/world-do/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@immortal-claw/world-do",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "hono": "^4.12.8"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["es2022", "webworker"],
    "types": ["@cloudflare/workers-types"],
    "noEmit": true
  }
}
```

- [ ] **Step 3: Run npm install to link workspace**

Run: `npm install`
Expected: `@immortal-claw/world-do` linked in node_modules

- [ ] **Step 4: Commit**

```bash
git add apps/world-do/
git commit -m "feat: scaffold world-do workspace package"
```

---

## Task 7: Implement WorldDurableObject Class

The core DO class with constructor, fetch, and alarm.

**Files:**
- Create: `apps/world-do/src/index.ts`
- Create: `apps/world-do/src/env.ts`

- [ ] **Step 1: Create env.ts with DO types**

```ts
import type { AuthClient } from "@immortal-claw/persistence";
import type { WorldRepository } from "@immortal-claw/persistence";

export interface WorldDOEnv {
  FRONTEND_ORIGIN?: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  WORLD_TICK_STEPS?: string;
}

export interface WorldDOHonoEnv {
  Bindings: WorldDOEnv;
  Variables: {
    world: WorldRepository;
    auth: AuthClient;
  };
}
```

Also move `readTickSteps()`, `resolveCorsOrigins()`, `isAllowedCorsOrigin()` from `apps/runtime-worker/src/env.ts` into this file — these are now the DO's responsibility.

- [ ] **Step 2: Create the WorldDurableObject class**

Create `apps/world-do/src/index.ts`:

```ts
import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import { createSchema, SqliteWorldRepository, createSupabaseAuthClient } from "@immortal-claw/persistence";
import { registerRoutes } from "./routes.js";
import { registerMiddleware } from "./middleware.js";
import { readTickSteps } from "./env.js";
import type { WorldDOEnv, WorldDOHonoEnv } from "./env.js";

export class WorldDurableObject extends DurableObject<WorldDOEnv> {
  private app: Hono<WorldDOHonoEnv>;

  constructor(ctx: DurableObjectState, env: WorldDOEnv) {
    super(ctx, env);

    // Schema creation + alarm setup inside blockConcurrencyWhile
    ctx.blockConcurrencyWhile(async () => {
      createSchema(ctx.storage.sql);
      const existingAlarm = await ctx.storage.getAlarm();
      if (!existingAlarm) {
        await ctx.storage.setAlarm(Date.now() + 60_000);
      }
    });

    // Build Hono app
    this.app = new Hono<WorldDOHonoEnv>();

    const world = new SqliteWorldRepository(ctx.storage.sql);
    const auth = createSupabaseAuthClient({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    });

    // Inject dependencies as Hono variables
    this.app.use("*", async (c, next) => {
      c.set("world", world);
      c.set("auth", auth);
      await next();
    });

    registerMiddleware(this.app, env);
    registerRoutes(this.app);
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }

  async alarm(): Promise<void> {
    // Always reschedule first — guarantees the world never stops ticking
    // even if all 6 Cloudflare retries are exhausted.
    await this.ctx.storage.setAlarm(Date.now() + 60_000);

    // Let errors propagate — Cloudflare retries failed alarms up to 6 times.
    // advanceWorld() is atomic (single SQLite transaction), so a failed tick
    // leaves no partial state. Safe to retry.
    const world = new SqliteWorldRepository(this.ctx.storage.sql);
    const steps = readTickSteps(this.env);
    await world.advanceWorld(steps, "scheduled");
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit -p apps/world-do/tsconfig.json`
Expected: May have errors until routes.ts/middleware.ts are created (next tasks)

- [ ] **Step 4: Commit**

```bash
git add apps/world-do/src/index.ts apps/world-do/src/env.ts
git commit -m "feat: implement WorldDurableObject class with alarm and Hono router"
```

---

## Task 8: Move Routes to world-do

Move the Hono routes from `apps/runtime-worker/` into `apps/world-do/`, updating them to use the split `world` + `auth` dependencies.

**Files:**
- Create: `apps/world-do/src/routes.ts`
- Create: `apps/world-do/src/middleware.ts`
- Reference: `apps/runtime-worker/src/routes.ts` (source to port from)
- Reference: `apps/runtime-worker/src/middleware.ts` (source to port from)

- [ ] **Step 1: Create middleware.ts**

Port `apps/runtime-worker/src/middleware.ts` to `apps/world-do/src/middleware.ts`. Update the CORS resolution to use the new env types:

```ts
import { cors } from "hono/cors";
import type { Hono } from "hono";
import { isAllowedCorsOrigin } from "./env.js";
import type { WorldDOHonoEnv, WorldDOEnv } from "./env.js";

export function registerMiddleware(app: Hono<WorldDOHonoEnv>, env: WorldDOEnv): void {
  app.use("*", cors({
    origin(origin) {
      if (!origin) return null;
      return isAllowedCorsOrigin(origin, env) ? origin : null;
    },
  }));

  app.onError((error, context) => {
    const status = readStatus(error) as 400 | 401 | 409 | 500;
    return context.json({ error: readMessage(error) }, status);
  });
}
```

- [ ] **Step 2: Create routes.ts**

Port `apps/runtime-worker/src/routes.ts` to `apps/world-do/src/routes.ts`. Key changes:

1. **Port all route helper functions verbatim** — the top of `routes.ts` (~lines 71-258) contains helpers: `readBearerToken`, `readAuthenticatedAgent`, `readLegacyCultivatorIdFromQuery`, `readRegistrationInput`, `createStatusError`, etc. Copy these as-is, updating only the repository references.

2. **Port `agent-guides.ts`** — copy `apps/runtime-worker/src/agent-guides.ts` to `apps/world-do/src/agent-guides.ts` verbatim.

3. Replace `resolveRepository(context.env)` calls with `context.get("world")` and `context.get("auth")`

4. Update `readAuthenticatedAgent()` to use `auth` from context:
   ```ts
   async function readAuthenticatedAgent(request: Request, auth: AuthClient): Promise<AgentProfileRecord> {
     const credential = readBearerToken(request.headers.get("authorization") ?? undefined);
     const agent = await auth.authenticateAgent(credential);
     if (!agent) throw createStatusError(401, INVALID_CREDENTIAL_MESSAGE);
     await auth.touchAgent(agent.agentId);
     return agent;
   }
   ```

5. Update all route handlers to pass `world` and/or `auth` to application use cases:
   ```ts
   // Before
   const repository = resolveRepository(context.env);
   const result = await buildPublicAgentDirectory({ repository });

   // After
   const world = context.get("world");
   const auth = context.get("auth");
   const result = await buildPublicAgentDirectory({ world, auth });
   ```

6. **Replace deprecated `POST /cultivator/registration` route** — this route currently calls `repository.saveCultivationRegistration()` directly, which is removed. Replace with a call through `transactWorld()` using the domain-level `saveCultivationRegistration` function:
   ```ts
   // Before
   await repository.saveCultivationRegistration(cultivatorId, record, agentId);

   // After
   const world = context.get("world");
   await world.transactWorld((state) => {
     saveCultivationRegistration(state, cultivatorId, record, agentId);
     return record;
   });
   ```
   Import `saveCultivationRegistration` from `packages/domain/src/runtime.js`.

7. Add the new `GET /world/status` endpoint for rollout verification. This needs the `updated_at` timestamp from the `world_state` row, not the current time. Since `readWorld()` only returns the parsed payload, add a `getWorldMetadata()` method to `WorldRepository` (see note below), or read it directly from the SQLite context variable. Simplest approach — add to `WorldRepository`:
   ```ts
   getWorldMetadata(): Promise<{ tick: number; updatedAt: string }>;
   ```
   Implementation in `SqliteWorldRepository`:
   ```ts
   async getWorldMetadata() {
     const row = this.sql.exec<{ tick: number; updated_at: string }>(
       "SELECT tick, updated_at FROM world_state WHERE world_key = ?", this.worldKey
     ).toArray();
     if (row.length === 0) return { tick: 0, updatedAt: new Date().toISOString() };
     return { tick: row[0].tick, updatedAt: row[0].updated_at };
   }
   ```
   Route handler:
   ```ts
   app.get("/world/status", async (context) => {
     const world = context.get("world");
     const meta = await world.getWorldMetadata();
     return context.json({ ok: true, tick: meta.tick, lastTickAt: meta.updatedAt });
   });
   ```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit -p apps/world-do/tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/world-do/src/routes.ts apps/world-do/src/middleware.ts
git commit -m "feat: port routes and middleware to world-do with split world/auth dependencies"
```

---

## Task 9: Rewire runtime-worker as Pass-Through

Gut the Worker to a thin pass-through that re-exports the DO and forwards requests.

**Files:**
- Modify: `apps/runtime-worker/src/index.ts`
- Modify: `apps/runtime-worker/wrangler.jsonc`
- Modify: `apps/runtime-worker/package.json`
- Delete: `apps/runtime-worker/src/routes.ts`
- Delete: `apps/runtime-worker/src/middleware.ts`
- Delete: `apps/runtime-worker/src/app.ts`
- Delete: `apps/runtime-worker/src/scheduler.ts`
- Delete: `apps/runtime-worker/src/env.ts`

- [ ] **Step 1: Update wrangler.jsonc**

```jsonc
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

Changes: removed `triggers.crons`, added `durable_objects` and `migrations`.

- [ ] **Step 2: Replace index.ts with pass-through**

```ts
export { WorldDurableObject } from "@immortal-claw/world-do";

interface Env {
  WORLD: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.WORLD.idFromName("primary");
    const stub = env.WORLD.get(id);
    return stub.fetch(request);
  },
};
```

- [ ] **Step 3: Update package.json**

Add `@immortal-claw/world-do` as a workspace dependency:

```json
{
  "dependencies": {
    "@immortal-claw/world-do": "*",
    "hono": "^4.12.8"
  }
}
```

Note: `hono` may still be needed if any remaining code references it. If not, remove it.

- [ ] **Step 4: Delete old files**

```bash
rm apps/runtime-worker/src/routes.ts
rm apps/runtime-worker/src/middleware.ts
rm apps/runtime-worker/src/app.ts
rm apps/runtime-worker/src/scheduler.ts
rm apps/runtime-worker/src/env.ts
```

- [ ] **Step 5: Update or remove runtime-worker tests**

`apps/runtime-worker/src/index.test.ts` and `apps/runtime-worker/src/env.test.ts` reference deleted modules. Either:
- Delete them (the functionality is now tested via world-do tests)
- Or port the relevant integration tests to `apps/world-do/`

- [ ] **Step 6: Run npm install**

Run: `npm install`

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit -p apps/runtime-worker/tsconfig.json`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/runtime-worker/
git commit -m "refactor: gut runtime-worker to thin DO pass-through"
```

---

## Task 10: Write Tests for WorldDurableObject

Two levels of testing: (A) route-level tests using the Hono app directly with in-memory repos, and (B) DO lifecycle tests using `wrangler dev --remote=false` to verify the actual Durable Object class (constructor, alarm, `blockConcurrencyWhile`).

**Files:**
- Create: `apps/world-do/src/routes.test.ts`
- Create: `apps/world-do/src/test-helpers.ts`
- Create: `apps/world-do/src/middleware.test.ts`
- Create: `apps/world-do/src/env.test.ts`

### Part A: Route-Level Tests

- [ ] **Step 1: Create test-helpers.ts**

```ts
import { Hono } from "hono";
import { createInMemoryWorldRepository } from "@immortal-claw/persistence";
import { registerRoutes } from "./routes.js";
import { registerMiddleware } from "./middleware.js";
import type { WorldDOHonoEnv, WorldDOEnv } from "./env.js";

const TEST_ENV: WorldDOEnv = {
  FRONTEND_ORIGIN: "https://immortal-claw.pages.dev",
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_SECRET_KEY: "test-secret",
};

export function createTestApp() {
  const app = new Hono<WorldDOHonoEnv>();
  const repo = createInMemoryWorldRepository();
  app.use("*", async (c, next) => {
    c.set("world", repo);
    c.set("auth", repo); // InMemoryWorldRepository implements both
    await next();
  });
  registerMiddleware(app, TEST_ENV);
  registerRoutes(app);
  return app;
}
```

- [ ] **Step 2: Write route-level tests**

Create `apps/world-do/src/routes.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "./test-helpers.js";

test("GET /health returns ok", async () => {
  const app = createTestApp();
  const res = await app.request("/health");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test("GET /world/status returns tick info", async () => {
  const app = createTestApp();
  const res = await app.request("/world/status");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(typeof body.tick, "number");
  assert.equal(typeof body.lastTickAt, "string");
});
```

- [ ] **Step 3: Write registration + authenticated flow test**

The registration route requires either `answers` (array of questionnaire answers) or `record` (a pre-built `CultivationRegistrationRecord`). Use a minimal valid registration body:

```ts
test("agent registration and authenticated state retrieval", async () => {
  const app = createTestApp();
  // Register with minimal valid answers
  const regRes = await app.request("/agent/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Su Mingyue",
      answers: createMinimalAnswers(), // helper that provides valid questionnaire answers
    }),
  });
  assert.equal(regRes.status, 200);
  const { credential } = await regRes.json();
  assert.ok(credential);

  // Use credential to get agent state
  const stateRes = await app.request("/agent/state", {
    headers: { Authorization: `Bearer ${credential}` },
  });
  assert.equal(stateRes.status, 200);
});
```

Implement `createMinimalAnswers()` by referencing the questionnaire schema from `packages/domain/src/registration-questionnaire.ts` — provide one valid answer per question.

- [ ] **Step 4: Port CORS tests from runtime-worker**

Create `apps/world-do/src/middleware.test.ts`. Port the 8 CORS tests from `apps/runtime-worker/src/middleware.test.ts` — these cover preview origins, disallowed origins, error responses with CORS headers, etc. Security-relevant behavior that must be preserved.

- [ ] **Step 5: Port env utility tests**

Create `apps/world-do/src/env.test.ts`. Port tests from `apps/runtime-worker/src/env.test.ts` — covers `readFrontendOrigin`, `isAllowedCorsOrigin`, `readTickSteps` validation.

### Part B: DO Lifecycle Tests

These tests verify the actual `WorldDurableObject` class — constructor setup, `blockConcurrencyWhile()` schema creation, alarm scheduling, and the alarm tick path. They cannot run with plain `node:test` because they require the Cloudflare Workers runtime.

- [ ] **Step 6: Write DO lifecycle smoke test**

Create `apps/runtime-worker/test/do-lifecycle.test.ts` (uses `wrangler` unstable dev API or vitest with `@cloudflare/vitest-pool-workers`):

```ts
// This test requires the Cloudflare Workers runtime.
// Run via: npx wrangler dev --test (or vitest with pool-workers)

import { env, runDurableObjectAlarm } from "cloudflare:test";
import { test, expect } from "vitest";

test("DO initializes schema and sets alarm on first fetch", async () => {
  const id = env.WORLD.idFromName("test-lifecycle");
  const stub = env.WORLD.get(id);

  // First fetch should trigger constructor → blockConcurrencyWhile → schema + alarm
  const res = await stub.fetch(new Request("http://localhost/world/status"));
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.tick).toBe("number");
});

test("DO alarm advances world tick", async () => {
  const id = env.WORLD.idFromName("test-alarm");
  const stub = env.WORLD.get(id);

  // Initialize
  const res1 = await stub.fetch(new Request("http://localhost/world/status"));
  const tick1 = (await res1.json()).tick;

  // Trigger alarm via Cloudflare's test helper (not stub.alarm())
  // See: https://developers.cloudflare.com/workers/testing/vitest-integration/testing-durable-objects/
  const alarmResult = await runDurableObjectAlarm(stub);
  expect(alarmResult).toBe(true); // true = alarm handler ran

  const res2 = await stub.fetch(new Request("http://localhost/world/status"));
  const tick2 = (await res2.json()).tick;
  expect(tick2).toBeGreaterThan(tick1);
});
```

**Test runner choice:** Use `@cloudflare/vitest-pool-workers` (Cloudflare's official test integration) which runs tests inside the Workers runtime with real DO instances. Add to `apps/runtime-worker/package.json` devDependencies:
```json
"@cloudflare/vitest-pool-workers": "^0.8.0",
"vitest": "^3.0.0"
```

Add a `vitest.config.ts` in `apps/runtime-worker/`:
```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({
  test: { poolOptions: { workers: { wrangler: { configPath: "./wrangler.jsonc" } } } },
});
```

- [ ] **Step 7: Install new dependencies**

Run: `npm install`
Expected: `vitest` and `@cloudflare/vitest-pool-workers` installed and linked

- [ ] **Step 8: Run both test suites**

Route-level tests: `node --import tsx --test apps/world-do/src/*.test.ts`
DO lifecycle tests: `cd apps/runtime-worker && npx vitest run test/do-lifecycle.test.ts`

Expected: Both PASS

- [ ] **Step 9: Commit**

```bash
git add apps/world-do/src/routes.test.ts apps/world-do/src/test-helpers.ts apps/world-do/src/middleware.test.ts apps/world-do/src/env.test.ts apps/runtime-worker/test/do-lifecycle.test.ts apps/runtime-worker/vitest.config.ts apps/runtime-worker/package.json
git commit -m "test: add route-level and DO lifecycle tests for WorldDurableObject"
```

---

## Task 11: Full Test Suite + Cleanup

Run the full test suite and fix any remaining issues.

**Files:**
- Various fixes across the codebase

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Fix any failures. Common issues to expect:
- Import path updates for moved modules
- `InMemoryWorldRepository` method signature mismatches after interface trim
- Test files referencing deleted `SupabaseWorldRepository`

- [ ] **Step 2: Verify worker builds with wrangler**

Run: `cd apps/runtime-worker && npx wrangler deploy --dry-run`
Expected: Build succeeds, shows what would be deployed

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve remaining test failures and build issues"
```

---

## Task 12: Supabase Migration

Create the Supabase migration to drop world tables and purge auth data.

**Files:**
- Create: `supabase/migrations/20260323_drop_world_tables.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Drop world-state tables (no longer used — moved to DO SQLite)
DROP TABLE IF EXISTS world_locks;
DROP TABLE IF EXISTS world_actions;
DROP TABLE IF EXISTS world_events;
DROP TABLE IF EXISTS tick_runs;
DROP TABLE IF EXISTS cultivator_records;
DROP TABLE IF EXISTS world_snapshots;

-- Purge all existing auth data (fresh start)
TRUNCATE agent_credentials;
TRUNCATE agent_profiles CASCADE;
```

- [ ] **Step 2: Test locally**

Run: `npx supabase db reset` (local database)
Expected: Migration applies cleanly. Only `agent_profiles` and `agent_credentials` tables remain.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323_drop_world_tables.sql
git commit -m "chore: add Supabase migration to drop world tables and purge auth data"
```

---

## Task 13: CI/CD Workflow

Add GitHub Actions workflow for `wrangler deploy`.

**Files:**
- Create: `.github/workflows/deploy-worker.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Deploy Worker

on:
  push:
    branches: [master]

jobs:
  deploy:
    name: Deploy Runtime Worker
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx wrangler deploy
        working-directory: apps/runtime-worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-worker.yml
git commit -m "ci: add GitHub Actions workflow for wrangler deploy"
```

---

## Rollout Checklist

After all tasks are complete and merged:

- [ ] Ensure `CLOUDFLARE_API_TOKEN` is set as a GitHub Actions secret
- [ ] Ensure `SUPABASE_SECRET_KEY` is set as a Wrangler secret (`wrangler secret put SUPABASE_SECRET_KEY`)
- [ ] Push to master — CI deploys Worker + DO
- [ ] Verify: `curl https://<worker-url>/health` returns `{ ok: true }`
- [ ] Verify: `curl https://<worker-url>/world/status` returns tick info
- [ ] Wait 2 minutes, re-check `/world/status` — tick should have advanced
- [ ] Run Supabase migration: `npx supabase db push`
- [ ] Verify Supabase: only `agent_profiles` and `agent_credentials` tables remain
