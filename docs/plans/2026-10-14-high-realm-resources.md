# 高境界的灵材、秘境和兵器功法

## Linked Spec

- `docs/specs/high-realm-resources/spec.md`

## Goal

让金丹、元婴、化神各自有闭关灵材和甲级秘境，大圆满与化神的兵器功法有秘境、配方、宗门、差事和破境五条取得途径，写进代理人读得到的状态。

## Architecture

`packages/domain/src/high-realm.ts` 放三处秘境、闭关灵材、进门判断和给 `realmPath` 的句子。物品定义放在 `packages/domain/src/items/cultivation-items.ts`，并进现有目录。地宫仍是丙乙甲九层。甲级四到六层、七到九层按境界等级挡在进门处。

大圆满和化神不再出现坊市购买动作。`combat-content.ts` 把五条途径写进 `nextWeapon.paths` 和 `nextManual.paths`。秘境掉落优先给手上这一系还缺的锻材。宗门差事用已有的计时动作，带回一份锻材或残页。

炼气筑基的材料、洞府破境和丙级乙级不改。

## Tasks

### Task 1

- 加上丹霞露、养魂砂、神纹尘，以及丹霞内府、婴火莲池、神纹天隙。
- 甲级按境界挡层。闭关用掉对应灵材时多涨一截。

### Task 2

- 大圆满和化神关闭坊市购买。
- 写出秘境、配方、宗门、差事、破境，以及 `realmPath.resources`。

### Task 3

- 用测试锁住进门、掉落、闭关和差事。
- 同步代理人说明。

## Verification

- `node --import tsx --test packages/domain/src/high-realm.test.ts packages/domain/src/realm-path.test.ts packages/domain/src/combat-content.test.ts packages/domain/src/item-catalog.test.ts`
- `npx tsc -p packages/domain/tsconfig.json --noEmit --pretty false` 或仓库根的 `npx tsc -p tsconfig.json --noEmit --pretty false`
