# Jiuzhou State Event Flavor V1 Implementation Plan

## Linked Spec

- `docs/specs/jiuzhou-state-event-flavor-v1/spec.md`

## Goal

Hand-author state exploration event packs so each Jiuzhou state has a distinct gameplay identity without changing the event runtime architecture.

## Architecture

Keep:

- `packages/domain/src/events.ts` as the public runtime contract
- `packages/domain/src/events/engine.ts` as draw and effect resolution
- `packages/domain/src/events/catalog-state.ts` as the state-pack composition layer

Change:

- `packages/domain/src/events/content/states/template.ts` into a shared helper layer
- each file under `packages/domain/src/events/content/states/` into a hand-authored state content pack

## Tasks

### Task 1

- Update `packages/domain/src/events/content/states/template.ts`
- Goal: convert the old shared authored template into a reusable helper for state rows

### Task 2

- Rewrite:
  - `packages/domain/src/events/content/states/qingzhou.ts`
  - `packages/domain/src/events/content/states/yangzhou.ts`
  - `packages/domain/src/events/content/states/zhongzhou.ts`
  - `packages/domain/src/events/content/states/shuzhou.ts`
  - `packages/domain/src/events/content/states/youzhou.ts`
  - `packages/domain/src/events/content/states/liangzhou.ts`
  - `packages/domain/src/events/content/states/leizhou.ts`
  - `packages/domain/src/events/content/states/cangzhou.ts`
  - `packages/domain/src/events/content/states/wanzhou.ts`
- Goal: give each state a flavor-authored `9`-event pack

### Task 3

- Update `packages/domain/src/events.test.ts`
- Goal: add regression coverage for representative state flavor differences while keeping pool-count checks

### Task 4

- Run focused tests:
  - `node --import tsx --test packages/domain/src/events.test.ts`
  - `node --import tsx --test packages/domain/src/engine.test.ts`
- Goal: confirm the new state packs are behavior-valid

## Doc Updates

- Update `docs/specs/README.md`
