# Breakthrough Material Event Support V1 Implementation Plan

## Linked Spec

- `docs/specs/breakthrough-material-event-support-v1/spec.md`

## Goal

Make the event library a real contributor to breakthrough-material collection beyond the first realm, while keeping realm gating explicit and risk-aligned.

## Implementation Areas

### 1. Event Contract Activation

- Modify `packages/domain/src/events/engine.ts`
- Add realm-order helpers and filter candidates by `minRealm`
- Apply the same rule to both shared event draws and node-specific event draws

### 2. Content Authoring Support

- Modify the event content builders so authored rows can carry `minRealm`
- Files:
  - `packages/domain/src/events/content/exploration/global.ts`
  - `packages/domain/src/events/content/travel/global.ts`
  - `packages/domain/src/events/content/states/template.ts`
  - `packages/domain/src/events/content/nodes/shared.ts`

### 3. Material Event Expansion

- Add realm-gated material events in:
  - travel shared pool
  - wilderness exploration pack
  - `dungeon-c` exploration pack
  - `dungeon-b` exploration pack
  - `dungeon-a` exploration pack
- Keep `qi-common` beginner support unchanged
- Add `foundation-common` and `core-common` support without changing breakthrough formulas

### 4. Regression Coverage

- Extend `packages/domain/src/events.test.ts`
- Cover:
  - updated event-pool counts
  - presence of higher-tier material events in the correct pools
  - `minRealm` filtering for shared and node-specific draws

## Verification

- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`

## Doc Sync

- Update `docs/specs/README.md`
- Update `README.md`
- Update `apps/web/public/skill.md`
- Update `apps/web/public/heartbeat.md`
