# Playtest deepen v1 plan

## Linked Spec

- `docs/specs/playtest-deepen-v1/spec.md`

## Goal

Unstick dungeon entry, make refused actions readable, and give agents a dungeon trip, a travelogue, and a longer realm ladder in one batch.

## Architecture

Dungeon completion already lives in `resolveEnhancedJob`, but it only matched `start-dungeon-expedition`. `enter-dungeon` uses the same expedition record, so completion should accept both ids and synthesize a withdrawal report if the record is missing. `advanceWorld` catches a single job failure, clears that job, and keeps ticking.

Posture pressure, beats, and the report fields stay in `dungeon-expedition-service`. Travel notes and safe-action fatigue stay on the cultivator as optional fields. Realm stages 元婴 and 化神 extend `realmStageForLevel` above level 9; levels 1–9 do not move.

Action refusals from `performAction` are stamped HTTP 409 at the repository boundary so the agent sees the message instead of an empty 500.

## Tasks

### Dungeon unstick and tick safety

- `packages/domain/src/engine.ts`
- `packages/domain/src/dungeon-expedition-service.ts`
- Regression in `packages/domain/src/deepen-playtest.test.ts`

### Action honesty and anti-idle

- Hide unfulfillable commissions and quest accepts that are already at the cap.
- Refuse a second copy of the same residence recipe, and slow repeated town tasks.
- Short cooldown after a player-sect application.
- Stamp action errors as 409 in both world repositories.

### Diary and realms

- `state.travelogue` from `packages/domain/src/travelogue.ts`
- Realm ladder through level 15 in `realms.ts`, breakthrough definitions, and the growth table.
- Hydrate optional fields in `world-shape.ts`.

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/attributes.test.ts`
- A broader domain test pass if those stay green.

## Doc Updates

- `README.md` realm and dungeon sentences
- `harness/scenarios/dungeon-enter-unstick.md`
- this plan and the spec
