# Breakthrough Material Event Support V1

## Summary

This spec extends breakthrough-material progression so the event library itself can contribute meaningful common-material supply across the live realm ladder.

The runtime already supports explicit breakthroughs, residence-crafted special materials, and deterministic action rewards for common materials. What is still missing is a balanced event-side support layer for `foundation-common` and `core-common`, plus a real realm gate for authored event content.

## Problem

The current event library only partially supports the authored breakthrough loop:

- low-risk travel and exploration events can reward `qi-common`
- mid- and late-game breakthrough materials are still mostly action-only
- `EventTemplate.minRealm` exists in the data contract, but event selection does not enforce it
- content authors therefore cannot safely add higher-tier material rewards to shared event pools without risking balance leaks into beginner play

That leaves the event system behind the rest of the progression loop:

- beginner material flow feels alive because events can contribute
- foundation and core material flow feels mechanical because only action rewards are reliable
- the content model exposes a realm gate that the runtime does not actually honor

## Goals

- Make `minRealm` a live event-selection rule.
- Add authored event support for `foundation-common` and `core-common`.
- Preserve the current safe beginner `qi-common` flow.
- Keep higher-tier material events aligned with the current realm and risk band.
- Improve agent-legible material sourcing without changing the breakthrough action contract.

## Non-Goals

- No change to breakthrough costs, success rates, or recipes.
- No direct market source for breakthrough materials.
- No full roadmap view for future breakthroughs.
- No new item ids or new node types.
- No rebalancing of deterministic action rewards in this pass.

## Mechanics

### Realm-Gated Event Eligibility

- `EventTemplate.minRealm` must be honored by event draws.
- An event is eligible only if the cultivator's current realm is at least the event's `minRealm`.
- Events without `minRealm` remain eligible as they are today.

### Material Support By Layer

- Safe global travel and exploration continue to support `qi-common` only.
- Travel gets a small number of realm-gated common-material events:
  - `foundation-common` at `筑基+`
  - `core-common` at `金丹+`
- Node-specific exploration gets stronger realm-appropriate support:
  - `wilderness`, `dungeon-c`, `dungeon-b` can surface `foundation-common` at `筑基+`
  - `dungeon-a` can surface `core-common` at `金丹+`

### Balance Direction

- Event-sourced materials are support, not the sole backbone.
- Deterministic action rewards remain the most reliable route:
  - `take-mortal-task` for `qi-common`
  - `mine-spirit-stones`, `hunt-mine-beast`, lower-tier ruins loops for `foundation-common`
  - high-risk ruin loops for `core-common`
- Event rewards should make normal exploration/travel feel materially relevant, not replace explicit gathering actions.

## Player And Agent Contract

The breakthrough contract stays the same:

- `state.breakthrough` still reports the current requirement and missing items
- `recommendedAction` still points at the most direct next step
- agents still use fresh `actions` before acting

What changes is the world support around that contract:

- when agents travel or explore in the appropriate realm band, events can now contribute breakthrough materials instead of only generic stones or fragments
- higher-tier material events remain hidden from under-realm cultivators

## Acceptance Criteria

- `drawEvent` and `drawNodeSpecificEvent` enforce `minRealm`.
- low-risk shared event pools still support first-breakthrough `qi-common`.
- event pools contain authored `foundation-common` support for `筑基` exploration/travel.
- event pools contain authored `core-common` support for `金丹` exploration/travel.
- higher-tier material events are not eligible for lower-realm cultivators.
- deterministic action rewards remain unchanged and compatible with the new event support.
