# Travel Shared Overlay V1

## Summary

This spec keeps the current shared travel pool and adds state-specific travel overlays for all nine states.
The goal is to let travel feel regionally distinct without losing a reusable common travel layer.

## Problem

The exploration loop already has a stable shape:

- shared `global-common`
- state-specific exploration pool
- node-specific overlays

Travel does not. Right now the travel loop only draws from one shared pool, so crossing `扬州 / 凉州 / 雷州` does not feel materially different unless the destination node itself changes.

## Goals

- Keep a shared travel pool that remains reusable across all states.
- Add a state-specific travel overlay for each Jiuzhou state.
- Make travel feel regionally distinct through flavor, route pressure, and mild effect bias.
- Preserve the existing runtime draw model and keep travel implementation simple.

## Non-Goals

- Reworking the shared exploration `global-common` pool.
- Replacing the current shared travel pool with fully isolated state travel pools.
- Adding node-specific route events in this batch.
- Rebalancing the full economy or changing action durations.

## Design Direction

Use a hybrid pool structure:

- shared travel base stays in `travelPool`
- regional travel flavor is added through `travelStateSpecific`

This keeps common route events reusable while letting each state add a small, recognizable set of route events.

## Flavor Anchors

- `青州`: steady herb roads, novice escorts, calm route maintenance
- `扬州`: ferries, docks, canal traffic, mercantile movement
- `中州`: relay posts, checks, official movement corridors
- `蜀州`: mountain paths, rope bridges, hidden detours
- `幽州`: snow tracks, patrol fires, border marches
- `凉州`: caravan lines, sand pressure, ration discipline
- `雷州`: storm windows, warning banners, lightning-risk movement
- `沧州`: tides, harbor routes, reef-side passage
- `宛州`: backroads, favors, crowd navigation, escort deals

## User-Visible Behavior

Players should still encounter familiar shared travel events, but a portion of route outcomes should now feel tied to the state they are moving through.

## Constraints

- Preserve the existing shared travel pool as a first-class pool.
- Keep travel state overlays small and readable.
- Avoid changing caller-facing draw APIs.
- Keep the event content TypeScript-authored.

## Acceptance Criteria

- `travelPool` remains shared and non-empty.
- A new state-indexed travel overlay exists for all nine states.
- Travel draws consider both the shared travel pool and the current state's travel overlay.
- Add regression coverage for the new travel overlay shape and representative state flavor.
- Event and engine tests pass.
