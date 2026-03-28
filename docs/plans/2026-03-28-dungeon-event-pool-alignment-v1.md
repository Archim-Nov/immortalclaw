# Dungeon Event Pool Alignment V1 Implementation Plan

## Linked Spec

- `docs/specs/dungeon-event-pool-alignment-v1/spec.md`

## Goal

Make dungeon nodes feel materially different by aligning ruin search and guardian tuning with the existing event-pool architecture.

## Architecture

Keep the current event module boundaries introduced by the recent split:

- content stays in `packages/domain/src/events/catalog-*.ts`
- weighting and effect application stay in `packages/domain/src/events/engine.ts`
- runtime action wiring stays in `packages/domain/src/engine.ts`

The implementation should prefer additive catalog data and small runtime seams over a fresh dungeon subsystem.

## Tasks

### Task 1

- Modify: `packages/domain/src/events/catalog-node.ts`
- Check: `packages/domain/src/events/catalog.ts`
- Goal: replace the single placeholder node event with tier-aware dungeon overlays and slightly richer wilderness overlays only if needed for shared helpers
- Verification: targeted event-pool shape tests

### Task 2

- Modify: `packages/domain/src/engine.ts`
- Check: `packages/domain/src/events/engine.ts`
- Goal: route `search-fortune` through catalog-driven dungeon event content instead of the current hardcoded modulo-only resolution
- Verification: targeted engine tests for dungeon search results and world-event logging

### Task 3

- Modify: `packages/domain/src/engine.ts`
- Modify or Create: a small dungeon-tier tuning table in `packages/domain/src/constants.ts` or a nearby domain module if needed
- Goal: make `challenge-guardian` risk and reward differentiation depend on dungeon tier without changing the action surface
- Verification: targeted guardian outcome tests across `dungeon-c / dungeon-b / dungeon-a`

### Task 4

- Modify: `packages/domain/src/events.test.ts`
- Modify: `packages/domain/src/engine.test.ts`
- Goal: lock in dungeon overlay counts, dungeon search behavior, and guardian tier differentiation
- Verification: focused domain test run

## Verification

- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`

## Doc Updates

- Review `docs/specs/README.md`
- Review `docs/specs/gameplay-build-foundation/event-pool-foundation.md` only if the implementation forces a change to documented event-pool rules rather than just filling the existing gap
