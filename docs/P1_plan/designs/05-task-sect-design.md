# 设计：任务与宗门系统落地方案

## 技术概述

本文档将 `docs/P1_plan/05-task-and-sect-tables.md` 中定义的任务板系统和宗门系统转化为技术实现方案。核心变化是从当前简单的 `take-mortal-task`（固定 2t, +140 灵石）和 `take-sect-errand`（固定 2t, +180 灵石）升级为完整的数据驱动任务板、可配置任务模板、宗门贡献追踪和头衔自动更新系统。

当前代码现状：
- `packages/domain/src/engine.ts` 中 `take-mortal-task` 是在 `mortal-town` 位置固定可用的 2t 动作
- `take-sect-errand` 是在 `sect-gate` 位置且已加入宗门时可用的 2t 动作
- `join-sect` 是即时动作，硬编码加入 `qing-yun-sect`
- `model.ts` 中 `Sect` 接口只有 `id, name, type, treasury, memberIds, spiritVeins`
- 没有贡献系统、头衔系统、任务板刷新机制

P1 目标状态：
- 任务板：州主城 5 位、辅镇 3 位、宗门 2 位
- 5 类寻常任务模板 + 3 类高风险入口
- 4 类宗门任务模板
- 宗门贡献累计、头衔 5 档、2880t 自动更新
- 任务板 12t 刷新、持有上限（基础 2 / 宗门 1）

---

## 架构决策

### 决策 1：任务模板采用数据驱动 + 运行时实例化

**方案**：任务模板定义为静态数据，运行时根据模板 + 随机种子生成具体任务实例。

```
QuestTemplate（静态数据，~20 个模板）
    │
    │ 实例化
    ▼
QuestInstance（运行时数据，绑定到具体任务板位置）
    │
    │ 玩家接取
    ▼
ActiveQuest（绑定到具体角色，含进度和结算信息）
```

**为什么选这个**：
- 模板数量有限（5 寻常 + 3 高风险 + 4 宗门 = 12 类），但每次刷新需要产出不同参数的任务实例
- 数据驱动便于策划调参和测试
- 实例化过程使用世界 tick 和位置作为种子，保证确定性（同一 tick 同一位置看到相同任务）
- 与现有 `ActionJob` 的 pattern 一致（模板定义 + 运行时实例）

### 决策 2：任务板作为 WorldState 的一级成员

**方案**：在 `WorldState` 中新增 `questBoards: Record<LocationId, QuestBoard>` 字段。

**为什么选这个**：
- 任务板与世界状态强耦合（刷新依赖 tick，任务完成影响世界状态）
- 存储在 JSONB 快照中，与其他世界数据一起持久化
- 不需要额外的数据库表（减少 join 查询）
- 任务板数据量小（每个位置 3-5 个位，总共 < 200 个实例），对 JSONB 大小影响可忽略

### 决策 3：宗门贡献采用独立记录表 + 聚合缓存

**方案**：每次贡献变化写入 `sect_contributions` 表（详细记录），同时在 `Cultivator` 上缓存聚合值 `totalContribution`。

**为什么选这个**：
- 详细记录支持头衔更新时的精确排序
- 缓存值避免每次读取状态时都要 SUM 聚合
- 两者不一致时以详细记录为准（定时对账）
- 与现有 Repository pattern 一致

### 决策 4：头衔更新采用定时批处理而非实时计算

**方案**：每 2880 ticks 由 `apps/runtime-worker/src/scheduler.ts` 中的 cron 任务触发头衔更新。

**为什么选这个**：
- 头衔涉及排名竞争（多个角色争有限名额），实时计算开销大
- 2880 tick 的批处理窗口给玩家稳定的预期
- 与现有 `scheduler.ts` 的调度机制一致
- 批处理可以在低负载时段执行

---

## 数据流

### 任务板生成与刷新

```
世界 tick 推进
    │
    ├─ 检查各任务板最后刷新时间
    │     if (currentTick - board.lastRefreshedTick >= 12)
    │
    ▼
refreshQuestBoard(world, locationId)
    │
    ├─ 1. 获取位置信息
    │     location = world.locations[locationId]
    │     slots = location.questSlots  // 主城 5, 辅镇 3
    │
    ├─ 2. 保留未接取的任务（可选：全部清空重生成）
    │
    ├─ 3. 生成新任务实例
    │     for (i = 0; i < slots; i++)
    │       template = selectTemplate(location, world.tick, i)
    │       instance = instantiateQuest(template, location, world.tick)
    │       board.quests.push(instance)
    │
    ├─ 4. 更新刷新时间
    │     board.lastRefreshedTick = world.tick
    │
    └─ 返回更新后的 QuestBoard
```

### 任务接取与结算

```
玩家浏览任务板
    │
    ▼
GET /api/agent/quest-board
    │ 返回当前位置的 QuestBoard
    │
    ▼
玩家接取任务
    │
    ▼
POST /api/agent/action { actionId: "accept-quest", questInstanceId: "..." }
    │
    ├─ 1. 检查持有上限
    │     activeQuests = cultivator.activeQuests
    │     if (isBaseQuest && activeQuests.base.length >= 2) reject
    │     if (isSectQuest && activeQuests.sect.length >= 1) reject
    │
    ├─ 2. 检查准备度门槛
    │     readiness = computeReadiness(cultivator)
    │     if (readiness < quest.minReadiness) warn (不强制拒绝，但给出警告)
    │
    ├─ 3. 创建 ActiveQuest
    │     activeQuest = { ...instance, cultivatorId, acceptedAtTick }
    │     cultivator.activeQuests.push(activeQuest)
    │
    ├─ 4. 从任务板移除
    │     board.quests.remove(instance)
    │
    └─ 返回 QuestAcceptResult

玩家执行任务动作
    │
    ▼
POST /api/agent/action { actionId: "execute-quest", questId: "..." }
    │
    ├─ 创建 ActionJob（时长由任务模板决定）
    │
    ▼
tick 推进 → job 完成
    │
    ▼
resolveQuestJob(world, job)
    │
    ├─ 1. 计算结果（成功/失败）
    │     roll = hashString(world.tick + job.id)
    │     success = roll % 100 < quest.successRate
    │
    ├─ 2. 结算奖励/损耗
    │     if (success)
    │       cultivator.spiritStones += quest.reward.spiritStones
    │       cultivator.reputation += quest.reward.reputation
    │       addItems(cultivator, quest.reward.items)
    │     else
    │       applyFailurePenalty(cultivator, quest)
    │
    ├─ 3. 宗门贡献（如果是宗门任务）
    │     if (quest.isSectQuest && success)
    │       addSectContribution(world, cultivator, quest.contribution)
    │
    ├─ 4. 写入日志
    │     addDaoLog(world, cultivator.id, ..., ["quest-complete"])
    │
    └─ 5. 清理
          cultivator.activeQuests.remove(quest)
```

### 宗门头衔更新

```
每 2880 ticks 触发（scheduler.ts）
    │
    ▼
updateSectTitles(world)
    │
    ├─ 对每个宗门 sect
    │     ├─ 获取所有成员
    │     │     members = sect.memberIds.map(id => world.cultivators[id])
    │     │
    │     ├─ 按贡献排序
    │     │     sorted = members.sort(
    │     │       (a, b) => b.totalContribution - a.totalContribution
    │     │       || a.contributionReachedAt - b.contributionReachedAt
    │     │       || a.id.localeCompare(b.id)
    │     │     )
    │     │
    │     ├─ 分配名额
    │     │     for (const member of sorted)
    │     │       if (member.totalContribution >= 1500 && 长老名额未满)
    │     │         member.sectTitle = "长老"
    │     │       else if (member.totalContribution >= 600 && 精英名额未满)
    │     │         member.sectTitle = "精英"
    │     │       else if (member.totalContribution >= 200 && 内门名额未满)
    │     │         member.sectTitle = "内门"
    │     │       else
    │     │         member.sectTitle = "外门"
    │     │
    │     └─ 写入日志
    │           addDaoLog(world, ..., ["title-update", "sect"])
    │
    └─ 返回更新报告
```

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `packages/domain/src/model.ts` | 扩展 | 新增 `QuestTemplate`, `QuestInstance`, `QuestBoard`, `ActiveQuest`, `SectTitle`, `SectMembership` 类型；`Cultivator` 新增 `activeQuests`, `totalContribution`, `sectTitle` 字段；`Sect` 新增 `titleSlots`, `contributionThresholds`；`WorldState` 新增 `questBoards` |
| `packages/domain/src/quest.ts` | 新增 | 任务模板定义、任务板生成/刷新、任务接取/结算 |
| `packages/domain/src/sect.ts` | 新增 | 宗门系统、贡献计算、头衔更新、加入宗门 |
| `packages/domain/src/constants.ts` | 扩展 | 任务奖励参数表、宗门贡献阈值、头衔名额 |
| `packages/domain/src/engine.ts` | 修改 | `listAvailableActions` 增加任务相关动作；`performAction` 增加任务分发；`advanceWorld` 增加任务板刷新触发 |
| `packages/domain/src/seed.ts` | 修改 | 初始化世界时生成全部任务板 |
| `packages/contracts/src/runtime-api.ts` | 扩展 | 新增 `QuestBoardResponse`, `QuestAcceptRequest`, `SectInfoResponse` |
| `packages/persistence/src/world-repository.ts` | 扩展 | 新增 `updateSectTitles` 方法 |
| `apps/runtime-worker/src/routes.ts` | 扩展 | 新增 `/quest-board`, `/quest/accept`, `/quest/abandon`, `/sect/info`, `/sect/titles` 路由 |
| `apps/runtime-worker/src/scheduler.ts` | 扩展 | 新增 2880 tick 头衔更新调度 |

---

## TypeScript 接口定义

### 任务系统（`packages/domain/src/model.ts`）

```typescript
export type QuestCategory = "base" | "sect" | "high-risk";

export type BaseQuestType =
  | "gathering"          // 采集委托
  | "delivery"           // 跑腿递送
  | "market-work"        // 坊市打工
  | "bounty-low"         // 除魔悬赏（低阶）
  | "investigation";     // 调查寻访

export type HighRiskQuestType =
  | "state-elite"        // 州内精英任务
  | "dungeon-challenge"  // 副本挑战
  | "strong-event-quest"; // 强事件衍生任务

export type SectQuestType =
  | "resource-tribute"   // 资源上缴
  | "sect-delivery"      // 宗门跑腿/联络
  | "sect-exploration"   // 宗门专属游历
  | "patrol-suppress";   // 巡查/镇压

export type QuestType = BaseQuestType | HighRiskQuestType | SectQuestType;

export type ReadinessLevel = "poor" | "stable" | "ready" | "advantaged";

export interface QuestTemplate {
  readonly id: string;
  readonly type: QuestType;
  readonly category: QuestCategory;
  readonly name: string;
  readonly nameCn: string;
  readonly description: string;
  readonly durationTicks: number;
  readonly minReadiness: ReadinessLevel;
  readonly sourceNodeTypes: readonly NodeType[];  // 哪些节点类型可以刷出这个任务
  readonly reward: QuestReward;
  readonly failurePenalty: QuestPenalty;
  readonly contribution: number;                  // 宗门贡献（非宗门任务为 0）
  readonly successRate: number;                   // 0-100 基础成功率
}

export interface QuestReward {
  readonly spiritStones: { min: number; max: number };
  readonly reputation: number;
  readonly items: readonly { itemId: ItemId; count: number; chance: number }[];
  readonly karmaChange: number;
}

export interface QuestPenalty {
  readonly injuryTicks: number;
  readonly spiritStoneLoss: number;
  readonly timeLost: number;  // 额外浪费的 ticks
}

export interface QuestInstance {
  readonly id: string;
  readonly templateId: string;
  readonly locationId: LocationId;
  readonly name: string;
  readonly nameCn: string;
  readonly description: string;
  readonly durationTicks: number;
  readonly reward: QuestReward;
  readonly generatedAtTick: number;
  readonly expiresAtTick: number;       // = generatedAtTick + 12
}

export interface QuestBoard {
  readonly locationId: LocationId;
  readonly slots: number;
  readonly quests: readonly QuestInstance[];
  readonly lastRefreshedTick: number;
}

export interface ActiveQuest {
  readonly id: string;
  readonly instanceId: string;
  readonly templateId: string;
  readonly cultivatorId: string;
  readonly category: QuestCategory;
  readonly acceptedAtTick: number;
  readonly status: "accepted" | "in-progress" | "completed" | "failed" | "abandoned";
}
```

### 宗门系统（`packages/domain/src/model.ts`）

```typescript
export type SectTitle = "外门" | "内门" | "精英" | "长老" | "宗主";

export interface SectMembership {
  readonly cultivatorId: string;
  readonly sectId: string;
  readonly title: SectTitle;
  readonly totalContribution: number;
  readonly contributionReachedAt: number;  // 达到当前阈值的 tick
  readonly joinedAtTick: number;
}

export interface SectTitleSlot {
  readonly title: SectTitle;
  readonly threshold: number;
  readonly maxSlots: number;
}

// 扩展 Sect 接口
export interface Sect {
  readonly id: string;
  readonly name: string;
  readonly type: "剑修" | "丹修" | "阵修";
  readonly treasury: number;
  readonly memberIds: readonly string[];
  readonly spiritVeins: readonly string[];
  readonly headquarters: LocationId;         // 新增：总部地点
  readonly titleSlots: readonly SectTitleSlot[];  // 新增：头衔配置
  readonly titleUpdateInterval: 2880;        // 新增：更新周期
  readonly lastTitleUpdateTick: number;      // 新增：上次更新 tick
}

// 扩展 Cultivator
export interface Cultivator {
  // ... 现有字段 ...
  readonly sectTitle: SectTitle | null;
  readonly totalContribution: number;
  readonly activeQuests: readonly ActiveQuest[];
}
```

---

## 现有系统映射

| 当前动作 | P1 任务系统对应 | 变化说明 |
|---------|----------------|---------|
| `take-mortal-task` (2t, +140 灵石) | 任务板中的 `market-work` 或 `delivery` 模板 | 从固定动作变为任务板随机刷出；奖励从固定改为区间 |
| `take-sect-errand` (2t, +180 灵石) | 任务板中的 `sect-delivery` 或 `resource-tribute` 模板 | 同上；新增贡献值奖励 |
| `join-sect` (即时) | 保留为即时动作，但新增前置条件（至少完成 1 次基础任务） | 支持 3 个宗门选择；新增初始 `sectTitle = "外门"` |

---

## 5 类寻常任务模板详细参数

```typescript
export const BASE_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "tpl-gathering",
    type: "gathering",
    category: "base",
    name: "Gathering Commission",
    nameCn: "采集委托",
    description: "去州外采集指定材料并回交。",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: {
      spiritStones: { min: 90, max: 130 },
      reputation: 5,
      items: [{ itemId: "spirit-ore", count: 1, chance: 40 }],
      karmaChange: 0,
    },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0, timeLost: 3 },
    contribution: 0,
    successRate: 90,
  },
  {
    id: "tpl-delivery",
    type: "delivery",
    category: "base",
    name: "Delivery Run",
    nameCn: "跑腿递送",
    description: "在节点间递送物资或消息。",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: {
      spiritStones: { min: 80, max: 120 },
      reputation: 3,
      items: [],
      karmaChange: -1,
    },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0, timeLost: 2 },
    contribution: 0,
    successRate: 95,
  },
  {
    id: "tpl-market-work",
    type: "market-work",
    category: "base",
    name: "Market Work",
    nameCn: "坊市打工",
    description: "在坊市做稳定工作赚取灵石。",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["main-city"],
    reward: {
      spiritStones: { min: 100, max: 140 },
      reputation: 2,
      items: [],
      karmaChange: -2,
    },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0, timeLost: 0 },
    contribution: 0,
    successRate: 100,  // 永远成功（保底动作）
  },
  {
    id: "tpl-bounty-low",
    type: "bounty-low",
    category: "base",
    name: "Low-Tier Bounty",
    nameCn: "除魔悬赏（低阶）",
    description: "完成一次低压战斗任务。",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: {
      spiritStones: { min: 120, max: 180 },
      reputation: 8,
      items: [{ itemId: "beast-core", count: 1, chance: 30 }],
      karmaChange: 2,
    },
    failurePenalty: { injuryTicks: 2, spiritStoneLoss: 20, timeLost: 1 },
    contribution: 0,
    successRate: 80,
  },
  {
    id: "tpl-investigation",
    type: "investigation",
    category: "base",
    name: "Investigation",
    nameCn: "调查寻访",
    description: "收集线索、识别异常。",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: {
      spiritStones: { min: 90, max: 140 },
      reputation: 6,
      items: [{ itemId: "ruin-fragment", count: 1, chance: 25 }],
      karmaChange: 1,
    },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0, timeLost: 3 },
    contribution: 0,
    successRate: 85,
  },
];
```

---

## 宗门头衔自动更新实现

### 头衔配置（`packages/domain/src/constants.ts`）

```typescript
export const SECT_TITLE_CONFIG: readonly SectTitleSlot[] = [
  { title: "外门", threshold: 0,    maxSlots: Infinity },
  { title: "内门", threshold: 200,  maxSlots: 32 },
  { title: "精英", threshold: 600,  maxSlots: 16 },
  { title: "长老", threshold: 1500, maxSlots: 4 },
  { title: "宗主", threshold: Infinity, maxSlots: 1 },  // P1 不开放宗主竞选
];

export const TITLE_UPDATE_INTERVAL = 2880;
```

### 更新逻辑（`packages/domain/src/sect.ts`）

```typescript
export function updateSectTitles(world: WorldState): SectTitleUpdateReport {
  const reports: SectTitleUpdateReport[] = [];

  for (const sect of Object.values(world.sects)) {
    if (world.tick - sect.lastTitleUpdateTick < TITLE_UPDATE_INTERVAL) continue;

    const members = sect.memberIds
      .map(id => world.cultivators[id])
      .filter(Boolean);

    // 按贡献降序排序，同贡献按达到时间优先，再按 ID 稳定排序
    const sorted = [...members].sort((a, b) => {
      if (b.totalContribution !== a.totalContribution) {
        return b.totalContribution - a.totalContribution;
      }
      // contributionReachedAt 越小表示越早达到阈值
      if (a.contributionReachedAt !== b.contributionReachedAt) {
        return a.contributionReachedAt - b.contributionReachedAt;
      }
      return a.id.localeCompare(b.id);
    });

    // 从高到低分配名额
    const remaining: Record<SectTitle, number> = {
      "宗主": 1, "长老": 4, "精英": 16, "内门": 32, "外门": Infinity,
    };

    for (const member of sorted) {
      let assigned: SectTitle = "外门";
      for (const slot of SECT_TITLE_CONFIG.slice().reverse()) {
        if (
          slot.title !== "宗主" &&  // P1 不开放宗主
          member.totalContribution >= slot.threshold &&
          remaining[slot.title] > 0
        ) {
          assigned = slot.title;
          remaining[slot.title] -= 1;
          break;
        }
      }

      const oldTitle = member.sectTitle;
      member.sectTitle = assigned;

      if (oldTitle !== assigned) {
        addDaoLog(world, member.id,
          "宗门头衔变更",
          `${member.name} 的头衔从 ${oldTitle ?? "无"} 变更为 ${assigned}。`,
          ["title-update", "sect"],
        );
      }
    }

    sect.lastTitleUpdateTick = world.tick;
  }

  return reports;
}
```

### Scheduler 集成（`apps/runtime-worker/src/scheduler.ts`）

```typescript
// 在现有 scheduler 中添加头衔更新检查
async function onTickAdvanced(world: WorldState, repository: WorldRepository) {
  // ... 现有逻辑 ...

  // 检查是否需要更新宗门头衔
  for (const sect of Object.values(world.sects)) {
    if (world.tick - sect.lastTitleUpdateTick >= TITLE_UPDATE_INTERVAL) {
      updateSectTitles(world);
      await repository.saveWorld(world);
      break;  // 一次 tick 推进最多触发一次头衔更新
    }
  }

  // 检查是否需要刷新任务板
  for (const [locationId, board] of Object.entries(world.questBoards)) {
    if (world.tick - board.lastRefreshedTick >= 12) {
      refreshQuestBoard(world, locationId as LocationId);
    }
  }
}
```

---

## 3 类高风险入口实现

### 州内精英任务

```typescript
export const HIGH_RISK_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "tpl-state-elite",
    type: "state-elite",
    category: "high-risk",
    name: "State Elite Mission",
    nameCn: "州内精英任务",
    description: "处理州内高级异常或精英级对手。",
    durationTicks: 4,
    minReadiness: "ready",
    sourceNodeTypes: ["wilderness"],
    reward: {
      spiritStones: { min: 180, max: 260 },
      reputation: 15,
      items: [
        { itemId: "beast-core", count: 1, chance: 50 },
        { itemId: "ruin-fragment", count: 1, chance: 30 },
      ],
      karmaChange: 5,
    },
    failurePenalty: { injuryTicks: 4, spiritStoneLoss: 40, timeLost: 2 },
    contribution: 0,
    successRate: 65,
  },
];
```

### 副本挑战

副本挑战不通过任务板刷新，而是作为固定入口存在于副本节点：

```typescript
// 丙等、乙等、甲等副本分别绑定到 dungeon-c, dungeon-b, dungeon-a 节点
// 玩家到达节点后可直接发起挑战
export function isDungeonChallengeAvailable(
  cultivator: Cultivator,
  locationId: LocationId,
): boolean {
  const { nodeSlug } = parseLocationId(locationId);
  return nodeSlug.startsWith("dungeon-");
}
```

---

## 测试策略

### 单元测试

```typescript
describe("任务板系统", () => {
  describe("生成", () => {
    it("主城任务板有 5 个位", () => {});
    it("辅镇任务板有 3 个位", () => {});
    it("任务板 12 ticks 自动刷新", () => {});
    it("刷新后旧任务被替换", () => {});
  });

  describe("接取", () => {
    it("同时最多持有 2 个基础任务", () => {});
    it("同时最多持有 1 个宗门任务", () => {});
    it("高风险挑战不占任务栏", () => {});
    it("放弃基础任务无惩罚", () => {});
    it("放弃宗门任务无扣分", () => {});
  });

  describe("结算", () => {
    it("坊市打工成功率 100%，奖励 100-140 灵石", () => {});
    it("除魔悬赏失败导致 2t 伤势", () => {});
    it("宗门任务成功获得贡献值", () => {});
    it("宗门任务失败获得 0 贡献", () => {});
  });
});

describe("宗门头衔系统", () => {
  it("加入宗门后默认外门", () => {});
  it("贡献 200+ 且有名额时升为内门", () => {});
  it("贡献 600+ 且有名额时升为精英", () => {});
  it("贡献 1500+ 且有名额时升为长老", () => {});
  it("名额满时高贡献挤掉低贡献", () => {});
  it("同贡献按先达到阈值优先", () => {});
  it("2880 ticks 触发一次更新", () => {});
  it("更新后写入头衔变更日志", () => {});
});
```

### 集成测试

| 测试场景 | 验证内容 |
|---------|---------|
| 完整任务循环 | 浏览任务板 → 接取 → 执行 → 结算 → 奖励到账 |
| 宗门任务循环 | 加入宗门 → 接取宗门任务 → 完成 → 贡献增加 |
| 头衔更新 | 模拟 2880 ticks → 验证头衔分配正确 |
| 高风险路径 | 副本挑战 → 失败 → 伤势 → 恢复路径可用 |

---

## 迁移方案

### 从旧动作到新系统

1. **take-mortal-task** → 由任务板系统替代
   - 过渡期：保留旧动作作为 fallback
   - 新角色直接使用任务板
   - 旧角色下次登录时触发迁移

2. **take-sect-errand** → 由宗门任务板替代
   - 过渡期：同上

3. **join-sect** → 保留为即时动作，扩展为 3 选 1
   - 新增前置条件
   - 新增宗门选择参数

### 迁移步骤

1. 在 `model.ts` 中新增所有任务和宗门相关类型
2. 在 `seed.ts` 中初始化 3 个宗门的完整数据
3. 实现任务板生成和刷新逻辑
4. 实现任务接取和结算逻辑
5. 实现宗门贡献和头衔系统
6. 在 `engine.ts` 中新增动作分发
7. 新增 API 路由和调度任务
8. 测试通过后标记旧动作为 deprecated
