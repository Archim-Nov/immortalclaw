# Breakthrough Growth V1

## Summary

本 spec 为当前已经落地的显式突破流程补上"成长结果"合同。
成功突破不再只改变境界、资源上限与寿元，还要授予有方向性的主属性成长包与五行成长包——成长方向由角色灵根/五行亲和决定，灵根相关的核心属性大幅成长，其余属性微量成长；五行成长同样按灵根锚点集中分配。当前灵根也不再等于登记时的一次性文本，而是由"登记基线五行 + 突破成长五行"实时解释出的运行时结果。

## Problem

当前 live runtime 已经把突破做成了明确动作与材料链，但成长层仍然停留在半完成状态：

- 突破成功后只增加 `maxQi`、`maxSpiritualPower`、`lifespan`
- `mainAttributes` 仍然只来自 `registrationRecord`
- `fiveElementScores` 仍然只来自登记结果
- `spirit_root_result` 是注册时生成的一次性文本，不会反映后续成长

这会造成三个问题：

- 升阶在玩法上成立了，但在属性层和灵根层没有真实成长反馈
- 登记问卷变成了角色强度的唯一长期来源，不符合"注册决定风格，成长决定后劲"的设计目的
- 当前 UI 和 agent state 无法区分"登记灵根"和"当前灵根"，信息表达失真

## Goals

- 为 live `realmLevel 1..9` 的每个突破槽位定义明确的、可配置的成长包。
- 让 8 个主属性在突破成功后获得**有方向性**的成长——由灵根/五行亲和决定核心属性，核心属性大涨、其余微涨——并继续驱动 15 个详细属性。
- 让 5 个五行属性在突破成功后增长，并让灵根随最终五行分布演进。
- 成长预算表必须是表驱动的可配置数据，方便后续境界扩展时实现爆发式成长。
- 保持 `registrationRecord` 作为不可变起点，不重做 18 题问卷与 taxonomy。
- 保持当前突破成功率合同：大突破成功率仍然只依赖临时状态，不依赖登记、灵根或隐藏资质。
- 保持当前显式突破、材料链和 action-first 世界循环不变。

## Non-Goals

- 不引入自由加点、洗点或属性点分配界面。
- 不重启 `人道 / 地道 / 天道` 分支。
- 不改写 15 个详细属性公式。
- 不重做五行与主属性之间的深层耦合公式。
- 不在本 spec 内重新启用境界倍率乘区。
- 不一次性重做战斗、经济和世界数值平衡。
- 不改变现有 `ELEMENT_ATTRIBUTE_DELTAS` 五行→主属性亲和映射的具体数值。

## User-Visible Behavior

- 玩家或 Agent 在突破前查看 `state.breakthrough` 时，可以看到本次成功后会授予的主属性成长和五行成长预览。
- 成功突破后，`mainAttributes`、`fiveElementScores`、`detailedAttributes` 立即更新。
- 角色页和 Agent state 同时保留两层信息：
  - 登记灵根：注册时得到的 origin profile
  - 当前灵根：按当前最终五行分布解释出的运行时灵根
- 失败突破不授予任何成长包。

## Constraints

- 当前 live 只覆盖 `炼气 / 筑基 / 金丹` 与 `realmLevel 1..9`。
- 当前突破流程、材料链、显式 action 和成功率规则已经是 live 合同，不能被这次设计推翻。
- `registrationRecord` 必须保持不可变；成长不能写回登记结果。
- 旧存档必须通过默认零增量完成兼容，不要求清档。
- 属性、五行和灵根仍然是 action-first 世界玩法的修正层，而不是独立主玩法。

## Mechanics

### 1. Growth Layering

突破成长采用"登记基线 + 持久化增量 + 百分比加成"的三层结构：

- `registrationBaselineMainAttributes = deriveMainAttributes(registrationRecord)`
- `registrationBaselineFiveElementScores = extractFiveElementScores(registrationRecord)`
- `mainAttributeGrowth`：Cultivator 上的 8 主属性累计固定成长增量
- `fiveElementGrowth`：Cultivator 上的 5 五行累计成长增量
- `mainAttributePercentageBonus`：Cultivator 上的主属性累计百分比加成（整数，单位为百分点）

运行时最终值按如下顺序计算——**先加固定值，再乘百分比**：

- `flatMainAttributes = registrationBaselineMainAttributes + mainAttributeGrowth`
- `effectiveMainAttributes = floor(flatMainAttributes × (1 + mainAttributePercentageBonus / 100))`
- `effectiveFiveElementScores = registrationBaselineFiveElementScores + fiveElementGrowth`
- `detailedAttributes = deriveDetailedAttributes(effectiveMainAttributes)`

百分比加成为固定的升阶奖励，不受灵根方向影响：

- minor 突破：`+2%`
- major 突破：`+5%`

当前 8 个突破槽位全部完成后，累计百分比加成 = 6 × 2% + 2 × 5% = **22%**。

本 spec 只补上加法成长层与百分比乘区，不在本轮重新启用境界倍率乘区。
若未来重新接入境界倍率，其作用对象也应是 `effectiveMainAttributes`（已含百分比加成），而不是回退到登记基线。

### 2. Directed Main-Attribute Growth

突破成长**不再均匀分配到 8 个主属性**，而是按角色灵根/五行亲和决定的方向进行有针对性的分配。

#### 2.1 Element-Attribute Affinity Table

沿用 live 代码中 `ELEMENT_ATTRIBUTE_DELTAS` 定义的正权重属性作为该元素的"核心属性"：

| Element | Core Attribute 1 (weight) | Core Attribute 2 (weight) | Core Attribute 3 (weight) |
| --- | --- | --- | --- |
| 金 metal | 秉魄 bingpo (3) | 神识 shenshi (2) | 道心 daoxin (1) |
| 木 wood | 悟性 wuxing (3) | 根骨 gengu (2) | 灵渊 lingyuan (1) |
| 水 water | 道心 daoxin (3) | 神识 shenshi (2) | 身法 shenfa (1) |
| 火 fire | 灵渊 lingyuan (2) | 身法 shenfa (2) | 秉魄 bingpo (2) |
| 土 earth | 根骨 gengu (2) | 体魄 tipu (2) | 道心 daoxin (2) |

每个元素恰好有 3 个核心属性。括号中的数字即为该核心属性在元素内的亲和权重。

#### 2.2 Growth Budget Distribution

每次成功突破获取的主属性成长总预算按如下规则分配：

- **核心预算 70%**：按灵根锚点元素的亲和权重比例分配给核心属性。
- **非核心预算 30%**：在剩余 5 个非核心属性之间均分。
- 所有取整余量向权重最高的核心属性倾斜。

#### 2.3 Single-Root Distribution

单灵根角色的核心预算 100% 跟随主灵根元素的亲和权重分配。

**示例**：金单灵根，major 突破 (总预算 100)

| Attribute | Allocation | Amount |
| --- | --- | --- |
| 秉魄 bingpo | core 70% x 3/6 | **35** |
| 神识 shenshi | core 70% x 2/6 | **24** |
| 道心 daoxin | core 70% x 1/6 | **12** |
| 其余 5 属性 | non-core 30% / 5 | **6** each |

总计：35 + 24 + 12 + (6 x 5) = 101 → 取整时余量向 bingpo 倾斜，实际分配 = 100。

#### 2.4 Dual-Root Distribution

双灵根角色的核心预算按 50/50 拆分给两个锚点元素，各自按其亲和权重独立分配。
若两个元素有重叠的核心属性，该属性的成长量为两侧之和。

**示例**：水火双灵根，major 突破 (总预算 100)

水行核心预算 = 100 x 70% x 50% = 35

| Attribute | Weight | Amount |
| --- | --- | --- |
| 道心 daoxin | 3/6 | 18 |
| 神识 shenshi | 2/6 | 12 |
| 身法 shenfa | 1/6 | 6 |

火行核心预算 = 100 x 70% x 50% = 35

| Attribute | Weight | Amount |
| --- | --- | --- |
| 灵渊 lingyuan | 2/6 | 12 |
| 身法 shenfa | 2/6 | 12 |
| 秉魄 bingpo | 2/6 | 12 |

合并核心：道心 18、神识 12、身法 18、灵渊 12、秉魄 12 = 72
非核心：根骨、体魄、悟性，各 30 / 3 = 10，共 30
总计 = 102 → 取整时余量从最高权重核心属性扣回，实际 = 100。

#### 2.5 Growth Budget Table (Configurable)

该表为表驱动的可配置数据。当前 P1 初始值如下，后续境界扩展时可按槽位独立调大以实现爆发式成长：

| Breakthrough Slot | Category | Total Main-Attribute Growth | Percentage Bonus |
| --- | --- | --- | --- |
| `1 -> 2` | minor | `50` | `+2%` |
| `2 -> 3` | minor | `50` | `+2%` |
| `3 -> 4` | major | `100` | `+5%` |
| `4 -> 5` | minor | `50` | `+2%` |
| `5 -> 6` | minor | `50` | `+2%` |
| `6 -> 7` | major | `100` | `+5%` |
| `7 -> 8` | minor | `50` | `+2%` |
| `8 -> 9` | minor | `50` | `+2%` |

说明：

- 当前 P1 阶段统一为 minor = 50、major = 100，保证成长节奏可感但不失控。
- 该表在代码中实现为 `BREAKTHROUGH_GROWTH_TABLE`，以便未来按槽位单独调整。
- 后续境界扩展（元婴及以上）可按需大幅提高每槽位预算，实现爆发式成长曲线。

#### 2.6 Unregistered Character Fallback

对未登记角色的主属性成长方向采用兜底规则：

- 若 `registrationRecord` 为空，则以当前 `effectiveFiveElementScores` 的实时灵根判定结果作为本次突破的属性方向锚点。
- 当前判定为单灵根时：取当前主行的亲和权重表进行分配。
- 当前判定为双灵根时：取当前前二元素各自的亲和权重表按 50/50 分配。

### 3. Five-Element Growth Packages

灵根成长不单独新建"灵根经验条"，而是通过五行成长实现。

#### 3.1 Five-Element Budget Table (Configurable)

与主属性成长表平行，五行成长表也是表驱动可配置数据：

| Breakthrough Slot | Category | Five-Element Growth Total |
| --- | --- | --- |
| `1 -> 2` | minor | `5` |
| `2 -> 3` | minor | `5` |
| `3 -> 4` | major | `10` |
| `4 -> 5` | minor | `5` |
| `5 -> 6` | minor | `5` |
| `6 -> 7` | major | `10` |
| `7 -> 8` | minor | `5` |
| `8 -> 9` | minor | `5` |

后续境界扩展时可按槽位独立调大，与主属性成长表一起维护。

#### 3.2 Five-Element Distribution Rules

五行成长包按灵根锚点进行分配：

- 单灵根：
  - `80%` 分配给登记主灵根元素
  - `20%` 分配给"生我"的辅助元素
  - 所有取整余量向主灵根元素倾斜
- 双灵根：
  - 在登记时确定的两个灵根元素之间均分
  - 若总量为奇数，余量给登记主灵根元素

本轮不向非灵根元素发放突破成长。

#### 3.3 Unregistered Character Fallback

- 若 `registrationRecord` 为空，则以当前 `effectiveFiveElementScores` 的实时判定结果作为本次突破锚点
- 当前判定为单灵根时：取当前主行作为主灵根元素，并取"生我"元素作为辅助元素
- 当前判定为双灵根时：取当前前二元素作为双灵根锚点

这样既不要求补填问卷，也不会让未登记角色的五行成长进入未定义状态。

### 4. Main-Attribute and Five-Element Linkage

主属性成长方向和五行成长方向共享同一个灵根/五行锚点。这意味着角色的整体成长画像由灵根亲和一致性地决定：

- 灵根锚点元素 → 决定哪些主属性是核心属性 → 核心属性大涨
- 灵根锚点元素 → 决定五行成长集中在哪些元素 → 灵根强度加深
- 两者联动形成"灵根决定修炼风格"的叙事一致性

### 5. Spirit-Root Interpretation

登记灵根与当前灵根是两层不同信息：

- 登记灵根：`registrationRecord.result.spirit_root_kind_id` 与 `registrationRecord.result.spirit_root_result`
- 当前灵根：由 `effectiveFiveElementScores` 通过现有灵根判定和标签函数实时推导的运行时结果

因此：

- 登记灵根始终保留，作为角色 origin profile 的一部分
- 当前灵根会随着五行成长改变其面板强度，必要时也可以改变单/双灵根解释结果
- 默认突破成长包会尽量保持登记时的灵根风格，而不是频繁改写角色路线

### 6. Breakthrough Success Application

突破成功时按如下顺序结算：

1. 从 `BREAKTHROUGH_GROWTH_TABLE` 读取当前突破槽位的主属性总预算、五行总预算和百分比加成。
2. 确定灵根锚点（登记灵根 → 或兜底判定）。
3. 按 Section 2 的 70/30 核心/非核心分配规则，计算本次主属性固定成长包。
4. 按 Section 3 的灵根锚点分配规则，计算本次五行成长包。
5. 将固定成长包累加到 `cultivator.mainAttributeGrowth` 与 `cultivator.fiveElementGrowth`。
6. 将百分比加成累加到 `cultivator.mainAttributePercentageBonus`（minor +2, major +5）。
7. 按现有 live 合同推进 `realmLevel`、`realm`、`realmProgress`。
8. 继续保留现有的资源回满、资源上限增长与寿元增长。
9. 把本次授予的固定成长包与百分比加成写入 `BreakthroughRecord`、dao log 和 world event。

运行时的 `effectiveMainAttributes` 按"先加固定值，再乘百分比"顺序实时计算，百分比加成不参与固定增量的分配逻辑。

突破失败时：

- 不授予任何主属性成长
- 不授予任何五行成长
- 当前灵根不发生变化

### 7. State And Presentation Contract

运行时需要区分"origin profile"和"current build"：

- `mainAttributes`：改为返回 `effectiveMainAttributes`
- `fiveElementScores`：改为返回 `effectiveFiveElementScores`
- `detailedAttributes`：继续由最终主属性实时派生
- `currentSpiritRoot`：新增运行时视图字段，至少包含：
  - `kindId`
  - `label`
  - `dominantElements`

`state.breakthrough` 需要增加成功预览字段，至少包含：

- `previewMainAttributeGrowth`
- `previewFiveElementGrowth`
- `previewPercentageBonus`

前台和 Agent 文案必须明确区分：

- "登记灵根"是问卷 origin
- "当前灵根"是当前五行成长后的运行时结果

以下字段仍然属于登记层，不会被突破成长回写：

- `registration`
- `registrationProfile`
- `registrationEffects`
- `registrationRecord.result.spirit_root_kind_id`
- `registrationRecord.result.spirit_root_result`

## Data Contract

### Cultivator Persistence

`Cultivator` 新增：

- `mainAttributeGrowth: Record<MainAttributeId, number>`
- `fiveElementGrowth: Record<FiveElementId, number>`
- `mainAttributePercentageBonus: number`

三个字段都必须以零值作为默认兼容形态，而不是 `null`。

### BreakthroughRecord

`BreakthroughRecord` 需要扩展：

- `grantedMainAttributeGrowth: Record<MainAttributeId, number>`
- `grantedFiveElementGrowth: Record<FiveElementId, number>`
- `grantedPercentageBonus: number`

这样每次突破的成长结果都可被追踪、展示和回归测试锁定。

### Growth Configuration

`BREAKTHROUGH_GROWTH_TABLE` 为运行时可配置表，结构如下：

```typescript
type BreakthroughGrowthEntry = {
  readonly slot: number;          // fromLevel
  readonly category: 'minor' | 'major';
  readonly mainAttributeTotal: number;
  readonly fiveElementTotal: number;
  readonly percentageBonus: number; // 整数百分点，minor=2, major=5
};
```

该表必须在代码中集中定义，方便后续按槽位调整数值。

### State View

运行时状态至少新增：

- `currentSpiritRoot`
- `state.breakthrough.previewMainAttributeGrowth`
- `state.breakthrough.previewFiveElementGrowth`
- `state.breakthrough.previewPercentageBonus`

## Compatibility

- 旧世界默认把 `mainAttributeGrowth` 和 `fiveElementGrowth` hydrate 为全零 map，`mainAttributePercentageBonus` hydrate 为 `0`。
- 旧角色在首次成长前，`currentSpiritRoot` 应与登记灵根解释结果一致。
- 旧世界不需要重跑问卷，也不需要重写已有登记结果。

## Acceptance Criteria

- 成功突破后，`state.mainAttributes` 按灵根亲和方向增长——核心属性获得大部分预算，非核心属性获得少量增长——然后再享受百分比加成。
- 成功突破后，`state.mainAttributes` 的最终值 = `floor((baseline + growth) × (1 + bonus%))`，百分比加成在固定加值之后计算。
- 成功突破后，`state.fiveElementScores` 按灵根锚点集中增长。
- 成功突破后，`state.detailedAttributes` 自动反映主属性变化。
- 单灵根和双灵根的分配结果可被验证：单灵根比双灵根的核心属性更集中。
- 失败突破不会授予任何成长包。
- `registrationRecord` 中的灵根结果保持不变。
- 运行时新增 `currentSpiritRoot`，并基于最终五行结果计算。
- `BreakthroughRecord` 持久化记录本次主属性成长包与五行成长包。
- UI 和 Agent 文案能同时表达"登记灵根"和"当前灵根"。
- `BREAKTHROUGH_GROWTH_TABLE` 的数值可被独立修改而不影响分配逻辑。

## Open Questions

- 境界倍率何时重新接回主属性乘区，不属于本 spec 的阻塞项，但需要在后续战力与战斗平衡轮单独决策。
- 70/30 核心/非核心比例是否需要在后续平衡轮中微调。
