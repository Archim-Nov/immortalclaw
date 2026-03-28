# Manual Removal V1 Implementation Plan

## Linked Spec

- `docs/specs/manual-removal-v1/spec.md`

## Goal

Delete the current sword, alchemy, and array manual family from live gameplay while preserving the schema space for future manual items.

## Architecture

The removal touches four layers:

- `packages/domain/src/model.ts` for item and action unions
- `packages/domain/src/items/catalog.ts` and `packages/domain/src/seed.ts` for source data
- `packages/domain/src/engine.ts` for guidance, rewards, and action behavior
- `packages/persistence/src/world-shape.ts` for legacy snapshot cleanup

## Tasks

### Task 1

- Remove current manual ids from the active item union and current study action ids from the action union
- Keep `manual` in `ItemCategory`
- Goal: preserve future schema flexibility while deleting current runtime exposure

### Task 2

- Remove manual items from the item catalog and seed inventory
- Remove manual reward branches from dungeon and sect logic
- Goal: ensure no active gameplay path can create or consume a manual

### Task 3

- Remove manual-specific guidance and public action docs
- Goal: stop teaching agents to plan around a deleted mechanic

### Task 4

- Strip removed manual ids from hydrated inventories and item definitions in legacy worlds
- Goal: old saves do not crash or carry deleted items forward

### Task 5

- Replace obsolete manual tests with removal and hydration assertions
- Goal: lock the deleted state into regression coverage

## Verification

- `node --import tsx --test packages/domain/src/item-catalog.test.ts packages/domain/src/engine.test.ts packages/domain/src/events.test.ts packages/domain/src/wilderness.test.ts packages/persistence/src/in-memory-world-repository.test.ts packages/persistence/src/sqlite-world-repository.test.ts packages/application/src/agent-onboarding.test.ts packages/application/src/agent-registration.test.ts`
- `npx tsc --noEmit`

## Doc Updates

- Update `docs/specs/README.md`
- Update current public agent guidance docs under `apps/web/public/`
