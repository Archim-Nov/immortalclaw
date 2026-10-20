# Implementation Plan

## Linked Spec

- `docs/specs/playtest-surface-2026-10-20/spec.md`

## Goal

让试玩里这四条代理人能看见的问题，用同一套名字、读得通的关系句、城里的事务名，以及做完留得下的结果。

## Architecture

修士名字不再经过 `facingPersonName`。请托和悬赏直接用存档名。任务标题里的拉丁词仍由 `polishEmbeddedNames` 处理。

`describeArcLine` 按交情和嫌隙等级各写一句，不再把等级名填进「嫌隙到了……」。

事务显示名以模板为准，旧的「强事件线索」「州内精英任务」在读出时换成新名字。接下时记下地点。状态视图在还有未完成事务时带上 `activeQuests`。结算时写游记、生活记录、世界事件，并把伤势同步成带伤。

## Tasks

### Task 1

- 改 `social-deepen.ts`、`engine.ts` 里的人名显示
- 改 `social.ts` 的关系句
- 改 `constants.ts` 的两个事务显示名，并在 `quest.ts` 做旧名替换

### Task 2

- `ActiveQuest` 记下接下时的地点
- `CultivatorStateView.activeQuests` 写出名字、地点和做不了的原因
- 有伤时仍列出执行卡，交上去复述同一句原因
- 结算写中文结果、游记、摘要和 `recentEvents`，并同步带伤

### Task 3

- 补 `packages/domain/src/playtest-surface-2026-10-20.test.ts`
- 改原来把英文名换成中文显示名的那条测试
- 更新 `AGENTS.md` 和旧的动作卡说明

## Verification

- `node --import tsx --test packages/domain/src/playtest-surface-2026-10-20.test.ts packages/domain/src/agent-surface-zh.test.ts packages/domain/src/inner-life.test.ts packages/domain/src/engine.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`

## Doc Updates

- `docs/specs/playtest-surface-2026-10-20/spec.md`
- `docs/plans/playtest-surface-2026-10-20.md`
- `docs/specs/agent-surface-zh-cards/spec.md`
- `AGENTS.md`
