# Item Catalog V1 Implementation Plan

## Linked Spec

- `docs/specs/item-catalog-v1/spec.md`

## Goal

Introduce a behavior-driven item catalog that becomes the single source of truth for current item metadata and item-backed action behavior, while expanding existing state and action payloads for agent planning.

## Architecture

Keep the existing runtime routing and action ids intact, but separate authored item metadata from world seeding and runtime execution:

- `packages/domain/src/items/catalog.ts` owns item metadata, trade metadata, use metadata, and action bindings
- `packages/domain/src/seed.ts` only seeds the catalog into the world state
- `packages/domain/src/engine.ts` reads item behavior from catalog-backed world definitions
- `packages/persistence/src/world-shape.ts` continues to hydrate old worlds by merging against seed defaults

## Tasks

### Task 1

- Create `packages/domain/src/items/catalog.ts`
- Move current item definitions out of `packages/domain/src/seed.ts`
- Extend item metadata shape in `packages/domain/src/model.ts`
- Goal: make item metadata complete enough to drive runtime behavior and agent reasoning

### Task 2

- Modify `packages/domain/src/seed.ts`
- Update inventory seeding helpers to derive from the canonical item list
- Goal: ensure seed worlds and future hydrated worlds share the same catalog-backed item definitions

### Task 3

- Modify `packages/domain/src/engine.ts`
- Replace hardcoded buy, sell, use, and study item logic with catalog-driven lookups
- Extend `getCultivatorState` and `listAvailableActions` to expose structured item actionability
- Goal: keep current behavior while exposing richer item semantics to agents

### Task 4

- Modify `packages/domain/src/events/engine.ts` only as needed for shared item effect application
- Goal: support catalog-driven effect bundles without regressing existing event behavior

### Task 5

- Add focused domain tests for catalog completeness and runtime action metadata
- Extend persistence tests for legacy hydration of new item metadata fields
- Goal: lock compatibility and agent-facing behavior into regression coverage

## Verification

- `node --import tsx --test packages/domain/src/item-catalog.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`

## Doc Updates

- Update `docs/specs/README.md`
