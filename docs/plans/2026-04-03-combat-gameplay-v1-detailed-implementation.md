# Combat Gameplay V1 Detailed Implementation Plan

> Current execution reference has moved to `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`.
> This file is preserved as the earlier reduced-scope “damage-first” combat V1 draft and is no longer the current implementation plan.

## Linked Spec

- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/specs/combat-gameplay-v1/registration-action-weight-table.md` (V1 now includes initiative / hit / crit combat resolution; see `2026-04-04-combat-gameplay-v1-light-complete-implementation.md` for current execution reference)

## Goal

把当前仓库里的单次 `power vs threat` 战斗，升级为一个按 `world tick` 推进的单人 PVE 战斗 V1，并明确冻结当前真正实现的最小集合：三路线、服务端评分选路、兵器通道底盘伤害、真实战斗日志。

## Scope Freeze

- 本轮只做 `单人 PVE`
- 本轮只做 `hunt-mine-beast` 与 `challenge-guardian`
- 本轮只做 `蛮力 / 巧劲 / 战术` 三路线，不做五动作体系
- 本轮默认只走 `兵器` 通道，`法术` 通道只留接口
- 本轮不做：
  - 命中 / 闪避
  - 速度 / 先手
  - 会心 / 暴伤
  - 控制 / 状态附着
  - 五行战斗内结算
  - 完整兵器家族与 `18` 把兵器细分
  - 组队副本 / PvP / 宗门战

## Runtime Model

- 战斗继续通过现有 action 进入，不新增独立“开战”指令
- 进入战斗后创建一个 timed `combat job`
- `advanceWorld()` 每推进 `1` 个 tick，战斗 job 就推进 `1` 个战斗轮
- 回合上限固定为：
  - 矿脉妖兽：最多 `5` 回合
  - 遗迹守关者：最多 `7` 回合
- 战斗提前终止条件固定为：
  - 任一方生命降到结束阈值
  - 达到回合上限
  - 前置条件在写回前发现状态失效时直接按失败结算

## Data Model Changes

### `CultivatorStateView.combatProfile`

新增 `combatProfile`，至少包含：

- `battleReadiness`
- `attackChannel`
- `coreCombatStats`
- `combatTraits`

推荐字段形态：

- `battleReadiness: "poor" | "stable" | "ready" | "advantaged"`
- `attackChannel: "weapon" | "spell"`
- `coreCombatStats`
  - `weaponAttack`
  - `spellAttack`
  - `physicalDefense`
  - `spellDefense`
- `combatTraits`
  - `styleBias`
  - `dominantStyle`
  - `registrationBiasSummary`

### 新增内部类型

- `CombatStyle = "brute" | "finesse" | "tactic"`
- `AttackChannel = "weapon" | "spell"`
- `CombatSnapshot`
- `CombatJobState`
- `CombatRoundLog`
- `CombatDamageBreakdown`
- `EncounterTemplate`

### `CombatSnapshot`

至少包含：

- `cultivatorId`
- `currentHp`
- `currentSpirit`
- `attackChannel`
- `weaponAttack`
- `spellAttack`
- `physicalDefense`
- `spellDefense`
- `mainAttributes`
  - `bingpo`
  - `shenfa`
  - `daoxin`
  - `tipu`
  - `lingyuan`
  - `gengu`
  - `shenshi`
  - `wuxing`
- `styleBias`
- `statusEffects`

说明：

- 运行时当前代码字段名仍是 `wuxing`
- 在本计划语义上，它对应的是主属性里的 `悟性`，不是战斗内的五行元素值

### `CombatJobState`

至少包含：

- `encounterTemplateId`
- `round`
- `maxRounds`
- `player`
- `enemy`
- `rounds`
- `result`

### `CombatRoundLog`

至少包含：

- `round`
- `playerStyle`
- `enemyStyle`
- `playerDamage`
- `enemyDamage`
- `playerBreakdown`
- `enemyBreakdown`
- `playerHpAfter`
- `enemyHpAfter`

### `CombatDamageBreakdown`

至少包含：

- `baseAttack`
- `baseDefense`
- `baseDamage`
- `styleMultiplier`
- `counterMultiplier`
- `finalDamage`

## Combat Loop

每场战斗固定按以下顺序推进：

1. 进入战斗前检查
2. 生成我方 / 敌方战斗快照
3. 初始化 `CombatJobState`
4. 每回合双方各自选一条路线
5. 计算双方本回合伤害
6. 同步扣减生命
7. 写入回合日志
8. 检查是否终局
9. 未终局则等待下一次 `advanceWorld()` 继续
10. 终局时统一写回 summary、掉血、失败成本、奖励和战斗日志

### 进入战斗前检查

- readiness 不得为 `poor`
- 当前不得有互斥 job
- 场景必须允许对应 action
- 当前生命、灵力不得低于该遭遇最低开战阈值

### 快照生成

- 玩家快照来自当前 cultivator 状态
- 敌方快照来自 `EncounterTemplate`
- 当前 V1 的 `attackChannel` 默认写死为 `"weapon"`

### 生命结算

- 每回合双方都先算伤害，再同步扣血
- 不做“先手秒掉后对面不出手”的分支
- 若同步结算后双方都降到结束阈值，优先按“双败但玩家失败”写回，避免产生免费高收益

### 回合上限结算

- 回合上限是硬上限
- 到达 `maxRounds` 后，当轮结算完成即自动结束战斗
- 若双方在上限轮结束后都仍存活，则比较双方剩余生命比例：
  - `剩余生命比例 = currentHp / maxHp`
  - 玩家更高：判玩家胜利
  - 敌人更高：判玩家失败
  - 双方相同：按玩家失败处理
- 到上限时不进入加时，不再创建额外回合

## Route Selection

### 评分公式

当前 V1 固定为：

`StyleScore = staticBias + battleStateBias + smallRandom`

其中：

- `staticBias = registrationBias + attributeStyleBias`
- `battleStateBias` 只做最小局内修正
- `smallRandom` 只用于避免每回合完全同招

### 注册偏好

- 只接 `core_temperament`
- 只接 `behavior_aspect`
- `secondary_temperament` 与 `cultivation_motive` 保留接口，不进入 V1 评分器

### 采样方式

固定为 `Top 2` 加权抽样：

1. 计算三路线 raw score
2. 按分数从高到低排序
3. 只保留前两名
4. 将前两名分数转换为正权重：
   - `sampleWeight = rawScore - top2MinScore + 1`
5. 在前两名之间按权重随机选择

### 最小局内修正

当前 V1 只保留两条 `battleStateBias`：

- 自身生命比例 `<= 35%`：
  - `brute -1`
  - `finesse 0`
  - `tactic +1`
- 目标生命比例 `<= 25%`：
  - `brute +1`
  - `finesse 0`
  - `tactic -1`

### `smallRandom`

- 每条路线加入 `0 ~ 1` 的小随机
- 小随机只负责打破完全固定循环，不能压过主偏好

## Damage Model

### 攻防底盘

- `兵器攻击力 = 20 + 0.60 × 体魄`
- `法术攻击力 = 20 + 0.60 × 灵元`
- `物防 = 8 + 0.45 × 根骨`
- `法防 = 8 + 0.45 × 神识`

当前 V1 默认只使用：

- 攻击端：`兵器攻击力`
- 防守端：`物防`

### 底盘伤害

`底盘伤害 = max(1, 攻击力 - 防御力 × 0.5)`

### 三路线主属性系数

路线映射固定为：

- `蛮力 -> 兵魄`
- `巧劲 -> 身法`
- `战术 -> 道心`

三路线系数固定为：

- `三轴平均 = (兵魄 + 身法 + 道心) / 3`
- `蛮力系数 = 1 + clamp((兵魄 - 三轴平均) × 0.01, -0.15, 0.15)`
- `巧劲系数 = 1 + clamp((身法 - 三轴平均) × 0.01, -0.15, 0.15)`
- `战术系数 = 1 + clamp((道心 - 三轴平均) × 0.01, -0.15, 0.15)`

### 克制关系

固定为：

- `战术克蛮力`
- `蛮力克巧劲`
- `巧劲克战术`

倍率固定为中克制：

- 克制方：`1.15`
- 被克方：`0.90`
- 中性：`1.00`

### 最终伤害

`最终伤害 = 底盘伤害 × 路线主属性系数 × 克制系数`

### 主属性分工

当前 V1 明确冻结为：

- `体魄`：兵器攻击底盘
- `灵元`：法术攻击底盘
- `根骨`：物防
- `神识`：法防
- `兵魄`：蛮力路线系数
- `身法`：巧劲路线系数
- `道心`：战术路线系数
- `悟性`：暂不进入 V1 最小伤害公式

## Encounter Templates

### 矿脉妖兽模板

- `maxRounds = 5`
- 基础血量：中等
- 风格偏好：`brute > finesse > tactic`
- 属性档位：体魄与根骨偏高
- 奖励：矿材、灵石、低阶掉落
- 失败成本：轻中度生命损失，概率附带轻伤

### 遗迹守关者模板

- `maxRounds = 7`
- 基础血量：偏高
- 风格偏好：`tactic > brute > finesse`
- 属性档位：根骨与道心偏高
- 奖励：遗迹素材、守关奖励、阶段推进收益
- 失败成本：更高生命损失，更高受伤概率

### 模板字段最低要求

每个 `EncounterTemplate` 至少包含：

- `id`
- `label`
- `baseHp`
- `baseSpirit`
- `styleBias`
- `attributeProfile`
- `maxRounds`
- `rewardProfile`
- `failureCost`

## Combat Logs

### Summary 日志

每场战斗结束后至少写出：

- `encounterTemplateId`
- `outcome`
- `totalRounds`
- `hpLost`
- `spiritLost`
- `injuryChange`
- `loot`
- `summary`

### 回合级日志

每回合必须写出：

- `round`
- `playerStyle`
- `enemyStyle`
- `playerBreakdown`
- `enemyBreakdown`
- `playerHpAfter`
- `enemyHpAfter`

### 伤害拆解日志

`CombatDamageBreakdown` 必须让人直接看到：

- `baseAttack`
- `baseDefense`
- `baseDamage`
- `styleMultiplier`
- `counterMultiplier`
- `finalDamage`

### 已知问题修复要求

- 必须修掉当前“实际受伤但 `damageTaken = 0`”的问题
- 战败日志必须能真实反映生命损失与失败成本

## Implementation Phases

### Phase 1：类型与视图

- 更新 `packages/domain/src/model.ts`
- 为状态视图补上 `combatProfile`
- 为日志补上 `rounds` 与 `CombatDamageBreakdown`
- 定义 `CombatStyle`、`AttackChannel`、`CombatSnapshot`、`CombatJobState`、`EncounterTemplate`

### Phase 2：评分器与三路线选择

- 在 `packages/domain/src/engine.ts` 或配套战斗 helper 中加入三路线评分器
- 接入 `core_temperament + behavior_aspect`
- 固定 Top 2 加权抽样
- 敌我共用同一评分器

### Phase 3：最小伤害公式接入 `hunt-mine-beast`

- 为矿脉妖兽建立首个 `EncounterTemplate`
- 把 `hunt-mine-beast` 从一次性结算改成 `5` 回合战斗 job
- 接入最小伤害公式和回合日志

### Phase 4：接入 `challenge-guardian`

- 为守关者建立 `EncounterTemplate`
- 把 `challenge-guardian` 改成 `7` 回合战斗 job
- 复用同一评分器和最小伤害公式

### Phase 5：日志完善与文档收尾

- 补齐 summary 日志与回合日志
- 对齐状态视图与 agent 可读性
- 更新主 spec、旧计划说明和注册偏好参数表

## Verification

### 属性测试

- 三轴平均值系数正确
- `悟性` 不影响当前 V1 最小伤害
- `兵器攻击力 / 物防` 公式正确

### 克制测试

- `蛮力克巧劲`
- `巧劲克战术`
- `战术克蛮力`

### 评分器测试

- Top 2 加权抽样只在前两高分中取样
- 注册偏好能稳定影响三路线选择

### 状态机测试

- 战斗 job 能创建
- 每 tick 推进一轮
- `5 / 7` 回合上限正确结束
- 到回合上限后会自动结束，并按剩余生命比例正确判胜负

### 日志测试

- 战败后真实写出生命损失和失败成本
- 回合日志包含伤害拆解

### 兼容性测试

- 旧 action id 不变
- 旧 `recentCombats` 读取路径继续可用

### 建议验证命令

- `node --import tsx --test packages/domain/src/attributes.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Sync

本轮至少同步这些文档：

- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- `docs/plans/2026-03-14-combat-gameplay-v1.md`
- `docs/plans/2026-04-03-combat-gameplay-v1-detailed-implementation.md`
