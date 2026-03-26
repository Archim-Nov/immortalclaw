# Event Module Layer Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the domain event module into a content-focused catalog layer and a runtime-focused engine layer without changing event behavior or public imports.

**Architecture:** Keep `packages/domain/src/events.ts` as the stable public entrypoint for event types and exports. Move event template construction into `packages/domain/src/events/catalog.ts`, and move weighting, draws, and effect application into `packages/domain/src/events/engine.ts`.

**Tech Stack:** TypeScript, Node test runner, tsx

---

### Task 1: Preserve the public event surface

**Files:**
- Modify: `packages/domain/src/events.ts`
- Check: `packages/domain/src/engine.ts`
- Check: `packages/domain/src/seed.ts`

**Step 1: Keep the existing event type definitions in `events.ts`**

Make `events.ts` the stable contract file for:
- `EventSourceType`
- `EventSemanticType`
- `EventResultType`
- `EventPoolLayer`
- `EventEffect`
- `EventTemplate`
- `EventPools`
- `DrawnEvent`

**Step 2: Re-export the same runtime helpers from `events.ts`**

Re-export:
- `createEventPools`
- `drawEvent`
- `applyEventEffects`
- `eventSeverityOf`

**Step 3: Verify import callers do not need to change**

These files should still import from `./events.js`:
- `packages/domain/src/seed.ts`
- `packages/domain/src/engine.ts`
- `packages/domain/src/events.test.ts`

### Task 2: Split content from runtime logic

**Files:**
- Create: `packages/domain/src/events/catalog.ts`
- Create: `packages/domain/src/events/engine.ts`
- Modify: `packages/domain/src/events.ts`

**Step 1: Move event content builders into `catalog.ts`**

Move the data-heavy pieces here:
- global exploration pool builders
- per-state event builders
- node-specific event builders
- travel pool builders
- `createEventPools`

**Step 2: Move runtime event logic into `engine.ts`**

Move the rule-heavy pieces here:
- overlay weight adjustments
- weighted pick helper
- candidate merging
- `drawEvent`
- status effect application
- `applyEventEffects`
- `eventSeverityOf`

**Step 3: Keep behavior byte-for-byte compatible where practical**

Do not change:
- event counts
- weight multipliers
- 30% sub-event logic
- status application behavior
- severity mapping

### Task 3: Re-run targeted verification

**Files:**
- Test: `packages/domain/src/events.test.ts`
- Test: `packages/domain/src/boundary.test.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Run focused event tests**

Run:

```bash
node --import tsx --test packages/domain/src/events.test.ts
```

Expected: all event pool shape and integration tests pass.

**Step 2: Run barrel boundary tests**

Run:

```bash
node --import tsx --test packages/domain/src/boundary.test.ts
```

Expected: public domain barrel surface remains unchanged.

**Step 3: Run engine regression tests**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts
```

Expected: runtime world progression still passes after the refactor.
