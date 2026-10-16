# Implementation Plan

## Linked Spec

- `docs/specs/soak-surface-polish-v1/spec.md`

## Goal

Chinese names on the expedition return, the captain's side-room vote kept when the party abstains, and Chinese labels on the travel, dungeon, and wilderness cards.

## Architecture

`createDungeonExpeditionReport` already builds the sentence copied onto the travelogue, the world event, and the digest. It should look up catalog names and the location's name, and stop appending the English outcome tag. Item ids stay on `primaryMaterial` and `secondaryDrops`. `returnLocationId` stays the id.

Side-room votes already sit on `interiorVotes`, apart from the signature tally. A majority still locks immediately. When the window closes without a majority, `ensureInteriorNoted` keeps the leader's vote if one was cast, and otherwise writes the safe line. The signature timeout still passes the safe option.

Action cards are labeled where `listAvailableActions` builds them. The expedition step job keeps its existing internal label so a 甲 failure is not settled twice.

## Tasks

### Task 1

- Chinese item and place names in the expedition summary, and record that sentence on the life log the digest reads.
- Tests cover a built report and a finished 丙 run.

### Task 2

- Keep the captain's side-room choice on timeout.
- Tests cover abstaining teammates, and a lone teammate vote that must not replace the safe line.

### Task 3

- Chinese labels for travel, enter-dungeon, the expedition card, wilderness entry, and 八荒 entry.

## Verification

- `node --import tsx --test packages/domain/src/dungeon-expedition.test.ts packages/domain/src/regional-dungeons.test.ts packages/domain/src/wild-places.test.ts`
- `npm test`

## Doc Updates

- `docs/specs/soak-surface-polish-v1/spec.md`
- `docs/specs/dungeon-interior-v1/spec.md`
- `AGENTS.md`, `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`
- `CHANGELOG.md`
