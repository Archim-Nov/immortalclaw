# P1 Continuation Plan after Phase 2 Event System (2026-03-16)

## What is complete in this handoff

Phase 2 (Event System) is now wired in `packages/domain`:

- `packages/domain/src/events.ts`
  - event template and pool structures
  - seeded pool builders (global/state/node/travel)
  - weighted draw with overlay adjustments
  - event effect application
- minimal integration updates:
  - `packages/domain/src/model.ts` (`WorldState.eventPools` + event pool types)
  - `packages/domain/src/seed.ts` (seed now creates `eventPools`)
  - `packages/domain/src/engine.ts` (travel tick event injection + arrival exploration event trigger)
  - `packages/domain/src/index.ts` (exports from `events.ts`)
- focused tests:
  - `packages/domain/src/events.test.ts`

Design reference used: `docs/P1_plan/designs/03-jiuzhou-events-design.md`.

---

## Remaining phases and execution order

Use this order to reduce churn and keep compatibility with current runtime routes.

1. **Residence (居)**
2. **Quests/Sects (遇 + 势)**
3. **Economy/Derived Views**
4. **Golden Path wiring**
5. **Integration and boundary verification**

---

## Phase 3: Residence (居)

### Goal

Implement P1 residence actions:

- 闭关 (retreat)
- 疗伤 (already present, align to residence semantics)
- 调息回灵 (recover qi/spiritual power as explicit residence action)
- 基础生产 (light supply crafting)
- 好友交流 (social action with low-risk state impact)

### Primary files to touch

- `packages/domain/src/model.ts`
  - add/extend action IDs and any residence-specific payload/state fields
- `packages/domain/src/constants.ts`
  - residence action durations and defaults
- `packages/domain/src/engine.ts`
  - action availability gates in safe locations
  - resolve logic for residence actions
  - low-risk event interplay where appropriate
- `packages/domain/src/engine.test.ts`
  - residence action behavior tests

### Optional (if needed)

- `packages/domain/src/events.ts`
  - only if residence-specific event tags are needed by design

---

## Phase 4: Quests/Sects (遇 + 势)

### Goal

Implement P1 quest categories and sect progression scaffolding:

- 5 daily quest categories
- single-player high-risk entrance hooks
- sect contribution accumulation
- sect title thresholds/rules
- cleanup note: runtime `reputation` is now state-local; quest/task rewards and trade modifiers read the current state's reputation only
- cleanup note: legacy `karma` is removed from runtime state, persistence normalization, and public API examples

### Primary files to touch

- `packages/domain/src/model.ts`
  - quest/sect contribution/title state
- `packages/domain/src/seed.ts`
  - quest and sect table seeds
- `packages/domain/src/engine.ts`
  - quest acceptance/completion outcomes
  - sect contribution bookkeeping
  - title updates
- `packages/domain/src/engine.test.ts`
  - quest completion + contribution/title assertions

### Cross-package follow-up (after domain stable)

- `packages/contracts/src/runtime-api.ts`
  - optional request/response surfaces for quest/sect views
- `apps/runtime-worker/src/routes.ts`
  - only if new endpoints are needed (do not address unrelated baseline type issue unless directly required)

---

## Phase 5: Economy and Derived Views

### Goal

Implement P1 economy guardrails and derived operational views:

- readiness
- recoveryState
- activityContext
- 道势 (dao momentum)

### Primary files to touch

- `packages/domain/src/model.ts`
  - derived view interfaces
- `packages/domain/src/engine.ts`
  - calculators for derived view states
  - economy fail-safe logic
- `packages/domain/src/engine.test.ts`
  - deterministic assertions for derived view transitions

### Optional

- `packages/domain/src/attributes.ts`
  - if shared formulas should be moved for reuse

---

## Phase 6: Golden Path

### Goal

Encode the recommended first-run gameplay loop from P1 docs as action guidance and checks.

### Primary files to touch

- `packages/domain/src/engine.ts`
  - guidance/recommendation branch updates (`getStrategySnapshot` + state guidance)
- `packages/domain/src/engine.test.ts`
  - scenario test for standard progression path
- docs alignment:
  - `docs/P1_plan/02-golden-path.md` (if implementation reveals needed clarification)

---

## Phase 7: Integration / stabilization

### Goal

Ensure end-to-end compatibility with current 72-location topology and existing persistence/runtime boundaries.

### Primary files to touch

- `packages/domain/src/index.ts`
  - final export consistency
- `packages/application/*` (only if domain API changes require adapters)
- `packages/contracts/*` (only for surfaced API shape changes)
- `packages/persistence/*` (only for schema/type alignment required by new domain fields)

### Known baseline issues to preserve unless directly required

- `packages/persistence/src/supabase-world-repository.test.ts` serialization failures
- `apps/runtime-worker/src/routes.ts` TS7053 typing issue

---

## Verification commands for next agent

Run in repo root:

```bash
# Focused domain tests while iterating
node --import tsx --test "packages/domain/src/events.test.ts" "packages/domain/src/engine.test.ts"

# Expand to full domain package tests when phase is complete
node --import tsx --test "packages/domain/src/*.test.ts"

# Workspace typecheck (expect current known runtime-worker error unless resolved intentionally)
npx tsc --noEmit
```

And for each changed domain file, run LSP diagnostics if language server is available in environment.

---

## Notes for continuity

- Event pools are seeded and integrated, and current `WorldEvent` records `locationId`; any old `zoneId` data is normalized only at the persistence boundary.
- Travel now injects probabilistic travel events per tick and an exploration event on arrival.
- Event layering currently includes global/state/node + overlay weighting; special-overlay is represented as runtime weighting logic rather than a separate persisted template layer.
