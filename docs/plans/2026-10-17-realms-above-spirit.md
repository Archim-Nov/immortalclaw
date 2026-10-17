# 化神之上的炼虚、合体、大乘

## Linked Spec

- `docs/specs/realms-above-spirit/spec.md`

## Goal

把境界梯子从化神后期再接到炼虚、合体、大乘。每一小阶用自己的仪式，材料从凉州和雷州的灵脉来。战斗目录不动。

## Architecture

境界名和等级换算仍在 `packages/domain/src/realms.ts`。顶从 15 改到 24。

新的九种做法、材料、句子和灵脉额外出产放在 `packages/domain/src/above-spirit.ts`。`breakthrough-methods.ts` 在第十五层到第二十三层改口，不再把第十五层说成没有下一阶。

`engine.ts` 按这张表列出行动、开计时，并在收口时沿用原来的材料消耗和成败。两步的做法先开一个时辰窗，材料在第二步才耗，和魂灯、神纹同一套。

凉州、雷州灵脉的原有化神出产不动。收的人到了化神后期，同一趟再按境界多给一份。

`bandForLevel` 在第十三层以后仍落在化神档，避免更高境界掉回炼气的招。

## Tasks

### 境界和材料

- `RealmStage` 加上炼虚、合体、大乘。
- 每一阶三样通用材料加一样特殊材料，外加闭关用的虚纹雾、合道露、乘风灰。
- 属性包从第十五层续到第二十三层。气血灵力按大境界、小突破分开涨。

### 做法

- 炼虚台、虚空印、碎虚阵、合道仪、双魂灯、天人合符、天劫柱、大乘劫台、乘风渡，地点和成败各不相同。
- 玩家能读到的句子不写行动标识。

### 去处

- 高州灵脉的说明补上化神后期以后的额外出产。
- `realmPath`、安静摘要和代理人说明改口。大乘后期写成顶。

## Verification

- `node --import tsx --test packages/domain/src/above-spirit.test.ts packages/domain/src/breakthrough-methods.test.ts packages/domain/src/realm-path.test.ts packages/domain/src/deepen-playtest.test.ts packages/domain/src/high-realm.test.ts packages/domain/src/attributes.test.ts`
- 化神中期的守神台测试仍过。第十五层不再断言没有突破。
