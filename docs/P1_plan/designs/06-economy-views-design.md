# 设计：经济护栏与派生视图落地方案

## 技术概述

本文档将 `docs/P1_plan/06-economy-and-derived-views.md` 中定义的经济平衡机制和派生状态视图转化为技术实现方案。核心目标是在不替代真实结算的前提下，为玩家提供一目了然的状态指示（readiness/recoveryState/activityContext），为系统提供经济安全阀（保底机制、收入带、支出带），并为前端提供统一的派生数据源。

当前代码现状：
- `packages/domain/src/engine.ts` 中 `guidance()` 函数提供简单的 warnings/priorities/suggestedActions
- `getStrategySnapshot()` 返回 riskLevel（low/medium/high）、shortTermGoal、longTermGoal
- `statusOf()` 只返回 `"idle" | "busy" | "injured"` 三个值
- 没有 readiness、recoveryState、activityContext 概念
- 经济参数散落在各个动作的结算逻辑中，没有统一管理
- 没有保底（beg work）机制

P1 目标状态：
- 4 档 readiness（poor/stable/ready/advantaged）
- 4 种 recoveryState（healthy/wounded/injured/depleted）
- 8 种 activityContext（stationed/traveling/retreating/recovering/tasking/exploring/sect-duty/encounter-resolving）
- 道势（Dao Potential）综合战力表达
- 统一的经济参数配置表
- 保底动作机制
- 前端派生视图 API

---

## 架构决策

### 决策 1：readiness/recoveryState/activityContext 作为纯函数计算而非持久化字段

**方案**：这三个派生状态不存储在 `Cultivator` 对象中，而是在每次 `getCultivatorState()` 调用时实时计算。

```typescript
// 纯函数，无副作用
export function computeReadiness(cultivator: Cultivator): ReadinessLevel { ... }
export function computeRecoveryState(cultivator: Cultivator): RecoveryState { ... }
export function computeActivityContext(cultivator: Cultivator, world: WorldState): ActivityContext { ... }
export function computeDaoPotential(cultivator: Cultivator, world: WorldState): number { ... }
```

**为什么选这个**：
- 派生状态应该始终与源数据保持一致，持久化会引入一致性风险
- 计算成本极低（几个 if 判断），不需要缓存
- 纯函数便于测试——输入确定则输出确定
- 前端和服务端使用同一份计算逻辑，避免不一致
- 与现有 `statusOf()` 的模式一致

### 决策 2：经济参数通过集中配置表管理

**方案**：在 `packages/domain/src/constants.ts` 中定义所有经济参数的上下界。

**为什么选这个**：
- 策划调参只需修改一个文件
- 测试可以直接引用参数表进行断言
- 与动作结算逻辑解耦——引擎代码引用常量而非硬编码数字
- 便于经济模拟测试批量读取

### 决策 3：道势采用加权公式而非单一数值

**方案**：道势 = 境界基础分 + 主属性平均分 + 详细属性修正 + readiness 修正 + 状态修正。

**为什么选这个**：
- 道势是展示用的综合指标，不参与真实结算
- 加权公式让每个因子都有可解释的贡献
- 便于策划调整各因子的权重
- 防止单一属性垄断道势评分

### 决策 4：保底机制通过兜底动作 + 经济下限保证实现

**方案**：在 `listAvailableActions()` 中确保任何状态下至少有 1 个零成本动作可用。

**为什么选这个**：
- 不需要引入特殊的"破产恢复"流程
- 保底动作是常规动作的子集（坊市打工、跑腿递送、调息回灵）
- 玩家不会感知到"保底系统"的存在，体验更自然
- 与 `02-golden-path-design.md` 中的反软锁保证一致

---

## 数据流

### 派生视图计算流程

```
GET /api/agent/state
    │
    ▼
getCultivatorState(world, cultivatorId)
    │
    ├─ 1. 获取基础数据
    │     cultivator = world.cultivators[cultivatorId]
    │
    ├─ 2. 计算 readiness
    │     readiness = computeReadiness(cultivator)
    │     ┌─────────────────────────────┐
    │     │ injured?          → poor    │
    │     │ qi < 25%?         → poor    │
    │     │ 负面状态 >= 2?     → poor    │
    │     │ 补给不足?          → poor    │
    │     │ qi > 80% + 正面?  → advantaged │
    │     │ qi > 60% + 补给?  → ready   │
    │     │ else              → stable  │
    │     └─────────────────────────────┘
    │
    ├─ 3. 计算 recoveryState
    │     recovery = computeRecoveryState(cultivator)
    │     ┌─────────────────────────────┐
    │     │ injuryTicks > 4?  → injured │
    │     │ injuryTicks > 0?  → wounded │
    │     │ qi < 25%?         → depleted│
    │     │ else              → healthy │
    │     └─────────────────────────────┘
    │
    ├─ 4. 计算 activityContext
    │     activity = computeActivityContext(cultivator, world)
    │     ┌──────────────────────────────────┐
    │     │ 无 activeJob?        → stationed │
    │     │ travel job?          → traveling  │
    │     │ 疗伤/调息 job?       → recovering │
    │     │ 任务 job?            → tasking    │
    │     │ 游历 job?            → exploring  │
    │     │ 宗门任务 job?        → sect-duty  │
    │     │ 战斗/遭遇 job?      → encounter-resolving │
    │     │ 刚从高风险撤出?      → retreating │
    │     └──────────────────────────────────┘
    │
    ├─ 5. 计算道势
    │     daoPotential = computeDaoPotential(cultivator, world)
    │
    ├─ 6. 组装派生视图
    │     derivedView = {
    │       readiness, recoveryState, activityContext,
    │       daoPotential, economySnapshot,
    │       recommendations,
    │     }
    │
    └─ 返回 CultivatorStateView（包含 derivedView）
```

### 经济循环验证流程

```
经济模拟测试
    │
    ├─ 1. 创建测试世界和角色
    │     world = createSeedWorld()
    │     cultivator = createCultivator(world, ...)
    │
    ├─ 2. 模拟 N 轮循环
    │     for (round = 0; round < N; round++)
    │       ├─ 执行 2 次低风险任务
    │       │     spiritStones += 80-140 (坊市打工)
    │       │     spiritStones += 80-140 (跑腿递送)
    │       ├─ 执行 1 次恢复
    │       │     spiritStones -= 0 (调息回灵)
    │       ├─ 执行 1 次闭关
    │       │     spiritStones -= 80
    │       └─ 记录灵石余额
    │
    ├─ 3. 验证经济稳定性
    │     assert 灵石余额 > 0（不破产）
    │     assert 灵石余额 < 上限（不通胀）
    │     assert 修为在增长
    │
    └─ 输出经济报告
```

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `packages/domain/src/model.ts` | 扩展 | 新增 `ReadinessLevel`, `RecoveryState`, `ActivityContext`, `EconomySnapshot`, `DaoPotential`, `DerivedStateView` 类型 |
| `packages/domain/src/economy.ts` | 新增 | readiness/recoveryState/activityContext/daoPotential 计算纯函数；经济参数引用；保底机制 |
| `packages/domain/src/constants.ts` | 扩展 | 收益带/支出带参数表；readiness 阈值；道势权重 |
| `packages/domain/src/engine.ts` | 修改 | `getCultivatorState` 返回值中增加 `derivedState`；`listAvailableActions` 增加保底动作保证；`guidance()` 使用新的 readiness 判断 |
| `packages/contracts/src/runtime-api.ts` | 扩展 | `CultivatorStateView` 新增 `derivedState` 字段 |
| `apps/runtime-worker/src/routes.ts` | 扩展 | 新增 `/economy` 调试路由（非生产） |
| `packages/domain/src/economy.test.ts` | 新增 | 经济模拟测试套件 |

---

## TypeScript 接口定义

### 派生状态类型（`packages/domain/src/model.ts`）

```typescript
export type ReadinessLevel = "poor" | "stable" | "ready" | "advantaged";
export type RecoveryState = "healthy" | "wounded" | "injured" | "depleted";
export type ActivityContext =
  | "stationed"
  | "traveling"
  | "retreating"
  | "recovering"
  | "tasking"
  | "exploring"
  | "sect-duty"
  | "encounter-resolving";

export interface DerivedStateView {
  readonly readiness: ReadinessLevel;
  readonly recoveryState: RecoveryState;
  readonly activityContext: ActivityContext;
  readonly daoPotential: DaoPotential;
  readonly economySnapshot: EconomySnapshot;
  readonly recommendations: Recommendations;
}

export interface DaoPotential {
  readonly score: number;
  readonly tier: "入门" | "小成" | "登堂" | "入室" | "大成" | "化境";
  readonly breakdown: {
    readonly realmBase: number;
    readonly attributeAverage: number;
    readonly detailedAttributeModifier: number;
    readonly readinessModifier: number;
    readonly statusModifier: number;
  };
}

export interface EconomySnapshot {
  readonly spiritStones: number;
  readonly estimatedIncome: { low: number; high: number };
  readonly estimatedExpense: { low: number; high: number };
  readonly netFlow: { low: number; high: number };
  readonly canAffordMeditate: boolean;
  readonly canAffordProduction: boolean;
  readonly turnsUntilBroke: number | null;  // null = 安全
}

export interface Recommendations {
  readonly nextLowRiskAction: string | null;
  readonly highRiskWarning: string | null;
  readonly nextStep: string;
}
```

---

## 纯函数实现（`packages/domain/src/economy.ts`）

### readiness 计算

```typescript
import type { Cultivator, ReadinessLevel } from "./model.js";

export function computeReadiness(cultivator: Cultivator): ReadinessLevel {
  // poor: 满足任一即可
  if (cultivator.injuryTicksRemaining > 4) return "poor";
  if (cultivator.qi < cultivator.maxQi * 0.25) return "poor";
  if (countNegativeEffects(cultivator) >= 2) return "poor";
  if (isSupplyInsufficient(cultivator)) return "poor";

  // advantaged: 全部满足
  if (
    cultivator.qi >= cultivator.maxQi * 0.80 &&
    hasPositiveEffect(cultivator) &&
    isSupplySufficient(cultivator) &&
    cultivator.injuryTicksRemaining === 0
  ) {
    return "advantaged";
  }

  // ready: 全部满足
  if (
    cultivator.qi >= cultivator.maxQi * 0.60 &&
    isSupplyBasic(cultivator) &&
    cultivator.injuryTicksRemaining === 0
  ) {
    return "ready";
  }

  return "stable";
}

function countNegativeEffects(cultivator: Cultivator): number {
  const negativeIds = new Set(["wounded", "poisoned", "deviation"]);
  return cultivator.statusEffects.filter(e => negativeIds.has(e.id)).length;
}

function hasPositiveEffect(cultivator: Cultivator): boolean {
  const positiveIds = new Set(["clear-mind", "qi-surge", "fortune-marked", "warded", "insight"]);
  return cultivator.statusEffects.some(e => positiveIds.has(e.id));
}

function isSupplyInsufficient(cultivator: Cultivator): boolean {
  return cultivator.spiritStones < 30 &&
    cultivator.inventory["healing-pill"] === 0 &&
    cultivator.inventory["qi-pill"] === 0;
}

function isSupplySufficient(cultivator: Cultivator): boolean {
  return cultivator.spiritStones >= 200 &&
    (cultivator.inventory["healing-pill"] >= 1 || cultivator.inventory["qi-pill"] >= 1);
}

function isSupplyBasic(cultivator: Cultivator): boolean {
  return cultivator.spiritStones >= 80;
}
```

### recoveryState 计算

```typescript
export function computeRecoveryState(cultivator: Cultivator): RecoveryState {
  if (cultivator.injuryTicksRemaining > 4) return "injured";
  if (cultivator.injuryTicksRemaining > 0) return "wounded";
  if (cultivator.qi < cultivator.maxQi * 0.25) return "depleted";
  return "healthy";
}
```

### activityContext 计算

```typescript
export function computeActivityContext(
  cultivator: Cultivator,
  world: WorldState,
): ActivityContext {
  if (!cultivator.activeJobId) return "stationed";

  const job = world.jobs[cultivator.activeJobId];
  if (!job) return "stationed";

  // 根据 job.actionId 判断上下文
  if (job.actionId === "travel") return "traveling";
  if (job.actionId === "residence-heal" || job.actionId === "residence-recover-qi") {
    return "recovering";
  }
  if (job.actionId === "residence-meditate" || job.actionId === "residence-produce") {
    return "stationed";  // 洞府内活动也算 stationed
  }

  // 任务相关
  const activeQuests = cultivator.activeQuests ?? [];
  const currentQuest = activeQuests.find(q => q.status === "in-progress");
  if (currentQuest) {
    if (currentQuest.category === "sect") return "sect-duty";
    if (currentQuest.category === "high-risk") return "encounter-resolving";
    return "tasking";
  }

  // 游历
  if (job.actionId === "explore") return "exploring";

  // 高风险内容
  if (job.actionId.includes("dungeon") || job.actionId.includes("elite")) {
    return "encounter-resolving";
  }

  return "tasking";
}
```

### 道势计算

```typescript
import { stubMainAttributes } from "./attributes.js";

export function computeDaoPotential(
  cultivator: Cultivator,
  world: WorldState,
): DaoPotential {
  // 1. 境界基础分
  const realmBase =
    cultivator.realm === "炼气" ? 10 + cultivator.realmLevel * 5 :
    cultivator.realm === "筑基" ? 50 + cultivator.realmLevel * 8 :
    cultivator.realm === "金丹" ? 100 + cultivator.realmLevel * 12 :
    10;

  // 2. 主属性平均分
  const mainAttrs = stubMainAttributes(); // P1 使用 stub，后续替换为真实计算
  const attrValues = Object.values(mainAttrs);
  const attributeAverage = Math.floor(
    attrValues.reduce((sum, v) => sum + v, 0) / attrValues.length
  );

  // 3. 详细属性修正（简化）
  const detailedAttributeModifier = Math.floor(
    (cultivator.spiritualPower / cultivator.maxSpiritualPower) * 20
  );

  // 4. readiness 修正
  const readiness = computeReadiness(cultivator);
  const readinessModifier =
    readiness === "advantaged" ? 15 :
    readiness === "ready" ? 8 :
    readiness === "stable" ? 0 :
    -10;

  // 5. 状态修正
  const statusModifier =
    (hasPositiveEffect(cultivator) ? 5 : 0) +
    (countNegativeEffects(cultivator) * -5) +
    (cultivator.injuryTicksRemaining > 0 ? -10 : 0);

  const score = realmBase + attributeAverage + detailedAttributeModifier
    + readinessModifier + statusModifier;

  const tier = daoPotentialTier(score);

  return {
    score,
    tier,
    breakdown: {
      realmBase,
      attributeAverage,
      detailedAttributeModifier,
      readinessModifier,
      statusModifier,
    },
  };
}

function daoPotentialTier(score: number): DaoPotential["tier"] {
  if (score >= 200) return "化境";
  if (score >= 150) return "大成";
  if (score >= 120) return "入室";
  if (score >= 90)  return "登堂";
  if (score >= 60)  return "小成";
  return "入门";
}
```

---

## 数值参数配置表

### 收益带（`packages/domain/src/constants.ts`）

```typescript
export const ECONOMY_INCOME_BANDS = {
  // 低风险任务
  "market-work":     { min: 100, max: 140, description: "最稳定兜底" },
  "delivery":        { min: 80,  max: 120, description: "低风险，强化移动意义" },
  "gathering":       { min: 90,  max: 130, description: "推动 游→居" },
  "bounty-low":      { min: 120, max: 180, description: "轻战斗过渡层" },
  "investigation":   { min: 90,  max: 140, description: "信息类任务" },

  // 高风险
  "state-elite":     { min: 180, max: 260, description: "单人高风险" },
  "dungeon-c":       { min: 220, max: 320, description: "P1 首个副本层" },

  // 宗门任务
  "sect-delivery":   { min: 100, max: 150, description: "低准备度宗门入口" },
  "patrol-suppress": { min: 140, max: 220, description: "组织高压事务" },
} as const;

export const ECONOMY_EXPENSE_BANDS = {
  "residence-meditate":    { cost: 80,    description: "常规成长投入" },
  "residence-heal":        { cost: 0,     description: "无药也能恢复" },
  "residence-recover-qi":  { cost: 0,     description: "最便宜兜底动作" },
  "recipe-healing-pill":   { cost: 30,    description: "材料 + 灵石" },
  "recipe-qi-pill":        { cost: 25,    description: "材料 + 灵石" },
  "recipe-ward-talisman":  { cost: 40,    description: "材料 + 灵石" },
} as const;
```

### 经济目标验证

```typescript
export const ECONOMY_GOALS = {
  /** 1-2 次低风险任务足以支付 1 次恢复 */
  recoveryAffordability: {
    minIncome: 80,   // 最低单次任务收入
    maxRecoveryCost: 0, // 调息回灵免费
    ratio: "1:1 至少可达",
  },

  /** 3-4 次低风险动作足以支付 1 次标准闭关 */
  meditateAffordability: {
    minTotalIncome: 240,  // 3 次最低收入
    meditateCost: 80,
    ratio: "3:1 可达",
  },

  /** 高风险成功收益显著高于普通任务 */
  highRiskPremium: {
    minHighRisk: 180,  // 州内精英最低
    maxLowRisk: 140,   // 坊市打工最高
    premiumRatio: 1.28, // 至少高 28%
  },

  /** 失败恢复成本不会导致破产 */
  failureRecovery: {
    maxInjuryTicks: 4,     // 精英任务失败最大伤势
    maxSpiritStoneLoss: 40, // 精英任务失败最大灵石损失
    recoveryActionCount: 2, // 2 个动作内回到可玩状态
  },
} as const;
```

---

## 前端派生视图

### CultivatorStateView 扩展

在 `packages/contracts/src/runtime-api.ts` 的 `CultivatorStateView` 中新增：

```typescript
export interface CultivatorStateView {
  // ... 现有字段 ...

  /** P1 新增：派生状态视图 */
  derivedState: {
    readiness: ReadinessLevel;
    readinessLabel: string;          // "危险" | "稳定" | "就绪" | "充裕"
    recoveryState: RecoveryState;
    recoveryStateLabel: string;      // "健康" | "轻伤" | "重伤" | "灵力枯竭"
    activityContext: ActivityContext;
    activityContextLabel: string;    // "驻留" | "赶路中" | "撤退中" | ...
    daoPotential: DaoPotential;
    recommendations: Recommendations;
  };
}
```

### 前端展示方案

```
┌──────────────────────────────────────┐
│  角色状态面板                         │
│                                      │
│  境界：炼气三层        道势：67 (小成) │
│  准备度：[██████░░░░] 就绪            │
│  恢复状态：健康                       │
│  当前活动：驻留                       │
│                                      │
│  ┌─ 推荐 ──────────────────────────┐ │
│  │ 下一步：接取基础任务             │ │
│  │ 警告：无                        │ │
│  └─────────────────────────────────┘ │
│                                      │
│  灵石：320   补给：疗伤丹x1 回气丹x1  │
└──────────────────────────────────────┘
```

### 国际化标签映射

```typescript
const READINESS_LABELS: Record<ReadinessLevel, Record<string, string>> = {
  poor:       { "zh-CN": "危险", en: "Poor" },
  stable:     { "zh-CN": "稳定", en: "Stable" },
  ready:      { "zh-CN": "就绪", en: "Ready" },
  advantaged: { "zh-CN": "充裕", en: "Advantaged" },
};

const RECOVERY_STATE_LABELS: Record<RecoveryState, Record<string, string>> = {
  healthy:  { "zh-CN": "健康",     en: "Healthy" },
  wounded:  { "zh-CN": "轻伤",     en: "Wounded" },
  injured:  { "zh-CN": "重伤",     en: "Injured" },
  depleted: { "zh-CN": "灵力枯竭", en: "Depleted" },
};

const ACTIVITY_CONTEXT_LABELS: Record<ActivityContext, Record<string, string>> = {
  stationed:           { "zh-CN": "驻留",     en: "Stationed" },
  traveling:           { "zh-CN": "赶路中",   en: "Traveling" },
  retreating:          { "zh-CN": "撤退中",   en: "Retreating" },
  recovering:          { "zh-CN": "恢复中",   en: "Recovering" },
  tasking:             { "zh-CN": "执行任务", en: "On Task" },
  exploring:           { "zh-CN": "游历中",   en: "Exploring" },
  "sect-duty":         { "zh-CN": "宗门事务", en: "Sect Duty" },
  "encounter-resolving": { "zh-CN": "遭遇处理", en: "In Encounter" },
};
```

---

## 保底机制

### "坊市打工"保底实现

```typescript
// 在 listAvailableActions 中确保保底动作
export function ensureSafetyNet(
  actions: AvailableAction[],
  cultivator: Cultivator,
  world: WorldState,
): AvailableAction[] {
  const hasSafeAction = actions.some(a =>
    a.actionId === "market-work" ||
    a.actionId === "delivery" ||
    a.actionId === "residence-recover-qi" ||
    a.actionId.startsWith("travel")
  );

  if (!hasSafeAction) {
    // 添加赶路回主城（永远可用）
    const residenceLocation = cultivator.residence.locationId;
    const mainCity = parseLocationId(residenceLocation).stateId + ":main-city";

    actions.push({
      actionId: "travel" as ActionId,
      label: "返回主城",
      description: "回到主城寻找机会。赶路不消耗灵石。",
      durationTicks: computeTravelTicks(
        cultivator.locationId,
        mainCity,
        world.topology,
      ),
      kind: "timed",
    });
  }

  return actions;
}
```

### 保底条件验证

| 角色状态 | 可用保底动作 | 验证方式 |
|---------|------------|---------|
| 灵石 = 0，无伤 | 赶路(免费) + 坊市打工(0 前置) | 单元测试 |
| 灵石 = 0，轻伤 | 赶路(免费) + 调息回灵(免费) | 单元测试 |
| 灵石 = 0，重伤 | 赶路(免费) + 疗伤(0 灵石) | 单元测试 |
| 灵石 = 0，重伤 + 灵力枯竭 | 赶路回洞府(免费) → 调息回灵(免费) → 疗伤(免费) | 集成测试 |

---

## 测试策略

### 纯函数单元测试（`packages/domain/src/economy.test.ts`）

```typescript
describe("readiness 计算", () => {
  it("重伤角色 readiness = poor", () => {
    const cultivator = createTestCultivator({ injuryTicksRemaining: 5 });
    expect(computeReadiness(cultivator)).toBe("poor");
  });

  it("灵力低于 25% readiness = poor", () => {
    const cultivator = createTestCultivator({ qi: 20, maxQi: 100 });
    expect(computeReadiness(cultivator)).toBe("poor");
  });

  it("灵力高于 80% + 正面状态 readiness = advantaged", () => {
    const cultivator = createTestCultivator({
      qi: 90, maxQi: 100,
      statusEffects: [{ id: "clear-mind", ...defaults }],
      spiritStones: 300,
    });
    expect(computeReadiness(cultivator)).toBe("advantaged");
  });

  it("灵力 60-80% + 基础补给 readiness = ready", () => {
    const cultivator = createTestCultivator({ qi: 70, maxQi: 100, spiritStones: 100 });
    expect(computeReadiness(cultivator)).toBe("ready");
  });

  it("默认状态 readiness = stable", () => {
    const cultivator = createTestCultivator({ qi: 50, maxQi: 100, spiritStones: 50 });
    expect(computeReadiness(cultivator)).toBe("stable");
  });
});

describe("recoveryState 计算", () => {
  it("injuryTicks > 4 → injured", () => {});
  it("injuryTicks 1-4 → wounded", () => {});
  it("qi < 25% → depleted", () => {});
  it("正常状态 → healthy", () => {});
});

describe("activityContext 计算", () => {
  it("无 activeJob → stationed", () => {});
  it("travel job → traveling", () => {});
  it("疗伤 job → recovering", () => {});
  it("任务 job → tasking", () => {});
  it("宗门任务 → sect-duty", () => {});
});

describe("道势计算", () => {
  it("炼气一层基础道势约 15 + 50 = 65", () => {});
  it("readiness poor 时道势降低", () => {});
  it("有正面状态时道势增加", () => {});
});
```

### 经济模拟测试

```typescript
describe("P1 经济平衡", () => {
  it("1-2 次低风险任务足以支付 1 次恢复", () => {
    const income = ECONOMY_INCOME_BANDS["market-work"].min; // 100
    const recoveryCost = ECONOMY_EXPENSE_BANDS["residence-recover-qi"].cost; // 0
    expect(income).toBeGreaterThanOrEqual(recoveryCost);
  });

  it("3-4 次低风险动作足以支付 1 次标准闭关", () => {
    const totalIncome = ECONOMY_INCOME_BANDS["market-work"].min * 3; // 300
    const meditateCost = ECONOMY_EXPENSE_BANDS["residence-meditate"].cost; // 80
    expect(totalIncome).toBeGreaterThanOrEqual(meditateCost);
  });

  it("高风险收益显著高于低风险", () => {
    const highRiskMin = ECONOMY_INCOME_BANDS["state-elite"].min; // 180
    const lowRiskMax = ECONOMY_INCOME_BANDS["market-work"].max;  // 140
    expect(highRiskMin).toBeGreaterThan(lowRiskMax);
  });

  it("失败恢复成本不会导致破产（模拟 100 轮）", () => {
    const world = createSeedWorld();
    const cultivator = createCultivator(world, { name: "经济测试" });

    for (let round = 0; round < 100; round++) {
      // 模拟任务循环
      simulateLowRiskQuest(world, cultivator.id);
      simulateLowRiskQuest(world, cultivator.id);
      simulateResidenceMeditate(world, cultivator.id);

      // 每 10 轮模拟一次高风险失败
      if (round % 10 === 0) {
        simulateHighRiskFailure(world, cultivator.id);
        simulateRecovery(world, cultivator.id);
      }

      // 验证不会破产
      const c = world.cultivators[cultivator.id]!;
      expect(c.spiritStones).toBeGreaterThanOrEqual(0);
    }
  });
});
```

---

## 经济模拟验证

### 验证方法

创建 `packages/domain/src/economy-simulation.test.ts` 专用测试文件：

1. **单循环验证**：模拟 1 次完整的"任务→洞府→再出发"循环，验证灵石净增长为正
2. **多循环压力测试**：模拟 100 轮循环，验证灵石不会崩溃（持续下降到 0）也不会通胀（无限增长）
3. **极端场景**：模拟连续 5 次高风险失败，验证通过保底动作 3 轮内可恢复
4. **新手路径**：模拟黄金路径的 8 个阶段，验证初始 200 灵石足以支撑到完成第一次宗门任务

### 健康指标

| 指标 | 健康范围 | 报警阈值 |
|------|---------|---------|
| 单循环灵石净变化 | +20 ~ +80 | < 0 或 > 200 |
| 100 轮后灵石余额 | 200 ~ 2000 | < 100 或 > 5000 |
| 修为增长率 | 每 4 轮 +10-14 | < +4 或 > +20 |
| 失败后恢复动作数 | 1-3 次 | > 5 次 |
