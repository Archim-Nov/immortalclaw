# Jiuzhou State Event Flavor V1

## Summary

This spec replaces the current templated state exploration events with hand-authored state packs for all nine states.
The goal is to make each state's exploration pool reflect its resource bias, regional risks, and social atmosphere while keeping the existing event-pool runtime intact.

## Problem

The event content library is now split by source and ownership, but the state layer still behaves like a shared template:

- all nine state packs currently reuse the same event structure
- state-specific ids exist, but the actual event tone does not match Jiuzhou flavor
- the state pool does not yet express the world-design differences already defined in P1 Jiuzhou planning

This leaves the exploration loop with weak geographic identity.

## Goals

- Hand-author one exploration event pack for each of the nine states.
- Keep the state pool structure at `3 fortune / 3 training / 3 human` per state.
- Express each state's flavor through event names, descriptions, and light effect bias.
- Preserve the current event runtime, draw layers, and event-pool interfaces.

## Non-Goals

- Reworking global-common or travel pools in this batch.
- Redesigning node-specific dungeon or wilderness pools in this batch.
- Adding new event sources, new pool layers, or a new content format.
- Rebalancing the full economy around state events.

## Flavor Anchors

Use the Jiuzhou anchors already defined in `docs/P1_plan/03-jiuzhou-and-events.md` and `docs/P1_plan/designs/03-jiuzhou-events-design.md`.

- `青州`: beginner-friendly herbs, low-tier beasts, sect-adjacent steady cultivation
- `扬州`: waterways, trade, ferries, market and guild dealings
- `中州`: order, patrols, registries, sect liaison and official process
- `蜀州`: mountains, herbs, spirit wood, hidden paths and secluded figures
- `幽州`: frontier defense, cold lands, hunting, patrol shelters
- `凉州`: desert routes, ore veins, supply stress, convoy pragmatism
- `雷州`: thunder anomalies, unstable qi, warning patrols, high-pressure status events
- `沧州`: ports, sea trade, tides, reef ruins, salvage and relic clues
- `宛州`: favors, jianghu ties, rogue cultivators, bandits, flexible social dealing

## User-Visible Behavior

Players should notice that state exploration feels geographically distinct.

Examples:

- `青州` should lean calmer and more herb/sect-adjacent
- `扬州` should feel wetter, more mercantile, and more movement-linked
- `凉州` should feel drier, harsher, and more convoy/survival oriented
- `雷州` should feel unstable and status-heavy

## Constraints

- Keep existing state event ids and prefixes (`qz-*`, `yz-*`, etc.) stable.
- Keep the `catalog-state.ts` entrypoint unchanged for callers.
- Avoid large balance jumps; favor flavor through content and mild weight/effect shifts.
- Preserve total state event count at `81`.

## Acceptance Criteria

- Each state content file contains its own authored state event rows.
- The shared state template is reduced to helper logic rather than authored content.
- Each state pack contains `9` events with distinct names and descriptions.
- Event and engine tests still pass.
- Add at least one regression test that confirms representative flavor differences across states.
