# Breakthrough Materials V1 Implementation Plan

## Linked Spec

- `docs/specs/breakthrough-materials-v1/spec.md`

## Goal

Ship an explicit breakthrough flow that joins together capped realm progress, authored breakthrough materials, residence crafting, status-only major success rates, persistent breakthrough records, and updated agent-facing guidance.

## Implementation Areas

### 1. Domain Contracts

- Extend `packages/domain/src/model.ts`
- Add:
  - new breakthrough item ids
  - `residence-breakthrough`
  - breakthrough records and breakthrough state view types
- Goal: make breakthrough a first-class runtime contract

### 2. Item And Residence Data

- Extend `packages/domain/src/items/catalog.ts`
- Extend `packages/domain/src/constants.ts`
- Add:
  - breakthrough common materials
  - breakthrough special materials
  - residence recipes for special materials
  - breakthrough default action duration
- Goal: make authored materials and recipes the source of truth

### 3. Runtime Behavior

- Modify `packages/domain/src/engine.ts`
- Remove auto-breakthrough from cultivation progress sources
- Add:
  - progress clamping at `100`
  - breakthrough state computation
  - breakthrough action generation
  - breakthrough resolution and records
  - status-only success-rate calculation
  - beginner and mid-loop material sources
  - onboarding and guidance updates
- Goal: make the field loop feed residence crafting and explicit breakthrough

### 4. Persistence Compatibility

- Modify `packages/persistence/src/world-shape.ts`
- Ensure:
  - new item definitions hydrate into old worlds
  - inventories receive zero-count breakthrough items
  - `breakthroughRecords` defaults to `[]`
  - legacy `realmProgress >= 100` clamps to pending-breakthrough state
- Goal: avoid requiring a world reset

### 5. Regression Coverage

- Extend `packages/domain/src/engine.test.ts`
- Extend persistence hydration tests
- Cover:
  - capped progress with no auto-breakthrough
  - residence breakthrough visibility and material costs
  - special-material crafting path
  - major breakthrough rate calculation
  - failure rollback behavior
  - hydration defaults
- Goal: lock the new contract in before later balance passes

## Verification

- `node --import tsx --test packages/domain/src/item-catalog.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`

## Doc Sync

- Update `README.md`
- Update `docs/specs/README.md`
- Update `apps/web/public/skill.md`
- Update `apps/web/public/register.md`
- Update `apps/web/public/heartbeat.md`
- Update `apps/world-do/src/agent-guides.ts`
- Update `packages/openclaw-immortal-plugin/README.md`
