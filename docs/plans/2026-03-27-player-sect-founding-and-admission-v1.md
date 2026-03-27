# Player Sect Founding And Admission Approval V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add player-sect founding, recruitment, applications, approval, and admission-policy updates without letting sect applications bloat actions payloads or world snapshots.

**Architecture:** Extend the domain world model with a compact sect-admission subsystem, expose it through authenticated `/agent/*` routes, and keep read paths pure by doing lazy expiry filtering in memory while only mutating the world on real writes. Generic sect inbox tasks are injected into authenticated agent actions so approval visibility stays constant-sized even when a sect has many pending applications.

**Tech Stack:** TypeScript, Node test runner, Hono routes, domain runtime, in-memory repository, SQLite snapshot persistence

---

### Task 1: Lock the new domain lifecycle with failing tests

**Files:**
- Create: `packages/domain/src/player-sects.test.ts`

**Step 1: Write the failing test**

Cover:

- founding failure cases
- founding success with treasury transfer, state-bound outpost, and founder `宗主`
- single pending application rule
- application location and organization gating
- motive bucket registration gating
- review approve/reject flow
- policy cooldown
- founder title preservation during sect title recalculation

**Step 2: Run test to verify it fails**

Run:

```powershell
node --import tsx --test packages/domain/src/player-sects.test.ts
```

Expected: FAIL because the new player-sect domain functions and fields do not exist yet.

### Task 2: Lock authenticated action and route behavior with failing tests

**Files:**
- Create: `packages/application/src/player-sects.test.ts`
- Create: `apps/world-do/src/player-sects-routes.test.ts`

**Step 1: Write the failing test**

Cover:

- generic authenticated actions add `open-player-sect-recruitment` and `review-player-sect-applications` only once
- `GET /agent/player-sects/recruitment` pagination and read-only behavior
- `POST /agent/sects/found`
- `POST /agent/player-sect-applications`
- `GET /agent/sect/applications`
- `POST /agent/sect/applications/review`
- `POST /agent/sect/admission-policy`

**Step 2: Run test to verify it fails**

Run:

```powershell
node --import tsx --test packages/application/src/player-sects.test.ts apps/world-do/src/player-sects-routes.test.ts
```

Expected: FAIL because the application helpers, contracts, and routes are missing.

### Task 3: Add the new world model and snapshot hydration

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/constants.ts`
- Modify: `packages/persistence/src/world-shape.ts`
- Modify: `packages/persistence/src/sqlite-world-repository.test.ts`

**Step 1: Write the failing test**

Use the domain and persistence tests from Tasks 1-2.

**Step 2: Run test to verify it fails**

Run the focused test commands again.

**Step 3: Write minimal implementation**

Add:

- sect admission policy types
- motive bucket ids and mapping helpers
- sect application and reject cooldown records
- new sect and cultivator fields
- world hydration defaults for older snapshots

**Step 4: Run test to verify it passes**

Run:

```powershell
node --import tsx --test packages/domain/src/player-sects.test.ts packages/persistence/src/sqlite-world-repository.test.ts
```

Expected: model and migration tests move forward, while route-level tests still fail.

### Task 4: Implement domain founding, recruitment, application, review, and policy updates

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/domain/src/quest.ts`

**Step 1: Write the failing test**

Keep extending `packages/domain/src/player-sects.test.ts` until every rule in the spec has a concrete assertion.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --import tsx --test packages/domain/src/player-sects.test.ts
```

**Step 3: Write minimal implementation**

Implement:

- founding validator and mutator
- recruitment listing with pagination
- application creation with lazy expiry/cooldown cleanup on write
- approval queue listing with lazy in-memory expiry filtering only
- review approve/reject mutations
- policy update mutation with cooldown
- founder-preserving sect title recalculation

**Step 4: Run test to verify it passes**

Run the focused domain test again.

### Task 5: Implement contracts, repositories, application helpers, and routes

**Files:**
- Modify: `packages/contracts/src/runtime-api.ts`
- Modify: `packages/persistence/src/world-repository.ts`
- Modify: `packages/persistence/src/in-memory-world-repository.ts`
- Modify: `packages/persistence/src/sqlite-world-repository.ts`
- Modify: `packages/application/src/agent-actions.ts`
- Modify: `packages/application/src/agent-operations.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `apps/world-do/src/routes.ts`

**Step 1: Write the failing test**

Use the application and route tests from Task 2.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --import tsx --test packages/application/src/player-sects.test.ts apps/world-do/src/player-sects-routes.test.ts
```

**Step 3: Write minimal implementation**

Implement:

- request and response contracts
- repository methods for new read and write flows
- authenticated action injection for generic sect todos
- application-layer wrappers that resolve the bound cultivator
- Hono routes and request parsing

**Step 4: Run test to verify it passes**

Run the same focused command again.

### Task 6: Sync docs and public agent guidance

**Files:**
- Modify: `README.md`
- Modify: `docs/product/vision.md`
- Modify: `apps/world-do/src/agent-guides.ts`

**Step 1: Write the failing test**

Add or extend route tests to check the public docs mention the new player-sect flow at a high level.

**Step 2: Run test to verify it fails**

Run:

```powershell
node --import tsx --test apps/world-do/src/player-sects-routes.test.ts apps/world-do/src/routes.test.ts
```

**Step 3: Write minimal implementation**

Document:

- founding gate
- neutral sects remain the safe fallback
- recruitment and approval now use dedicated routes
- authenticated actions expose generic sect inbox tasks

**Step 4: Run test to verify it passes**

Run the same route-focused command again.

### Task 7: Full verification

**Files:**
- No new files

**Step 1: Run targeted verification**

Run:

```powershell
node --import tsx --test packages/domain/src/player-sects.test.ts packages/application/src/player-sects.test.ts packages/persistence/src/sqlite-world-repository.test.ts apps/world-do/src/player-sects-routes.test.ts apps/world-do/src/routes.test.ts
```

**Step 2: Run full verification**

Run:

```powershell
npm test
```

**Step 3: Run build verification**

Run:

```powershell
npm run build
```

Expected: PASS, or report the exact remaining failure with evidence.
