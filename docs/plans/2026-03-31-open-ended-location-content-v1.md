# Open-Ended Location Content And Cached World Runtime Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the fixed Jiuzhou geography model with a repo-authored registry, split persisted world data from derived runtime state, and move the Durable Object to a warm in-memory cached world with automatic geography merge on hydrate.

**Architecture:** The implementation introduces a geography registry as the single content source for states, base locations, neutral sect defaults, and travel connectivity. The domain layer will split `PersistedWorldState` from runtime `WorldState`, hydrate newly registered geography into persisted worlds, and rebuild derived structures such as `eventPools`, topology, and state `locationIds`. The persistence layer will add a write-through in-memory cache on top of SQLite, and the Durable Object rollout path will clear the known SQLite world tables plus alarm state once before reseeding under the new model.

**Tech Stack:** TypeScript, Node test runner, Cloudflare Durable Objects with SQLite storage, Hono, Wrangler/Vitest DO harness

---

### Task 1: Introduce the geography registry and derived ID types

**Files:**
- Create: `packages/domain/src/geography-registry.ts`
- Create: `packages/domain/src/topology.test.ts`
- Modify: `packages/domain/src/constants.ts`
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/topology.ts`
- Modify: `packages/domain/src/events/catalog.ts`
- Modify: `packages/domain/src/events/catalog-state.ts`
- Modify: `packages/domain/src/events/catalog-travel-state.ts`
- Modify: `packages/domain/src/events/catalog-node-state.ts`
- Modify: `packages/domain/src/events/content/states/*.ts`
- Modify: `packages/domain/src/events/content/travel/states/*.ts`
- Modify: `packages/domain/src/events/content/nodes/states/*.ts`
- Modify: `packages/domain/src/events.test.ts`

- [x] **Step 1: Write the failing tests for registry-derived geography**

Add tests that prove:
- topology builds from registry entries rather than a hardcoded state list
- registry validation fails if a state has no cross-state connection
- adding a synthetic registry entry widens derived IDs and makes its locations appear in seeded topology/content without touching unrelated hardcoded lists

Suggested assertions:

```ts
test("seeded world includes locations from an extended geography registry", () => {
  const registry = createGeographyRegistryForTest({
    haizhou: createSyntheticStateDefinition(),
  });

  const world = createSeedWorld({ geographyRegistry: registry });

  assert.ok(world.states.haizhou);
  assert.ok(world.locations["haizhou:main-city"]);
});

test("geography registry validation rejects disconnected states", () => {
  assert.throws(() => validateGeographyRegistry(
    createGeographyRegistryForTest({
      isolated: createDisconnectedStateDefinition(),
    }),
  ));
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --import tsx --test packages/domain/src/topology.test.ts packages/domain/src/events.test.ts
```

Expected:
- new registry-validation expectations fail because no registry exists yet
- topology/content tests still rely on `STATE_IDS` and fixed constants

- [x] **Step 3: Implement the geography registry and adapt type exports**

Implement:
- `GEOGRAPHY_REGISTRY` with state metadata, named settlements, neutral sect defaults, and cross-state edges
- helper exports derived from the registry instead of manually maintained `STATE_IDS`/`LocationId` unions
- seed/topology builders that can iterate an injected registry for tests while defaulting to the repo-authored registry at runtime
- topology helpers that iterate registry-defined states and edges rather than fixed arrays
- event catalog builders and state-scoped content modules that key off registry-derived state IDs rather than hardcoded `StateId` assumptions

Keep:
- repo-authored geography
- compile-time widening from registry keys
- explicit validation helpers for disconnected states and malformed content

- [x] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --import tsx --test packages/domain/src/topology.test.ts packages/domain/src/events.test.ts
```

Expected:
- topology and event pool tests pass against the registry-driven geography model

- [x] **Step 5: Commit**

```bash
git add packages/domain/src/geography-registry.ts packages/domain/src/constants.ts packages/domain/src/model.ts packages/domain/src/seed.ts packages/domain/src/topology.ts packages/domain/src/topology.test.ts packages/domain/src/events/catalog*.ts packages/domain/src/events/content/states/*.ts packages/domain/src/events/content/travel/states/*.ts packages/domain/src/events/content/nodes/states/*.ts packages/domain/src/events.test.ts
git commit -m "refactor: derive geography ids from registry content"
```

### Task 2: Split persisted world data from derived runtime state

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/events.ts`
- Modify: `packages/domain/src/quest.ts`
- Modify: `packages/persistence/src/world-repository.ts`
- Modify: `packages/persistence/src/in-memory-world-repository.ts`
- Test: `packages/domain/src/events.test.ts`
- Test: `packages/domain/src/engine.test.ts`
- Test: `packages/persistence/src/in-memory-world-repository.test.ts`

- [x] **Step 1: Write the failing tests for persisted-vs-runtime world shape**

Add tests that prove:
- `createSeedWorld()` returns a runtime `WorldState` with derived fields populated
- a new persisted-world builder/normalizer can omit derived fields and still hydrate correctly
- quest boards remain canonical and survive hydration while derived structures are rebuilt
- `InMemoryWorldRepository` still returns hydrated runtime worlds even if initialized from canonical persisted state

Suggested shape:

```ts
test("hydrateWorldState rebuilds event pools and topology from persisted state", () => {
  const world = createSeedWorld();
  const persisted = toPersistedWorldState(world);
  delete (persisted as Record<string, unknown>).eventPools;
  delete (persisted as Record<string, unknown>).topology;

  const hydrated = hydrateWorldState(persisted);

  assert.ok(hydrated.eventPools.travelStateSpecific);
  assert.ok(hydrated.topology.distanceMatrix.size > 0);
});

test("in-memory repository hydrates runtime state from persisted input", async () => {
  const world = createSeedWorld();
  const repository = createInMemoryWorldRepository({
    world: toPersistedWorldState(world),
  });

  const hydrated = await repository.readWorld();
  assert.ok(hydrated.eventPools.travelStateSpecific);
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --import tsx --test packages/domain/src/events.test.ts packages/domain/src/engine.test.ts packages/persistence/src/in-memory-world-repository.test.ts
```

Expected:
- tests fail because no persisted/runtime split exists yet

- [x] **Step 3: Implement the explicit `PersistedWorldState` boundary**

Implement:
- `PersistedWorldState` in the domain model
- a hydration path that rebuilds:
  - topology
  - `eventPools`
  - state `locationIds`
  - any additional geography-derived indexes
- a serializer/builder that strips derived fields structurally before persistence
- seed helpers that can produce canonical persisted state and hydrated runtime state without duplicating geography logic
- `WorldRepository` contract notes that callers still receive/mutate hydrated runtime `WorldState`, while each repository implementation owns projection back to `PersistedWorldState`
- `InMemoryWorldRepository` normalization so its constructor/options and read/write paths follow the same persisted/runtime boundary as the SQLite repository

Ensure:
- `questBoards` remain persisted/canonical
- runtime-only fields cannot leak into the persisted serializer surface

- [x] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --import tsx --test packages/domain/src/events.test.ts packages/domain/src/engine.test.ts packages/persistence/src/in-memory-world-repository.test.ts
```

Expected:
- all tests pass with the explicit persisted/runtime split

- [x] **Step 5: Commit**

```bash
git add packages/domain/src/model.ts packages/domain/src/runtime.ts packages/domain/src/index.ts packages/domain/src/seed.ts packages/domain/src/events.ts packages/domain/src/quest.ts packages/persistence/src/world-repository.ts packages/persistence/src/in-memory-world-repository.ts packages/persistence/src/in-memory-world-repository.test.ts packages/domain/src/events.test.ts packages/domain/src/engine.test.ts
git commit -m "refactor: split persisted world state from runtime state"
```

### Task 3: Rebuild hydration around geometry merge and derived-state regeneration

**Files:**
- Modify: `packages/persistence/src/world-shape.ts`
- Modify: `packages/persistence/src/sqlite-world-repository.ts`
- Test: `packages/persistence/src/sqlite-world-repository.test.ts`

- [x] **Step 1: Write the failing tests for geometry merge on hydrate**

Add tests that prove:
- a persisted world missing a newly added registry state/location gains it during hydration
- existing cultivators remain at their current locations
- new quest boards are seeded only for newly introduced locations
- `eventPools` are rebuilt instead of trusted from stored payload

Suggested assertions:

```ts
test("deserializeStoredWorld merges newly registered geography while preserving cultivator positions", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const persisted = toPersistedWorldState(world);
  const registry = createGeographyRegistryForTest({
    haizhou: createSyntheticStateDefinition(),
  });

  const hydrated = deserializeStoredWorld(persisted as never, {
    geographyRegistry: registry,
  });

  assert.equal(hydrated.cultivators[cultivatorId].locationId, world.cultivators[cultivatorId].locationId);
  assert.ok(hydrated.states.haizhou);
  assert.ok(hydrated.locations["haizhou:main-city"]);
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts
```

Expected:
- new hydrate-merge tests fail because current deserialization still trusts broad `WorldState` persistence and does not rebuild all derived data

- [x] **Step 3: Implement canonical merge + rebuild hydration**

Implement:
- hydration helpers that accept `PersistedWorldState`
- geometry merge from the current registry/seed content into persisted canonical state
- runtime rebuild of `eventPools`, topology, and state indexes
- quest-board seeding only for newly added locations
- optional test-only registry injection so hydrate tests can model "newly added in content, absent in persisted world" directly
- removal of persisted derived-state assumptions from repository deserialization

Keep the output idempotent:
- hydrating an already up-to-date world should not churn canonical data

- [x] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts
```

Expected:
- hydrate merge and deserialization tests pass

- [x] **Step 5: Commit**

```bash
git add packages/persistence/src/world-shape.ts packages/persistence/src/sqlite-world-repository.ts packages/persistence/src/sqlite-world-repository.test.ts
git commit -m "fix: rebuild derived world state during hydration"
```

### Task 4: Add the SQLite-backed warm world cache and write-through failure recovery

**Files:**
- Modify: `packages/persistence/src/sqlite-world-repository.ts`
- Modify: `apps/world-do/src/index.ts`
- Modify: `apps/world-do/src/runtime.ts`
- Test: `packages/persistence/src/sqlite-world-repository.test.ts`
- Test: `apps/world-do/src/runtime.test.ts`
- Test: `apps/runtime-worker/test/do-lifecycle.vitest.ts`

- [x] **Step 1: Write the failing tests for cached-world behavior**

Add tests that prove:
- repeated reads reuse a hydrated in-memory world instead of re-reading and re-deserializing SQLite every time
- writes update the cache and SQLite together
- if SQLite persistence fails, the dirty cache is discarded and the repository replays from committed storage
- alarm-driven ticks still schedule the next alarm before world advancement

Suggested shape:

```ts
test("repository discards dirty cache after persist failure", async () => {
  // inject failing sql write after in-memory mutation
  // assert next read rehydrates from committed state
});
```

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/runtime.test.ts
```

Expected:
- cache and replay behavior is not implemented yet

- [x] **Step 3: Implement the warm cache and failure recovery path**

Implement:
- repository-level cached hydrated world
- lazy initial load from SQLite
- write-through persistence for:
  - `transactWorld`
  - `performAction`
  - `advanceWorld`
- dirty-cache invalidation and replay-on-failure behavior
- world metadata/read APIs that operate from the cache once hydrated

Preserve:
- SQLite as the durable source of truth
- deterministic recovery by reusing the standard hydrate path

- [x] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/runtime.test.ts
npm run test:do --workspace @immortal-claw/runtime-worker
```

Expected:
- persistence tests pass
- DO lifecycle tests still pass with the cached world architecture

- [x] **Step 5: Commit**

```bash
git add packages/persistence/src/sqlite-world-repository.ts packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/index.ts apps/world-do/src/runtime.ts apps/world-do/src/runtime.test.ts apps/runtime-worker/test/do-lifecycle.vitest.ts
git commit -m "feat: cache hydrated world in durable object runtime"
```

### Task 5: Implement rollout reset handling for legacy storage

**Files:**
- Modify: `packages/persistence/src/sqlite-schema.ts`
- Modify: `apps/world-do/src/index.ts`
- Modify: `apps/world-do/src/runtime.ts`
- Create: `scripts/reset-world-do-storage.mjs` or equivalent rollout utility
- Test: `apps/world-do/src/runtime.test.ts`
- Test: `apps/runtime-worker/test/do-lifecycle.vitest.ts`
- Doc: `docs/process/deployment-guide.md`

- [x] **Step 1: Write the failing tests for the reset path**

Add tests that prove:
- the reset primitive clears `world_state`, `cultivator_records`, `world_actions`, `world_events`, and `tick_runs`, then clears alarm state before reseeding
- a fresh world is available after reset
- the reset path is separate from normal request handling and can be used during rollout

- [x] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --import tsx --test apps/world-do/src/runtime.test.ts
```

Expected:
- reset behavior is not implemented yet

- [x] **Step 3: Implement the reset utility and DO wiring**

Implement one dedicated rollout path that can:
- execute `DELETE FROM tick_runs`, `world_events`, `world_actions`, `cultivator_records`, and `world_state` in a defined order
- clear the alarm via the DO storage alarm API
- invalidate any warm in-memory cached world or otherwise force the live instance to stop serving pre-reset state before normal traffic resumes
- allow the next load to reseed under the new architecture

Prefer:
- a narrowly scoped maintenance script or explicitly guarded reset path
- no permanent user-facing reset surface in normal runtime routes

- [x] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
node --import tsx --test apps/world-do/src/runtime.test.ts
npm run test:do --workspace @immortal-claw/runtime-worker
```

Expected:
- reset behavior and DO lifecycle remain green

- [x] **Step 5: Commit**

```bash
git add packages/persistence/src/sqlite-schema.ts apps/world-do/src/index.ts apps/world-do/src/runtime.ts apps/world-do/src/runtime.test.ts apps/runtime-worker/test/do-lifecycle.vitest.ts scripts/reset-world-do-storage.mjs docs/process/deployment-guide.md
git commit -m "ops: add rollout reset path for legacy world storage"
```

### Task 6: Finish integration verification and source-of-truth docs

**Files:**
- Modify: `README.md`
- Modify: `docs/process/deployment-guide.md`
- Modify: `docs/specs/open-ended-location-content-v1/spec.md` (only if implementation changes intent)
- Test: `packages/domain/src/events.test.ts`
- Test: `packages/domain/src/engine.test.ts`
- Test: `packages/persistence/src/sqlite-world-repository.test.ts`
- Test: `apps/world-do/src/routes.test.ts`
- Test: `apps/world-do/src/runtime.test.ts`
- Test: `apps/runtime-worker/test/do-lifecycle.vitest.ts`

- [x] **Step 1: Add any final regression tests discovered during integration**

Focus on:
- newly added locations appearing after hydrate merge
- travel event generation using rebuilt `eventPools`
- cached-world reads/writes staying coherent after multiple requests and ticks

- [x] **Step 2: Run the full relevant verification suite**

Run:

```bash
node --import tsx --test packages/domain/src/topology.test.ts packages/domain/src/events.test.ts packages/domain/src/engine.test.ts packages/persistence/src/in-memory-world-repository.test.ts packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/routes.test.ts apps/world-do/src/runtime.test.ts
npm run test:do --workspace @immortal-claw/runtime-worker
npm run verify:worker
```

Expected:
- all relevant domain, persistence, DO, and worker verification passes

- [x] **Step 3: Update source-of-truth docs**

Document:
- geometry registry as the source of geography content
- cached-world + SQLite persistence model
- rollout reset procedure for legacy storage
- operational expectations for adding new locations post-migration

- [x] **Step 4: Re-run the lightweight verification after doc-sensitive command changes**

Run:

```bash
node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/runtime.test.ts
```

Expected:
- targeted tests remain green after final adjustments

- [x] **Step 5: Commit**

```bash
git add README.md docs/process/deployment-guide.md docs/plans/2026-03-31-open-ended-location-content-v1.md
git commit -m "docs: describe registry-based geography runtime"
```

## Verification

- `node --import tsx --test packages/domain/src/topology.test.ts packages/domain/src/events.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts packages/persistence/src/in-memory-world-repository.test.ts packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/routes.test.ts apps/world-do/src/runtime.test.ts`
- `npm run test:do --workspace @immortal-claw/runtime-worker`
- `npm run verify:worker`

## Doc Updates

- Review/update: `README.md`
- Review/update: `docs/process/deployment-guide.md`
- Review/update: `docs/specs/open-ended-location-content-v1/spec.md` if implementation changes the approved intent
