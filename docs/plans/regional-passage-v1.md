# Implementation Plan

## Linked Spec

- `docs/specs/regional-passage-v1/spec.md`

## Goal

Give each of the nine state dungeons a scout step and then a named foe or a favor, on the regional run that already exists.

## Architecture

The sentences live in `packages/domain/src/dungeon-interior.ts` as `regionalPassage`. The run keeps `passageIndex` and `passageVotes` on the existing regional run. `regional-choice` answers the open step, the side room, the farther room, or the signature choice. Answering a passage step does not finish the job. The three shorter caves have no passage.

## Tasks

### Task 1

- Add the nine passage catalogs and the thin foe used by a passage fight.
- Expected check: the catalog lists two steps for each state dungeon and none for the shorter caves.

### Task 2

- Vote, resolve, and show `active.passage`. A fight writes the foe's name on the combat log. A yield writes an owed favor. A selfish take adds grudge 3 when someone else is there.
- Expected check: `packages/domain/src/regional-dungeons.test.ts`.

### Task 3

- Point the skill, heartbeat, runtime guide, `AGENTS.md`, and the README at `active.passage`.
- Expected check: the same names an agent is told to read are the names the passage returns.

## Verification

- `node --import tsx --test packages/domain/src/regional-dungeons.test.ts packages/domain/src/dungeon-interior.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/regional-passage-v1/spec.md`
- `docs/plans/regional-passage-v1.md`
- `docs/specs/regional-dungeons-v1/spec.md`
- `docs/specs/dungeon-interior-v1/spec.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/scenarios/regional-dungeons-v1.md`
- `harness/README.md`
