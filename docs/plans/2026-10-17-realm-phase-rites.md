# 元婴和化神按阶段换做法

## Linked Spec

- `docs/specs/realm-phase-rites/spec.md`

## Goal

让元婴前期炼婴、中期守魂灯、后期渡劫，化神前期铺神纹、中期守神台。材料层和涨幅保持不动。

## Architecture

做法的句子仍放在 `packages/domain/src/breakthrough-methods.ts`。`breakthroughMethodIdForLevel` 按境界等级返回不同的 `method`，不再把十层和十一层、十三层和十四层并成同一种。

`engine.ts` 增加两个计时行动：`refine-nascent`、`hold-divine-platform`。材料是否齐、消耗和成长包沿用原来的突破定义。同伴只决定做成以后挂不挂那一点伤，并写进见闻。

`quietMethodStep` 按十、十一、十二、十三、十四、十五层分开写。十三层和十四层不再掉进「下一阶是化神，去迎天劫」。

## Tasks

### 做法

- 新增 `nascent-refine` 与 `divine-vigil`。
- 元婴中期的魂灯、元婴后期的天劫、化神前期的神纹保持原来的行动。天劫的玩家可见名字写成渡劫。
- 安静摘要和 `realmPath.sequence` 用中文，不写行动标识。

### 行动和见闻

- 炼婴只在宗门驻地或甲级门口出现。守神台只在荒野或甲级门口出现。
- 材料不齐或拿错特殊材料时拒绝，背包不变。
- 见闻标题仍是「破境」，正文与生平同一句。
- 运功回执不再把 `realmPath` 写进人能读到的句子。

### 文档

- 更新 `AGENTS.md`、`README.md`、`apps/web/public/skill.md`、`apps/world-do/src/agent-guides.ts` 和对应的 harness 场景。
- 旧的破境说明顶部加一句，指向这份规格，避免把两层小突破仍读成同一颗按钮。

## Verification

- `node --import tsx --test packages/domain/src/breakthrough-methods.test.ts packages/domain/src/realm-path.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/realm-phase-rites/spec.md`
- `docs/specs/README.md`
- `docs/specs/breakthrough-methods/spec.md`
- `docs/specs/realm-ladder-past-core/spec.md`
- `harness/scenarios/breakthrough-methods.md`
- `harness/README.md`
- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
