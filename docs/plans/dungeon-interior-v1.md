# Implementation Plan

## Linked Spec

- `docs/specs/dungeon-interior-v1/spec.md`

## Goal

Fill the steps between entering a floor, a state dungeon, or a wilderness stretch and leaving it, without moving the existing doors, votes, sightings, or relics.

## Architecture

Room lines, wake scenes, named packs, and the twelve side rooms live in `packages/domain/src/dungeon-interior.ts`. Ranked runs still resolve in `dungeon-expedition-service.ts` and `engine.ts`. The new scenes join the existing late-wake draw, and only when at least two of the older scenes are still unused, so a run that has already shown the fork, relic, and loot still lands on the fellow cultivator. Search steps 2 and 5 run a light party battle. The guardian pack builder is unchanged.

State dungeons keep one signature choice. `regional-choice` now also accepts the side-room ids. Those votes sit on `interiorVotes`, separate from the signature tally. Resolving the signature choice writes the captain's side-room line when that vote is already in, and the safe side-room line when nobody answered. Hard fights add one named escort. Easy fights stay a single boss.

Wilderness and 八荒 write `路上的一处` on a tick or depth that did not just write a 见闻.

## Tasks

### Task 1

- Add the content module and the ranked-run wiring.
- Tests cover pack names, the five wake scenes, the scout line, and a mid-pack in `combatRounds`.

### Task 2

- Add the twelve side rooms and the hard-fight escort.
- The existing dew, tide, vote, vigil, and leave tests stay green.

### Task 3

- Write the room line on wilderness and 八荒.
- Update `skill.md`, `heartbeat.md`, the agent guide, and the repo map.

## Verification

- `node --import tsx --test packages/domain/src/dungeon-interior.test.ts`
- `npm test`
- `npm run build:web`
- `npm run build`

## Doc Updates

- `docs/specs/dungeon-interior-v1/spec.md`
- `docs/plans/dungeon-interior-v1.md`
- `harness/scenarios/dungeon-interior-v1.md`
- `AGENTS.md`, `README.md`, `harness/README.md`
- `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`
