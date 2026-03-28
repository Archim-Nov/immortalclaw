# Dungeon Rank Expansion V1 Implementation Plan

## Linked Spec

- `docs/specs/dungeon-rank-expansion-v1/spec.md`

## Goal

Ship a nine-rank dungeon ladder per dungeon grade while preserving the current map shape and making agents act through explicit rank-parameterized dungeon actions.

## Implementation Areas

### 1. Domain Contracts

- Extend `packages/domain/src/model.ts`
- Add:
  - dungeon grade metadata on locations
  - shared dungeon rank progress on cultivators
  - `state.dungeon`
  - parameterized timed action ids for dungeon search and guardian fights
  - dungeon rank metadata in job meta where needed

### 2. Seed And Compatibility

- Extend `packages/domain/src/seed.ts`
- Extend `packages/persistence/src/world-shape.ts`
- Seed every live dungeon entrance with:
  - grade
  - max rank
  - minimum realm
  - danger and reward bands
- Hydrate old worlds with default shared rank progress

### 3. Runtime Behavior

- Modify `packages/domain/src/engine.ts`
- Replace bare dungeon actions with rank-parameterized ones
- Add:
  - rank parsing and validation
  - grade gate checks
  - shared unlock progression
  - `state.dungeon`
  - guardian and ruin tuning tables by `grade + rank`
  - rank-aware action generation and completion handling

### 4. Event System

- Extend `packages/domain/src/events.ts`
- Extend `packages/domain/src/events/engine.ts`
- Extend node/event content builders
- Add:
  - dungeon grade and rank filters on templates
  - rank-aware draw context
  - shared grade-rank templates plus state overlays by rank band

### 5. Tests And Docs

- Extend `packages/domain/src/engine.test.ts`
- Extend `packages/domain/src/events.test.ts`
- Extend persistence hydration tests
- Update agent-facing docs:
  - `README.md`
  - `apps/web/public/skill.md`
  - `apps/web/public/heartbeat.md`

## Verification

- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`

## Doc Sync

- Update `docs/specs/README.md`
- Update runtime and agent docs to describe:
  - rank-parameterized dungeon actions
  - guardian-only rank unlocks
  - grade-banded material drops
