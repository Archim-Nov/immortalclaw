# 设计：P1 范围冻结落地方案

## 技术概述

本文档将 `docs/P1_plan/01-scope-freeze.md` 中冻结的 P1 范围转化为具体的技术落地方案。核心挑战是将当前仓库中基于 6 个扁平 `ZoneId` 的世界模型，平滑迁移到 9 州 x 8 节点 = 72 地点的层级化世界架构，同时保证四大模块（游/居/遇/势）的共享基础设施统一建设。

当前代码现状：
- `packages/domain/src/model.ts` 中 `ZoneId` 是 6 个硬编码字面量联合类型
- `Cultivator.locationId` 类型为 `ZoneId`，直接绑定旧的 6 区域
- `packages/domain/src/engine.ts` 中 `TRAVEL_TARGETS` 和 `ACTION_DURATIONS` 都基于 6 区域硬编码
- `packages/domain/src/seed.ts` 中 `zones` 只包含 6 个 `Zone` 对象
- `packages/persistence/src/world-repository.ts` 中 `WorldRepository` 接口与 `WorldState` 强耦合

P1 目标状态：
- 72 个动态地点通过数据驱动加载，不再硬编码到类型系统
- 赶路耗时可变（1-8 ticks），不再全部是 1 tick
- 洞府、任务板、宗门、事件池均绑定到地点层级
- 经济护栏和派生视图作为纯函数层独立存在

---

## 架构决策

### 决策 1：LocationId 从字面量联合类型改为模式化字符串

**方案**：将 `ZoneId` 替换为 `LocationId`（模式化字符串 `string`），格式 `"{stateId}:{nodeType}:{nodeIndex}"`。

**为什么选这个**：
- 72 个地点不适合硬编码为 TypeScript 字面量联合类型，维护成本过高
- 模式化字符串兼顾类型安全（运行时验证）和数据驱动（种子数据定义地点）
- 保持与现有 `cultivator.locationId` 字段的结构兼容，只需放宽类型

**影响范围**：`model.ts` 中所有引用 `ZoneId` 的类型和接口

### 决策 2：世界模型采用分层结构而非扁平替换

**方案**：在 `WorldState` 中新增 `states` 和 `locations` 字典，保留 `zones` 做向后兼容映射。

```
WorldState
├── states: Record<StateId, State>          // 9 个州
├── locations: Record<LocationId, Location> // 72 个地点
├── topology: TopologyGraph                 // 邻接关系和赶路耗时
├── zones (deprecated)                      // 迁移期保留
└── ...其余字段不变
```

**为什么选这个**：
- 渐进迁移，不需要一次性重写所有引用旧 `zones` 的代码
- 前端和 API 层可以按需读取新结构，旧结构不影响编译
- 种子数据生成器只需产出 `states` + `locations` + `topology`

### 决策 3：P1 特性边界通过编译时标记和运行时守卫双重隔离

**方案**：
- 编译时：在 `packages/domain/src/model.ts` 中为 P1 范围外的类型标注 `@p2` JSDoc 标记
- 运行时：在 `engine.ts` 的动作处理中增加 `assertP1Action(actionId)` 守卫函数

**为什么选这个**：
- 避免 P2 内容意外混入 P1 代码路径
- JSDoc 标记不影响类型系统，但为代码审查提供明确信号
- 运行时守卫在 CI 集成测试中可以捕获越界调用

### 决策 4：共享基础设施先于业务模块实现

**方案**：按 `共享基础 → 游 → 居 → 遇 → 势` 的顺序实施。

**为什么选这个**：
- `游` 的世界结构是所有模块的前置依赖
- `居` 依赖地点系统（洞府绑定）和新的动作前置条件框架
- `遇` 依赖任务板，任务板依赖地点节点功能分区
- `势` 依赖宗门据点，据点是地点节点的一种

---

## 模块依赖图

```
                  ┌──────────────────────────┐
                  │    共享基础设施            │
                  │  (LocationId, Topology,   │
                  │   DB Migration, Seed)     │
                  └─────────┬────────────────┘
                            │
                  ┌─────────▼────────────────┐
                  │   游（九州世界+事件系统）   │
                  │   03-jiuzhou-events       │
                  └─────────┬────────────────┘
                            │
              ┌─────────────┼─────────────────┐
              │             │                  │
    ┌─────────▼──────┐  ┌──▼──────────────┐   │
    │ 居（洞府+内循环）│  │ 遇（任务+高风险）│   │
    │ 04-residence   │  │ 05-task-sect    │   │
    └─────────┬──────┘  └──┬──────────────┘   │
              │            │                   │
              │     ┌──────▼───────────┐       │
              │     │ 势（宗门系统）     │       │
              │     │ 05-task-sect     │       │
              │     └──────┬───────────┘       │
              │            │                   │
              └────────────┼───────────────────┘
                           │
                  ┌────────▼───────────────┐
                  │  经济护栏+派生视图       │
                  │  06-economy-views       │
                  └────────────────────────┘
```

建议实施顺序：
1. 共享基础设施（类型定义、数据库迁移、种子数据改造）
2. 九州世界与事件系统（`游`）
3. 洞府与内循环动作（`居`）—— 与遇可并行
4. 任务与宗门系统（`遇` + `势`）
5. 经济护栏与派生视图（整合层）
6. 黄金路径验收测试

---

## 文件变更总览

### packages/domain

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/model.ts` | 重构 | 新增 `LocationId`, `StateId`, `NodeType`, `Location`, `State`, `TopologyEdge` 类型；扩展 `Cultivator`（添加 `residenceId`, `sectContribution`, `sectTitle` 等字段）；扩展 `WorldState`（添加 `states`, `locations`, `topology`, `questBoards`, `eventPools`） |
| `src/engine.ts` | 重构 | 重写赶路系统、动作前置条件、job 结算；新增任务板引擎、宗门引擎、事件引擎 |
| `src/seed.ts` | 重写 | 从 6 区域静态数据改为 72 地点程序化生成 |
| `src/attributes.ts` | 扩展 | 实现主属性和详细属性的真实计算（替换 stub） |
| `src/runtime.ts` | 扩展 | 导出新增的引擎函数和类型 |
| `src/events.ts` | 新增 | 事件池定义、抽取引擎、事件模板 |
| `src/quest.ts` | 新增 | 任务模板、任务板管理、任务结算 |
| `src/sect.ts` | 新增 | 宗门系统、贡献计算、头衔更新 |
| `src/residence.ts` | 新增 | 洞府动作、生产配方、资源转化 |
| `src/economy.ts` | 新增 | 经济护栏、readiness 计算、recoveryState 计算 |
| `src/topology.ts` | 新增 | 拓扑图结构、路径计算、赶路耗时 |

### packages/contracts

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/runtime-api.ts` | 扩展 | 新增任务板 API、宗门 API、事件 API 的请求/响应类型 |

### packages/persistence

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/world-repository.ts` | 扩展 | 新增 `getQuestBoard`, `refreshQuestBoard`, `updateSectTitles` 等方法 |
| `src/supabase-world-repository.ts` | 扩展 | 实现新 Repository 方法，适配 schema 变更 |
| `src/in-memory-world-repository.ts` | 扩展 | 内存适配器同步实现新方法 |

### apps/runtime-worker

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/routes.ts` | 扩展 | 新增任务板路由、宗门路由、事件查询路由 |
| `src/scheduler.ts` | 扩展 | 新增宗门头衔周期更新调度、任务板刷新调度 |

### apps/web

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| 多个组件 | 扩展 | 适配新 LocationId 展示、任务板 UI、宗门面板、准备度指示器 |

### 数据库

| 变更 | 说明 |
|------|------|
| `world_snapshots` | JSONB 结构扩展以容纳新的 WorldState 字段 |
| `quest_boards` | 新表：存储各节点任务板快照 |
| `sect_contributions` | 新表：宗门贡献历史 |

---

## 共享基础设施

### 新增核心类型（`packages/domain/src/model.ts`）

```typescript
// ---- 州与地点 ----
export type StateId =
  | "qingzhou" | "yangzhou" | "zhongzhou"
  | "shuzhou"  | "youzhou"  | "liangzhou"
  | "leizhou"  | "cangzhou" | "wanzhou";

export type NodeType =
  | "main-city"   // 州主城
  | "sub-town"    // 州辅镇
  | "wilderness"  // 州外游历区
  | "dungeon-c"   // 丙等副本
  | "dungeon-b"   // 乙等副本
  | "dungeon-a";  // 甲等副本

export type LocationId = string; // 格式 "{stateId}:{nodeType}" 或 "{stateId}:{nodeType}:{index}"

export type RiskLevel = "safe" | "low" | "medium" | "high";

export interface Location {
  readonly id: LocationId;
  readonly stateId: StateId;
  readonly nodeType: NodeType;
  readonly name: string;
  readonly description: string;
  readonly riskLevel: RiskLevel;
  readonly questSlots: number;       // 任务板容量
  readonly hasSectGate: boolean;     // 是否有宗门入口
  readonly hasMarket: boolean;       // 是否有交易入口
  readonly hasResidence: boolean;    // 是否可驻留洞府
}

export interface TopologyEdge {
  readonly from: LocationId;
  readonly to: LocationId;
  readonly baseTicks: number;        // 基础赶路耗时
  readonly terrainModifier: number;  // 地形修正
}

export interface State {
  readonly id: StateId;
  readonly name: string;
  readonly resourceBias: string;
  readonly riskBias: string;
  readonly eventBias: string;
  readonly sectHooks: string[];
}
```

### 数据库迁移

```sql
-- 迁移 1: 扩展 world_snapshots 的 JSONB 结构验证
-- 无需新增列，JSONB 内部结构通过应用层验证

-- 迁移 2: 任务板持久化
CREATE TABLE quest_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  board_snapshot JSONB NOT NULL,
  last_refreshed_tick INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 迁移 3: 宗门贡献记录
CREATE TABLE sect_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cultivator_id TEXT NOT NULL,
  sect_id TEXT NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL,
  tick INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sect_contributions_cultivator
  ON sect_contributions(cultivator_id);
CREATE INDEX idx_sect_contributions_sect
  ON sect_contributions(sect_id);
```

### 种子数据改造要点

当前 `packages/domain/src/seed.ts` 中的 `createSeedWorld()` 需要：
1. 用程序化循环生成 9 州 x 8 节点 = 72 个 `Location` 对象
2. 用邻接矩阵生成 `TopologyEdge` 数组
3. 保留 `ITEM_DEFINITIONS` 和 `createEmptyInventory()` 不变
4. 新角色默认 `locationId` 从 `"mortal-town"` 改为 `"qingzhou:main-city"`
5. 默认不预置固定官方玩家宗门数据，`world.sects` 可为空；九大默认中立宗门据点继续 seeded

---

## 验收标准

| P1 完成定义（原文） | 技术验收标准 | 验证方式 |
|-------------------|-------------|---------|
| 新角色从注册进入州主城 | `createCultivator` 返回 `locationId === "qingzhou:main-city"` | 单元测试 |
| 完整九州内移动 | `performAction("travel-*")` 支持 72 个地点之间的路径查找 | 集成测试 |
| 洞府内 5 动作 | `listAvailableActions` 在洞府位置返回闭关/疗伤/调息/生产/交流 | 单元测试 |
| 基础任务接取和完成 | 任务板 API 返回可接任务，`performAction` 可完成任务 | 集成测试 |
| 加入宗门 + 宗门任务 | 宗门 API 和贡献结算完整可用 | 集成测试 |
| 清晰状态展示 | `getCultivatorState` 返回 readiness/recoveryState/activityContext | 单元测试 |
| 高风险失败不软锁 | 失败后角色可通过疗伤/调息/打工回到可玩状态 | E2E 测试 |

---

## 排除项隔离

以下 P2+ 功能通过以下方式隔离：

| 排除项 | 隔离方式 |
|--------|---------|
| 八荒/归墟 | `StateId` 类型不包含对应值；种子数据不生成对应地点 |
| 复杂天气系统 | `Location` 接口不定义 `weather` 字段 |
| 洞府经营扩张 | `Residence` 接口标记 `readonly level: 1`，不暴露升级 API |
| 多人副本 | `QuestTemplate.maxPlayers` 恒为 1 |
| 宗门经营/战争 | `Sect` 接口不新增经营类字段 |
| 阵营战 | 不引入 `Faction.warState` 概念 |
| 道侣/仇人系统 | 不在 `Cultivator` 上新增关系字段 |

---

## 风险与缓解表

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 72 地点的种子数据质量不足 | 世界感觉雷同 | 高 | 每州至少配置独立的 `resourceBias` 和 `eventBias`，通过代码审查确认差异 |
| 迁移期旧 `ZoneId` 引用遗漏 | 编译错误或运行时崩溃 | 中 | 在迁移第一步使用 TypeScript `@deprecated` 标记 `ZoneId`，CI 报告所有引用 |
| 事件池容量不足（105+ 条） | 开发时间超预算 | 中 | 优先生成全局通用池 15 条 + 赶路池 9 条，州特有池用模板函数批量生成 |
| 数据库迁移影响现有数据 | 线上服务中断 | 低 | JSONB 结构是加法扩展，不修改现有列；新表独立创建 |
| 前端适配工作量大 | 上线延期 | 中 | 先保持 API 向后兼容（旧 `/state` 端点同时返回新旧格式），前端分批适配 |
| 宗门头衔 2880t 定时任务稳定性 | 头衔未及时更新 | 低 | 使用 Cloudflare Worker Cron 触发，增加补偿重试逻辑 |
