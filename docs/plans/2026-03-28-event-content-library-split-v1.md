# Event Content Library Split V1 Implementation Plan

## Linked Spec

- `docs/specs/event-content-library-split-v1/spec.md`

## Goal

Split event content packs into dedicated files while keeping runtime behavior unchanged.

## Architecture

Keep the existing runtime separation:

- `packages/domain/src/events.ts` for public contracts
- `packages/domain/src/events/engine.ts` for draw and effect logic
- `packages/domain/src/events/catalog*.ts` as thin composition wrappers

Move authored content into a content-pack directory structure organized by source and ownership.

## Tasks

### Task 1

- Create: `packages/domain/src/events/content/exploration/global.ts`
- Create: `packages/domain/src/events/content/travel/global.ts`
- Modify: `packages/domain/src/events/catalog-global.ts`
- Modify: `packages/domain/src/events/catalog-travel.ts`
- Goal: move global exploration and travel content into dedicated content-pack files

### Task 2

- Create: `packages/domain/src/events/content/states/template.ts`
- Create: one file per state under `packages/domain/src/events/content/states/`
- Modify: `packages/domain/src/events/catalog-state.ts`
- Goal: give each state its own content file while preserving current behavior

### Task 3

- Create: `packages/domain/src/events/content/nodes/`
- Move or wrap node-tier content under dedicated node files
- Modify: `packages/domain/src/events/catalog-node.ts`
- Goal: make node content writable by node family instead of one central file

### Task 4

- Run focused tests for event pools and engine behavior
- Goal: confirm the split is behavior-preserving

## Verification

- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`

## Doc Updates

- Review `docs/specs/README.md`
