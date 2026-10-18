# Implementation Plan

## Linked Spec

- `docs/specs/wilderness-survey-pool-v1/spec.md`

## Goal

起始荒野的再探能按池子里的三个 id 走完，中断时不再把英文错误贴给玩家。

## Architecture

在 `WILDERNESS_EVENT_POOL` 补上三件一层静处事件。结算仍按原来的奖励、见闻和「这一段走完了」走。`settleFailedTimedJob` 在把失败写进摘要之前，先看错误是不是已经给人看的中文；不是的话，荒野再探换成固定的中文句，其他差事换成一句短的中文。

## Tasks

### Task 1

- 在 `packages/domain/src/wilderness-events.ts` 增加三个定义。
- 领域测试断言每个荒野层 `eventPool` id 都有定义，并对这三个 id 调用 `resolveWildernessSurvey`。

### Task 2

- 在 `packages/domain/src/engine.ts` 的失败结算里去掉英文 `Error.message`。
- 测试一次未知事件 id 的完整差事，确认摘要和 recentEvents 是中文。

## Verification

- `node --import tsx --test packages/domain/src/wilderness-survey-pool.test.ts`
- `node --import tsx --test packages/domain/src/wild-beats.test.ts packages/domain/src/wilderness.test.ts packages/domain/src/deepen-playtest.test.ts`

### Task 3

- 搭讪和组队邀请不在同一处时，拒绝改成中文。
- `packages/domain/src/social.test.ts` 断言 `error` 与 `summary` 都是这句中文。

## Doc Updates

- `docs/specs/wilderness-survey-pool-v1/spec.md`
- `docs/plans/2026-10-18-wilderness-survey-pool.md`
- `AGENTS.md` 荒野一节补上这三件再探和中断句。
