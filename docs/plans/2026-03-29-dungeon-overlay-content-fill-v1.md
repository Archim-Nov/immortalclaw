# 2026-03-29 Dungeon Overlay Content Fill V1

## Scope

Implement `docs/specs/dungeon-overlay-content-fill-v1/spec.md`.

This batch expands state dungeon overlay content and adds lightweight managed-expedition flavor exposure without changing the existing action surface or event draw architecture.

## Work Items

1. Expand each file under `packages/domain/src/events/content/nodes/states/*` from `6` to `18` dungeon mother rows.
2. Keep the current `1-3 / 4-6 / 7-9` rank-band replication model and shared dungeon grade packs unchanged.
3. Ensure all touched overlay rows expose both `title` and `titleCn`.
4. Extend `DungeonExpeditionProgress` with internal `flavorEventTitles: string[]`.
5. Extend `DungeonExpeditionReport` with public `flavorEvents: string[]`.
6. Capture node-specific dungeon event titles from managed expedition `search` steps before routine world-event trimming.
7. Dedupe flavor titles in first-seen order and cap them at `3`.
8. Backfill missing expedition flavor arrays during world hydration for legacy snapshots.
9. Update README, specs index, and agent-facing docs to describe the thicker dungeon overlays and the new report field.

## Verification

- Domain tests for:
  - dungeon event-pool volume per state and per entrance
  - representative regional overlay anchors
  - managed expedition report `flavorEvents`
  - no routine step-level expedition wake leaks before the final report
- Persistence tests for:
  - missing `flavorEventTitles` backfilled to `[]`
  - missing `flavorEvents` backfilled to `[]`
- Targeted verification commands:
  - `node --import tsx --test packages/domain/src/events.test.ts`
  - `node --import tsx --test packages/domain/src/dungeon-expedition.test.ts`
  - `node --import tsx --test packages/domain/src/engine.test.ts`
  - `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
  - `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`
