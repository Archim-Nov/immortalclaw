# Resource Usage Visibility V1

## Summary

资源获取日志自动附带结构化用途摘要（`usableFor` 字段），让 Agent 在获得资源的瞬间即可判断其价值与转化方向。用途信息完全从现有数据结构（`ITEM_CATALOG`、`RESIDENCE_PRODUCTION_RECIPES`、突破定义）运行时推导，新增配方只需加入 `RESIDENCE_PRODUCTION_RECIPES` 即可自动生效——零额外接线。

## Problem

当前资源获取日志仅记载"获得了 X"，存在三个核心问题：

- 15+ 资源获取入口散布于 engine.ts 各处（宗门任务、委托、双人荒野、地宫远征、生产完成、赠礼、商购等），日志格式各异，均不包含资源用途信息
- Agent 收到 `spirit-ore ×2` 后无法判断：这是突破材料？配方原料？还是只能卖掉？只能靠记忆或额外查询
- 灵石（spiritStones）作为最通用的资源，其多元用途（突破、生产、锻造、购买）在日志中完全不可见

这导致 Agent 对资源获取事件的响应缺乏上下文，无法做出基于价值的决策（例如"刚获得的 beast-core 应该留着炼丹还是卖掉"）。

## Goals

- 在资源获取日志的 `DaoLogEntry` 上添加 optional `usableFor` 字段，包含结构化的单跳用途摘要
- 用途摘要必须数据驱动：从 `ITEM_CATALOG`（可卖/可用）、`RESIDENCE_PRODUCTION_RECIPES`（配方输入）、突破定义（突破材料）运行时推导，不允许硬编码
- 首批覆盖 9 个高频资源获取入口
- 保证未来可持续性：新增配方加入 `RESIDENCE_PRODUCTION_RECIPES` 后，用途摘要自动包含，无需额外代码

## Non-Goals

- 不构建完整的经济图谱 UI 或可视化面板
- 不做多跳转化链（例如 "spirit-ore → healing-pill → 战斗恢复"）
- 不借机重构 item-catalog（留给 P2 的 `item-catalog-v2-unification`）
- 不改变非资源类日志（"任务失败"、"道德选择"等）的格式
- 不为第二批边缘入口（quest、八荒、矿脉/遗迹 inline 入口）提供覆盖

## User-Visible Behavior

当 Agent 通过 `GET /agent/dao-logs` 读取日志时：

**资源获取日志（物品）示例：**
```json
{
  "id": "log-42",
  "cultivatorId": "yun-zhong-he",
  "tick": 100,
  "title": "来源物掉落",
  "content": "云中鹤 完成地宫远征后获得了锈铁短剑图谱。",
  "tags": ["weapon-source"],
  "usableFor": {
    "sellable": { "baseValue": 80 },
    "directUse": { "kind": "unlock-loadout", "effectSummary": "解锁武器装配「锈铁短剑」" },
    "recipeInputFor": [
      { "recipeId": "recipe-forge-rusty-short-sword", "outputItemId": "weapon-item-rusty-short-sword", "outputName": "锈铁短剑" }
    ]
  }
}
```

**资源获取日志（灵石）示例：**
```json
{
  "id": "log-43",
  "cultivatorId": "yun-zhong-he",
  "tick": 100,
  "title": "完成委托",
  "content": "云中鹤完成了某某的spirit-ore委托，获得200灵石。好感度+25。",
  "tags": ["social", "commission"],
  "usableFor": {
    "spiritStoneUsage": true,
    "recipeCosts": [
      { "recipeId": "recipe-healing-pill", "cost": 30 },
      { "recipeId": "recipe-qi-pill", "cost": 25 }
    ],
    "marketBuying": true
  }
}
```

**非资源类日志不受影响**—— `usableFor` 字段缺失或为 undefined。

## Design Direction

### 1. 数据模型

在 `model.ts` 新增两个接口：

**`ResourceUsageSummary`**（物品用途摘要）：
- `sellable?: { baseValue: number }` — 来自 `ItemDefinition.trade`
- `directUse?: { kind: ItemUseKind; effectSummary: string }` — 来自 `ItemUseDefinition`
- `recipeInputFor?: Array<{ recipeId: string; outputItemId: ItemId; outputName: string }>` — 配方反向索引
- `breakthroughMaterialFor?: Array<{ targetLevel: number; targetRealm: string }>` — 突破反向索引
- `loadoutUnlock?: { type: "weapon" | "spell"; loadoutId: string; loadoutName: string }` — 来源物解锁能力

**`SpiritStoneUsageSummary`**（灵石用途摘要）：
- `spiritStoneUsage: true` — 类型标记
- `recipeCosts: Array<{ recipeId: string; cost: number }>` — 所有需灵石的配方
- `marketBuying: boolean` — 永远为 true

在 `DaoLogEntry` 上添加 optional `usableFor?: ResourceUsageSummary | SpiritStoneUsageSummary`。

### 2. 反向索引构建器

新建 `resource-usage.ts`，提供纯函数构建器：

- `buildRecipeReverseIndex(recipes)` — 遍历 `RESIDENCE_PRODUCTION_RECIPES`，对每个 `inputMaterials[].itemId` 建立反向映射。**新配方加入数组后自动包含在索引中。**
- `buildBreakthroughReverseIndex()` — 遍历 realm level 1-8 的突破定义，对每个材料建立反向映射
- `buildItemUsageSummary(itemId, catalog, recipeIndex, breakthroughIndex)` — 组合上述索引生成完整用途摘要
- `buildSpiritStoneUsageSummary(recipes)` — 灵石专用

所有构建器均为纯函数，输入为现有数据常量，无副作用。

### 3. 日志接入层

在 `engine.ts` 中 `addDaoLog` 附近新增：

- `addResourceGainLog(world, cultivatorId, title, content, tags, gainedItems[])` — 内部调用 `buildItemUsageSummary()` 后挂到日志
- `addSpiritStoneGainLog(world, cultivatorId, title, content, tags, amount)` — 灵石专用

修改 `addDaoLog` 签名支持 optional `usableFor` 参数。非资源日志调用方式不变。

### 4. 首批覆盖入口

| 入口 | 资源类型 | Helper |
|------|---------|--------|
| 宗门任务完成 | spiritStones | `addSpiritStoneGainLog` |
| 委托完成 | spiritStones | `addSpiritStoneGainLog` |
| 双人荒野 | spiritStones | `addSpiritStoneGainLog` |
| 来源物掉落（地宫远征） | weapon/spell source | `addResourceGainLog` |
| 来源物掉落（搜灵） | weapon/spell source | `addResourceGainLog` |
| 来源物掉落（守关） | weapon/spell source | `addResourceGainLog` |
| 洞府生产完成 | recipe output item | `addResourceGainLog` |
| 接受赠礼 | any item | `addResourceGainLog` |
| 商购 | any item | `addResourceGainLog` |

第二批（quest、八荒、矿脉/遗迹 inline 入口）可独立 PR 补齐。

## Constraints

- `DaoLogEntry` 通过 `GET /agent/dao-logs` 直接 JSON 序列化，新增 optional 字段必须向后兼容
- 现有日志消费者（`getRecentResidenceAmbientEvents()` 等）只读 `tags`/`content`，不得受影响
- 不修改 `ITEM_CATALOG`、`RESIDENCE_PRODUCTION_RECIPES`、`LOADOUT_SOURCE_RECIPES` 的结构或内容
- 用途摘要必须来自运行时数据推导，禁止硬编码用途映射
- 不改变现有 `addDaoLog` 非资源调用点的行为

## Acceptance Criteria

- 首批 9 个资源获取入口的 `DaoLogEntry` 包含 `usableFor` 字段
- `usableFor` 中的卖出、使用、配方、突破用途与当前 `ITEM_CATALOG` / `RESIDENCE_PRODUCTION_RECIPES` / 突破定义数据一致
- `spirit-ore` 的 `usableFor.recipeInputFor` 包含 `recipe-healing-pill` 和 `recipe-qi-pill`
- `beast-core` 的 `usableFor.recipeInputFor` 包含 `recipe-healing-pill`
- 武器/法术来源物的 `usableFor.loadoutUnlock` 正确指向对应装配
- 突破材料的 `usableFor.breakthroughMaterialFor` 正确指向对应突破等级
- `healing-pill` 的 `usableFor.directUse.kind` 为 `"consume"`
- RESIDENCE_PRODUCTION_RECIPES 中每个 recipe 的每个 inputMaterial 都能在反向索引中找到（可持续性保证）
- 现有 502+ 测试全通过，无回归

## Verification

- 新建 `resource-usage.test.ts`，覆盖反向索引正确性、用途摘要完整性、可持续性断言
- 对宗门任务 / 来源物掉落 / 生产完成 各添加日志集成测试
- 运行 `npm test` 全量测试确认无回归

## Open Questions

- 第二批入口（quest、八荒、矿脉/遗迹 inline）的覆盖时机：随 P2 工作包一起补齐，还是作为 R5 的 follow-up PR？
