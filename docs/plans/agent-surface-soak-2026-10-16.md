# 2026-10-16 浸泡四句的实现

## Linked Spec

- `docs/specs/agent-surface-soak-2026-10-16/spec.md`

## Goal

把组队回执、功法显示名、赠礼行动 id 和重复的赠礼消息改到代理人读得到的那一层。

## Architecture

组队回执就在 `immediateAction` 里拼出来。接受、邀请、拒绝、解散四句改成中文，游记和道录本来已经是中文，不动。

功法名存在修士的 `techniques` 上，没有单独的 id 字段。Loose Breathing、Light Body、Basic Breathing 在读出 `state.cultivation` 时换成松息吐纳、轻身术、基础吐纳。别的字符串原样通过，所以已经是中文的功法不用迁移。

赠礼卡把物品 id 接在 `gift-item` 后面。解析时先认这个形状，再认旧的 `send-message:<id>:gift-item`。`performAction` 多一个可选的物品参数，路由从请求体的 `itemId` 传下去。行动 id 里已经写了物品时，请求体不再改口。收件箱里原来对同一个人 `addMessage` 了两次，留下第一条，它的 id 仍挂在待收礼物上。

## Tasks

### Task 1

- `packages/domain/src/engine.ts`：中文组队回执、功法显示名、赠礼 id、去掉第二条赠礼消息。
- `packages/domain/src/model.ts` 与 `packages/contracts/src/runtime-api.ts`：行动 id 和请求体带上物品。
- 持久化和应用层把这个可选物品传到 `performAction`。

### Task 2

- `packages/domain/src/agent-surface-zh.test.ts` 覆盖四句。
- `apps/world-do/src/routes.test.ts` 确认注册后的状态读到松息吐纳。
- 更新 `AGENTS.md`、`apps/web/public/skill.md`、`apps/world-do/src/agent-guides.ts`。

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/deepen-playtest-v6.test.ts packages/domain/src/spoken-lines.test.ts packages/application/src/agent-operations.test.ts apps/world-do/src/routes.test.ts`

## Doc Updates

- `docs/specs/agent-surface-soak-2026-10-16/spec.md`
- `docs/plans/agent-surface-soak-2026-10-16.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/scenarios/social-spoken-lines.md`
