# Regional Dungeon Travel Pool Expansion V1

## Summary

This spec expands regional travel overlays and regional dungeon overlays so that each state's route flavor and dungeon flavor have enough content volume to feel replayable.

The design keeps shared pools where they are valuable:

- shared travel base remains shared
- shared dungeon tier packs remain shared

Regional identity is added by expanding state overlays on top of those bases.

## Problem

The current modular structure is correct, but the content volume is still light:

- each state's travel overlay only contains `3` events
- each dungeon location currently relies almost entirely on shared tier content
- most dungeon locations still top out at `3-4` node events

This makes route identity and dungeon repetition show up too quickly.

## Goals

- Expand each state's travel overlay to around `10` events.
- Expand each state's dungeon overlay so each dungeon location ends up with about `9-10` local node events after composition.
- Preserve shared travel and shared dungeon tier pools.
- Keep content authored in modular per-state files.

## Non-Goals

- Reworking the event draw algorithm.
- Replacing shared travel or shared dungeon tier pools.
- Changing action durations or economy systems.
- Expanding wilderness overlays in this batch.

## Design Direction

Travel:

- keep `travelPool` as the shared route base
- expand `travelStateSpecific[stateId]` from `3` to about `10`

Dungeon:

- keep shared node-family packs for `dungeon-c / dungeon-b / dungeon-a`
- add per-state dungeon overlays for dungeon nodes only
- compose them into each state's dungeon node pool so each location reaches about `9-10` events

## User-Visible Behavior

- Travel through each state should surface more route variety before repeating.
- Dungeon searches in different states should feel like they inherit both tier identity and regional identity.

## Constraints

- Preserve existing shared travel and shared dungeon tier packs.
- Keep state overlays authored in dedicated content files.
- Preserve stable ids where possible for already-shipped content.
- Keep tests explicit about pool volume and representative flavor anchors.

## Acceptance Criteria

- Each state's travel overlay contains about `10` events.
- Each dungeon location in a state has about `9-10` node-specific events after composition.
- Shared travel and shared dungeon tier packs remain present.
- Event tests cover the new pool counts and representative regional anchors.
- Focused event and engine tests pass.
