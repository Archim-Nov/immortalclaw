# 炼虚、合体、大乘的兵器与功法

## Linked Spec

- `docs/specs/combat-ladder-past-spirit/spec.md`

## Goal

把兵器家族、兵器专属和五门灵根功法从化神续到炼虚、合体、大乘，并接上不经过坊市的获取途径。

## Architecture

招式目录仍由 `combat-catalog.ts` 汇总。新的三档写在 `combat-catalog-later.ts`，门和境界门槛跟原来的 `skill()` 同一套。

兵器和功法的装配在 `combat-loadouts.ts` 上从第五阶续到第八阶。物品、锻材、残页和洞府配方跟着装配表生成。状态数值和兵器加成各续三档，避免高阶装配读到空值。

`combat-content.ts` 的境界档加上 16、19、22。坊市仍只卖前三阶。第六阶起的说明不写行动标识。神纹天隙和凉州、雷州灵脉，在人已经到了炼虚并且下一件东西属于这三档时，掉还缺的那一档。

## Tasks

### 目录

- 家族两式、灵根两式、二十种兵器专属，炼虚、合体、大乘各一份。
- 境界、阶、熟练三道门沿用原来的判断。

### 装配和获取

- 二十种兵器、十五支功法各加三件，中文名写进装配。
- 宗门贡献门槛 320、440、580。洞府配方费用和耗时跟着加。
- 甲级七到九层和化神后期以后的灵脉，掉当前还缺的高阶锻材或残页。

### 说法

- 破境句子不再说兵器和功法停在化神。
- `realmPath.catalogTier` 跟着当前境界档走。

## Verification

- `node --import tsx --test packages/domain/src/combat-ladder-past-spirit.test.ts packages/domain/src/combat-content.test.ts packages/domain/src/combat-statuses.test.ts packages/domain/src/above-spirit.test.ts packages/domain/src/high-realm.test.ts packages/domain/src/realm-path.test.ts`

## Doc Updates

- `AGENTS.md`
- `README.md`
- `docs/specs/README.md`
- `docs/specs/realms-above-spirit/spec.md`
- `harness/README.md`
- `harness/scenarios/combat-ladder-past-spirit.md`
