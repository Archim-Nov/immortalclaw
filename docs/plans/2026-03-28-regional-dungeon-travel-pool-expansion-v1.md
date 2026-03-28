# Regional Dungeon Travel Pool Expansion V1 Implementation Plan

## Linked Spec

- `docs/specs/regional-dungeon-travel-pool-expansion-v1/spec.md`

## Goal

Raise the content volume of regional travel and dungeon overlays while keeping shared base pools intact.

## Architecture

Keep:

- `packages/domain/src/events/content/travel/global.ts`
- `packages/domain/src/events/content/nodes/dungeon-*.ts`
- current draw logic and weighting model

Add or expand:

- per-state travel overlay files under `packages/domain/src/events/content/travel/states/`
- per-state dungeon overlay files under a new `packages/domain/src/events/content/nodes/states/`
- catalog composition so shared tier packs and state dungeon overlays combine into each dungeon location

## Tasks

### Task 1

- Expand all per-state travel overlay packs from `3` to about `10` events
- Goal: increase route variety while keeping the shared travel base pool

### Task 2

- Create per-state dungeon overlay packs
- Modify node catalog composition for dungeon nodes
- Goal: bring each dungeon location to about `9-10` node events after composition

### Task 3

- Update `packages/domain/src/events.test.ts`
- Goal: verify expanded travel volume, expanded dungeon volume, and representative flavor anchors

### Task 4

- Run focused tests:
  - `node --import tsx --test packages/domain/src/events.test.ts`
  - `node --import tsx --test packages/domain/src/engine.test.ts`

## Doc Updates

- Update `docs/specs/README.md`
