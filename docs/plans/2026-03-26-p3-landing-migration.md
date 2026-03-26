# P3 Landing Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the gameplay systems from `codex/p3-landing` into the current `master` branch without undoing the current architecture changes.

**Architecture:** Treat `codex/p3-landing` as a source of gameplay modules, not as a branch to merge wholesale. Rebuild each P3 slice on top of the current `master` boundaries, escalating only the directional conflicts that require a user choice.

**Tech Stack:** TypeScript, Node test runner, tsx, git worktrees

## Progress Update

- Batch 1 completed on current `master`: Eight Wastes + Guixu domain, seed data, engine wiring, and focused domain tests.
- Batch 2 completed on current `master`: sect level and faction war modules, seed data, engine integration, and regression coverage.
- Batch 3 completed on current `master`: outer-layer exposure verified through current contracts/application/world-do route tests.
- Batch 4 completed on the chosen new persistence direction: legacy snapshots now hydrate missing P3-era wilderness, Guixu, sect, faction war, and item data into the current sqlite/in-memory repositories without restoring the old Supabase repository pattern.

---

### Task 1: Record the staged migration baseline

**Files:**
- Create: `docs/plans/2026-03-26-p3-landing-migration-design.md`
- Create: `docs/plans/2026-03-26-p3-landing-migration.md`

**Step 1: Save the migration design**

Write down:

- why direct merge is too risky
- which files showed core conflicts
- the staged batch order
- the explicit conflict escalation rule

**Step 2: Save the implementation plan**

Document the migration as batches:

- Batch 1: Eight Wastes + Guixu domain
- Batch 2: sect level + faction war
- Batch 3: application/contracts/routes
- Batch 4: persistence decision

**Step 3: Keep the docs in the same workstream**

Do not treat these docs as optional cleanup. They are part of the repo source of truth for this migration.

### Task 2: Batch 1 RED - add failing wilderness and Guixu tests on current master

**Files:**
- Create: `packages/domain/src/wilderness.test.ts`
- Create: `packages/domain/src/guixu.test.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Add a wilderness entry/progression test**

Port the intent of the old P3 tests, but target the current `master` public domain surface:

- qualified cultivator can enter Eight Wastes with a ticket
- wilderness state becomes visible
- survival pressure can force retreat
- wilderness survey resolves dedicated events

**Step 2: Add a Guixu unlock/exploration test**

Add tests for:

- wilderness attunement unlocks a Guixu node
- shared Guixu nodes become available to other cultivators
- Guixu exploration awards exclusive endgame rewards

**Step 3: Run the new tests and confirm RED**

Run:

```bash
node --import tsx --test packages/domain/src/wilderness.test.ts packages/domain/src/guixu.test.ts
```

Expected:

- tests fail because the current `master` branch does not expose the wilderness and Guixu systems yet

### Task 3: Batch 1 GREEN - migrate wilderness and Guixu model + seed + services

**Files:**
- Create: `packages/domain/src/wilderness-events.ts`
- Create: `packages/domain/src/wilderness-service.ts`
- Create: `packages/domain/src/guixu-events.ts`
- Create: `packages/domain/src/guixu-service.ts`
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Add only the model types required by the tests**

Add the minimum new world structures for:

- wilderness layers
- wilderness progress
- Guixu nodes
- Guixu progress

Do not pull in later sect or faction structures in this batch unless the code truly requires them.

**Step 2: Add seed data for the Eight Wastes and Guixu**

Seed:

- entry ticket item
- wilderness layer definitions
- Guixu node definitions
- any exclusive item rewards required by the tests

**Step 3: Add the domain services**

Create small focused modules for:

- wilderness entry, retreat, pressure, and survey resolution
- Guixu attunement, unlock checks, and exploration resolution

### Task 4: Batch 1 wiring - connect wilderness and Guixu to the current engine

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/domain/src/constants.ts`
- Modify: `packages/domain/src/events.ts`

**Step 1: Add action parsing and available actions**

Wire:

- `enter-wilderness:<layerId>`
- `withdraw-from-wilderness`
- `survey-wilderness`
- `unlock-guixu:<nodeId>`
- `explore-guixu:<nodeId>`

**Step 2: Extend cultivator state views**

Expose only the state needed by the tests and by later outer-layer adaptation:

- active wilderness expedition summary
- Guixu unlock and attunement summary

**Step 3: Preserve current master architecture choices**

Important:

- keep the split event module boundaries from current `master`
- do not silently replace the current event architecture with the old P3 monolith

If event integration requires a behavioral choice between the old P3 direction and the current split-module direction, stop and ask the user.

### Task 5: Batch 1 verification

**Files:**
- Test: `packages/domain/src/wilderness.test.ts`
- Test: `packages/domain/src/guixu.test.ts`
- Test: `packages/domain/src/engine.test.ts`
- Test: `packages/domain/src/events.test.ts`

**Step 1: Re-run the focused new tests**

Run:

```bash
node --import tsx --test packages/domain/src/wilderness.test.ts packages/domain/src/guixu.test.ts
```

Expected: the new P3 slice passes on current `master`.

**Step 2: Re-run critical regression coverage**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts packages/domain/src/events.test.ts
```

Expected: current core runtime behavior still passes.

### Task 6: Batch 2 migrate sect level and faction war

**Files:**
- Create: `packages/domain/src/sect-level.ts`
- Create: `packages/domain/src/sect-level.test.ts`
- Create: `packages/domain/src/faction-war.ts`
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/engine.ts`

**Step 1: Add tests first**

Cover:

- sect level scales from total contribution
- sect bonuses affect sect members
- sect actions advance faction war progress

**Step 2: Add the minimal model and seed support**

Only introduce the structures needed to satisfy the tests.

**Step 3: Wire contribution effects into the current engine**

Integrate with the existing sect task flow instead of rewriting it from the old branch wholesale.

### Task 7: Batch 3 adapt outer layers

**Files:**
- Modify: `packages/contracts/src/runtime-api.ts`
- Modify: `packages/application/src/*`
- Modify: current runtime route files under `apps/runtime-worker` or legacy compatibility routes if still required

**Step 1: Add tests for exposed state**

Before wiring UI-facing state, write failing tests for the exact new fields and actions that must surface outward.

**Step 2: Adapt to current runtime shape**

Use the current official runtime path as the truth. Do not revive removed outer-layer patterns unless the user approves that direction.

### Task 8: Batch 4 decide persistence direction

**Files:**
- Inspect: `packages/persistence/src/*`
- Compare: `codex/p3-landing` persistence files

**Step 1: Stop for decision if repository direction diverges**

If the current architecture and the old P3 persistence approach are materially different, ask the user to choose one of:

- adapt P3 behavior into the current persistence architecture
- restore the old persistence pattern

**Step 2: Implement only after explicit user choice**

This is a directional conflict, not a mechanical merge.
