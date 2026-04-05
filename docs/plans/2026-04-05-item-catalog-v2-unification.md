# Item Catalog V2 Unification Implementation Plan

**Spec dependency:** meaningful implementation work for this plan should be anchored by a matching approved spec at `docs/specs/item-catalog-v2-unification/spec.md`.  
**Current inputs:** `docs/specs/item-catalog-v1/spec.md`, `docs/specs/combat-loadout-sourcing-v2/spec.md`, `docs/plans/2026-04-05-combat-loadout-sourcing-v2.md`.

## Goal

把当前仓库里的物品体系整理成一套**统一、可扩展、可多语言、可测试**的物品目录系统。

这里的“统一”指的是：

- 所有当前物品都通过同一套 `ItemDefinition` 进入 `ITEM_CATALOG`
- 第一批战斗来源链物品也进入同一物品表，而不是停留在 `loadout-sourcing.ts` 的半独立生成逻辑里
- 物品的名字、描述、使用说明等文本统一支持 `zh-CN` 和 `en`
- 运行时继续兼容当前接口，避免为了整理物品表而把现有动作系统和战斗系统一起打碎

## Non-Goals

本轮**不**做下面这些事：

- 不引入外部 Excel、CSV、Google Sheet 导入链路
- 不顺手重做整个 UI 国际化系统
- 不把所有 action 文案、日志文案一次性改成多语言
- 不扩展新的交易经济、稀有度、强化、拆解、拍卖等系统
- 不重新设计武器、法术、掉落规则本身

## Current Baseline

当前基线已经有一半底座，但还没有彻底收口：

- `packages/domain/src/items/catalog.ts`
  - 已经是统一目录入口
  - 但仍然把老物品大对象直接写在同一个文件里
  - 也直接合并了 `LOADOUT_SOURCE_ITEMS`
- `packages/domain/src/loadout-sourcing.ts`
  - 已经能批量生成武器材料、武器成品、功法残本、完整功法
  - 但它同时持有了名字、描述、配方、掉落池等多种职责
- `packages/domain/src/model.ts`
  - `ItemUseKind` 已经支持 `"unlock-loadout"`
  - `ItemDefinition` 仍然只有单语言字段 `name`、`description`
  - `ItemUseDefinition` 仍然只有单语言字段 `effectSummary`
- `packages/domain/src/engine.ts`
  - 已经能处理 `unlock-loadout:${itemId}`
  - 推荐动作也已经会建议可解锁物品
  - 但这些展示文本仍然依赖当前单语言物品定义

换句话说，当前仓库已经有“统一入口”和“来源链物品”，但还没有形成一套完整的 **V2 物品目录架构**。

## Design Rules

### 1. 物品表继续使用 TypeScript 配置表

这一轮不把物品表挪到外部表格文件。原因很简单：

- 现在仓库测试和类型系统都围绕 TypeScript
- 先把结构和运行时合同收稳，比先引入导入链路更重要
- 以后真要接外部表格，也应该建立在 V2 的稳定表结构之上

### 2. 多语言采用 locale map，不再平行堆字段

这里直接复用仓库里已经存在的语言类型：

- `RegistrationLocale = "zh-CN" | "en"`

V2 的物品文本统一采用：

- `LocalizedText = Record<RegistrationLocale, string>`

这样做的意思是：  
同一个文本字段，不再靠 `name` / `nameCn` / `nameEn` 这种不断扩列的方式保存，而是用一张小 map 明确写出两种语言版本。

### 3. 保留旧字段，先兼容当前运行时

本轮不能直接把所有旧调用点都改成 `nameByLocale["zh-CN"]`，那样回归面太大。  
所以需要保留兼容字段：

- `ItemDefinition.name`
- `ItemDefinition.description`
- `ItemUseDefinition.effectSummary`

兼容规则固定为：

- `name === nameByLocale["zh-CN"]`
- `description === descriptionByLocale["zh-CN"]`
- `effectSummary === effectSummaryByLocale["zh-CN"]`（当非空时）

也就是说，V2 先把多语言字段加进去，但旧代码还能继续工作。

### 4. 名字是真正的内容源，不应该继续散落在逻辑文件里

这里要明确两件事：

- `combat-loadouts.ts` 负责战斗装配的结构和数值
- 物品目录负责“物品怎么展示”

所以武器和法术相关的物品名，应该由独立名字表驱动，再自动派生来源物名字：

- 武器材料：`<武器名>锻材`
- 武器成品：`<武器名>`
- 功法残本：`<法术名>残本`
- 完整功法：`<法术名>`

英文名也同理自动派生：

- 武器材料：`<Weapon Name> Forging Materials`
- 武器成品：`<Weapon Name>`
- 功法残本：`Fragment of <Spell Name>`
- 完整功法：`<Spell Name>`

## Target Architecture

### 1. 目录分层

`packages/domain/src/items/` 目录在 V2 中拆成下面这些模块：

- `catalog.ts`
  - 只做总装配器
  - 合并各分表
  - 导出 `ITEM_CATALOG`、`ITEM_IDS`
  - 构建 item/action 的映射关系
- `shared.ts`
  - 放物品表公共 helper
  - 例如默认 `material use` 模板、`makeLocalizedText(...)`
- `legacy-consumables.ts`
  - 丹药、符箓等基础消耗品
- `legacy-materials.ts`
  - 灵矿、残璧、妖核等基础材料
- `breakthrough-items.ts`
  - 突破材料及相关专用物品
- `special-items.ts`
  - 票券、特殊凭证、遗宝等
- `loadout-item-names.ts`
  - 武器与法术核心名字表
- `loadout-source-items.ts`
  - 根据核心名字表、loadout tier、解锁关系生成来源链物品

### 2. 运行时职责分离

V2 里模块职责固定如下：

- `combat-loadouts.ts`
  - 继续维护战斗装配数值和结构
- `loadout-sourcing.ts`
  - 只维护来源链规则
  - 比如 recipe 规则、tier 来源池规则、掉落 helper
- `items/loadout-source-items.ts`
  - 负责来源链物品定义
  - 不负责战斗公式
- `items/loadout-item-names.ts`
  - 负责名字真源
  - 不负责配方和掉落

这样做的目的，是把“内容文本”和“行为逻辑”拆开，避免未来改个名字还要碰战斗引擎。

## Data Model Changes

### 1. `packages/domain/src/model.ts`

需要新增一个通用文本类型：

- `LocalizedText = Record<RegistrationLocale, string>`

然后扩展下面这些接口：

#### `ItemUseDefinition`

新增：

- `effectSummaryByLocale: LocalizedText | null`

保留：

- `effectSummary: string | null`

#### `ItemDefinition`

新增：

- `nameByLocale: LocalizedText`
- `descriptionByLocale: LocalizedText`

保留：

- `name: string`
- `description: string`

#### `InventoryEntryView`

新增：

- `nameByLocale: LocalizedText`
- `descriptionByLocale: LocalizedText`
- `use.effectSummaryByLocale`

保留当前已有字段，确保旧前端和旧 agent 消费方不会立刻断。

### 2. `ItemId` 继续稳定，注册方式改为表驱动扩展

这里不重命名任何现有 `LegacyItemId`。  
V2 的目标不是“推翻 ItemId”，而是把未来新增的大批量物品改成由注册表推导。

代码层的落地方向：

- 保留现有 `LegacyItemId`
- 保留生成型 `GeneratedItemId`
- 让新的来源链物品继续通过统一前缀规则进入 `ItemId`
- 不再长期依赖一个不断变长的手写联合类型来扩展新内容

## Naming and Localization Strategy

### 1. 核心名字表

单独新建核心名字表，只维护：

- `100` 个武器装配核心名
- `75` 个法术装配核心名

每条记录都写成双语：

- `zh-CN`
- `en`

推荐结构：

```ts
export const WEAPON_LOADOUT_NAME_BY_ID: Record<WeaponLoadoutId, LocalizedText> = { ... };
export const SPELL_LOADOUT_NAME_BY_ID: Record<SpellLoadoutId, LocalizedText> = { ... };
```

### 2. 派生命名 helper

新增 helper：

- `deriveWeaponSourceTexts(loadoutNameByLocale)`
- `deriveSpellSourceTexts(loadoutNameByLocale)`

它们负责从核心名自动生成：

- 材料名
- 成品名
- 描述
- 使用说明

这样以后改一个核心装配名，就不需要再手动改四套相关物品文本。

## Task Breakdown

### Task 1. 扩展模型，先把多语言字段接进类型层

修改文件：

- `packages/domain/src/model.ts`

具体工作：

- 新增 `LocalizedText`
- 给 `ItemDefinition` 增加 `nameByLocale` / `descriptionByLocale`
- 给 `ItemUseDefinition` 增加 `effectSummaryByLocale`
- 给 `InventoryEntryView` 增加对应字段
- 保持现有旧字段继续存在

完成标准：

- 代码可以同时承载新旧字段
- 不需要一次性修改全部调用点

### Task 2. 抽出 `items/shared.ts`，统一常用模板与本地化 helper

新增文件建议：

- `packages/domain/src/items/shared.ts`

至少放入：

- `makeLocalizedText(zh, en)`
- `resolveLocalizedText(text, locale)`
- `materialUse` 默认模板
- 生成 `ItemDefinition` 的小型 helper

完成标准：

- 后续子表不再重复手写一大坨相同字段

### Task 3. 把当前 `catalog.ts` 拆成分表

新增文件建议：

- `packages/domain/src/items/legacy-consumables.ts`
- `packages/domain/src/items/legacy-materials.ts`
- `packages/domain/src/items/breakthrough-items.ts`
- `packages/domain/src/items/special-items.ts`

修改文件：

- `packages/domain/src/items/catalog.ts`

具体工作：

- 把当前大对象里的老物品按内容类型拆走
- `catalog.ts` 只保留汇总逻辑
- `BUY_ACTION_TO_ITEM`、`SELL_ACTION_TO_ITEM`、`ACTION_ITEM_BINDINGS` 继续保留在总装配器层

完成标准：

- `catalog.ts` 不再同时承担“内容仓库”和“总入口”两种职责

### Task 4. 建立武器/法术核心名字表

新增文件建议：

- `packages/domain/src/items/loadout-item-names.ts`

具体工作：

- 给 100 个武器装配写双语核心名
- 给 75 个法术装配写双语核心名
- 不在这里写掉落规则和 recipe

完成标准：

- 名字是独立真源
- 后续物品显示名可以全部从这里派生

### Task 5. 重写来源链物品生成，收回到 item catalog 体系

新增文件建议：

- `packages/domain/src/items/loadout-source-items.ts`

修改文件：

- `packages/domain/src/loadout-sourcing.ts`
- `packages/domain/src/items/catalog.ts`

具体工作：

- 把当前 `LOADOUT_SOURCE_ITEMS` 的物品定义逻辑，从 `loadout-sourcing.ts` 挪到 `items/loadout-source-items.ts`
- `loadout-sourcing.ts` 只保留：
  - 配方表
  - tier 来源池
  - 掉落 helper
- `items/loadout-source-items.ts` 从：
  - 核心名字表
  - `WEAPON_LOADOUT_DEFINITIONS`
  - `SPELL_LOADOUT_DEFINITIONS`
  派生出：
  - 100 个武器材料
  - 100 个武器成品
  - 75 个功法残本
  - 75 个完整功法

完成标准：

- 来源链物品正式成为 item catalog 的一个内容分区
- `loadout-sourcing.ts` 不再承担最终文本定义职责

### Task 6. 运行时状态与视图兼容

修改文件：

- `packages/domain/src/engine.ts`

具体工作：

- `getCultivatorState(...)` 返回的 `InventoryEntryView` 需要把新多语言字段透传出去
- `unlock-loadout:${itemId}` 相关逻辑继续复用现有行为
- 推荐动作不变，但从新目录读取文本

完成标准：

- 不改变现有玩法
- 新字段已经能从状态视图拿到

### Task 7. Seed 与持久化兼容

修改文件：

- `packages/domain/src/seed.ts`
- `packages/persistence/src/world-shape.ts`
- 相关 repository/hydration 测试文件

这里的 “hydrate” 可以简单理解成：  
老存档被读取进新代码时，系统会顺手补齐新字段，保证旧世界也能跑在新结构上。

具体工作：

- 确保 `world.itemDefinitions` 继续从统一目录 seed
- 确保旧世界缺失新本地化字段时，能补齐默认值
- 缺失规则以 `zh-CN` 为兼容基线

完成标准：

- 旧存档不会因为 V2 物品字段扩展而坏掉

### Task 8. 文档与后续实现引用收口

更新文件：

- `docs/plans/2026-04-05-combat-loadout-sourcing-v2.md`
- 新增必要的 V2 spec 时，再更新 `docs/specs/README.md`

具体工作：

- 把这份计划挂到来源链计划的关系说明里
- 若后续补 spec，再同步 `docs/specs/README.md`

## Test Plan

### 1. 目录完整性

- 全部老物品仍存在
- 来源链四组物品全部存在：
  - `100` 武器材料
  - `100` 武器成品
  - `75` 功法残本
  - `75` 完整功法
- `ITEM_IDS` 与目录 key 完全一致
- 不允许重复 `ItemId`

### 2. 多语言完整性

- 每个物品都必须有：
  - `nameByLocale["zh-CN"]`
  - `nameByLocale["en"]`
  - `descriptionByLocale["zh-CN"]`
  - `descriptionByLocale["en"]`
- 当 `effectSummaryByLocale` 非空时，也必须同时有中英两种语言
- 兼容字段必须满足：
  - `name === nameByLocale["zh-CN"]`
  - `description === descriptionByLocale["zh-CN"]`
  - `effectSummary === effectSummaryByLocale["zh-CN"]`

### 3. 派生命名正确性

- 修改一个武器核心名时：
  - 武器材料名同步变化
  - 武器成品名同步变化
- 修改一个法术核心名时：
  - 功法残本名同步变化
  - 完整功法名同步变化

### 4. 行为回归

- 丹药、符箓、票券、突破材料行为不回归
- `unlock-loadout` 行为不回归
- 买卖映射、使用映射、study/use 区分不回归

### 5. 持久化兼容

- 老世界 hydration 通过
- 新字段缺失时能自动补齐
- 不会因为目录拆分而丢库存或丢 item definition

### 6. live 边界

- `1-3` 阶来源物继续可用于 live 掉落和 live 洞府配方
- `4/5` 阶来源物仍然只存在于数据层，不进入 live

## Verification Commands

- `node --import tsx --test packages/domain/src/item-catalog.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/domain/src/loadout-sourcing.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`
- `npm run build`

## Acceptance Criteria

满足下面这些条件时，这份计划就算真正落地完成：

1. 当前全部老物品和来源链物品都进入统一 `ITEM_CATALOG`
2. 物品文本支持 `zh-CN` 与 `en`，并保持旧字段兼容
3. 武器/法术名字只维护核心真源，来源物名字全部自动派生
4. `loadout-sourcing.ts` 不再持有最终物品名字与描述
5. `engine.ts` 和持久化层对新结构兼容，现有玩法不回归

## Assumptions

- 本计划是代码级落地计划，不代替正式 spec
- 多语言这轮只收口到物品目录与物品视图，不扩展到全项目所有文本
- 这轮先统一结构和真源，再考虑未来是否接外部表格导入
