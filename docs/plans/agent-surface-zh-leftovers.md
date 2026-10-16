# Implementation Plan

## Linked Spec

- `docs/specs/agent-surface-zh-leftovers/spec.md`

## Goal

Gift cards, recent combat status names, and the wilderness departure line read in Chinese, while `outcome` stays `victory` or `defeat`.

## Architecture

Gift cards already list up to two items under `send-message:<id>:gift-item`. The label and description switch to the catalog name. The action id does not gain an item id, and sending still gives the first item in the bag.

`getCultivatorState` copies `recentCombats` through the same status-name table used for `statusEffects`. The stored log is left as written. `outcomeLabel` is added on that copy only.

Wilderness departure uses `wildPlaceForState` for the job label, the same place name the travel card and the enter summary already use.

## Tasks

### Task 1

- Chinese names on gift-item cards.
- Test the four soak item ids.

### Task 2

- Public combat log: Chinese status names and `outcomeLabel`.
- Test that the stored log still says Clear Mind and has no `outcomeLabel`.

### Task 3

- Wilderness `travel-to` start label uses the place name.
- Test 扬州 → 听潮浦.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/wild-places.test.ts packages/domain/src/dungeon-expedition.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/agent-surface-zh-leftovers/spec.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
