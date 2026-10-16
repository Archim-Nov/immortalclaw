# Implementation Plan

## Linked Spec

- `docs/specs/playtest-agent-surface-2026-10-16/spec.md`

## Goal

Fix the seven agent-facing playtest bugs without a realm or sect redesign.

## Architecture

Scene-choice rewards already live on `option.summary`, which the act result prints. The pending action description keeps only the prompt.

The ward status id stays `warded`. Chinese copy uses the existing name 护体.

Dungeon side choices reuse `maybeQueueSceneChoice` after a step that did not open a wake. The choice lasts six ticks, at most twice a run, and does not add ticks to the job. `listAvailableActions` keeps abort, any wake, and those choices together.

`buildSectStateView` copies a joined neutral outpost onto `sect` when there is no player sect.

Withdrawn template URLs are exact 404s in nginx and a Pages function. The deploy copy also deletes leftover html.

The expedition report swaps the cultivation clause only when progress is already full and the recorded gain is zero.

## Tasks

### Copy and state

- `packages/domain/src/engine.ts`
- `packages/domain/src/items/legacy-consumables.ts`
- `packages/domain/src/dungeon-expedition-service.ts`
- `packages/domain/src/model.ts`

### Static 404

- `deploy/nginx/immortalclaw.conf`
- `deploy/sync-web-root.sh`
- `apps/web/public/_routes.json`
- `apps/web/functions/agent-templates/[[file]].js`

### Verification

- `packages/domain/src/scene-choices.test.ts`
- `packages/domain/src/dungeon-expedition.test.ts`
- `packages/domain/src/engine.test.ts`
- `apps/web/deploy-config.test.ts`

## Verification

- `node --import tsx --test packages/domain/src/scene-choices.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/engine.test.ts packages/domain/src/events.test.ts packages/domain/src/agent-surface-zh.test.ts packages/domain/src/item-catalog.test.ts`
- `node --import tsx --test apps/web/deploy-config.test.ts packages/application/src/agent-presentation.test.ts apps/web/src/pages/public-copy-cleanup.test.ts`

## Doc Updates

- `AGENTS.md`
- `docs/specs/playtest-agent-surface-2026-10-16/spec.md`
- `docs/specs/agent-owner-presentation-v2/spec.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `deploy/README.md`
