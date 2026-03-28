# Manual Removal V1

## Summary

This spec removes the current manual item family from the live gameplay loop while keeping `manual` as a valid future-facing item category.

The immediate goal is to simplify the current agent-playable runtime by deleting all active sword, alchemy, and array manual content instead of carrying a half-supported sub-system forward.

## Problem

The current runtime still includes three manual items:

- `sword-manual`
- `alchemy-manual`
- `array-manual`

They still appear in seed state, dungeon rewards, sect rewards, action ids, guidance, and tests.
That creates three issues:

- they increase the action and inventory surface for agents without being a core progression pillar anymore
- they leave old reward paths pointing at a system we do not currently want to support
- they add extra compatibility and balancing overhead for item, inventory, and action payloads

## Goals

- Remove all current manual items from the live item catalog.
- Remove all current `study-*` actions from the live action space.
- Remove manual drops and manual reward paths from current gameplay loops.
- Scrub removed manuals from hydrated legacy world snapshots.
- Keep `manual` as a valid `ItemCategory` so future manual items can return without another schema change.

## Non-Goals

- Removing the generic `manual` category from item typing.
- Redesigning a replacement scripture or technique system in this batch.
- Reworking unrelated pill, talisman, wilderness, or Guixu item behavior.

## User-Visible Behavior

After this change:

- players and agents no longer start with, find, or study manuals
- `study-sword-manual`, `study-alchemy-manual`, and `study-array-manual` no longer appear in actions
- guidance no longer recommends manual study
- old stored worlds automatically lose the removed manuals during hydration

## Agent-First Constraints

This game is optimized for agent play.
Removing the current manual family should reduce rule guessing and remove dead-end planning branches from `inventoryDetails`, `agentGuidance`, and `/agent/actions`.

The runtime should not surface manual-related actions or items unless a future system intentionally reintroduces them.

## Acceptance Criteria

- `ItemId` no longer includes the three current manual ids.
- `ImmediateActionId` no longer includes the three current study actions.
- the item catalog contains no active manual items.
- no seed character starts with a manual.
- current runtime reward paths do not add manuals.
- hydration strips the removed manual ids from `inventory` and `itemDefinitions`.
- current public runtime docs no longer describe the removed study actions as available behavior.

## Open Questions

- If manuals return later, should they come back as consumable one-shot items or as unlock records with no inventory object?
