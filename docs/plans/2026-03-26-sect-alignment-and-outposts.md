# Sect Alignment And Outposts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace legacy sect classification with explicit alignment and move sect duties onto dedicated sect outpost nodes.

**Architecture:** Extend the seeded world with fixed neutral-sect outposts, refactor topology to read real seeded locations, and route organization duties through outpost-specific availability checks. Default worlds no longer pre-seed fixed official sects; player sect support remains in the architecture and only activates when player-sect data exists in the world snapshot.

**Tech Stack:** TypeScript, Node test runner, domain runtime, seeded world topology

---

### Task 1: Lock the new behavior with failing tests

**Files:**
- Modify: `packages/domain/src/engine.test.ts`
- Modify: `apps/world-do/src/routes.test.ts`

**Step 1: Write the failing test**

Add tests that verify:

- player sects expose `alignment` instead of old `type`
- neutral sect info exposes `alignment: 中立`
- sect duties no longer appear in main city
- sect duties appear at a dedicated sect outpost
- neutral duties appear at a dedicated neutral outpost

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test packages/domain/src/engine.test.ts apps/world-do/src/routes.test.ts`

Expected: FAIL because the runtime still uses old sect typing and main-city sect duty entry.

### Task 2: Add the new world model and seeded outposts

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/constants.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/topology.ts`

**Step 1: Write the failing test**

Use the tests from Task 1 as the failure driver.

**Step 2: Run test to verify it fails**

Run the same focused test command.

**Step 3: Write minimal implementation**

Implement:

- organization alignment types
- sect outpost location metadata
- seeded official and neutral outpost locations
- topology support for extra seeded locations and edges

**Step 4: Run test to verify it passes**

Run the focused test command again.

Expected: seeded outposts and alignment fields now exist, but action routing may still fail.

### Task 3: Move sect and neutral duty entry to outposts

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/quest.ts`

**Step 1: Write the failing test**

Extend focused tests to require:

- no sect errand action in main city
- sect errand only at matching player sect outpost
- no neutral duty in main city
- neutral duty only at matching neutral outpost

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test packages/domain/src/engine.test.ts`

Expected: FAIL because current action gating still uses `main-city`.

**Step 3: Write minimal implementation**

Implement:

- action visibility and validation based on outpost nodes
- task board slot placement for outpost nodes
- template source node updates for organization duties

**Step 4: Run test to verify it passes**

Run the focused domain tests again.

### Task 4: Update route payloads and docs

**Files:**
- Modify: `apps/world-do/src/routes.test.ts`
- Modify: `docs/P1_plan/05-task-and-sect-tables.md`
- Modify: `docs/P2_plan/00-deletion-cleanup.md`

**Step 1: Write the failing test**

Use route tests to require the new `alignment` field in public organization payloads where relevant.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/world-do/src/routes.test.ts`

**Step 3: Write minimal implementation**

Update route expectations and sync the docs to the new sect alignment and outpost-entry direction.

**Step 4: Run test to verify it passes**

Run the route test again.

### Task 5: Full verification

**Files:**
- No new files

**Step 1: Run targeted verification**

Run:

```powershell
node --import tsx --test packages/domain/src/engine.test.ts packages/application/src/agent-insights.test.ts apps/world-do/src/routes.test.ts
```

**Step 2: Run full verification**

Run:

```powershell
$tests = @()
$tests += Get-ChildItem packages/domain/src/*.test.ts | ForEach-Object { $_.FullName }
$tests += Get-ChildItem packages/application/src/*.test.ts | ForEach-Object { $_.FullName }
$tests += Get-ChildItem packages/persistence/src/*.test.ts | ForEach-Object { $_.FullName }
$tests += Get-ChildItem apps/world-do/src/*.test.ts | ForEach-Object { $_.FullName }
node --import tsx --test $tests
```

Expected: PASS
