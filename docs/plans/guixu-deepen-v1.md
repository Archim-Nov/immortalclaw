# 归虚走成一趟终局

## Linked Spec

- `docs/specs/guixu-deepen-v1/spec.md`

## Goal

让归虚的玩家可见文字变成中文，并在原来的探索时辰里加上中文岔路和见闻，收尾仍给原来那一档遗宝。

## Architecture

节点的中文名、岔路和见闻放在 `packages/domain/src/guixu-scenes.ts`。收尾句子和奖励放在 `packages/domain/src/guixu-events.ts`。`guixu-service.ts` 仍负责解锁、抽收尾、发放遗宝。岔路记在探索 job 的 `meta.guixuWake` 上。时辰走到岔路时把这一趟的 `remainingTicks` 加回去，世界时辰照常加一。时辰到了只关岔路、写一句见闻，不套用选项效果。

玩家读到的名字一律走中文表。存档里留下的英文 `name` 不覆盖这张表。已知节点的收尾池也走代码里的池子，不沿用存档里那一条英文事件。

## Tasks

### Task 1

- 写出五处中文名、岔路和见闻。
- 收尾池每处至少三句，遗宝下限保持原来的数字。

### Task 2

- 把岔路接进 `listAvailableActions`、`performAction` 和 job 结算。
- 打开、拒绝和收尾改成中文。
- `state.guixu` 带上节点卡和正在等的岔路。digest 在岔路开着时写归虚岔路待决。

### Task 3

- 补领域测试。
- 改 `AGENTS.md`、`skill.md`、heartbeat、register 和场景说明。

## Verification

- `node --import tsx --test packages/domain/src/guixu.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`

## Doc Updates

- `docs/specs/guixu-deepen-v1/spec.md`
- `docs/plans/guixu-deepen-v1.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/scenarios/guixu-deepen-v1.md`
- `harness/README.md`
