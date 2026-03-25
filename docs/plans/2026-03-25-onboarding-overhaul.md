# 2026-03-25 Onboarding Overhaul

## Scope

Implement the onboarding and starter-flow overhaul from `docs/specs/neutral-sects-starter-overhaul/spec.md` with the approved convergence:

- onboarding completes at first breakthrough (`realmLevel >= 2`)
- new cultivators spawn in one of `qingzhou`, `yangzhou`, or `wanzhou` main cities
- nine state-level neutral sects exist in world data
- neutral sect gameplay for this phase is `join + safe duty loop + leave`
- legacy player-sect internals remain for compatibility but are no longer exposed as the new starter path

## Execution Order

1. Update domain model, runtime exports, contracts, and persistence normalization for `neutralSect*` fields and unified organization views.
2. Rework starter spawn, onboarding stage calculation, and runtime guidance in `packages/domain/src/engine.ts`.
3. Add neutral sect actions and rewards, and stop exposing `join-sect` / `take-sect-errand` in starter-facing action lists.
4. Remove starter-facing sect quest generation from main-city quest boards.
5. Update application readers and public docs to describe breakthrough-led onboarding and neutral sects.
6. Revise tests for new onboarding stages, starter spawn rules, neutral sect organization reads, and persistence backfills.

## Notes

- `CultivatorStateView.sect` remains player-sect-only.
- `CultivatorStateView.neutralSect` is the new neutral membership surface.
- `GET /agent/sect` returns a unified organization payload with `organizationType: "player" | "neutral"`.
- Legacy snapshots missing `neutralSects`, `neutralSectId`, or `neutralContribution` are normalized on read.
