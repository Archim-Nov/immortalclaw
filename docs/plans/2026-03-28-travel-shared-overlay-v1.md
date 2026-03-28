# Travel Shared Overlay V1 Implementation Plan

## Linked Spec

- `docs/specs/travel-shared-overlay-v1/spec.md`

## Goal

Keep travel partly shared while adding enough state-specific overlay to make Jiuzhou route traversal feel regional.

## Architecture

Keep:

- `packages/domain/src/events/content/travel/global.ts` as the shared travel base
- `packages/domain/src/events/engine.ts` as the draw resolver

Add:

- `packages/domain/src/events/content/travel/states/` for per-state travel packs
- `travelStateSpecific` to the event pool shape
- catalog composition for state-indexed travel overlays

## Tasks

### Task 1

- Update event pool interfaces and catalog composition
- Goal: add a dedicated `travelStateSpecific` pool without breaking current callers

### Task 2

- Create travel state content files for all nine states
- Goal: give each state a small route overlay pack while preserving the shared pool

### Task 3

- Update travel draw logic in `packages/domain/src/events/engine.ts`
- Goal: combine shared travel events with the current state's travel overlay

### Task 4

- Update tests in `packages/domain/src/events.test.ts`
- Goal: verify shared travel remains present and state travel overlays are loaded

### Task 5

- Run focused tests:
  - `node --import tsx --test packages/domain/src/events.test.ts`
  - `node --import tsx --test packages/domain/src/engine.test.ts`

## Doc Updates

- Update `docs/specs/README.md`
