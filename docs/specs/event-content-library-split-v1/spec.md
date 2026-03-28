# Event Content Library Split V1

## Summary

This spec separates event content packs into dedicated files without changing event behavior.
The goal is to make the event library easier to write, review, and extend by splitting content by source and ownership while keeping the current runtime draw and effect logic intact.

## Problem

The runtime event module is already split into catalog and engine layers, but content is still too concentrated in a few files:

- global exploration content lives in one file
- travel content lives in one file
- all state content is generated from one template file
- node content is still composed inside one dispatcher file

This causes three problems:

- content writing is harder to parallelize
- future state-by-state differentiation still points back to a shared generator
- small content edits touch central files and create unnecessary merge overlap

## Goals

- Split event content into dedicated content-pack files.
- Keep current event behavior unchanged.
- Make each state ready for independent future writing.
- Keep runtime draw and weighting logic in the existing engine layer.

## Non-Goals

- Changing event weights, rewards, or trigger rules.
- Reworking the exploration or travel architecture.
- Redesigning state flavor or dungeon content during this split.
- Moving event content to JSON, YAML, or external data files.

## User-Visible Behavior

Players should not notice any behavior change from this split alone.

The expected outcome is internal:

- content is easier to edit in isolated files
- future state or node rewrites can happen locally
- the runtime keeps producing the same event pools as before the split

## Constraints

- Keep `packages/domain/src/events.ts` and `packages/domain/src/events/engine.ts` focused on runtime contracts and resolution logic.
- Preserve existing event ids and behavior.
- Keep the catalog entrypoints stable enough that current callers do not need to change.

## Acceptance Criteria

- Event content is split into dedicated files under a content-oriented directory structure.
- `catalog.ts` remains a composition layer, not the place where content is authored.
- Existing event tests and engine tests still pass without behavior updates.

## Open Questions

- After this split, should the next batch hand-author each state pack instead of reusing a shared template?
- At what content volume should the project consider moving from TypeScript-authored packs to a compiled content format?
