# Breakthrough Pill And Material Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Spec dependency:** meaningful implementation work for this plan should be anchored by an update to `docs/specs/breakthrough-materials-v1/spec.md` and any follow-on spec text that still assumes shared `qi-common` / `foundation-common` / `core-common` buckets.

**Goal:** 把当前突破材料从三大境界共桶的 `*-common` 结构，改成“按突破段拆分的突破丹 + 辅材”结构：练气前两段和筑基前两段的突破丹可由市场或野外双路径获取，`3 -> 4`、`6 -> 7` 与全部金丹段突破丹继续只能由野外活动掉落，同时每次突破还要配套消耗灵气、药材、奇物等辅材。

**Architecture:** 这次补丁不再把 `qi-common` / `foundation-common` / `core-common` 当成抽象资源桶，而是把它们落成可命名、可掉落、可展示、可定价的分段突破丹。突破的结构化状态也同步从“common requirement”改成“主突破丹 requirement + 辅材 requirement”，让 agent 直接读到当前突破缺哪颗丹、缺哪些辅材、哪些能买、哪些只能刷。实现重心在 `packages/domain` 的 item 合同、突破定义、事件掉落、动作生成与 state 视图，兼容层在 `packages/persistence`。

**Tech Stack:** TypeScript monorepo, `packages/domain`, `packages/persistence`, public agent docs on Cloudflare Pages / Worker.

---

## Summary

当前计划需要改的不是单纯命名，而是整套材料表达：

- 现在的 `qi-common` / `foundation-common` / `core-common` 太抽象，不像修仙世界里的实际突破物
- 一旦允许 early common 上架市场，玩家就能提前囤货，绕过本来应当“必须野外掉落”的大突破门槛
- runtime 里目前只在说“缺 common”，没有把“缺哪颗丹、缺哪些辅材、哪部分能买、哪部分只能刷”做成明确合同

这次计划改成一套统一规则：

- 每个突破段都有自己的主突破丹，命名统一为 `<大境界><关位>丹`
- 每个突破段还配有辅材，至少包含灵气类、药材类；大突破和金丹段再加入奇物类
- 市场只卖练气前两段、筑基前两段的主突破丹，不卖大突破丹，不卖任何金丹段突破丹，也不卖辅材
- 野外 / travel / exploration / dungeon 则按当前突破段掉落对应主丹和辅材

## Implementation Areas

### Task 1: 把 shared common 改成分段突破丹合同

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/items/legacy-materials.ts`
- Modify: `packages/domain/src/items/catalog.ts`

**Implementation:**

- 移除“只靠 `qi-common` / `foundation-common` / `core-common` 三桶推进”的设计假设。
- 新增分段主突破丹 item id：
  - `qi-stage-1-pill`
  - `qi-stage-2-pill`
  - `qi-major-pill`
  - `foundation-stage-1-pill`
  - `foundation-stage-2-pill`
  - `foundation-major-pill`
  - `core-stage-1-pill`
  - `core-stage-2-pill`
- 当前 live ladder 没有 `9 -> 10`，所以先不引入 `core-major-pill`，但命名规则要预留这类扩展位。
- 只给以下 4 个主突破丹开放市场购买动作：
  - `buy-qi-stage-1-pill`
  - `buy-qi-stage-2-pill`
  - `buy-foundation-stage-1-pill`
  - `buy-foundation-stage-2-pill`
- 价格规则继续复用现有 `buyPrice()` 折扣机制，基础价固定为：
  - `qi-stage-1-pill = 100`
  - `qi-stage-2-pill = 140`
  - `foundation-stage-1-pill = 220`
  - `foundation-stage-2-pill = 300`
- 以下突破丹禁止市场购买：
  - `qi-major-pill`
  - `foundation-major-pill`
  - `core-stage-1-pill`
  - `core-stage-2-pill`
- 所有突破丹默认不开放卖出动作，避免被当成普通商品回收。

### Task 2: 为每个突破段新增辅材体系

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/items/legacy-materials.ts`
- Modify: `packages/domain/src/constants.ts`

**Implementation:**

- 每个突破段新增辅材，采用统一的三类结构：
  - 灵气类：`<slot>-aura`
  - 药材类：`<slot>-herb`
  - 奇物类：`<slot>-curio`
- `slot` 与主突破丹保持完全同段：
  - `qi-stage-1`
  - `qi-stage-2`
  - `qi-major`
  - `foundation-stage-1`
  - `foundation-stage-2`
  - `foundation-major`
  - `core-stage-1`
  - `core-stage-2`
- 消耗规则固定为：
  - 练气前两段、筑基前两段：`1 主突破丹 + 1 灵气类 + 1 药材类 + 1 stage special`
  - `3 -> 4`、`6 -> 7`：`1 主突破丹 + 1 灵气类 + 1 药材类 + 1 奇物类 + 1 major special`
  - 金丹两段：`1 主突破丹 + 1 灵气类 + 1 药材类 + 1 奇物类 + 1 stage special`
- 所有辅材都只能从野外活动获取，不进入市场。
- 当前 special item id 可继续保留，但它们的 recipe 输入要从“1 个 common”升级为“主突破丹 + 对应辅材 + 灵石”。

### Task 3: 重写突破定义与 state 视图命名

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`

**Implementation:**

- `breakthroughDefinitionOf()` 改为按突破段返回主突破丹与辅材需求，而不是只返回一个 `commonItemId`。
- `BreakthroughStateView` 做以下改名与扩展：
  - `commonRequirement` 改为 `primaryPillRequirement`
  - 新增 `auxiliaryRequirements`
  - `commonSources` 改为 `pillSources`
- `auxiliaryRequirements` 固定返回结构化数组，每项包含：
  - `itemId`
  - `category: "aura" | "herb" | "curio"`
  - `required`
  - `owned`
  - `missing`
- `pillSources` 固定只描述主突破丹来源，不混入辅材来源。
- `recommendedAction` 的优先级固定为：
  - 主突破丹可买、人在安全点、灵石足够：优先推荐 `buy-*`
  - 主突破丹可买、人在安全点、灵石不足：推荐 `take-mortal-task`
  - 主突破丹可买、但不在安全点：推荐最近安全点 `travel-to:*`
  - 主突破丹不可买：推荐当前段正确的野外 / 地宫动作
  - 主突破丹已齐但辅材未齐：推荐对应辅材的掉落动作，而不是继续推荐买丹
- `missingItems` 继续保留，但内部应合并主突破丹、辅材、special item 三类缺口。

### Task 4: 重写掉落路径与市场展示规则

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/events/content/travel/global.ts`
- Modify: `packages/domain/src/events/content/exploration/global.ts`
- Modify: `packages/domain/src/events/content/nodes/*`
- Modify: `packages/domain/src/wilderness-events.ts`

**Implementation:**

- 练气段掉落：
  - `realmLevel = 1` 时掉 `qi-stage-1-pill`、`qi-stage-1-aura`、`qi-stage-1-herb`
  - `realmLevel = 2` 时掉 `qi-stage-2-pill`、`qi-stage-2-aura`、`qi-stage-2-herb`
  - `realmLevel = 3` 时掉 `qi-major-pill`、`qi-major-aura`、`qi-major-herb`、`qi-major-curio`
- `take-mortal-task` 只在 `realmLevel = 1` 或 `2` 时能补给当前段主突破丹，不再直接补给大突破丹或任何辅材。
- 筑基段掉落：
  - `realmLevel = 4` 时掉 `foundation-stage-1-pill`、`foundation-stage-1-aura`、`foundation-stage-1-herb`
  - `realmLevel = 5` 时掉 `foundation-stage-2-pill`、`foundation-stage-2-aura`、`foundation-stage-2-herb`
  - `realmLevel = 6` 时掉 `foundation-major-pill`、`foundation-major-aura`、`foundation-major-herb`、`foundation-major-curio`
- 金丹段掉落：
  - `realmLevel = 7` 时掉 `core-stage-1-pill`、`core-stage-1-aura`、`core-stage-1-herb`、`core-stage-1-curio`
  - `realmLevel = 8` 时掉 `core-stage-2-pill`、`core-stage-2-aura`、`core-stage-2-herb`、`core-stage-2-curio`
- 动作面只展示“当前突破段缺少且允许购买”的主突破丹购买动作，不展示未来段丹药。
- `state.dungeon.materialBand` 与 `rankYieldHints.primaryMaterial` 改成按当前突破段返回真实主突破丹，而不是继续返回抽象的 `qi-common` / `foundation-common` / `core-common`。

### Task 5: 兼容老存档

**Files:**
- Modify: `packages/persistence/src/world-shape.ts`
- Modify: `packages/persistence/src/in-memory-world-repository.test.ts`
- Modify: `packages/persistence/src/sqlite-world-repository.test.ts`

**Implementation:**

- 老存档里已有的：
  - `qi-common`
  - `foundation-common`
  - `core-common`
  要在 hydration 时按当前 `realmLevel` 一次性迁移到当前突破段的主突破丹。
- 这次兼容不追溯历史来源，不尝试把旧 common 拆回 aura / herb / curio，只做最小可玩迁移：
  - 旧 common 迁成当前段主突破丹
  - 新增辅材默认为 `0`
- 这样老角色仍能继续推进，但不能凭旧桶材料直接跳过新辅材要求。
- `realmProgress >= 100` 的旧角色迁移后仍应进入待突破状态，不自动晋级。

### Task 6: 更新测试与公开文档

**Files:**
- Modify: `packages/domain/src/item-catalog.test.ts`
- Modify: `packages/domain/src/engine.test.ts`
- Modify: `packages/domain/src/events.test.ts`
- Modify: `README.md`
- Modify: `apps/web/public/skill.md`
- Modify: `apps/world-do/src/agent-guides.ts`
- Modify: `packages/openclaw-immortal-plugin/README.md`

**Implementation:**

- 覆盖新的丹药与辅材目录，确认：
  - 8 个主突破丹都存在
  - 只有 4 个 early minor 丹可买
  - 所有辅材都不可买
- 覆盖突破链路，确认：
  - `1 -> 2`、`2 -> 3`、`4 -> 5`、`5 -> 6` 可走“买丹 + 刷辅材”或“全野外”双路径
  - `3 -> 4`、`6 -> 7` 无法通过市场补齐主突破丹
  - `7 -> 8`、`8 -> 9` 金丹段所有材料都必须掉落
- 覆盖 guidance，确认：
  - 主突破丹缺口优先出现在 `pillSources`
  - 辅材缺口会正确反映在 `auxiliaryRequirements`
  - `recommendedAction` 不会在辅材没齐时反复建议无关买丹动作
- 更新公开 agent 文档，让 agent 读到的是：
  - 当前缺哪颗突破丹
  - 当前缺哪类辅材
  - 哪些丹能买，哪些必须刷
  - 当前推荐去城镇、荒野还是地宫

## Verification

- `node --import tsx --test packages/domain/src/item-catalog.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/domain/src/events.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`

重点场景：

- 在安全城镇中，练气前两段与筑基前两段只出现当前段主突破丹的 `buy-*` 动作
- `3 -> 4`、`6 -> 7`、`7 -> 8`、`8 -> 9` 期间完全没有市场买丹入口
- `take-mortal-task` 不再产出大突破丹、金丹段丹、或任何辅材
- 老存档中的 `core-common` 也会被迁移到当前金丹段主突破丹，不再保留为共享桶
- 辅材缺口会真正阻止突破，而不只是文案显示

## Breakthrough Material Packaging

### Naming Rule

主突破丹统一采用：

`<大境界><关位>丹`

其中关位固定为：

- `初关`：该大境界内第一次小突破
- `中关`：该大境界内第二次小突破
- `破境`：跨入下一大境界的大突破

辅材统一采用：

- 灵气类：`<大境界><关位>灵气`
- 药材类：`<大境界><关位>药材`
- 奇物类：`<大境界><关位>奇物`

后续扩到元婴、化神、返虚时继续沿用同模板即可，例如：

- `元婴初关丹`
- `元婴初关灵气`
- `元婴初关药材`
- `元婴破境奇物`

### Proposed Pill Names

| Item Id | 包装名字 | 说明 |
| --- | --- | --- |
| `qi-stage-1-pill` | `炼气初关丹` | 炼气一层到二层主突破丹 |
| `qi-stage-2-pill` | `炼气中关丹` | 炼气二层到三层主突破丹 |
| `qi-major-pill` | `炼气破境丹` | 炼气圆满冲筑基主突破丹 |
| `foundation-stage-1-pill` | `筑基初关丹` | 筑基初段主突破丹 |
| `foundation-stage-2-pill` | `筑基中关丹` | 筑基中段主突破丹 |
| `foundation-major-pill` | `筑基破境丹` | 筑基圆满冲金丹主突破丹 |
| `core-stage-1-pill` | `金丹初关丹` | 金丹初段主突破丹 |
| `core-stage-2-pill` | `金丹中关丹` | 金丹中段主突破丹 |

### Proposed Auxiliary Material Names

| Item Id | 包装名字 | 说明 |
| --- | --- | --- |
| `qi-stage-1-aura` | `炼气初关灵气` | 炼气初关的灵气辅材 |
| `qi-stage-1-herb` | `炼气初关药材` | 炼气初关的药材辅材 |
| `qi-major-curio` | `炼气破境奇物` | 炼气破境使用的奇物辅材 |
| `foundation-stage-1-aura` | `筑基初关灵气` | 筑基初关的灵气辅材 |
| `foundation-stage-2-herb` | `筑基中关药材` | 筑基中关的药材辅材 |
| `foundation-major-curio` | `筑基破境奇物` | 筑基破境使用的奇物辅材 |
| `core-stage-1-aura` | `金丹初关灵气` | 金丹初关的灵气辅材 |
| `core-stage-1-herb` | `金丹初关药材` | 金丹初关的药材辅材 |
| `core-stage-1-curio` | `金丹初关奇物` | 金丹初关的奇物辅材 |
| `core-stage-2-aura` | `金丹中关灵气` | 金丹中关的灵气辅材 |
| `core-stage-2-herb` | `金丹中关药材` | 金丹中关的药材辅材 |
| `core-stage-2-curio` | `金丹中关奇物` | 金丹中关的奇物辅材 |

