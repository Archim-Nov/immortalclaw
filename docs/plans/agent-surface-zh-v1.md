# Implementation Plan

## Linked Spec

- `docs/specs/agent-surface-zh-v1/spec.md`

## Goal

Agent-facing cards, job labels, and summaries read as complete Chinese, the first dungeon wake is on `currentJob.meta.dungeonWake`, and repeated gifts collapse in the action list.

## Architecture

The expedition step already stamps `dungeonWake` when a choice is created. `getCultivatorState` also copies a pending wake onto the live job, so a read cannot show the decision actions without the same scene on `currentJob.meta`.

Action cards and `startJob` share one Chinese phrase for timed work. A label that already contains Chinese is kept. A raw action id or an English shell is replaced before it is stored on `job.label` or returned as the start summary.

Gifts stay individual records. The action list groups them by sender and item. One gift still uses `accept-gift:<messageId>` and `reject-gift:<messageId>`. A stack uses `accept-gift-batch:<fromId>:<itemId>` and `reject-gift-batch:<fromId>:<itemId>`. The single ids keep working when they are not listed.

Item ids stay. Reports and yield hints add the catalog name beside them. Recent event titles are written in Chinese and rewritten on read so older `[exploration]` lines come back as `[探索]`.

`resolve-morality-event-choice` stays an inbox hint. The card and a mistaken act both name `POST /agent/events/choose`, the choice id, and the option ids.

## Tasks

### Task 1

- Stamp and re-copy `dungeonWake` for the first pending choice.
- Natural wake confirmation from the beat title.
- Test the first 丙 rank-1 conservative choice.

### Task 2

- Chinese action labels, job labels, and the start and finish summaries named in the soak.
- Chinese wilderness entry summary using the state layer name.
- Chinese onboarding, strategy, decision policy, and status names.

### Task 3

- Collapse gift actions by sender and item, and keep single accept and reject.
- Attach `itemName` on the report, yield hints, and guidance craft line.
- Chinese recent-event brackets.
- Morality hint that is clearly not an act.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/wild-places.test.ts packages/domain/src/guidance.test.ts packages/application/src/agent-actions.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/agent-surface-zh-v1/spec.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
