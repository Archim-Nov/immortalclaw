# Implementation Plan

## Linked Spec

- `docs/specs/playtest-surface-2026-10-19/spec.md`

## Goal

道心岔路给人看的句子不再夹接口，八荒进不去的时候门口留一句中文原因。

## Architecture

道心那张卡仍由应用层在 `GET /agent/actions` 上补一张 `resolve-morality-event-choice`。句子和误交回执共用 `describePendingMoralityFork`。路径、choice id、选项 id 放在 `AvailableAction.routing`，不拼进 `label` 或 `description`。

八荒入口的三张进门卡仍只在 `canEnterBahuang` 允许、人又扛得住这一趟时出现。其余时候在同一地点放 `inspect-bahuang-gate`，说明直接用已有的中文原因。身上有伤或身子还没稳，外层不再把整段跳过，改成同一张卡上的另一句中文。交出这张卡在 `performAction` 里提前返回，不进 `requireSafeIfInjured`，所以带伤时也是 `accepted: false` 加那一句，而不是另抛一句不相干的拒绝。

## Tasks

### Task 1

- `packages/domain/src/engine.ts`、`packages/application/src/agent-actions.ts`、`packages/domain/src/model.ts`
- 改道心句子，加上 `routing`
- 改 `packages/domain/src/agent-surface-zh.test.ts`、`packages/application/src/morality-events.test.ts`、`packages/application/src/agent-actions.test.ts`

### Task 2

- `packages/domain/src/engine.ts` 在入口地点补 `inspect-bahuang-gate`
- `packages/domain/src/bahuang.test.ts` 覆盖窗口关闭、无令、带伤，以及窗口打开时仍是三张进门卡

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/bahuang.test.ts packages/application/src/morality-events.test.ts packages/application/src/agent-actions.test.ts`

## Doc Updates

- `AGENTS.md`
- `apps/web/public/skill.md`
- `docs/specs/agent-surface-zh-v1/spec.md`
- `docs/plans/agent-surface-zh-v1.md`
