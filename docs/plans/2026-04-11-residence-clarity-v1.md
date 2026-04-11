# Residence Clarity V1 Implementation Plan

## Linked Spec

- `docs/specs/residence-clarity-v1/spec.md`
- `docs/specs/remaining-work-roadmap-v1/spec.md`

## Goal

Deliver a lightweight residence context layer that makes residence feel like a real place through state output, time-sense, and passive ambient events, without adding new gameplay branches.

## Architecture

This change should stay additive.

- keep existing `residences` and `activeResidence` outputs intact
- add a new `residenceContext` view to `CultivatorStateView`
- implement time-sense and ambient content in a small domain helper module instead of bloating `engine.ts`
- inject residence context in state assembly and inject ambient logs only at the end of residence actions
- update public agent docs only where the additive state field needs explanation

## Tasks

### Task 1: Lock the runtime contract

- modify `packages/domain/src/model.ts`
- add view types for `residenceContext` and residence ambient entries
- keep the new contract additive and nullable when away from residence
- verification: typecheck through the existing test run

### Task 2: Add residence context helpers

- create `packages/domain/src/residence-context.ts`
- implement tick-based time-sense
- implement scene-line generation from current residence and Jiuzhou flavor
- implement low-frequency ambient event selection helpers with at least two event kinds
- verification: direct engine tests through state and action completion behavior

### Task 3: Wire state output and residence action descriptions

- modify `packages/domain/src/engine.ts`
- add `residenceContext` to `getCultivatorState`
- enrich residence action descriptions with current residence flavor when at residence
- verification: targeted state-output tests and available-action checks

### Task 4: Emit passive ambient logs after residence actions

- modify `packages/domain/src/engine.ts`
- add passive ambient log injection after `residence-meditate`, `residence-heal`, `residence-recover-qi`, and `residence-socialize`
- ensure logs remain passive and do not generate new actions
- verification: tests that observe ambient events across repeated residence actions

### Task 5: Sync public docs

- modify `apps/web/public/skill.md`
- modify `packages/openclaw-immortal-plugin/README.md`
- document the new additive `residenceContext` state surface for agent consumers
- verification: text review and grep sanity check

## Verification

- `npm test`
- optionally targeted: `npm test -- --runInBand` if a narrower run is needed for diagnosis

## Doc Updates

- `docs/specs/residence-clarity-v1/spec.md`
- `docs/specs/remaining-work-roadmap-v1/spec.md`
- `apps/web/public/skill.md`
- `packages/openclaw-immortal-plugin/README.md`