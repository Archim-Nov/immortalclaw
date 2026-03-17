# 设计：P1 黄金路径落地方案

## 技术概述

本文档将 `docs/P1_plan/02-golden-path.md` 中定义的标准可玩路径转化为技术实现方案。黄金路径的核心目的是保证新玩家从注册到跑通完整循环的流畅体验，对应到技术层面就是确保：

1. 初始化数据配置正确（起始地点、补给、洞府）
2. 每个阶段的 API 调用链路畅通
3. 时间节点验证可自动化（10/20/30/45 分钟）
4. 失败兜底路径不存在死路

当前代码现状：
- `packages/domain/src/engine.ts` 中 `createCultivator()` 默认将新角色放在 `"mortal-town"`
- `packages/domain/src/seed.ts` 中新角色初始补给通过 `starterProfile()` 函数配置
- 加入宗门是 `join-sect` 即时动作，仅在 `locationId === "sect-gate"` 时可用
- 当前没有任务板概念，`take-mortal-task` 是直接可执行的定时动作

P1 黄金路径的 8 个阶段必须在新架构下全部跑通。

---

## 架构决策

### 决策 1：引导系统采用服务端状态驱动而非前端硬编码

**方案**：在 `CultivatorStateView` 中新增 `onboarding` 字段，由服务端根据角色状态自动推断当前引导阶段。

```typescript
export interface OnboardingProgress {
  readonly stage: OnboardingStage;
  readonly completedStages: readonly OnboardingStage[];
  readonly nextAction: ActionId | null;
  readonly hint: string;
}

export type OnboardingStage =
  | "registered"        // 阶段 1：完成注册
  | "first-action"      // 阶段 2：做第一个动作
  | "first-travel"      // 阶段 3：第一次外出循环
  | "first-residence"   // 阶段 4：第一次洞府循环
  | "first-quest"       // 阶段 5：第一次任务循环
  | "joined-sect"       // 阶段 6：加入宗门
  | "first-sect-quest"  // 阶段 7：第一次宗门任务
  | "long-term-visible" // 阶段 8：看到长期目标
  | "completed";        // 引导完成
```

**为什么选这个**：
- 前端只负责展示提示信息，不需要自行判断用户状态
- 服务端拥有完整的角色数据，判断逻辑集中管理
- 状态驱动而非流程驱动，玩家可以跳过某些阶段
- 与现有 `agentGuidance` 结构自然融合

### 决策 2：初始资源配置通过常量表管理

**方案**：将新角色初始资源从散落在 `starterProfile()` 中的逻辑提取到 `packages/domain/src/constants.ts` 中的独立常量表。

**为什么选这个**：
- 策划调参不需要修改引擎逻辑代码
- 常量表可以被测试直接引用进行验证
- 与其他动作参数表（闭关成本、任务奖励等）统一管理方式

### 决策 3：阶段验证使用自动化集成测试而非手动检查

**方案**：创建 `packages/domain/src/golden-path.test.ts` 专用测试套件，模拟完整黄金路径并验证每个阶段的状态转换。

**为什么选这个**：
- 每次代码变更后可自动回归
- 测试本身就是黄金路径的可执行文档
- 可以加入时间约束断言（模拟 tick 推进）

---

## 黄金路径数据流

```
玩家注册
    │
    ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/register                     │
│   input: { name, startingPath, ... }         │
│   ├─ engine.createCultivator()               │
│   │   ├─ locationId = "qingzhou:main-city"   │
│   │   ├─ spiritStones = 200                  │
│   │   ├─ inventory = 新手补给                 │
│   │   └─ residenceId = auto-assigned         │
│   ├─ 写入 world_snapshots                    │
│   └─ 返回 AgentRegistrationResponse          │
└────────────┬────────────────────────────────┘
             │ 阶段 1 完成
             ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/action                       │
│   input: { actionId: "market-work" }         │
│   ├─ engine.performAction()                  │
│   │   ├─ 前置条件：locationId 在主城          │
│   │   ├─ 创建 ActionJob(2t)                  │
│   │   └─ 结算：+100-140 灵石                 │
│   ├─ onboarding.stage → "first-action"       │
│   └─ 返回 ActionExecutionResult              │
└────────────┬────────────────────────────────┘
             │ 阶段 2 完成
             ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/action                       │
│   input: { actionId: "travel" }              │
│   target: "qingzhou:wilderness"              │
│   ├─ engine.performAction()                  │
│   │   ├─ 路径计算：主城→游历区 = 2 ticks      │
│   │   ├─ 创建 ActionJob(2t)                  │
│   │   └─ 到达后触发事件池抽取                 │
│   └─ 返回后玩家处于游历区                     │
│                                              │
│ 玩家在游历区完成一次探索后                     │
│ POST /api/agent/action                       │
│   input: { actionId: "travel" }              │
│   target: "qingzhou:main-city"               │
│   ├─ 回到主城                                │
│   └─ onboarding.stage → "first-travel"       │
└────────────┬────────────────────────────────┘
             │ 阶段 3 完成
             ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/action                       │
│   input: { actionId: "residence-meditate" }  │
│   ├─ 前置条件：角色有洞府                     │
│   ├─ 创建 ActionJob(4t)                      │
│   ├─ 结算：+10-14 修为，-80 灵石             │
│   └─ onboarding.stage → "first-residence"    │
└────────────┬────────────────────────────────┘
             │ 阶段 4 完成
             ▼
┌─────────────────────────────────────────────┐
│ GET /api/agent/quest-board                   │
│   ├─ 返回当前节点任务板                       │
│ POST /api/agent/action                       │
│   input: { actionId: "accept-quest", ... }   │
│   ├─ 接取 "坊市打工" 或 "跑腿递送"           │
│ POST /api/agent/action                       │
│   input: { actionId: "complete-quest" }      │
│   ├─ 结算奖励                                │
│   └─ onboarding.stage → "first-quest"        │
└────────────┬────────────────────────────────┘
             │ 阶段 5 完成
             ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/action                       │
│   input: { actionId: "join-sect" }           │
│   ├─ 前置条件：至少完成 1 次基础任务          │
│   ├─ 分配 "外门" 头衔                        │
│   ├─ sectContribution = 0                    │
│   └─ onboarding.stage → "joined-sect"        │
└────────────┬────────────────────────────────┘
             │ 阶段 6 完成
             ▼
┌─────────────────────────────────────────────┐
│ POST /api/agent/action                       │
│   input: { actionId: "sect-quest" }          │
│   ├─ 接取 "宗门跑腿" 或 "资源上缴"           │
│   ├─ 结算：灵石 + 贡献值                     │
│   └─ onboarding.stage → "first-sect-quest"   │
└────────────┬────────────────────────────────┘
             │ 阶段 7 完成
             ▼
┌─────────────────────────────────────────────┐
│ GET /api/agent/state                         │
│   ├─ 返回宗门贡献、当前头衔、下一目标        │
│   └─ onboarding.stage → "long-term-visible"  │
└─────────────────────────────────────────────┘
  阶段 8 完成 → onboarding.stage = "completed"
```

---

## 文件变更清单

| 文件路径 | 变更 | 说明 |
|---------|------|------|
| `packages/domain/src/model.ts` | 扩展 | 新增 `OnboardingProgress`, `OnboardingStage` 类型 |
| `packages/domain/src/engine.ts` | 扩展 | 新增 `computeOnboardingStage()` 纯函数 |
| `packages/domain/src/seed.ts` | 修改 | 更新 `starterProfile()` 使用新初始化常量 |
| `packages/domain/src/constants.ts` | 新增 | 初始资源常量表、阶段判定阈值 |
| `packages/domain/src/golden-path.test.ts` | 新增 | 黄金路径端到端集成测试 |
| `packages/contracts/src/runtime-api.ts` | 扩展 | `CultivatorStateView` 新增 `onboarding` 字段 |
| `apps/runtime-worker/src/routes.ts` | 扩展 | 新增任务板查询路由 |
| `apps/web/src/components/Onboarding.tsx` | 新增 | 引导提示 UI 组件 |

---

## 初始化数据

### 新角色默认配置（`packages/domain/src/constants.ts`）

```typescript
export const P1_STARTER_CONFIG = {
  /** 默认出生地点 */
  startingLocation: "qingzhou:main-city" as LocationId,

  /** 初始灵石 */
  startingSpiritStones: 200,

  /** 初始灵力 */
  startingQi: 100,
  startingMaxQi: 100,

  /** 初始灵识 */
  startingSpiritualPower: 100,
  startingMaxSpiritualPower: 100,

  /** 新手补给 */
  startingInventory: {
    "healing-pill": 1,
    "qi-pill": 1,
    "ward-talisman": 1,
  } as Partial<Record<ItemId, number>>,

  /** 默认拥有固定洞府 */
  hasDefaultResidence: true,

  /** 境界 */
  startingRealm: "炼气" as RealmStage,
  startingRealmLevel: 1,
  startingRealmProgress: 0,
} as const;
```

### 默认洞府配置

```typescript
export interface Residence {
  readonly id: string;
  readonly cultivatorId: string;
  readonly locationId: LocationId;   // 洞府所在地点，默认与出生主城相同
  readonly level: 1;                 // P1 固定为 1
  readonly name: string;
  readonly createdAtTick: number;
}
```

新角色创建时，自动生成洞府：
- `locationId` 默认为出生州主城
- `level` 固定为 1（P1 不支持洞府升级）
- `name` 自动生成（如 "青州仙城·新修洞府"）

---

## 阶段验证标准

### 时间目标与技术指标映射

| 阶段 | 时间目标 | tick 预算 | 关键 API 调用 | 状态检查点 |
|------|---------|-----------|---------------|-----------|
| 1: 完成注册 | 0 分钟 | 0 ticks | `POST /register` | `cultivator.locationId === startingLocation` |
| 2: 第一个动作 | ≤10 分钟 | ≤4 ticks | `POST /action` | `completedJobs.length >= 1` |
| 3: 外出循环 | ≤20 分钟 | ≤12 ticks | 2x `POST /action`(travel) | 到达过 wilderness 并返回 |
| 4: 洞府循环 | ≤20 分钟 | ≤16 ticks | `POST /action`(residence) | 洞府动作结算至少 1 次 |
| 5: 任务循环 | ≤30 分钟 | ≤24 ticks | `GET /quest-board` + `POST /action` | 任务完成计数 >= 1 |
| 6: 加入宗门 | ≤35 分钟 | ≤28 ticks | `POST /action`(join-sect) | `cultivator.sectId !== null` |
| 7: 宗门任务 | ≤45 分钟 | ≤36 ticks | `POST /action`(sect-quest) | `sectContribution > 0` |
| 8: 长期目标 | ≤45 分钟 | ≤36 ticks | `GET /state` | onboarding 字段显示头衔信息 |

### 引导阶段推断逻辑

```typescript
export function computeOnboardingStage(
  cultivator: Cultivator,
  world: WorldState,
): OnboardingProgress {
  const completed: OnboardingStage[] = ["registered"];

  // 检查是否完成过任何动作
  const hasCompletedAction = world.daoLogs.some(
    log => log.cultivatorId === cultivator.id && !log.tags.includes("seed")
  );
  if (hasCompletedAction) completed.push("first-action");

  // 检查是否到达过游历区
  const hasTraveled = world.daoLogs.some(
    log => log.cultivatorId === cultivator.id && log.tags.includes("travel")
  );
  if (hasTraveled) completed.push("first-travel");

  // 检查是否使用过洞府动作
  const hasUsedResidence = world.daoLogs.some(
    log => log.cultivatorId === cultivator.id && log.tags.includes("residence")
  );
  if (hasUsedResidence) completed.push("first-residence");

  // 检查是否完成过任务
  const hasCompletedQuest = world.daoLogs.some(
    log => log.cultivatorId === cultivator.id && log.tags.includes("quest-complete")
  );
  if (hasCompletedQuest) completed.push("first-quest");

  // 检查是否加入宗门
  if (cultivator.sectId) completed.push("joined-sect");

  // 检查是否完成宗门任务
  const hasCompletedSectQuest = world.daoLogs.some(
    log => log.cultivatorId === cultivator.id && log.tags.includes("sect-quest-complete")
  );
  if (hasCompletedSectQuest) completed.push("first-sect-quest");

  // 检查长期目标是否可见（加入宗门且完成宗门任务）
  if (completed.includes("first-sect-quest")) {
    completed.push("long-term-visible");
  }

  const allStages: OnboardingStage[] = [
    "registered", "first-action", "first-travel", "first-residence",
    "first-quest", "joined-sect", "first-sect-quest", "long-term-visible",
  ];

  const currentIndex = completed.length - 1;
  const stage = currentIndex >= allStages.length - 1
    ? "completed" as OnboardingStage
    : allStages[currentIndex]!;

  // 推断下一步建议动作
  const nextAction = computeNextSuggestedAction(stage, cultivator);
  const hint = computeHint(stage);

  return { stage, completedStages: completed, nextAction, hint };
}
```

---

## 失败恢复机制

### 反软锁保证

P1 黄金路径必须满足以下不变量：**任何状态下角色都至少有 1 个可执行动作。**

```
角色状态判断
    │
    ├─ 有 activeJob？ → 等待 tick 推进（不是软锁）
    │
    ├─ 受伤？
    │   ├─ 在洞府/疗伤点？ → 可执行 "疗伤"（0 灵石可用）
    │   └─ 不在？ → 可执行 "赶路回洞府"（赶路不消耗灵石）
    │
    ├─ 灵力耗尽？
    │   ├─ 在洞府？ → 可执行 "调息回灵"（0 灵石可用）
    │   └─ 不在？ → 可执行 "赶路回洞府"
    │
    ├─ 没有灵石？
    │   ├─ 在主城/辅镇？ → 可执行 "坊市打工"（0 前置成本）
    │   └─ 不在？ → 可执行 "赶路回主城"
    │
    └─ 受伤 + 没钱 + 灵力耗尽？
        └─ 可执行 "赶路回洞府" → "调息回灵"（免费） → "赶路回主城" → "坊市打工"
```

### 保底动作定义

```typescript
export const SAFETY_NET_ACTIONS: readonly ActionId[] = [
  "travel",           // 赶路永远可用（不消耗灵石）
  "rest-recover-qi",  // 调息回灵（0 灵石成本）
  "market-work",      // 坊市打工（0 前置成本，poor 准备度可接）
  "delivery-run",     // 跑腿递送（0 前置成本，poor 准备度可接）
] as const;
```

### 实现要点

在 `listAvailableActions()` 中增加保底逻辑：

```typescript
// 如果常规动作列表为空（不应该发生），强制插入保底动作
if (actions.length === 0) {
  actions.push({
    actionId: "travel" as ActionId,
    label: "返回洞府",
    description: "回到洞府休整。",
    durationTicks: computeTravelTicks(cultivator.locationId, residenceLocation),
    kind: "timed",
  });
}
```

---

## 前端引导

### UI 引导方式

采用非阻塞式引导：
- **顶部横幅**：在玩家主界面顶部显示当前引导阶段和下一步建议
- **动作高亮**：在动作列表中高亮推荐的下一个动作
- **完成反馈**：阶段完成时显示简短的祝贺信息和解锁内容说明

不采用：
- 强制弹窗教程
- 不可跳过的引导流程
- 限制玩家只能执行推荐动作

### 国际化

引导文案通过 i18n 系统管理（当前项目支持 `en` 和 `zh-CN`）：

```typescript
// apps/web 的 i18n 文件中
const onboardingHints = {
  "registered": {
    "zh-CN": "欢迎来到九州！尝试做第一个动作吧。",
    "en": "Welcome to the Nine States! Try your first action.",
  },
  "first-action": {
    "zh-CN": "做得好！现在去州外游历区看看吧。",
    "en": "Well done! Now explore the wilderness.",
  },
  // ...
};
```

---

## 测试策略

### 黄金路径集成测试（`packages/domain/src/golden-path.test.ts`）

```typescript
describe("P1 Golden Path", () => {
  it("新角色在 36 ticks 内完成全部 8 个引导阶段", () => {
    const world = createSeedWorld();
    const cultivator = createCultivator(world, {
      name: "测试修士",
      startingPath: "sword",
    });

    // 阶段 1：注册完成
    expect(cultivator.locationId).toBe("qingzhou:main-city");

    // 阶段 2：第一个低风险动作
    performAction(world, cultivator.id, "market-work");
    advanceWorld(world, 2);
    // ... 验证灵石增加

    // 阶段 3-8：依次执行并验证
    // ...

    // 最终验证
    const onboarding = computeOnboardingStage(
      world.cultivators[cultivator.id]!,
      world,
    );
    expect(onboarding.stage).toBe("completed");
  });

  it("低准备度角色可通过保底路径恢复", () => {
    const world = createSeedWorld();
    const cultivator = createCultivator(world, { name: "穷修士" });
    // 模拟灵石耗尽、受伤
    world.cultivators[cultivator.id]!.spiritStones = 0;
    world.cultivators[cultivator.id]!.injuryTicksRemaining = 5;

    const actions = listAvailableActions(world, cultivator.id);
    // 必须至少有 1 个可执行动作
    expect(actions.length).toBeGreaterThan(0);
    // 保底动作必须存在
    expect(actions.some(a => a.actionId.startsWith("travel"))).toBe(true);
  });

  it("高风险失败后 2 个动作内回到可玩状态", () => {
    // 模拟副本失败，验证通过疗伤+调息回灵即可恢复
  });
});
```

### 路径 B/C 覆盖测试

- **路径 B（低准备度兜底）**：模拟 `readiness = poor`，验证可执行动作序列
- **路径 C（高风险接入）**：模拟 `readiness = ready/advantaged`，验证高风险入口可见
