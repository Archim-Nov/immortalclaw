> **Status: Completed.** The `startingPath` field was fully removed on 2026-03-18.

# Starting Path Deprecation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Soft-deprecate `startingPath` so it no longer changes starter packages for newly created characters while keeping compatibility fields and existing gameplay intact.

**Architecture:** Keep `startingPath` as compatibility metadata on registration, persona sync, stored profiles, and state views, but remove its only behavior-changing role in character creation. All new cultivators should receive one unified starter package. Mark the field as deprecated in types, runtime docs, and plugin comments so future cleanup can remove it layer by layer without breaking current callers.

**Tech Stack:** TypeScript, shared domain/persistence packages, Hono runtime worker, Node test runner with `tsx`

---

### Task 1: Record The Deprecation Contract

**Files:**
- Create: `docs/specs/deprecate-starting-path/spec.md`
- Create: `docs/plans/2026-03-17-deprecate-starting-path.md`

**Step 1: Save the product decision**

Document that:
- `startingPath` remains accepted for compatibility
- new characters use one unified starter package
- existing saves are untouched
- future work should remove the field gradually

### Task 2: Write Failing Behavior Tests First

**Files:**
- Modify: `packages/domain/src/engine.test.ts`
- Modify: `apps/runtime-worker/src/index.test.ts`

**Step 1: Add a failing domain test**

Cover:
- two new cultivators created with different `startingPath` values get the same starter loadout
- `startingPath` metadata is still preserved on the created cultivators

**Step 2: Add a failing runtime test**

Cover:
- `POST /agent/register` still accepts `startingPath`
- new registrations with different `startingPath` values expose the same starter state after `/agent/state`

**Step 3: Run targeted tests to verify RED**

Run:
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`

Expected:
- the new tests fail because starter packages still differ by path

### Task 3: Remove The Behavior Branch, Keep The Metadata

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/model.ts`

**Step 1: Replace path-based starter selection**

Use one shared starter package for all new cultivators.

**Step 2: Keep compatibility metadata**

Continue storing `startingPath` on newly created cultivators so older consumers do not break immediately.

**Step 3: Mark the type surface as deprecated**

Add concise `@deprecated` comments explaining that the field is compatibility-only and ignored for starter-package selection.

### Task 4: Mark Runtime And Plugin Surfaces As Deprecated

**Files:**
- Modify: `apps/runtime-worker/src/agent-guides.ts`
- Modify: `README.md`
- Modify: `packages/openclaw-immortal-plugin/index.ts`
- Modify: `packages/persistence/src/world-repository.ts`

**Step 1: Update public registration docs**

Explain that:
- `startingPath` is deprecated
- callers may still send it
- it no longer changes the new-character starter package

**Step 2: Add compatibility comments**

Mark plugin/persistence input fields as deprecated compatibility-only plumbing so future work removes them instead of reusing them.

### Task 5: Verify No Gameplay Regression

**Files:**
- No new files

**Step 1: Run targeted checks**

Run:
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`

**Step 2: Run broader verification**

Run:
- `npm test`

Expected:
- new deprecation tests pass
- existing gameplay behavior remains green
