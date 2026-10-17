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

## Follow-up: deadline must not skip an open step

The closing timeout used to call the safe signature option whenever `phase` was still `choice`. After the two passage steps landed, that fired about two ticks in, before the foe or the favor.

The close now runs only when `currentPassage` is empty. While a step is open, the deadline does not answer it and does not grant the signature item, and the job stays alive so the next tick cannot finish the run in its place. Finishing a step arms one new window of the existing `choiceTicks` and gives the job at least that many ticks. The catalog numbers stay at two and three. Lengthening those numbers as well would be a second clock: a longer static deadline would still skip the step if the close were allowed to run, and the run would end on a different tick from the choice window.

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
