# 战斗注册标签三路线偏好权重表

## Summary

本文用于承接 `combat-gameplay-v1` 当前真正进入实现的三路线评分器，把 `core_temperament` 与 `behavior_aspect` 如何映射到 `brute / finesse / tactic` 的偏好分单独冻结为一份实现参数文档。

本文只服务于当前战斗 V1。旧的 `快攻 / 普攻 / 核心技 / 重招 / 防御` 五动作设计保留为后续扩展方向，不是当前实现要求。

如与以下文档冲突，以这些文档为准：

- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`

## 1. 文档定位

当前三路线评分器明确遵循：

- 不额外发明独立人格系统
- 直接复用注册层已有 taxonomy
- 当前 V1 只硬接 `core_temperament` 与 `behavior_aspect`
- `secondary_temperament` 与 `cultivation_motive` 先保留接口，不进入当前评分器

**V1 更新（2026-04-04）**：当前 V1 已扩展为 `light-complete` 并包含以下新增内容：
- 初始化 / 先手判定（`速度 + 准备度修正 + 路线修正 + 小随机`）
- 命中 / 闪避判定
- 会心 / 暴伤判定

路线权重表本身仍保持不变，但注册标签现在驱动的战斗行为选择会在上述新增结算规则中被激活。冻结的兵器家族路线加成持续保持为：
- `蛮力（brute）` +8% 最终伤害
- `巧劲（finesse）` +8 先手 +5 闪避
- `战术（tactic）` +5 命中 +4% 会心几率

## 2. 路线集合

当前 V1 评分器只面向以下 3 条路线：

- `brute`
- `finesse`
- `tactic`

运行时含义固定为：

- `brute`：正面压制、硬碰硬、吃兵魄的出手
- `finesse`：轻灵、抢位、吃身法的出手
- `tactic`：算路、反制、吃道心的出手

## 3. 权重边界

当前冻结：

- `core_temperament` 权重范围：`-2 ~ +2`
- `behavior_aspect` 权重范围：`-1 ~ +1`
- `core_temperament` 是主导项
- `behavior_aspect` 是节奏修正项

本文只冻结 `registrationBias`，不冻结 `attributeStyleBias`、`battleStateBias` 或随机项。

## 4. 合成公式

当前 V1 的注册偏好分按以下方式合成：

`registrationBias[style] = coreTemperamentWeight[style] + behaviorAspectWeight[style]`

进入运行时总评分时，固定为：

`StyleScore = staticBias + battleStateBias + smallRandom`

其中：

- `staticBias = registrationBias + attributeStyleBias`
- `battleStateBias` 是局内生命态势修正
- `smallRandom` 是 `0 ~ 1` 的小随机

## 5. 核心心性三路线权重表

说明：下表以 taxonomy 展示名书写，运行时必须使用对应稳定 ID。

| `core_temperament` | `brute` | `finesse` | `tactic` |
| --- | --- | --- | --- |
| `守戒型` | `-1` | `-1` | `+2` |
| `断锋型` | `+2` | `0` | `-1` |
| `扶生型` | `-2` | `0` | `+2` |
| `向荣型` | `0` | `+1` | `+1` |
| `潜渊型` | `-1` | `0` | `+2` |
| `观澜型` | `-1` | `0` | `+2` |
| `炽心型` | `+1` | `+1` | `0` |
| `争胜型` | `+2` | `+1` | `-2` |
| `镇岳型` | `+1` | `-2` | `+2` |
| `守成型` | `-1` | `0` | `+2` |

## 6. 行事相三路线权重表

说明：行事相负责节奏修正，不负责彻底推翻本命心性的长期偏好。

| `behavior_aspect` | `brute` | `finesse` | `tactic` |
| --- | --- | --- | --- |
| `裁断` | `+1` | `0` | `0` |
| `生发` | `0` | `+1` | `0` |
| `观势` | `-1` | `0` | `+1` |
| `烈行` | `+1` | `+1` | `-1` |
| `镇持` | `0` | `-1` | `+1` |
| `砺生` | `0` | `+1` | `0` |
| `冷鉴` | `-1` | `0` | `+1` |
| `烈锋` | `+1` | `+1` | `-1` |
| `守序` | `0` | `-1` | `+1` |
| `润悟` | `-1` | `+1` | `+1` |
| `荣焰` | `+1` | `+1` | `0` |
| `厚培` | `-1` | `0` | `+1` |
| `潜燃` | `+1` | `0` | `0` |
| `潜守` | `-1` | `-1` | `+2` |
| `炽垒` | `+1` | `0` | `+1` |

## 7. 采样方式

当前 V1 固定为 `Top 2` 加权抽样：

1. 先计算三路线 `StyleScore`
2. 按分数从高到低排序
3. 只保留前两名
4. 采样权重按以下方式转正：
   - `sampleWeight = rawScore - top2MinScore + 1`
5. 在前两名之间按权重随机选出本回合路线

这意味着：

- 第一偏好仍然最常出现
- 第二偏好仍然有出手机会
- 最后一名不会在当前回合被选中

## 8. 首版解释口径

当前首版解释口径冻结为：

- `core_temperament` 决定长期主打法
- `behavior_aspect` 决定当前更倾向怎么处理这一回合
- `attributeStyleBias` 决定这名角色天生更适合哪条路线
- `battleStateBias` 决定低血量或斩杀窗口时是否偏离默认偏好

## 9. 运行时约束

首版继续冻结：

- 行为标签只通过稳定 taxonomy IDs 进入运行时
- 不允许基于中文标签字符串写分支逻辑
- 注册偏好只能影响“更倾向怎么打”，不能绕开当前 V1 的路线系数和克制规则
- 若后续新增 taxonomy，优先在本文追加映射，而不是散落回主 spec 正文
