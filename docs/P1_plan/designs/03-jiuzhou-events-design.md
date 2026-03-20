# 设计：九州世界与事件系统落地方案

## 技术概述

本文档是 P1 技术设计中最大的一份，负责将 `docs/P1_plan/03-jiuzhou-and-events.md` 中规划的九州世界从概念落地为可运行的代码。核心任务是将当前 `packages/domain/src/model.ts` 中 6 个扁平 `ZoneId` 替换为 72 个层级化地点节点，同时构建完整的事件池系统和可变耗时赶路系统。

当前代码现状：
- `model.ts` 中 `ZoneId` 是 6 个字面量联合类型：`mortal-town | market | sect-gate | spirit-mine | mystic-ruins | healing-sanctuary`
- `engine.ts` 中 `TRAVEL_TARGETS` 将 6 个 travel 动作映射到 6 个区域，所有赶路均为 1 tick
- `seed.ts` 中 `zones` 是 6 个静态 `Zone` 对象
- `Cultivator.locationId` 类型为 `ZoneId`
- 没有事件池概念，`WorldEvent` 仅用于日志记录

P1 目标状态：
- 9 州 x 8 节点 = 72 个 `Location` 对象
- 赶路耗时 1-8 ticks，基于拓扑图计算
- 105+ 事件模板分层管理（全局/州特有/节点/覆盖层）
- 事件在游历和赶路时自动触发

---

## 架构决策

### 决策 1：LocationId 采用 `"{stateId}:{nodeSlug}"` 格式的字符串

**方案**：LocationId 为普通 `string` 类型，格式约定 `"{stateId}:{nodeSlug}"`。

示例：
```
"qingzhou:main-city"
"qingzhou:east-town"
"qingzhou:wilderness"
"qingzhou:dungeon-c"
"yangzhou:main-city"
"zhongzhou:west-town"
```

**为什么选这个**：
- 72 个硬编码字面量联合类型会导致 TypeScript 编译器性能严重下降
- 字符串格式可以通过 `parseLocationId(id)` 工具函数在运行时提取 `stateId` 和 `nodeSlug`
- 种子数据生成器可以用模板函数批量生成，不需要手写每一个
- 与数据库 JSONB 存储天然兼容

**运行时验证**：
```typescript
export function parseLocationId(id: LocationId): { stateId: StateId; nodeSlug: string } {
  const parts = id.split(":");
  if (parts.length !== 2) throw new Error(`Invalid LocationId: ${id}`);
  return { stateId: parts[0] as StateId, nodeSlug: parts[1]! };
}

export function isValidLocationId(id: string, locations: Record<LocationId, Location>): boolean {
  return id in locations;
}
```

### 决策 2：拓扑结构采用邻接列表 + 预计算距离矩阵

**方案**：`TopologyGraph` 存储所有边的邻接列表，同时预计算每对节点之间的最短路径耗时。

```typescript
export interface TopologyGraph {
  readonly edges: readonly TopologyEdge[];
  readonly adjacency: Record<LocationId, readonly TopologyEdge[]>;
  readonly distanceMatrix: Record<LocationId, Record<LocationId, number>>;
}
```

**为什么选这个**：
- 72 个节点的距离矩阵大小为 72x72 = 5184 条，内存占用可忽略
- 预计算避免了每次赶路请求都做图搜索
- 邻接列表方便逐边添加地形修正和状态修正
- 跨州旅行的中间节点可以触发赶路事件

### 决策 3：事件池采用四层合并策略

**方案**：事件抽取时按 `global-common → state-specific → node-specific → special-overlay` 四层合并权重。

```
事件池合并
    │
    ├─ global-common（15 条，基础权重 1.0）
    │
    ├─ state-specific（每州 9 条，权重 1.5）
    │
    ├─ node-specific（特定节点覆盖，权重 2.0）
    │
    └─ special-overlay（状态修正层）
        ├─ recoveryState overlay → 伤势/枯竭时调整权重
        ├─ sect-affiliation overlay → 宗门相关事件加权
        └─ dominant-element overlay → 五行偏向调整掉落
```

**为什么选这个**：
- 四层结构允许用最少的事件模板覆盖最多的场景
- 全局通用池避免每州都写重复事件
- overlay 机制让角色状态影响事件内容，增加个性化
- 权重合并而非覆盖，保证池子不会被清空

### 决策 4：赶路系统采用统一公式 + 事件注入点

**方案**：赶路创建一个 `TravelJob`，途中每推进 1 tick 都有概率触发赶路事件。

**为什么选这个**：
- 长途赶路（4-8 ticks）不应该是空白等待
- 事件注入点复用事件池抽取逻辑，减少代码重复
- 赶路中断（如遭遇战斗）可以通过修改 `TravelJob.remainingTicks` 实现

---

## 数据流

### 赶路请求完整流程

```
玩家发起赶路
    │
    ▼
performAction(world, cultivatorId, "travel")
    │
    ├─ 1. 解析目标地点
    │     travelTarget = parseTravelTarget(actionPayload)
    │
    ├─ 2. 路径计算
    │     path = computePath(topology, currentLocation, travelTarget)
    │     baseTicks = topology.distanceMatrix[current][target]
    │
    ├─ 3. 耗时修正
    │     finalTicks = baseTicks
    │       + terrainModifier(path)
    │       - mobilityModifier(cultivator)
    │       + statusModifier(cultivator)
    │
    ├─ 4. 创建 TravelJob
    │     job = { id, cultivatorId, actionId: "travel",
    │             targetLocationId, remainingTicks: finalTicks,
    │             totalTicks: finalTicks, route: path }
    │
    └─ 返回 ActionExecutionResult

每次 advanceWorld tick 推进
    │
    ├─ 遍历所有活跃 job
    │     job.remainingTicks -= 1
    │
    ├─ 若 job 是 TravelJob 且 remainingTicks > 0
    │     ├─ 30% 概率触发赶路事件
    │     │     event = drawEvent(world, "travel", cultivator)
    │     │     applyEventResult(world, cultivator, event)
    │     └─ 写入 travel-log
    │
    └─ 若 job.remainingTicks === 0
          ├─ cultivator.locationId = job.targetLocationId
          ├─ 触发到达事件（如果目标是游历区）
          │     event = drawEvent(world, "exploration", cultivator)
          │     applyEventResult(world, cultivator, event)
          ├─ 写入 travel-log + event-log
          └─ 清理 job
```

### 事件抽取流程

```
drawEvent(world, source, cultivator)
    │
    ├─ 1. 收集候选事件池
    │     pool = []
    │     pool.push(...globalCommonPool)        // 15 条
    │     pool.push(...stateSpecificPool[stateId]) // 9 条
    │     pool.push(...nodeSpecificPool[locationId]) // 0-3 条
    │
    ├─ 2. 应用 overlay 权重修正
    │     applyRecoveryStateOverlay(pool, cultivator)
    │     applySectAffiliationOverlay(pool, cultivator)
    │     applyDominantElementOverlay(pool, cultivator)
    │
    ├─ 3. 加权随机抽取主事件
    │     mainEvent = weightedRandomPick(pool)
    │
    ├─ 4. 判断是否追加次事件
    │     if (mainEvent.result !== "combat" && random() < 0.3)
    │       subEvent = drawSubEvent(pool, "story")
    │
    └─ 返回 { mainEvent, subEvent? }
```

---

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `packages/domain/src/model.ts` | 重构 | 新增 `StateId`, `NodeType`, `LocationId`, `Location`, `State`, `TopologyEdge`, `TopologyGraph`, `EventTemplate`, `EventPool`, `EventResult` 类型；`Cultivator.locationId` 类型从 `ZoneId` 改为 `LocationId`；`WorldState` 新增 `states`, `locations`, `topology`, `eventPools` 字段 |
| `packages/domain/src/topology.ts` | 新增 | 拓扑图构建、路径计算、距离矩阵预计算 |
| `packages/domain/src/events.ts` | 新增 | 事件池定义、四层合并、加权抽取、结果应用 |
| `packages/domain/src/seed.ts` | 重写 | 程序化生成 9 州 72 地点、拓扑边、事件池种子数据 |
| `packages/domain/src/engine.ts` | 重构 | 赶路系统从 6 个硬编码 travel 动作改为通用 `travel` + 目标地点；`advanceWorld` 中增加赶路事件注入；`resolveJob` 增加到达事件触发 |
| `packages/domain/src/model.ts` | 修改 | `WorldEvent.zoneId` 改为 `WorldEvent.locationId` |
| `packages/contracts/src/runtime-api.ts` | 扩展 | 新增 `TravelRequest`, `LocationInfoResponse`, `EventLogResponse` |
| `apps/runtime-worker/src/routes.ts` | 扩展 | 新增 `/locations`, `/travel`, `/events` 路由 |
| `packages/persistence/src/world-repository.ts` | 扩展 | `WorldState` schema 更新后自动适配 |

---

## TypeScript 接口定义

### 州与地点（`packages/domain/src/model.ts`）

```typescript
export type StateId =
  | "qingzhou" | "yangzhou" | "zhongzhou"
  | "shuzhou"  | "youzhou"  | "liangzhou"
  | "leizhou"  | "cangzhou" | "wanzhou";

export type NodeType =
  | "main-city"
  | "sub-town-east" | "sub-town-west" | "sub-town-south"
  | "wilderness"
  | "dungeon-c" | "dungeon-b" | "dungeon-a";

export type LocationId = string;

export type RiskLevel = "safe" | "low" | "medium" | "high";

export interface Location {
  readonly id: LocationId;
  readonly stateId: StateId;
  readonly nodeType: NodeType;
  readonly name: string;
  readonly nameCn: string;
  readonly description: string;
  readonly riskLevel: RiskLevel;
  readonly questSlots: number;
  readonly hasSectGate: boolean;
  readonly hasMarket: boolean;
  readonly canAccess: (cultivator: Cultivator) => boolean;
}

export interface State {
  readonly id: StateId;
  readonly name: string;
  readonly nameCn: string;
  readonly resourceBias: string;
  readonly riskBias: string;
  readonly eventBias: string;
  readonly sectHooks: readonly string[];
  readonly specialRule: string | null;
}

export interface TopologyEdge {
  readonly from: LocationId;
  readonly to: LocationId;
  readonly baseTicks: number;
  readonly terrainModifier: number;
  readonly bidirectional: boolean;
}

export interface TopologyGraph {
  readonly edges: readonly TopologyEdge[];
  readonly adjacency: Readonly<Record<LocationId, readonly TopologyEdge[]>>;
  readonly distanceMatrix: Readonly<Record<LocationId, Record<LocationId, number>>>;
}
```

### 事件系统（`packages/domain/src/events.ts`）

```typescript
export type EventSourceType = "exploration" | "travel";
export type EventSemanticType = "fortune" | "training" | "human";
export type EventResultType = "resource" | "progression" | "status" | "combat" | "story";
export type EventPoolLayer = "global-common" | "state-specific" | "node-specific" | "special-overlay";

export interface EventTemplate {
  readonly id: string;
  readonly layer: EventPoolLayer;
  readonly source: EventSourceType;
  readonly semanticType: EventSemanticType;
  readonly resultType: EventResultType;
  readonly name: string;
  readonly nameCn: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly stateId: StateId | null;       // null 表示全局通用
  readonly nodeType: NodeType | null;     // null 表示不限节点
  readonly minRealm: RealmStage | null;   // 最低境界要求
  readonly effects: EventEffect;
}

export interface EventEffect {
  readonly spiritStones?: number;
  readonly qi?: number;
  readonly spiritualPower?: number;
  readonly realmProgress?: number;
  readonly injury?: number;
  readonly itemRewards?: readonly { itemId: ItemId; count: number }[];
  readonly statusEffects?: readonly { effectId: StatusEffectId; ticks: number }[];
  readonly karmaChange?: number;
  readonly reputationChange?: number;
}

export interface EventPool {
  readonly globalCommon: readonly EventTemplate[];
  readonly stateSpecific: Readonly<Record<StateId, readonly EventTemplate[]>>;
  readonly nodeSpecific: Readonly<Record<LocationId, readonly EventTemplate[]>>;
  readonly travelPool: readonly EventTemplate[];
}

export interface DrawnEvent {
  readonly template: EventTemplate;
  readonly subEvent: EventTemplate | null;
  readonly locationId: LocationId;
  readonly tick: number;
}
```

### 赶路扩展（`packages/domain/src/model.ts`）

```typescript
// 扩展 ActionJob 以支持赶路详细信息
export interface TravelJobData {
  readonly targetLocationId: LocationId;
  readonly route: readonly LocationId[];
  readonly eventsTriggered: readonly string[];
}

// 扩展 WorldState
export interface WorldState {
  // ... 现有字段 ...
  readonly states: Readonly<Record<StateId, State>>;
  readonly locations: Readonly<Record<LocationId, Location>>;
  readonly topology: TopologyGraph;
  readonly eventPools: EventPool;
  // zones 标记为 deprecated
  /** @deprecated 使用 locations 替代 */
  readonly zones: Record<string, Zone>;
}
```

---

## 种子数据生成

### 程序化生成 72 地点（`packages/domain/src/seed.ts`）

```typescript
const STATE_DEFINITIONS: readonly StateDefinition[] = [
  { id: "qingzhou",   name: "Qingzhou",   nameCn: "青州", resourceBias: "药材、基础灵石",        riskBias: "low",    eventBias: "低阶妖患",     sectHooks: ["宗门入口候选"] },
  { id: "yangzhou",   name: "Yangzhou",   nameCn: "扬州", resourceBias: "水属性材料、跑商收益",  riskBias: "low",    eventBias: "水域赶路事件",  sectHooks: ["市井与商会接口"] },
  { id: "zhongzhou",  name: "Zhongzhou",  nameCn: "中州", resourceBias: "综合资源、宗门联络",    riskBias: "medium", eventBias: "官面任务与巡查", sectHooks: ["宗门事务中转"] },
  { id: "shuzhou",    name: "Shuzhou",    nameCn: "蜀州", resourceBias: "药草、灵木",            riskBias: "medium", eventBias: "山路隐秘事件",  sectHooks: ["资源转化接口"] },
  { id: "youzhou",    name: "Youzhou",    nameCn: "幽州", resourceBias: "寒性材料、狩猎收益",    riskBias: "medium", eventBias: "中风险野外遭遇", sectHooks: ["镇压与边巡任务"] },
  { id: "liangzhou",  name: "Liangzhou",  nameCn: "凉州", resourceBias: "矿材、妖核",            riskBias: "high",   eventBias: "长途赶路枯竭",  sectHooks: ["资源上缴任务"] },
  { id: "leizhou",    name: "Leizhou",    nameCn: "雷州", resourceBias: "雷性碎片、强事件线索",  riskBias: "high",   eventBias: "状态型事件",    sectHooks: ["高风险精英钩子"] },
  { id: "cangzhou",   name: "Cangzhou",   nameCn: "沧州", resourceBias: "水灵材、残碑碎片",      riskBias: "medium", eventBias: "航路与遗迹事件", sectHooks: ["调查寻访接口"] },
  { id: "wanzhou",    name: "Wanzhou",    nameCn: "宛州", resourceBias: "杂项资源、关系事件",    riskBias: "low",    eventBias: "邪修与流寇事件", sectHooks: ["人情任务与联络"] },
];

const NODE_TEMPLATES: readonly NodeTemplate[] = [
  { slugSuffix: "main-city",      nodeType: "main-city",      nameSuffix: "仙城",     riskLevel: "safe",   questSlots: 5 },
  { slugSuffix: "east-town",      nodeType: "sub-town-east",  nameSuffix: "东镇",     riskLevel: "safe",   questSlots: 3 },
  { slugSuffix: "west-town",      nodeType: "sub-town-west",  nameSuffix: "西镇",     riskLevel: "safe",   questSlots: 3 },
  { slugSuffix: "south-town",     nodeType: "sub-town-south", nameSuffix: "南镇",     riskLevel: "low",    questSlots: 3 },
  { slugSuffix: "wilderness",     nodeType: "wilderness",     nameSuffix: "州外山野", riskLevel: "medium", questSlots: 0 },
  { slugSuffix: "dungeon-c",      nodeType: "dungeon-c",      nameSuffix: "丙等试炼", riskLevel: "medium", questSlots: 0 },
  { slugSuffix: "dungeon-b",      nodeType: "dungeon-b",      nameSuffix: "乙等秘境", riskLevel: "high",   questSlots: 0 },
  { slugSuffix: "dungeon-a",      nodeType: "dungeon-a",      nameSuffix: "甲等遗址", riskLevel: "high",   questSlots: 0 },
];

export function generateLocations(): Record<LocationId, Location> {
  const locations: Record<LocationId, Location> = {};
  for (const state of STATE_DEFINITIONS) {
    for (const node of NODE_TEMPLATES) {
      const id: LocationId = `${state.id}:${node.slugSuffix}`;
      locations[id] = {
        id,
        stateId: state.id,
        nodeType: node.nodeType,
        name: `${state.name} ${node.slugSuffix}`,
        nameCn: `${state.nameCn}${node.nameSuffix}`,
        description: `${state.nameCn}的${node.nameSuffix}`,
        riskLevel: node.riskLevel,
        questSlots: node.questSlots,
        hasSectGate: node.nodeType === "main-city",
        hasMarket: node.nodeType === "main-city" || node.nodeType.startsWith("sub-town"),
        canAccess: () => true,
      };
    }
  }
  return locations; // 共 72 个
}
```

### 拓扑边生成

```typescript
export function generateTopology(locations: Record<LocationId, Location>): TopologyGraph {
  const edges: TopologyEdge[] = [];

  for (const state of STATE_DEFINITIONS) {
    const mainCity = `${state.id}:main-city`;

    // 州内边：主城 <-> 辅镇 (1 tick)
    for (const town of ["east-town", "west-town", "south-town"]) {
      edges.push({ from: mainCity, to: `${state.id}:${town}`, baseTicks: 1, terrainModifier: 0, bidirectional: true });
    }

    // 主城 <-> 游历区 (2 ticks)
    edges.push({ from: mainCity, to: `${state.id}:wilderness`, baseTicks: 2, terrainModifier: 0, bidirectional: true });

    // 辅镇 <-> 游历区 (1-2 ticks)
    for (const town of ["east-town", "south-town"]) {
      edges.push({ from: `${state.id}:${town}`, to: `${state.id}:wilderness`, baseTicks: 2, terrainModifier: 0, bidirectional: true });
    }

    // 主城 <-> 副本节点 (2-3 ticks)
    edges.push({ from: mainCity, to: `${state.id}:dungeon-c`, baseTicks: 2, terrainModifier: 0, bidirectional: true });
    edges.push({ from: mainCity, to: `${state.id}:dungeon-b`, baseTicks: 3, terrainModifier: 0, bidirectional: true });
    edges.push({ from: mainCity, to: `${state.id}:dungeon-a`, baseTicks: 3, terrainModifier: 0, bidirectional: true });
  }

  // 跨州边：相邻州主城之间
  const CROSS_STATE_ADJACENCY: [StateId, StateId, number][] = [
    ["qingzhou", "yangzhou", 4],    // 相邻
    ["qingzhou", "zhongzhou", 4],   // 相邻
    ["yangzhou", "zhongzhou", 4],   // 相邻
    ["zhongzhou", "shuzhou", 4],    // 相邻
    ["zhongzhou", "youzhou", 6],    // 中距离
    ["shuzhou", "liangzhou", 6],    // 中距离
    ["youzhou", "liangzhou", 6],    // 中距离
    ["liangzhou", "leizhou", 6],    // 中距离
    ["leizhou", "cangzhou", 6],     // 中距离
    ["cangzhou", "wanzhou", 4],     // 相邻
    ["wanzhou", "yangzhou", 6],     // 中距离
    ["qingzhou", "leizhou", 8],     // 远距离
    ["shuzhou", "cangzhou", 8],     // 远距离
    ["youzhou", "wanzhou", 8],      // 远距离
  ];

  for (const [from, to, ticks] of CROSS_STATE_ADJACENCY) {
    edges.push({
      from: `${from}:main-city`,
      to: `${to}:main-city`,
      baseTicks: ticks,
      terrainModifier: 0,
      bidirectional: true,
    });
  }

  // 构建邻接列表和距离矩阵
  const adjacency = buildAdjacency(edges);
  const distanceMatrix = computeDistanceMatrix(Object.keys(locations), adjacency);

  return { edges, adjacency, distanceMatrix };
}
```

---

## 数据库迁移

### 迁移脚本

```sql
-- 迁移 001: 更新 world_snapshots 的 JSONB 内容
-- 无需 DDL 变更，JSONB 结构在应用层处理
-- 旧快照中的 zones 字段保留，新快照同时写入 locations + states + topology

-- 迁移 002: 事件日志表（可选，用于分析）
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_tick INTEGER NOT NULL,
  cultivator_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  event_template_id TEXT NOT NULL,
  source_type TEXT NOT NULL,         -- exploration | travel
  semantic_type TEXT NOT NULL,       -- fortune | training | human
  result_type TEXT NOT NULL,         -- resource | progression | status | combat | story
  effects JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_logs_cultivator ON event_logs(cultivator_id);
CREATE INDEX idx_event_logs_tick ON event_logs(world_tick);
```

### 数据迁移策略

旧数据（6 个 zone）到新数据（72 个 location）的迁移：

```typescript
const ZONE_TO_LOCATION_MAP: Record<ZoneId, LocationId> = {
  "mortal-town":       "qingzhou:main-city",
  "market":            "qingzhou:east-town",
  "sect-gate":         "qingzhou:main-city",    // 宗门入口合并到主城
  "spirit-mine":       "qingzhou:wilderness",
  "mystic-ruins":      "qingzhou:dungeon-c",
  "healing-sanctuary": "qingzhou:main-city",    // 疗伤功能合并到洞府
};

export function migrateWorldState(oldWorld: WorldState): WorldState {
  const locations = generateLocations();
  const states = generateStates();
  const topology = generateTopology(locations);
  const eventPools = generateEventPools();

  const migratedCultivators = Object.fromEntries(
    Object.entries(oldWorld.cultivators).map(([id, c]) => [
      id,
      { ...c, locationId: ZONE_TO_LOCATION_MAP[c.locationId as ZoneId] ?? "qingzhou:main-city" },
    ])
  );

  return {
    ...oldWorld,
    version: oldWorld.version + 1,
    cultivators: migratedCultivators,
    states,
    locations,
    topology,
    eventPools,
    zones: oldWorld.zones, // 保留旧数据做兼容
  };
}
```

---

## 事件池设计

### 全局通用游历池（15 条）

| ID | 语义类型 | 结果类型 | 名称 | 效果摘要 |
|----|---------|---------|------|---------|
| `g-f-01` | fortune | resource | 路边灵草 | +30-50 灵石等值材料 |
| `g-f-02` | fortune | resource | 废弃储物袋 | +50-80 灵石 |
| `g-f-03` | fortune | progression | 残碑感悟 | +3 修为进度 |
| `g-f-04` | fortune | status | 灵泉浸泡 | clear-mind 3t |
| `g-f-05` | fortune | story | 路遇仙鹤 | 轻日志 + 少量 karma |
| `g-t-01` | training | progression | 独自参悟 | +2-4 修为进度 |
| `g-t-02` | training | status | 行走练气 | qi-surge 2t |
| `g-t-03` | training | resource | 采药锻炼 | +1 材料 |
| `g-t-04` | training | combat | 野兽遭遇 | 轻战斗，+少量掉落 |
| `g-t-05` | training | story | 路遇前辈 | 线索日志 |
| `g-h-01` | human | resource | 散修求助 | +声望，+少量灵石 |
| `g-h-02` | human | status | 路遇故人 | fortune-marked 2t |
| `g-h-03` | human | story | 茶摊消息 | 区域线索 |
| `g-h-04` | human | combat | 遭遇劫道 | 中战斗，抵抗成功 +材料 |
| `g-h-05` | human | resource | 商旅互助 | +40-60 灵石 |

### 每州特有游历池（每州 9 条，共 81 条）

以青州为例：

| ID | 语义类型 | 结果类型 | 名称 | 效果摘要 |
|----|---------|---------|------|---------|
| `qz-f-01` | fortune | resource | 青岚灵草 | +青州特产药材 |
| `qz-f-02` | fortune | progression | 古修残碑 | +4 修为 |
| `qz-f-03` | fortune | status | 清风洗尘 | clear-mind 4t |
| `qz-t-01` | training | progression | 松间参悟 | +3 修为 |
| `qz-t-02` | training | combat | 低阶妖兽 | 轻战斗 |
| `qz-t-03` | training | resource | 灵泉取水 | +回气丹材料 |
| `qz-h-01` | human | resource | 青云弟子 | +宗门信息 |
| `qz-h-02` | human | story | 山间隐者 | 线索 |
| `qz-h-03` | human | status | 药农求购 | +灵石，+声望 |

### 通用赶路事件池（9 条）

| ID | 语义类型 | 结果类型 | 名称 | 效果摘要 |
|----|---------|---------|------|---------|
| `tr-f-01` | fortune | resource | 路边捡拾 | +少量灵石 |
| `tr-f-02` | fortune | status | 顺风赶路 | 赶路 -1 tick |
| `tr-f-03` | fortune | story | 路遇同行 | 轻日志 |
| `tr-t-01` | training | progression | 行路参悟 | +1 修为 |
| `tr-t-02` | training | status | 负重行走 | 轻增 spiritualPower |
| `tr-t-03` | training | combat | 路遇妖兽 | 轻战斗 |
| `tr-h-01` | human | resource | 过路商人 | 可购买补给 |
| `tr-h-02` | human | story | 路边告示 | 区域信息 |
| `tr-h-03` | human | combat | 山匪截路 | 中战斗，击退 +灵石 |

### 事件抽取算法

```typescript
export function drawEvent(
  world: WorldState,
  source: EventSourceType,
  cultivator: Cultivator,
  locationId: LocationId,
): DrawnEvent {
  const { stateId } = parseLocationId(locationId);
  const pool = world.eventPools;

  // 1. 收集候选事件
  let candidates: WeightedEvent[] = [];

  // 全局通用池
  for (const evt of pool.globalCommon) {
    if (evt.source === source) {
      candidates.push({ template: evt, weight: evt.baseWeight });
    }
  }

  // 州特有池（权重 1.5x）
  for (const evt of pool.stateSpecific[stateId] ?? []) {
    if (evt.source === source) {
      candidates.push({ template: evt, weight: evt.baseWeight * 1.5 });
    }
  }

  // 节点特有池（权重 2.0x）
  for (const evt of pool.nodeSpecific[locationId] ?? []) {
    if (evt.source === source) {
      candidates.push({ template: evt, weight: evt.baseWeight * 2.0 });
    }
  }

  // 2. 应用 overlay 权重修正
  candidates = applyOverlays(candidates, cultivator, world);

  // 3. 加权随机
  const mainEvent = weightedRandomPick(candidates, world.tick, cultivator.id);

  // 4. 次事件判定
  let subEvent: EventTemplate | null = null;
  if (mainEvent.resultType !== "combat") {
    const subRoll = hashString(`${world.tick}:${cultivator.id}:sub`) % 100;
    if (subRoll < 30) {
      const storyCandidates = candidates.filter(c => c.template.resultType === "story");
      if (storyCandidates.length > 0) {
        subEvent = weightedRandomPick(storyCandidates, world.tick, cultivator.id + ":sub").template;
      }
    }
  }

  return { template: mainEvent, subEvent, locationId, tick: world.tick };
}
```

---

## 测试策略

### 单元测试

| 测试模块 | 覆盖点 |
|---------|--------|
| `topology.test.ts` | 72 地点全部可达、距离矩阵对称性、最短路径正确性 |
| `events.test.ts` | 事件池容量验证（>=105）、四层合并逻辑、overlay 权重修正、战斗事件不追加次事件 |
| `seed.test.ts` | 生成地点数量 === 72、每州 8 个节点、LocationId 格式正确 |

### 集成测试

| 测试场景 | 验证内容 |
|---------|---------|
| 州内赶路 | 主城→辅镇 1 tick、主城→游历区 2 ticks |
| 跨州赶路 | 相邻州 4 ticks、远距离州 8 ticks |
| 赶路事件 | 长途赶路至少触发 1 次赶路事件 |
| 游历事件 | 到达游历区触发探索事件 |
| 事件抽取分布 | 1000 次抽取后各语义类型占比合理 |

### 迁移测试

| 测试场景 | 验证内容 |
|---------|---------|
| 旧数据迁移 | 6 个 ZoneId 全部正确映射到新 LocationId |
| 版本号递增 | 迁移后 `world.version` 正确递增 |
| 向后兼容 | 旧 `zones` 字段保留且不影响新逻辑 |

---

## 迁移方案

### 分三步迁移

**第一步：类型扩展（无破坏性变更）**
- 在 `model.ts` 中新增所有新类型，保留旧 `ZoneId` 和 `Zone`
- `Cultivator.locationId` 类型从 `ZoneId` 改为 `ZoneId | LocationId`（联合类型过渡）
- `WorldState` 新增 `states`, `locations`, `topology`, `eventPools` 为可选字段

**第二步：引擎切换（双写期）**
- `engine.ts` 中新增基于 `locations` 的赶路逻辑，旧 `TRAVEL_TARGETS` 逻辑保留
- `createSeedWorld()` 同时生成旧 `zones` 和新 `locations`
- API 路由同时支持旧动作 ID 和新动作 ID

**第三步：清理旧代码**
- 移除 `ZoneId` 类型和旧的 6 个 zone
- 移除 `TRAVEL_TARGETS` 和硬编码的 travel 动作
- `WorldState.zones` 字段删除
- `Cultivator.locationId` 类型改为纯 `LocationId`
