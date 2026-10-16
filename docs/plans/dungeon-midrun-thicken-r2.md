# Implementation Plan

## Linked Spec

- `docs/specs/dungeon-midrun-thicken-r2/spec.md`

## Goal

Add another layer of Chinese choices, named packs, and side rooms inside the runs that already exist.

## Architecture

New scenes, later packs, second room lines, and the twelve deeper rooms live beside the first interior pass. Ranked wakes still draw in `dungeon-expedition-service.ts`. The new scenes join the fresh pool after the five already there, so a run that has only the fork, relic, and loot left still lands on the fellow cultivator. Search resolutions that start at step index 2 and 5 use the later pack. Index 1 and 4 keep the original names. The guardian pack builder is unchanged.

State dungeons keep one signature choice and the first side room on `active.interior`. `active.deeper` is a second room. Its votes sit on `deeperVotes`. Resolving the signature choice writes each unanswered room: the captain's line when that vote is already in, otherwise the safe line.

八荒 adds two wake scenes to the existing four. The three-wake cap stays.

## Tasks

### Task 1

- Add the later packs, the five wake scenes, the second room lines, and the place prefix.
- Tests cover the original pack names, the later names, and the new scenes.

### Task 2

- Add `active.deeper` and the separate tally.
- The dew, captain side-room, and leave tests stay green.

### Task 3

- Add the two 八荒 scenes and the extra road lines.
- Update the agent-facing notes.

## Verification

- `node --import tsx --test packages/domain/src/dungeon-interior.test.ts packages/domain/src/dungeon-midrun-sights.test.ts packages/domain/src/regional-dungeons.test.ts packages/domain/src/agent-surface-zh.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
