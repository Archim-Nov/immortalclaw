# Implementation Plan

## Linked Spec

- `docs/specs/busy-rejection-zh/spec.md`

## Goal

A busy refusal stays in Chinese, names 中止地宫远征 only while a dungeon expedition is open, and leaves that sentence off for every other job.

## Architecture

`requireIdle` is the only busy rejection that still pastes an action id into the player-facing sentence. It already runs after abort, wake, scene, and regional choices. It should read `getActiveDungeonExpedition` and reuse the Chinese phrase already stored for `abort-dungeon-expedition`.

Other busy lines, such as a busy duel target or a busy party partner, are already Chinese and do not name an action id.

## Tasks

### Task 1

- Split the idle rejection in `packages/domain/src/engine.ts`.
- Cover a plain job and a live dungeon run in `packages/domain/src/agent-surface-zh.test.ts`, including the act body that copies the sentence onto `error` and `summary`.

### Task 2

- Point the agent-facing busy notes at the new sentences.
- Note that the earlier leftovers spec no longer asks this refusal to print the action id.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts`

## Doc Updates

- `docs/specs/busy-rejection-zh/spec.md`
- `docs/specs/agent-act-zh-leftovers/spec.md`
- `docs/plans/busy-rejection-zh.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
