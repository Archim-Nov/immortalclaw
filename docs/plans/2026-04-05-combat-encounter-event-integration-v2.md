# 战斗遭遇与事件整合 V2 实施计划

**Relationship:**

- 共享战斗装配底座：`docs/plans/2026-04-05-combat-gameplay-v2.md`
- 战斗装配来源链：`docs/plans/2026-04-05-combat-loadout-sourcing-v2.md`
- 武器内容包装：`docs/plans/2026-04-05-combat-weapon-family-v2.md`
- 法术内容包装：`docs/plans/2026-04-05-combat-lightweight-spell-status-v2.md`
- 状态运行时：`docs/plans/2026-04-05-combat-lightweight-status-runtime-v2.md`
- 正式行为规格：`docs/specs/combat-encounter-event-integration-v2/spec.md`
- 事件内容拆分基线：`docs/specs/event-content-library-split-v1/spec.md`
- 地宫内容填充基线：`docs/specs/dungeon-overlay-content-fill-v1/spec.md`

## Summary

这份计划负责把**事件内容**和**现在的战斗遭遇**接到同一套 authored 内容模型上，并且在同一轮里把相关的**非战斗偶遇事件**一起补厚。

这里的重点要说清楚：

- 这轮整合的是 **PVE 事件入口**
- 但我们设计的不是“只有事件里的 PVE 才能打”的战斗系统

也就是说，事件系统这轮负责的是“怎么把荒原、地宫、远征里的 PVE 内容接进战斗”，而不是把整个战斗内容模型绑死成 event-only PVE。
后面要做 `PVP` 时，应该复用同一套战斗内容底层，而不是再新造一套平行系统。

简单说，这轮不是单纯“加更多怪”：

- 事件负责“你遇到了什么”
- 遭遇构筑负责“这场战斗怎么被接起来”
- 敌人配置负责“这个对手具体怎么打”
- 偶遇事件负责“让战斗不是一条干巴巴的连战线”

目标是让荒原、地宫、守关、远征里的内容同时变得：

- 更有身份感
- 更容易扩展
- 更适合 agent 理解

## Current Baseline

当前仓库已经有三套接近但没有完全对齐的内容层：

### 1. 事件池系统

- `packages/domain/src/events/catalog.ts`
- `packages/domain/src/events/catalog-node.ts`
- `packages/domain/src/events/content/**/*`

这套系统已经能：

- 组装全局/州域/节点事件池
- 给地宫和荒原提供探索内容
- 给远征报告提供少量 `flavorEvents`

### 2. 荒原专用事件系统

- `packages/domain/src/wilderness-events.ts`
- `packages/domain/src/wilderness-service.ts`

这套系统已经能：

- 给 `survey-wilderness` 抽事件
- 结算奖励、伤害、撤退

但它和常规 `EventTemplate` 内容系统还是分开的。

### 3. 战斗遭遇入口

- `hunt-mine-beast`
- `challenge-guardian:*`
- 地宫远征里的内部 guardian step

这部分现在仍然主要依赖：

- `mine-beast`
- `ruins-guardian`

也就是说，战斗运行时已经很丰富，但“敌人到底是谁、为什么在这里、和当前事件有什么关系”还不够是同一套 authored 内容。

## Design Direction

这里需要先拆开两个容易混的概念：

- `Enemy Config`：敌人配置。也就是“这个敌人自己拿什么武器、什么法术、什么风格”
- `Encounter Build`：遭遇构筑。也就是“这场战斗由哪些敌人配置组成、属于什么入口、是什么遭遇家族”

换成更白话的话：

- 敌人配置像“演员”
- 遭遇构筑像“这一幕戏怎么排”

所以这轮不能只做 encounter build registry，还要把敌人配置先单独抽出来。

### 1. 新增敌人配置注册表

这里的“敌人配置”你可以理解成：

- 不是一段文案
- 也不是一个纯数值模板
- 而是一套“这个敌人自己怎么打”的定义

建议新增专门的 `enemy config registry`，里面每条至少要有：

- `enemyConfigId`
- 敌人显示名
- context tags，例如 `wilderness`、`guardian`、`ritual`、`elite`
- style bias
- 已装备武器/法术装配
- spirit 预算
- 奖励偏向标签

这张表是后续所有战斗身份的**机械真源**。

完成标准：

- 不再只有 `mine-beast` / `ruins-guardian` 两个抽象模板名撑全局

### 2. 新增遭遇构筑注册表

这里的“遭遇构筑”你可以理解成：

- 不是单个敌人
- 而是“这场战斗如何引用敌人配置、属于什么入口和家族”

建议新增专门的 `encounter build registry`，里面每条至少要有：

- `encounterBuildId`
- `battleSourceKind`
- `enemyConfigIds`
- 遭遇家族标签
- context tags，例如 `wilderness`、`guardian`、`ritual`、`elite`
- 奖励偏向标签

`battleSourceKind` 这里可以理解成“这场战斗是从哪种入口来的”。这轮先把结构留好，建议先支持或预留：

- `pve-event`
- `pve-direct`
- `pvp-duel`
- `pvp-arena`

这轮真正实现的是前两个，后两个只是预留结构，不做实际 PvP 行为。

完成标准：

- 敌人配置和遭遇构筑不再混成一张表
- 同一个敌人配置以后可以被不同的 encounter build 复用

### 3. 事件模板允许绑定 encounter build

当前 `EventTemplate` 已经有：

- `resultType`
- `semanticType`
- `effects`

这轮建议给 battle-facing content 增加一个可选字段，例如：

- `encounterBuildId?: string | null`

含义很简单：

- 非战斗偶遇不用填
- 战斗型事件必须填

这样事件系统就不再只是说“这里有 combat 结果”，而是能明确说“这里接的是哪种敌人构筑”。

### 4. 荒原专用事件也共享 encounter build

`WildernessEventDefinition` 不需要强行改成 `EventTemplate`，但必须和 encounter build registry 对齐。

也就是说：

- 荒原 survey 事件如果带战斗
- 它也要能指向 encounter build

这轮不强求把两套类型合一，但强求它们的**战斗身份来源一致**。

### 5. direct combat 入口也要走 encounter build，而不是继续写死

这条是为了后面 `PVP` 和更多 `PVE` 入口都能接同一套底层。

也就是说：

- `hunt-mine-beast` 这种 direct PVE 入口
- `challenge-guardian:*` 这种 direct PVE 入口
- 以后可能的 `duel:*`、`arena:*`

都不应该直接把敌人壳子写死在 `engine.ts` 里。
它们应该统一变成：

- 先确定 `battleSourceKind`
- 再选 `encounterBuild`
- 再由 `encounterBuild` 引用具体 `enemyConfig`

这轮先把 direct PVE 接上，顺手把 PvP 需要的结构留好。

### 6. 触碰到的内容包必须同时补“战斗事件”和“非战斗偶遇”

这条是硬规则。

如果一个内容包这轮被拿来补战斗整合，就不能只往里面塞战斗条目。

必须一起补：

- 资源型偶遇
- 状态型偶遇
- 进度型偶遇
- 风味/人文型偶遇

否则内容会变成“全是 fight 入口”，世界层会很薄。

## Scope

### 本轮覆盖

- `packages/domain/src/events/content/nodes/wilderness.ts`
- `packages/domain/src/wilderness-events.ts`
- `packages/domain/src/events/content/nodes/dungeon-c.ts`
- `packages/domain/src/events/content/nodes/dungeon-b.ts`
- `packages/domain/src/events/content/nodes/dungeon-a.ts`
- `packages/domain/src/events/content/nodes/states/*`
- `hunt-mine-beast`
- `challenge-guardian:*`
- 地宫远征 flavor event 采样逻辑

### 本轮不强求覆盖

- `events/content/exploration/global.ts`
- `events/content/states/*`
- `events/content/travel/**/*`

这些地方如果后面要做，可以单独再扩，不需要在这一轮一次性推平全世界事件。

### 本轮明确不实现，但必须预留结构

- `pvp-duel`
- `pvp-arena`
- 玩家镜像或玩家构筑投影

这里的“预留结构”意思是：现在先把 battle source kind、enemy config / encounter build 分层做好，让以后接 PvP 时不需要推翻这轮数据模型。

## Implementation Changes

### 1. 定义 enemy config 类型与注册表

建议修改文件：

- `packages/domain/src/model.ts`
- 新增 `packages/domain/src/encounters/enemy-configs.ts` 或同义文件

具体工作：

- 新增 `EnemyConfigId`
- 新增 enemy config 定义接口
- 注册第一波 enemy config

第一波至少建议包含：

- 荒原矿兽系
- 荒原古守系
- 地宫守印系
- 地宫术式系
- 地宫重兵系
- 地宫速袭系
- 地宫消耗系

完成标准：

- 不再只有 `mine-beast` / `ruins-guardian` 两个抽象模板名撑全局

### 2. 定义 encounter build 类型与注册表

建议修改文件：

- `packages/domain/src/model.ts`
- 新增 `packages/domain/src/encounters/catalog.ts` 或同义文件

具体工作：

- 新增 `EncounterBuildId`
- 新增 `BattleSourceKind`
- 新增 encounter build 定义接口
- encounter build 里引用 `enemyConfigIds`
- 注册第一波 encounter build

完成标准：

- `Encounter Build` 成为战斗入口和敌人配置之间的中间层
- battle source kind 结构已经能承接未来 PvP

### 3. 扩展事件内容接口，允许绑定 encounter build

建议修改文件：

- `packages/domain/src/model.ts`
- `packages/domain/src/events.ts`

具体工作：

- 给 `EventTemplate` 增加 encounter 绑定字段
- 给 `WildernessEventDefinition` 增加 encounter 绑定字段
- 保持字段可选，避免所有旧内容立刻强制重写

完成标准：

- 战斗型内容能明确绑定 encounter build
- 非战斗内容继续零改动可运行

### 4. 重构 direct combat 入口，让它们不再只吃固定模板

建议修改文件：

- `packages/domain/src/engine.ts`

具体工作：

- `hunt-mine-beast` 改成从 authored wilderness combat family 选 encounter build
- `challenge-guardian:*` 改成从对应 grade/rank 的 guardian event family 选 encounter build
- 保留现有动作 id，不改 agent 合同

这里不是删掉 `EncounterTemplate`，而是：

- encounter template 继续作为战斗运行时输入
- 但它的来源改成“由 encounter build 生成或映射”

完成标准：

- 直接战斗动作的敌人身份不再是写死在 `engine.ts` 里的两条壳子

### 5. 扩写 wilderness shared pack 和 wilderness expedition event pool

建议修改文件：

- `packages/domain/src/events/content/nodes/wilderness.ts`
- `packages/domain/src/wilderness-events.ts`

具体工作：

- wilderness shared pack 不再只有 2 条资源事件
- 至少补成“资源 + 线索 + 风险 + 人迹 + 战斗线索”混合包
- wilderness expedition event pool 里补 encounter-linked threats 和非战斗偶遇

推荐分类：

- `resource`
- `status`
- `story`
- `combat`

完成标准：

- 荒原不再只像资源层或战斗按钮层
- survey 和 direct hunt 至少在内容身份上彼此呼应

### 6. 扩写 dungeon shared grade packs

建议修改文件：

- `packages/domain/src/events/content/nodes/dungeon-c.ts`
- `packages/domain/src/events/content/nodes/dungeon-b.ts`
- `packages/domain/src/events/content/nodes/dungeon-a.ts`

具体工作：

- 保留当前 rank band 结构
- 但每个 touched band 的内容都要有：
  - combat encounter rows
  - resource rows
  - status rows
  - progression/story rows

这里要特别注意：

- `resultType = "combat"` 的条目要绑定 encounter build
- 非 combat 条目继续走普通效果包

完成标准：

- 地宫 shared pack 不是只靠资源和轻 hazard 撑内容

### 7. 扩写 state overlay packs，让州域风味真正进入战斗内容

建议修改文件：

- `packages/domain/src/events/content/nodes/states/*`

具体工作：

- 保留现有 18-row overlay 基础
- 但每个州至少补出能反映本州战斗气质的 encounter-linked rows

例如可以是：

- 青州偏药圃残阵、木系守兽
- 凉州偏炽火遗炉、火系术卫
- 雷州偏裂雷禁柱、金火速击守卫

完成标准：

- “在哪个州打”开始真的影响“遇到什么敌人”

### 8. 让远征 flavor report 和战斗身份接上

建议修改文件：

- `packages/domain/src/dungeon-expedition-service.ts`

具体工作：

- flavor event 依然保持简短
- 但现在允许采样 encounter-linked event title
- 继续保持：
  - 去重
  - 保序
  - 上限 3

完成标准：

- 远征报告不只是“搜到了几个 cache”，也能体现“碰到了哪种遭遇风格”

### 9. 日志与 agent 可读性

建议修改文件：

- `packages/domain/src/engine.ts`
- 如有需要，补 `combat log` 结构

具体工作：

- 战斗日志最好能带：
  - `encounterBuildId`
  - 可选 `sourceEventId`
- action description 或 state hint 至少能让 agent 知道：
  - 当前动作更偏向哪类遭遇

完成标准：

- 战斗和事件之间的桥不是只存在于内部代码，而是能被观察到

## Content Rules

### 1. 触碰到的包必须是混合包

Touched pack 里不能只有战斗条目。  
至少要保留或补出：

- `resource`
- `status`
- `progression/story`
- `combat`

### 2. 守关内容要分家族

guardian 不能再只是“同一个敌人换 grade/rank 数值”。

至少要形成几类 guardian 家族：

- 重压型
- 术式型
- 守御型
- 速袭型

### 3. 掉落偏向只做轻度，不做死绑定

这轮如果要做 encounter-family 与掉落的关系，建议只做轻偏向：

- 某些家族更容易偏武器锻材
- 某些家族更容易偏功法残本

不要做成“看到这个敌人就 100% 掉这个物品”。

## Implementation Order

建议顺序固定为：

1. 先补类型和 registry
2. 再改 direct combat 入口接 authored build
3. 再扩 wilderness content
4. 再扩 dungeon shared packs
5. 再扩 state overlay packs
6. 再补 expedition flavor/report/log 可读性
7. 最后补测试和文档引用

这个顺序的原因是：

- 先把 enemy config 和 encounter build 两层真源立住
- 再让内容去引用它
- 最后再补展示层和回归锁

## Test Plan

### 1. Encounter registry

- 第一波 enemy config 全部可读
- 第一波 encounter build 全部可读
- 没有重复 id
- wilderness / guardian / ritual / elite 等 context tag 能正确分组
- battle source kind 能正确区分 `pve-event` 和 `pve-direct`

### 2. Event binding

- combat 型 `EventTemplate` 能绑定合法 `encounterBuildId`
- 非 combat 条目允许为空
- `WildernessEventDefinition` 的战斗型条目也能绑定合法 `encounterBuildId`

### 3. Direct combat actions

- `hunt-mine-beast` 不再只走单一固定 encounter identity
- `challenge-guardian:*` 不再只走单一固定 guardian identity
- 原有动作 id 不变

### 4. Event pool quality

- wilderness shared pack 比当前更厚，且不全是 combat
- dungeon C/B/A shared pack 比当前更厚，且不全是 combat
- 每个 touched state overlay 仍满足最小内容量

### 5. Expedition/report behavior

- expedition `flavorEvents` 继续：
  - 去重
  - 保序
  - 最多 3 条
- 新增 encounter-linked title 后不破坏旧行为

### 6. Regression

- 现有 event pool composition 不回归
- 现有 search / guardian / wilderness action loop 不回归
- 现有 combat runtime、loadout、status、掉落来源链不回归

## Acceptance Criteria

满足下面这些条件时，这份整合计划算落地完成：

1. 当前战斗入口和事件内容不再是两套各写各的系统
2. 敌人配置从事件和 `engine.ts` 里单独抽出，成为独立可管理的注册表
3. 荒原和地宫的战斗遭遇有明确 authored 家族，而不是只剩两个硬编码壳子
4. 触碰到的战斗相关内容包同时补厚了非战斗偶遇
5. 远征和战斗日志能在有限度内反映真实遭遇身份
6. agent 不需要靠猜，能从内容和结构里看出“这次遇到的是哪类战斗”
7. 当前这套结构已经给未来 PvP 留出 battle source kind 和 encounter build 复用位

## Assumptions

- 这轮优先补 battle-adjacent content，不强求把全世界所有 exploration/travel pack 一次性重做
- 这轮不做 PvP 实现，只做 PvP 结构预留
- 这轮不扩更重的状态系统
- 如果 encounter-family 与奖励偏向挂钩，也只做轻偏向，不做绝对掉落锁定
