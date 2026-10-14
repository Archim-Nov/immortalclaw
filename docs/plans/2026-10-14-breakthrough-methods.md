# 破境方式按境界分开

## Linked Spec

- `docs/specs/breakthrough-methods/spec.md`

## Goal

让炼气和筑基继续用洞府破境，金丹、元婴、化神在状态和行动里各走一条看得见的做法，材料经济保持不动。

## Architecture

做法的句子和标识放在 `packages/domain/src/breakthrough-methods.ts`。`realm-path.ts` 用它填 `realmPath.method`、`methodName`、`sequence`，以及金丹后期起的 `digest.nextStep`。

`engine.ts` 仍负责材料是否齐、成功率、消耗和成长包。新的行动只决定地点、顺序、护法是否在场，以及失败或成功时多出来的伤和说法。多步仪式记在修士身上的 `breakthroughRite`，灯或神纹过期以后不扣材料。

## Tasks

### 做法和状态

- 在 `breakthrough-methods.ts` 写出六种做法：洞府、结丹仪、婴火淬体、魂灯守夜、天劫、神纹落印。
- `RealmPathView` 和 `BreakthroughStateView` 加上可选的 `method`、`methodName`、`sequence`。突破视图再加 `help` 和 `rite`。
- 炼气、筑基的句子仍指向 `residence-breakthrough`。

### 行动

- 新的计时行动：`core-rite:steady`、`core-rite:press`、`infant-fire-temper`、`begin-soul-vigil`、`face-tribulation`、`begin-divine-step`。
- 新的即时行动：`seal-soul-vigil`、`seal-divine-step`。
- 地点不对、没有护法、灯灭了、身上有伤，都用一句中文拒绝。
- 金丹以后再用 `residence-breakthrough`，拒绝并指向正确的行动。

### 成败

- 结丹催丹：成功，约四分之一留下短走火。
- 婴火：沿用大境界的成功涨幅。失败伤势比原来的六刻更重，日记写反噬。有同伴时成功率加一截。
- 天劫：一个人失败伤得更重。同伴在场则成功率更高，失败时雷分掉一点，同伴挂一点伤。
- 神纹：一个人落印会挂伤。有人看着则不挂这点伤。
- 魂灯和神纹的第一步不耗材料。

### 文档和验证

- 更新 `AGENTS.md`、`README.md`、面向代理人的说明，以及金丹之后那份说明里已经过时的「回洞府」句子。
- 每个境界带一条测试。炼气的洞府破境测试保持能过。

## Verification

- `npm test -- packages/domain/src/breakthrough-methods.test.ts packages/domain/src/realm-path.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/breakthrough-methods/spec.md`
- `docs/plans/2026-10-14-breakthrough-methods.md`
- `docs/specs/realm-ladder-past-core/spec.md`
- `harness/scenarios/realm-ladder-past-core.md`
- `harness/scenarios/breakthrough-methods.md`
- `harness/README.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
