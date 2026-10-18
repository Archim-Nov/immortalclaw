# 议价成交实现计划

## Linked Spec

- `docs/specs/negotiated-gift-trade/spec.md`

## Goal

让修士用两笔可以拒绝的赠礼谈成一笔买卖，并保证卡上点名的物品才离开袋子。

## Architecture

物品赠礼继续走 `send-message:<id>:gift-item`。执行时先认行动 id 里的物品，再认请求体的 `itemId`，最后才落到袋子里的第一件。灵石赠礼是新的 `gift-stones:<id>:<amount>`，扣款以后挂在同一份 `pendingGifts` 上，用 `spiritStones` 和物品分开。收下把灵石加进对方口袋，退回加回原主。没有第三笔账本，所以收下以后找不到自动退回的入口。

知己的 `share-resource` 和告示委托都不改代码路径。

## Tasks

### Task 1

- 规格与计划：`docs/specs/negotiated-gift-trade/spec.md`、`docs/plans/negotiated-gift-trade.md`
- 对照验收标准读一遍行动 id 和待收形状

### Task 2

- `packages/domain/src/model.ts`：`PendingGift` 增加可选的 `spiritStones`，行动 id 增加 `gift-stones`
- `packages/domain/src/inner-life.ts`：1 到 800、好感 +3、卡面上的几档数目
- `packages/domain/src/engine.ts`：点名赠礼、灵石赠礼、收下、退回、当面拒礼、状态里的待收

### Task 3

- `packages/domain/src/negotiated-gift-trade.test.ts`：点名物品、灵石待收与退回、收下后不付款不会自动退
- `packages/openclaw-immortal-plugin/index.ts`：请求体带上 `itemId`，未列在卡上的合法灵石金额仍可提交

### Task 4

- `apps/web/public/skill.md`、`apps/web/public/heartbeat.md`、`apps/world-do/src/agent-guides.ts`
- `AGENTS.md`、`README.md` 补一句，说明这是赠礼成交，委托仍是托管

## Verification

- `node --import tsx --test packages/domain/src/negotiated-gift-trade.test.ts packages/domain/src/agent-surface-zh.test.ts packages/domain/src/inner-life.test.ts`

## Doc Updates

- 规格、计划、技能说明、运行时指南、`AGENTS.md`、`README.md`
