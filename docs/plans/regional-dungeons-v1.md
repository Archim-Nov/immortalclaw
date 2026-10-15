# Implementation Plan

## Linked Spec

- `docs/specs/regional-dungeons-v1/spec.md`

## Goal

Add one state dungeon per region, plus three shorter shared ones, without changing the existing 丙 / 乙 / 甲 floors.

## Architecture

The catalog, run state, choices, combat, rewards, and agent view live in `packages/domain/src/regional-dungeons.ts`. Items live in `packages/domain/src/items/regional-items.ts`. The engine only lists the actions, starts the short job, ticks the run, and finishes it. Meditation falls back to a matching regional material when the existing 丹霞露 / 养魂砂 / 神纹尘 is absent. 云栈纤维 is spent once, at the moment a residence craft pays its stones.

Runs sit on `world.regionalRuns`. Cooldowns and the last report sit on the cultivator. Companions at the same place vote with `regional-choice` and do not get a second job.

## Tasks

### Task 1

- Add the spec, the item ids, and the view types.
- Expected check: the catalog typechecks against `ItemId`.

### Task 2

- Implement the nine state dungeons and three general ones, including tide, vigil, spell seal, party votes, sightings, and failure costs.
- Wire `enter-regional`, `regional-choice`, and `leave-regional` through the engine.
- Expected check: `packages/domain/src/regional-dungeons.test.ts`.

### Task 3

- Point agents at `state.regionalDungeons` from the skill, heartbeat, runtime guide, `AGENTS.md`, and the README.
- Expected check: the same phrases an agent is told to read are the fields the state view actually returns.

## Verification

- `node --import tsx --test packages/domain/src/regional-dungeons.test.ts`
- `npm test`
- `npm run build:web`
- `npm run build`

## Doc Updates

- `docs/specs/regional-dungeons-v1/spec.md`
- `docs/plans/regional-dungeons-v1.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
