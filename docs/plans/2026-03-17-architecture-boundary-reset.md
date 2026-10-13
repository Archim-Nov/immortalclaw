# Architecture Boundary Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-establish one official runtime architecture and progressively move transport, orchestration, persistence, and world rules back into their intended layers.

> Status: production transport is now `apps/server` behind Apache on `https://claw.archim.top`. The Worker path in the architecture line below is historical for this plan.

**Architecture:** Treat `apps/web -> apps/runtime-worker -> packages/application -> packages/persistence -> packages/domain` as the only official production path. Extract workflow-heavy runtime code out of `routes.ts` into explicit application use cases, reduce repositories to storage/transaction responsibilities, and narrow domain back toward pure world logic. Keep legacy harnesses visible but clearly fenced.

**Tech Stack:** TypeScript monorepo, Hono worker runtime, shared domain/application/persistence packages, Node test runner with `tsx`

---

### Task 1: Lock The Boundary Rules In Docs

**Files:**
- Create: `docs/plans/2026-03-17-architecture-boundary-reset-design.md`
- Create: `docs/specs/architecture-boundary-reset/spec.md`
- Create: `docs/plans/2026-03-17-architecture-boundary-reset.md`

**Step 1: Save the architecture design**

Document:
- one official runtime path
- legacy harness classification
- target layer responsibilities
- phased migration strategy

**Step 2: Save the architecture spec**

Capture:
- goals
- non-goals
- requirements by layer
- acceptance criteria

**Step 3: Save the implementation plan**

Write the phased execution plan below before any production refactor starts.

### Task 2: Fence Legacy Harnesses

**Files:**
- Modify: `README.md`
- Modify: `apps/world-api/src/server.ts`
- Modify: `apps/world-worker/src/worker.ts`
- Test: `apps/world-api/src/server.ts` smoke/manual verification only

**Step 1: Write a failing documentation test or assertion if practical**

Prefer lightweight coverage where practical for:
- README official path wording
- legacy harness notice wording

If automated coverage is not practical here, document the manual verification target in the implementation PR.

**Step 2: Update docs and notices**

Make it unambiguous that:
- these apps are legacy harnesses
- they are not part of the product architecture target

**Step 3: Verify**

Run: `npm test`
Expected: existing tests stay green

### Task 3: Introduce Application Use Cases For Registration And Onboarding

**Files:**
- Create: `packages/application/src/agent-registration.ts`
- Create: `packages/application/src/agent-onboarding.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `packages/application/src/*.test.ts`
- Modify: `apps/runtime-worker/src/routes.ts`

**Step 1: Write failing application tests**

Cover workflow-level behaviors such as:
- questionnaire registration
- registration response assembly
- authenticated agent bootstrap/state read

**Step 2: Implement the new application use cases**

Application should coordinate:
- repository calls
- registration derivation helpers
- state/profile assembly

**Step 3: Rewire runtime routes**

`routes.ts` should call the new application use cases instead of assembling the whole flow inline.

**Step 4: Verify**

Run:
- `node --import tsx --test packages/application/src/*.test.ts`
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`

Expected: new application tests and runtime integration tests pass.

### Task 4: Narrow Agent Workflow Responsibilities In Routes

**Files:**
- Modify: `apps/runtime-worker/src/routes.ts`
- Modify: `apps/runtime-worker/src/index.test.ts`

**Step 1: Write failing route-shape tests where practical**

Cover that runtime routes still return the same contract after the refactor.

**Step 2: Move more authenticated agent workflows behind application**

Targets:
- authenticated state
- authenticated actions
- authenticated messages
- credential reset response assembly

**Step 3: Verify**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: route contracts stay green while route internals shrink.

### Task 5: Shrink Repository Business Logic

**Files:**
- Modify: `packages/persistence/src/world-repository.ts`
- Modify: `packages/persistence/src/in-memory-world-repository.ts`
- Modify: `packages/persistence/src/supabase-world-repository.ts`
- Modify: `packages/persistence/src/*.test.ts`

**Step 1: Write failing repository tests**

Add or adjust tests so repositories are verified as storage/transaction adapters rather than workflow owners.

**Step 2: Extract business decisions upward**

Refactor repositories so they expose narrower primitives and persistence transactions while application decides the workflow.

**Step 3: Verify**

Run:
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/supabase-world-repository.test.ts`

Expected: persistence stays green with reduced business logic.

### Task 6: Reduce Domain Surface To World Rules

**Files:**
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/*.test.ts`
- Modify any application/runtime imports affected by domain surface cleanup

**Step 1: Write failing boundary tests where practical**

Protect expected world-rule behavior before moving helper surfaces away from domain exports.

**Step 2: Remove product-history leakage from domain surface**

Keep domain focused on:
- simulation
- world state transitions
- calculations

Move product orchestration helpers outward when they do not belong to world rules.

**Step 3: Verify**

Run:
- `node --import tsx --test packages/domain/src/*.test.ts`

Expected: world-rule behavior remains intact.

### Task 7: Full-System Verification After Each Phase

**Files:**
- No new files

**Step 1: Run full verification at the end of every merged phase**

Run:
- `npm test`
- `npm run smoke:onboarding`
- `npm run smoke:questionnaire-to-register`

**Step 2: Review against the spec**

Confirm:
- one official path remains documented
- routes are thinner
- application owns workflows
- persistence owns storage
- domain owns world rules

