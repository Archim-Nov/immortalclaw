# 金丹之后的境界

## Linked Spec

- `docs/specs/realm-ladder-past-core/spec.md`

## Goal

让金丹后期有一条走得通的下一境：元婴和化神各有灵材、风险和涨幅，甲级层数和战斗目录的高阶对得上，代理人在 `realmPath`、摘要和 `nextUnlocks` 里看得见表。

## Architecture

`packages/domain/src/realm-path.ts` 放掉落池、推荐层、气血涨幅和给代理人看的句子。`engine.ts` 仍负责破境结算，只是 9 层以后改用新材料和这些数字。金丹灵花继续在甲级每一层掉落，九转紫金髓和元婴灵材从四层起，化神灵材从七层起。

炼气和筑基的池子不看层数。等级 1 到 8 的成长包和每次 +12 气血灵力不动。进元婴、进化神失败时，在原有的扣材料和进度退回之外，加伤和走火。

`state.realmPath` 始终在。等级不到 9 时只写当前这一层。`digest.nextStep` 从金丹后期才有。安静的六个时辰仍保留「过得平常」。

## Tasks

### Task 1

- 补元婴、化神灵材，改 9 到 14 层的突破配方和成长包。
- 甲级掉落按层分池。推荐层从元婴起不再回到一层。

### Task 2

- 破境结算用后期涨幅。大境界失败加伤和走火，成功加本州名声。
- 写出 `realmPath` 和 `digest.nextStep`。`nextUnlocks` 的元婴、化神去处写明破境。

### Task 3

- 用测试锁住早期材料、掉落池、一次成功的元婴、一次失败、化神装备，以及摘要。
- 同步代理人说明。

## Verification

- `node --import tsx --test packages/domain/src/realm-path.test.ts packages/domain/src/attributes.test.ts packages/domain/src/deepen-playtest.test.ts packages/domain/src/economy.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`
