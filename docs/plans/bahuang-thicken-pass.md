# 八荒再厚一层，八荒令三条路

## Linked Spec

- `docs/specs/bahuang-thicken-pass/spec.md`

## Goal

让八荒令从坊市、荒野、地宫都能来到，并把八荒的灵石和中途岔路加厚，同时把进门的感应和贡献稍微放松。

## Architecture

掉落判定放在 `packages/domain/src/eight-wastes-pass.ts`。荒野巡查、猎兽、岔路和层内抽签都走同一个函数，同一次进层用 `passFound` 挡住第二枚。地宫在结账时按阶位和结果抽一次，抽中的票算进旁支，摘要另写一句。

奖励数字仍在 `packages/domain/src/seed.ts` 的 `rewardTable`。岔路文案仍在 `bahuang-scenes.ts`，结算仍在 `bahuang-service.ts`。时辰到了的路径不调用选项效果。

## Tasks

### Task 1

- 八荒令改称八荒令，标签带上荒野和地宫来源。
- 坊市购买保持原价。
- 荒野四处调用抽签。地宫四阶及以上的撤出和走完调用抽签。

### Task 2

- 提高每步灵石、修为、稀有率、走完加奖和岔路摸到的灵石。
- 撤出扣石一并提高。
- 三段各加一处岔路和两句见闻。

### Task 3

- 感应改为 40，贡献改为 120。
- 补测试，并改 `AGENTS.md`、`skill.md`、heartbeat 和 README。

## Verification

- `node --import tsx --test packages/domain/src/bahuang.test.ts packages/domain/src/bahuang-midrun.test.ts packages/domain/src/bahuang-ticket.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/wild-places.test.ts packages/domain/src/wild-beats.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`

## Doc Updates

- `docs/specs/bahuang-thicken-pass/spec.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
