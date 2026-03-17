# 设计：洞府与内循环动作落地方案

## 技术概述

本文档将 `docs/P1_plan/04-residence-actions.md` 中定义的洞府系统和 5 个内循环动作转化为技术实现方案。核心变化是从当前简单的全局可用动作（meditate/heal/cultivate），升级为基于地点门控、资源消耗、前置条件判断的洞府专属动作系统。

当前代码现状：
- `packages/domain/src/engine.ts` 中 `meditate` 是全局可用的 1 tick 动作（+28 spiritualPower）
- `heal` 限定在 `healing-sanctuary` 位置（2 tick，+45 qi，清除 poisoned）
- `cultivate` 是全局可用的 4 tick 动作（-50 spiritStones 未实现，+18 realmProgress）
- 没有生产系统
- 没有洞府概念
- 没有好友交流机制

P1 目标状态：
- 每角色 1 个固定洞府，绑定到特定 `LocationId`
- 5 个洞府动作：闭关(4t)、疗伤(2t)、调息回灵(1t)、基础生产(2t)、好友交流(0-1t)
- 动作有前置条件（地点、资源、状态）
- 生产配方系统（3 类补给品）
- 动作日志系统（cultivation-log, recovery-log, production-log, social-log）

---

## 架构决策

### 决策 1：洞府作为 Cultivator 的属性而非独立实体

**方案**：在 `Cultivator` 接口中新增 `residence` 嵌套对象，而非创建独立的 `Residence` 集合。

```typescript
export interface Cultivator {
  // ... 现有字段 ...
  readonly residence: Residence;
}

export interface Residence {
  readonly id: string;
  readonly locationId: LocationId;
  readonly level: 1;             // P1 固定
  readonly name: string;
}
```

**为什么选这个**：
- P1 每角色只有 1 个固定洞府，不需要多对多关系
- 减少一次数据库查询（洞府数据随角色加载）
- 与现有 `WorldState.cultivators` 的存储模式一致（JSONB 快照）
- P2 如果需要多洞府，可以将 `residence` 改为 `residences` 数组

### 决策 2：动作前置条件系统采用纯函数判断链

**方案**：每个动作的前置条件定义为 `ActionPrecondition` 纯函数数组，在 `performAction` 入口统一执行。

```typescript
export type ActionPrecondition = (
  cultivator: Cultivator,
  world: WorldState,
) => { ok: true } | { ok: false; reason: string };
```

**为什么选这个**：
- 纯函数便于测试（不依赖副作用）
- 每个条件独立，可以组合复用
- 前端可以调用相同的判断函数来预判动作是否可用
- 与现有 `requireIdle` / `requireSafeIfInjured` 模式一致

### 决策 3：生产配方采用数据驱动配置而非硬编码

**方案**：将 3 类配方定义在 `packages/domain/src/constants.ts` 的常量表中。

**为什么选这个**：
- 策划调参不需要修改引擎逻辑
- 配方数据可以在测试中直接引用验证
- P2 扩展新配方只需添加数据，不改逻辑
- 与现有 `ITEM_DEFINITIONS` 的管理方式一致

### 决策 4：动作日志通过标签化 DaoLog 实现而非独立表

**方案**：复用现有 `DaoLogEntry` 结构，通过 `tags` 字段区分日志类型。

```typescript
// cultivation-log: tags 包含 "cultivation", "residence"
// recovery-log: tags 包含 "recovery", "residence"
// production-log: tags 包含 "production", "residence"
// social-log: tags 包含 "social", "residence"
```

**为什么选这个**：
- 复用现有基础设施，不增加新表
- `DaoLogEntry` 已有 `cultivatorId`, `tick`, `title`, `content`, `tags`
- 前端按 `tags` 过滤即可展示分类日志
- 与 `engine.ts` 中现有的 `addDaoLog` 工具函数无缝衔接

---

## 数据流

### 洞府动作完整流程

```
玩家选择洞府动作
    │
    ▼
performAction(world, cultivatorId, actionId)
    │
    ├─ 1. 基础检查
    │     requireIdle(cultivator)
    │     requireSafeIfInjured(cultivator, actionId)
    │
    ├─ 2. 地点检查
    │     assertAtResidence(cultivator)
    │     // 验证 cultivator.locationId === cultivator.residence.locationId
    │     // 或在洞府可达范围内
    │
    ├─ 3. 动作特定前置条件
    │     preconditions = RESIDENCE_ACTION_PRECONDITIONS[actionId]
    │     for (const check of preconditions) {
    │       result = check(cultivator, world)
    │       if (!result.ok) throw Error(result.reason)
    │     }
    │
    ├─ 4. 资源预扣（如果需要）
    │     deductResources(cultivator, actionId)
    │     // 闭关：-80 灵石
    │     // 基础生产：-材料 - 灵石
    │     // 疗伤/调息/交流：无预扣或极少
    │
    ├─ 5. 创建 ActionJob
    │     job = createJob(world, cultivator, actionId, label)
    │     cultivator.activeJobId = job.id
    │
    └─ 返回 ActionExecutionResult

tick 推进 → job.remainingTicks === 0
    │
    ▼
resolveResidenceJob(world, job)
    │
    ├─ 闭关结算
    │   ├─ realmProgress += 10-14（有材料）或 4-6（断料）
    │   ├─ 判断是否触发感悟（insight）或偏差（deviation）
    │   └─ 写入 cultivation-log
    │
    ├─ 疗伤结算
    │   ├─ injuryTicksRemaining -= 4（无丹药）或 -= 6（有丹药）
    │   ├─ 清除 1 个伤势类负面状态
    │   └─ 写入 recovery-log
    │
    ├─ 调息回灵结算
    │   ├─ qi += maxQi * 0.35（基础）或 maxQi * 0.60（有回气丹）
    │   └─ 写入 recovery-log
    │
    ├─ 基础生产结算
    │   ├─ 消耗材料和灵石
    │   ├─ 产出对应道具
    │   └─ 写入 production-log
    │
    └─ 好友交流结算
        ├─ 增加 social support 标记
        ├─ 可能触发轻消息
        └─ 写入 social-log
```

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `packages/domain/src/model.ts` | 扩展 | 新增 `Residence` 接口；`Cultivator` 新增 `residence` 字段；新增 `ProductionRecipe`, `ResidenceActionId` 类型 |
| `packages/domain/src/residence.ts` | 新增 | 洞府动作处理、前置条件、结算逻辑 |
| `packages/domain/src/constants.ts` | 扩展 | 闭关/疗伤/调息/生产/交流的数值参数表 |
| `packages/domain/src/engine.ts` | 修改 | `listAvailableActions` 增加洞府动作列表；`performAction` 增加洞府动作分发；`resolveJob` 增加洞府 job 结算 |
| `packages/domain/src/seed.ts` | 修改 | 新角色创建时自动分配洞府 |
| `packages/contracts/src/runtime-api.ts` | 扩展 | 新增 `ResidenceStateResponse` 类型 |
| `apps/runtime-worker/src/routes.ts` | 扩展 | 新增 `/residence` 查询路由 |

---

## TypeScript 接口定义

### 洞府与动作（`packages/domain/src/model.ts`）

```typescript
export interface Residence {
  readonly id: string;
  readonly cultivatorId: string;
  readonly locationId: LocationId;
  readonly level: 1;
  readonly name: string;
  readonly createdAtTick: number;
}

export type ResidenceActionId =
  | "residence-meditate"    // 闭关
  | "residence-heal"        // 疗伤
  | "residence-recover-qi"  // 调息回灵
  | "residence-produce"     // 基础生产
  | "residence-socialize";  // 好友交流

export interface ProductionRecipe {
  readonly id: string;
  readonly name: string;
  readonly nameCn: string;
  readonly outputItemId: ItemId;
  readonly outputCount: number;
  readonly inputMaterials: readonly { itemId: ItemId; count: number }[];
  readonly spiritStoneCost: number;
  readonly durationTicks: number;
}

export interface ResidenceActionLog {
  readonly logType: "cultivation" | "recovery" | "production" | "social";
  readonly tick: number;
  readonly cultivatorId: string;
  readonly actionId: ResidenceActionId;
  readonly inputs: Record<string, number>;
  readonly outputs: Record<string, number>;
  readonly notes: string;
}
```

### 前置条件定义（`packages/domain/src/residence.ts`）

```typescript
import type { ActionPrecondition } from "./model.js";

export const RESIDENCE_PRECONDITIONS: Record<ResidenceActionId, readonly ActionPrecondition[]> = {
  "residence-meditate": [
    requireAtResidence,
    requireNotInjured,           // 重伤时禁止高效闭关
    requireSpiritStones(80),     // 标准闭关需要 80 灵石
  ],
  "residence-heal": [
    requireAtResidence,
    // 疗伤永远可用，无额外前置条件
  ],
  "residence-recover-qi": [
    requireAtResidence,
    // 调息回灵永远可用，最便宜的兜底动作
  ],
  "residence-produce": [
    requireAtResidence,
    requireProductionMaterials,   // 需要有对应配方的材料
  ],
  "residence-socialize": [
    requireAtResidence,
    // 好友交流可以很轻，无前置条件
  ],
};

function requireAtResidence(cultivator: Cultivator, world: WorldState) {
  const isAtResidence = cultivator.locationId === cultivator.residence.locationId;
  return isAtResidence
    ? { ok: true as const }
    : { ok: false as const, reason: "必须回到洞府才能执行此动作。" };
}

function requireNotInjured(cultivator: Cultivator) {
  return cultivator.injuryTicksRemaining <= 0
    ? { ok: true as const }
    : { ok: false as const, reason: "重伤时无法进行高效闭关，请先疗伤。" };
}

function requireSpiritStones(amount: number) {
  return (cultivator: Cultivator) => {
    // 断料闭关仍允许，但效率降低
    // 此处不硬拦截，而是在结算时区分效率
    return { ok: true as const };
  };
}

function requireProductionMaterials(cultivator: Cultivator, world: WorldState) {
  // 检查是否有至少一个可用配方的材料
  const hasAnyRecipe = PRODUCTION_RECIPES.some(recipe =>
    recipe.inputMaterials.every(mat =>
      (cultivator.inventory[mat.itemId] ?? 0) >= mat.count
    ) && cultivator.spiritStones >= recipe.spiritStoneCost
  );
  return hasAnyRecipe
    ? { ok: true as const }
    : { ok: false as const, reason: "没有足够的材料进行生产。" };
}
```

---

## 现有动作映射

| 当前动作 | P1 洞府动作 | 变化说明 |
|---------|------------|---------|
| `meditate` (1t, +28 spiritualPower) | `residence-recover-qi` (1t, +35% maxQi) | 功能对齐调息回灵，改为百分比恢复 |
| `heal` (2t, +45 qi, 仅 healing-sanctuary) | `residence-heal` (2t, 降伤势, 仅洞府) | 地点从 healing-sanctuary 改为洞府；效果从 qi 恢复改为伤势恢复 |
| `cultivate` (4t, +18 realmProgress) | `residence-meditate` (4t, +10-14 修为, -80 灵石) | 新增灵石消耗；有/无材料区分效率；新增感悟/偏差触发 |
| 无 | `residence-produce` (2t) | 全新动作：3 类配方 |
| 无 | `residence-socialize` (0-1t) | 全新动作：社交入口 |

---

## 数值参数表

### 闭关（`residence-meditate`）

| 参数 | 标准值 | 断料值 | 说明 |
|------|-------|--------|------|
| 时长 | 4 ticks | 4 ticks | 不变 |
| 灵石消耗 | 80 | 0 | 有灵石时扣除 |
| 修为进度增加 | +10 ~ +14 | +4 ~ +6 | 有材料奖励用于后续扩展 |
| 感悟触发概率 | 15% | 5% | 触发 insight 效果 3t |
| 偏差触发概率 | 5% | 10% | 触发 deviation 效果 3t |
| 重伤限制 | 禁止 | 禁止 | injuryTicks > 0 时不允许 |

### 疗伤（`residence-heal`）

| 参数 | 无丹药 | 有疗伤丹 | 说明 |
|------|--------|---------|------|
| 时长 | 2 ticks | 2 ticks | 不变 |
| 灵石消耗 | 0 | 0（消耗 1 疗伤丹） | 丹药提高效率 |
| 伤势减少 | 降低 2 级 | 降低 4 级 | injuryTicksRemaining 减少 |
| 负面状态清除 | 0 | 1 个伤势类 | 优先清除 wounded |
| 可用条件 | 永远可用 | 永远可用 | 保底动作 |

### 调息回灵（`residence-recover-qi`）

| 参数 | 基础 | 有回气丹 | 说明 |
|------|------|---------|------|
| 时长 | 1 tick | 1 tick | 最快恢复动作 |
| 灵石消耗 | 0 | 0（消耗 1 回气丹） | 免费保底 |
| 灵力恢复 | maxQi * 35% | maxQi * 60% | 百分比恢复 |
| 准备度效果 | 改善 depleted | 改善 depleted → stable | 快速脱离低准备度 |

### 基础生产（`residence-produce`）

| 配方 | 输入材料 | 灵石消耗 | 时长 | 输出 |
|------|---------|---------|------|------|
| 疗伤丹 | beast-core x1 + spirit-ore x1 | 30 | 2 ticks | healing-pill x1 |
| 回气丹 | spirit-ore x2 | 25 | 2 ticks | qi-pill x1 |
| 护身符 | ruin-fragment x1 | 40 | 2 ticks | ward-talisman x1 |

```typescript
export const PRODUCTION_RECIPES: readonly ProductionRecipe[] = [
  {
    id: "recipe-healing-pill",
    name: "Healing Pill",
    nameCn: "疗伤丹",
    outputItemId: "healing-pill",
    outputCount: 1,
    inputMaterials: [
      { itemId: "beast-core", count: 1 },
      { itemId: "spirit-ore", count: 1 },
    ],
    spiritStoneCost: 30,
    durationTicks: 2,
  },
  {
    id: "recipe-qi-pill",
    name: "Qi Pill",
    nameCn: "回气丹",
    outputItemId: "qi-pill",
    outputCount: 1,
    inputMaterials: [
      { itemId: "spirit-ore", count: 2 },
    ],
    spiritStoneCost: 25,
    durationTicks: 2,
  },
  {
    id: "recipe-ward-talisman",
    name: "Ward Talisman",
    nameCn: "护身符",
    outputItemId: "ward-talisman",
    outputCount: 1,
    inputMaterials: [
      { itemId: "ruin-fragment", count: 1 },
    ],
    spiritStoneCost: 40,
    durationTicks: 2,
  },
];
```

### 好友交流（`residence-socialize`）

| 参数 | 值 | 说明 |
|------|-----|------|
| 时长 | 0-1 tick | 即时或极短 |
| 灵石消耗 | 0 | 免费 |
| 效果 | +1 social-support 标记 | 轻量关系维护 |
| 触发消息概率 | 50% | 可能收到 NPC 消息 |
| 触发任务线索概率 | 20% | 解锁跑腿/调查类任务提示 |

---

## 结算逻辑实现

### 闭关结算（`packages/domain/src/residence.ts`）

```typescript
export function resolveResidenceMeditate(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
): string {
  const registration = registrationModifiersOf(cultivator);
  const hasMaterials = cultivator.spiritStones >= 80;

  // 扣除灵石（如果有）
  if (hasMaterials) {
    cultivator.spiritStones -= 80;
  }

  // 计算修为增量
  const baseProgress = hasMaterials ? 10 : 4;
  const variance = hashString(`${world.tick}:${job.id}:meditate`) % (hasMaterials ? 5 : 3);
  const registrationBonus = registration?.cultivateBonus ?? 0;
  const clearMindBonus = hasEffect(cultivator, "clear-mind") ? 3 : 0;
  const progressGain = baseProgress + variance + registrationBonus + clearMindBonus;

  cultivator.realmProgress = clamp(cultivator.realmProgress + progressGain, 0, 200);

  // 感悟/偏差判定
  const roll = hashString(`${world.tick}:${job.id}:insight`) % 100;
  const insightThreshold = hasMaterials ? 15 : 5;
  const deviationThreshold = hasMaterials ? 5 : 10;

  if (roll < insightThreshold) {
    upsertEffect(cultivator, {
      id: "insight", name: "感悟", description: "修为增长加速。",
      source: "residence-meditate", remainingTicks: 3, intensity: 1,
    });
  } else if (roll >= 100 - deviationThreshold) {
    upsertEffect(cultivator, {
      id: "deviation", name: "走火入魔", description: "修炼效率降低，需要稳定心境。",
      source: "residence-meditate", remainingTicks: 3, intensity: 1,
    });
  }

  // 写入日志
  addDaoLog(world, cultivator.id,
    hasMaterials ? "闭关修炼" : "断料苦修",
    `消耗灵石 ${hasMaterials ? 80 : 0}，修为增加 ${progressGain}。`,
    ["cultivation", "residence"],
  );

  // 突破判定
  if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) {
    return handleBreakthrough(world, cultivator);
  }

  return `${cultivator.name} 完成闭关，修为增加 ${progressGain}。`;
}
```

---

## 测试策略

### 单元测试（`packages/domain/src/residence.test.ts`）

```typescript
describe("洞府动作", () => {
  describe("闭关", () => {
    it("标准闭关消耗 80 灵石，增加 10-14 修为", () => {});
    it("断料闭关不消耗灵石，增加 4-6 修为", () => {});
    it("重伤时禁止闭关", () => {});
    it("感悟触发概率约 15%（有材料）", () => {});
    it("偏差触发概率约 5%（有材料）", () => {});
  });

  describe("疗伤", () => {
    it("无丹药时降低 2 级伤势", () => {});
    it("有丹药时降低 4 级伤势并清除 1 个负面状态", () => {});
    it("疗伤永远可用（保底动作）", () => {});
  });

  describe("调息回灵", () => {
    it("基础恢复 35% 最大灵力", () => {});
    it("有回气丹恢复 60% 最大灵力", () => {});
    it("调息回灵永远可用（保底动作）", () => {});
    it("调息回灵是最便宜的动作（0 灵石）", () => {});
  });

  describe("基础生产", () => {
    it("疗伤丹配方：beast-core x1 + spirit-ore x1 + 30 灵石 → healing-pill x1", () => {});
    it("回气丹配方：spirit-ore x2 + 25 灵石 → qi-pill x1", () => {});
    it("护身符配方：ruin-fragment x1 + 40 灵石 → ward-talisman x1", () => {});
    it("材料不足时拒绝生产", () => {});
  });

  describe("好友交流", () => {
    it("好友交流可以 0 tick 完成", () => {});
    it("有概率触发消息", () => {});
    it("有概率解锁任务线索", () => {});
  });

  describe("前置条件", () => {
    it("不在洞府时所有洞府动作不可用", () => {});
    it("角色在洞府时可以看到全部 5 个洞府动作", () => {});
    it("受伤角色看不到闭关但看得到疗伤和调息", () => {});
  });
});
```

### 经济平衡测试

```typescript
describe("洞府经济循环", () => {
  it("1-2 次低风险任务收入足以支付 1 次疗伤", () => {
    // 低风险任务奖励 80-140 灵石
    // 疗伤成本 0 灵石
    // 明显满足
  });

  it("3-4 次低风险任务收入足以支付 1 次标准闭关", () => {
    // 3 次坊市打工 = 300-420 灵石
    // 闭关成本 80 灵石
    // 明显满足
  });

  it("断料闭关收益明显低于标准闭关", () => {
    // 标准：+10-14 修为
    // 断料：+4-6 修为
    // 差距约 2-3 倍
  });
});
```

---

## 迁移方案

### 从旧动作到新洞府动作

1. **meditate (1t)** → `residence-recover-qi (1t)`
   - 旧逻辑：全局可用，+28 spiritualPower
   - 新逻辑：仅洞府，恢复 35% maxQi
   - 迁移：保留旧 `meditate` 作为非洞府的轻量恢复，新增 `residence-recover-qi`

2. **heal (2t)** → `residence-heal (2t)`
   - 旧逻辑：仅 healing-sanctuary，+45 qi，清除 poisoned
   - 新逻辑：仅洞府，降低伤势，可选丹药
   - 迁移：`healing-sanctuary` 概念合并到洞府

3. **cultivate (4t)** → `residence-meditate (4t)`
   - 旧逻辑：全局可用，+18 realmProgress
   - 新逻辑：仅洞府，-80 灵石，+10-14 修为，感悟/偏差
   - 迁移：旧 `cultivate` 标记为 deprecated，新动作取代

### 迁移步骤

1. 在 `model.ts` 中新增 `Residence` 和 `ResidenceActionId` 类型
2. 在 `seed.ts` 中为现有角色分配默认洞府
3. 在 `engine.ts` 中新增洞府动作处理分支，保留旧动作
4. 在 `listAvailableActions` 中当角色在洞府时显示新动作
5. 测试通过后，标记旧动作为 deprecated
6. 最终移除旧动作
