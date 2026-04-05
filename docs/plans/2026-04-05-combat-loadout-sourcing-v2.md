# 战斗装配来源链 V2：洞府打造与法术领悟实施计划

**Relationship:**

- 共享战斗装配底座：`docs/plans/2026-04-05-combat-gameplay-v2.md`
- 物品目录统一后续计划：`docs/plans/2026-04-05-item-catalog-v2-unification.md`
- 武器内容包装：`docs/plans/2026-04-05-combat-weapon-family-v2.md`
- 法术内容包装：`docs/plans/2026-04-05-combat-lightweight-spell-status-v2.md`
- 状态运行时：`docs/plans/2026-04-05-combat-lightweight-status-runtime-v2.md`
- 正式行为规格：`docs/specs/combat-loadout-sourcing-v2/spec.md`
- 武器包装规格：`docs/specs/combat-weapon-family-v2/spec.md`
- 法术包装规格：`docs/specs/combat-lightweight-spell-status-v2/spec.md`

## Summary

这份计划只负责一件事：把已经存在的 `100` 套武器装配和 `75` 套法术装配，接到一个**可掉落、可洞府加工、可使用解锁**的来源链上。

本轮明确不改洞府生产的底层合同。洞府依然只做一件事：**消耗材料，产出物品**。  
新的武器打造和法术领悟，统一走下面这两条链：

- 武器：`来源材料掉落 -> 洞府打造 -> 获得武器成品 -> 使用成品 -> 解锁对应武器装配`
- 法术：`功法残本掉落 -> 洞府合成 -> 获得完整功法 -> 使用完整功法 -> 解锁对应法术装配`

本轮冻结以下关键决定：

- 武器材料数量：`20 种武器类型 × 5 阶 = 100`
- 武器成品数量：`100`
- 功法残本数量：`15 条法术分支 × 5 阶 = 75`
- 完整功法数量：`75`
- 此前口头出现的“65 本功法残本”按笔误处理，本计划统一按 `75` 执行
- live 只开放 `1-3 阶`
- `4/5 阶` 只做数据、物品、配方、解锁接口预留，不进入 live 掉落和 live 可见动作
- 每次洞府加工只需要 `1` 份来源物
- 解锁后消耗成品物品，不自动装备
- 已解锁时再次使用对应物品会报错，且不消耗物品

## Current Baseline

当前仓库里的家园/洞府系统已经能支撑这条设计的一半：

- `ProductionRecipe` 只支持 `outputItemId`
- `residence-produce:*` 完成后会把 `outputItemId` 加进背包
- 突破材料链已经证明“掉落物 -> 洞府加工 -> 下一步使用”这条模式是可行的
- 战斗系统已经有稳定的 `WeaponLoadoutDefinition` / `SpellLoadoutDefinition`
- 现有 loadout 解锁还不是物品驱动，而是初始注册驱动

所以这轮不应该去推翻 Residence 系统，而应该补一层**物品桥接**。

## Implementation Changes

### 1. 统一物品注册方式

当前 `ItemId` 还是固定字符串联合类型。加入 `350` 个新物品后，如果继续手写联合类型，维护成本会很高，也容易漏项。

本轮统一改成：

- 现有老物品仍然保留稳定 ID
- 新的武器/法术来源物和解锁物由注册表推导生成
- `ItemId` 改成“老物品常量 + 新注册表 key”的联合推导，而不是继续手写长联合

新物品分成四组：

1. `weapon material items`
2. `weapon unlock items`
3. `spell fragment items`
4. `spell manual items`

四组物品都必须通过现有武器/法术包装表**机械生成**，不手工维护平行名单。

来源表的源头固定为：

- 武器：现有 `100` 个 `WeaponLoadoutDefinition`
- 法术：现有 `75` 个 `SpellLoadoutDefinition`

### 2. 物品命名、ID、类别与使用规则

#### 2.1 武器来源物

对每个 `weaponLoadoutId` 派生两个物品：

- 来源材料 ID：`weapon-material-${weaponLoadoutId}`
- 武器成品 ID：`weapon-item-${weaponLoadoutId}`

显示名规则固定为：

- 来源材料：`${weaponLoadout.name}锻材`
- 武器成品：`${weaponLoadout.name}`

字段规则：

- 来源材料
  - `category = "material"`
  - `trade.buyBasePrice = null`
  - `trade.sellBasePrice = null`
  - `tradableAt = "none"`
  - `use.kind = "material"`
- 武器成品
  - `category = "manual"`
  - `trade.buyBasePrice = null`
  - `trade.sellBasePrice = null`
  - `tradableAt = "none"`
  - `use.kind = "unlock-loadout"`
  - `use.grantsWeaponLoadoutId = weaponLoadoutId`
  - `use.grantsSpellLoadoutId = null`
  - `use.consumesOnUse = true`

#### 2.2 法术来源物

对每个 `spellLoadoutId` 派生两个物品：

- 残本 ID：`spell-fragment-${spellLoadoutId}`
- 完整功法 ID：`spell-manual-${spellLoadoutId}`

显示名规则固定为：

- 残本：`${spellLoadout.name}残本`
- 完整功法：`${spellLoadout.name}`

字段规则：

- 功法残本
  - `category = "material"`
  - `trade.buyBasePrice = null`
  - `trade.sellBasePrice = null`
  - `tradableAt = "none"`
  - `use.kind = "material"`
- 完整功法
  - `category = "manual"`
  - `trade.buyBasePrice = null`
  - `trade.sellBasePrice = null`
  - `tradableAt = "none"`
  - `use.kind = "unlock-loadout"`
  - `use.grantsSpellLoadoutId = spellLoadoutId`
  - `use.grantsWeaponLoadoutId = null`
  - `use.consumesOnUse = true`

#### 2.3 新的使用类型

`ItemUseKind` 新增：

- `"unlock-loadout"`

这个类型只用于：

- 武器成品
- 完整功法

它的语义固定为：

- 使用时尝试解锁一个武器或法术装配
- 成功后物品消耗
- 失败时物品不消耗

### 3. 洞府加工配方

继续沿用现有 `ProductionRecipe`，不新增 `outputKind`，不让 Residence 直接产出 loadout。

#### 3.1 武器打造配方

对每个 `weaponLoadoutId` 派生一个配方：

- 配方 ID：`recipe-forge-${weaponLoadoutId}`
- 输入：`weapon-material-${weaponLoadoutId} × 1`
- 输出：`weapon-item-${weaponLoadoutId} × 1`

Spirit stone 成本统一按阶位走表：

- `Tier 1 -> 40`
- `Tier 2 -> 90`
- `Tier 3 -> 160`
- `Tier 4 -> 260`
- `Tier 5 -> 400`

`durationTicks` 统一按阶位走表：

- `Tier 1 -> 2`
- `Tier 2 -> 2`
- `Tier 3 -> 3`
- `Tier 4 -> 4`
- `Tier 5 -> 5`

#### 3.2 功法合成配方

对每个 `spellLoadoutId` 派生一个配方：

- 配方 ID：`recipe-synthesize-${spellLoadoutId}`
- 输入：`spell-fragment-${spellLoadoutId} × 1`
- 输出：`spell-manual-${spellLoadoutId} × 1`

Spirit stone 成本统一按阶位走表：

- `Tier 1 -> 30`
- `Tier 2 -> 70`
- `Tier 3 -> 130`
- `Tier 4 -> 220`
- `Tier 5 -> 340`

`durationTicks` 统一按阶位走表：

- `Tier 1 -> 2`
- `Tier 2 -> 2`
- `Tier 3 -> 3`
- `Tier 4 -> 4`
- `Tier 5 -> 5`

#### 3.3 配方可见性

Residence 动作列表不能把 `175` 条配方一次性全部摊给玩家和 agent。

所以这轮必须收成下面的行为：

- `listAvailableActions(...)` 只展示**当前可加工**的 Residence 配方
- “当前可加工”的定义是：
  - 背包里有至少 `1` 个对应来源物
  - 灵石满足该配方 `spiritStoneCost`
  - 该配方 `enabledInLive = true`
- `4/5 阶` 的配方虽然会注册进数据，但 `enabledInLive = false`
- 因此 `4/5 阶` Residence 配方不会出现在 live 动作列表中

### 4. 解锁动作与使用合同

#### 4.1 新动作

新增即时动作：

- `unlock-loadout:${itemId}`

这个动作只能针对：

- 武器成品
- 完整功法

#### 4.2 解锁规则

执行 `unlock-loadout:${itemId}` 时：

1. 校验背包里该物品数量 `>= 1`
2. 读取该物品 `use.grantsWeaponLoadoutId` / `use.grantsSpellLoadoutId`
3. 若两者都为空，报错
4. 若绑定的是武器装配：
   - 若已解锁，报错且不消耗物品
   - 若未解锁，将该 ID 加入 `unlockedWeaponLoadoutIds`
5. 若绑定的是法术装配：
   - 若已解锁，报错且不消耗物品
   - 若未解锁，将该 ID 加入 `unlockedSpellLoadoutIds`
6. 消耗该物品 `1`
7. 写入一条 `dao log`

固定行为：

- 解锁后**不自动装备**
- 仍然需要通过现有 `equip-weapon:*` / `equip-spell:*` 自行切换
- 允许背包里同时保留多个不同待解锁成品

#### 4.3 动作列表展示

当角色未忙碌时：

- 对于背包中每一个可解锁但尚未解锁的武器成品，生成一个 `unlock-loadout:${itemId}`
- 对于背包中每一个可解锁但尚未解锁的完整功法，生成一个 `unlock-loadout:${itemId}`

动作描述必须直说清楚：

- 将消耗哪件物品
- 将解锁哪个武器或法术装配
- 不会自动装备

### 5. live 掉落来源与阶位绑定

#### 5.1 live 阶位边界

live 只启用：

- `Tier 1`
- `Tier 2`
- `Tier 3`

`Tier 4 / Tier 5`：

- 物品数据存在
- 配方数据存在
- 解锁接口存在
- 但 live 不会掉落
- live 不会显示相关 Residence 配方

#### 5.2 来源池结构

按阶位建立三个 live 来源池：

- `source-pool-tier-1`
- `source-pool-tier-2`
- `source-pool-tier-3`

每个来源池都由两部分组成：

- 该阶位全部武器来源材料
- 该阶位全部功法残本

抽取规则固定为两段：

1. 先 `50% / 50%` 决定掉落“武器材料”还是“功法残本”
2. 再在对应类别里等权随机抽一项

这样做的原因是让武器线和法术线的总体掉落带宽均衡，不因为 `20 vs 15` 的数量差导致武器长期更容易出。

#### 5.3 具体来源分配

掉落位置冻结为：

- `Tier 1` 来源池：
  - 荒原
  - 丙级地宫
- `Tier 2` 来源池：
  - 乙级地宫
- `Tier 3` 来源池：
  - 甲级地宫

#### 5.4 荒原接入

当前仓库中 `WILDERNESS_LAYERS` 还是空的，所以如果要兑现“1 阶材料荒原掉落”，必须补一个 live 可用的一阶荒原层。

本轮新增一个 live 荒原层：

- `layerId = "starter-wilderness-tier-1"`
- `tier = 1`
- `status = "active"`
- `locationIds` 挂到当前所有 `nodeType === "wilderness"` 的 location
- `entryRequirement.minRealm = "炼气"`
- `entryRequirement.entryTicket = null`
- `rewardTable` 不再掉旧固定材料，而是接 `source-pool-tier-1`

荒原掉落规则固定为：

- 每次成功完成 `survey-wilderness`，额外掉落 `1` 个 `Tier 1` 来源物
- 除此之外不再追加第二个来源物

#### 5.5 地宫接入

手动地宫动作：

- `search-fortune:rank-*`
- `challenge-guardian:rank-*`

固定规则：

- 丙级地宫成功结算：额外掉落 `1` 个 `Tier 1` 来源物
- 乙级地宫成功结算：额外掉落 `1` 个 `Tier 2` 来源物
- 甲级地宫成功结算：额外掉落 `1` 个 `Tier 3` 来源物

这里的“成功结算”定义为：

- `search-fortune:*` 动作完成
- `challenge-guardian:*` 战斗胜利

如果守关失败或逃跑：

- 不给来源物

#### 5.6 地宫远征接入

`dungeon expedition` 已经有 `secondaryDrops` 和报告结构，这轮直接接一份来源物进去即可。

规则固定为：

- `completed`：结算 `1` 个对应 grade 的来源物
- `withdrew` 且 `stepsResolved > 0`：结算 `1` 个对应 grade 的来源物
- `aborted`：不给来源物
- `catastrophic`：不给来源物

grade 对应阶位：

- `丙 -> Tier 1`
- `乙 -> Tier 2`
- `甲 -> Tier 3`

### 6. 推荐动作与状态展示

为了让 agent 能顺着这条链走，推荐动作必须补两层提示：

#### 6.1 Residence 推荐

如果角色在 Residence，且背包里有可加工来源物：

- 推荐对应 `residence-produce:${recipeId}`

优先级高于一般性 `residence-socialize`，但低于硬性生存动作。

#### 6.2 解锁推荐

如果背包里有可解锁成品，且对应 loadout 尚未解锁：

- 推荐对应 `unlock-loadout:${itemId}`

这个推荐必须明确告诉 agent：

- 这是永久解锁
- 不会自动装备
- 解锁后需要手动执行 `equip-*`

#### 6.3 状态视图

状态视图不需要额外做大 UI，但至少要能让调用者看到：

- 当前已解锁武器装配列表
- 当前已解锁法术装配列表
- 背包里有哪些待解锁武器成品
- 背包里有哪些待解锁完整功法

### 7. 日志与行为记录

每次成功完成以下行为都要写 `dao log`：

- 武器来源物掉落
- 功法残本掉落
- 洞府打造武器
- 洞府合成功法
- 使用武器成品解锁武器装配
- 使用完整功法解锁法术装配

日志标签固定使用：

- `weapon-source`
- `spell-source`
- `residence-production`
- `loadout-unlock`

## Implementation Order

建议实施顺序固定为：

1. 先把 `ItemId` 和 `ITEM_CATALOG` 改成支持注册表扩展
2. 再生成 `100 + 100 + 75 + 75` 四组新物品
3. 再生成武器打造和功法合成配方
4. 再补 `unlock-loadout:${itemId}` 即时动作
5. 再把 Residence 配方动作列表改成“只显示可加工”
6. 再接荒原 live 一阶层
7. 再接手动地宫动作掉落
8. 再接地宫远征报告掉落
9. 最后补推荐动作和状态视图

这个顺序不能反过来。  
如果先接掉落而不先接物品和解锁，仓库里会出现“掉了东西但没有用途”的中间状态。

## Test Plan

### 1. 物品与配方注册

- 武器来源材料数量为 `100`
- 武器成品数量为 `100`
- 功法残本数量为 `75`
- 完整功法数量为 `75`
- 武器打造配方数量为 `100`
- 功法合成配方数量为 `75`
- `Tier 4 / 5` 条目存在，但 `enabledInLive = false`

### 2. 洞府加工

- 背包中有 `weapon-material-*` 时，Residence 出现对应打造配方
- 加工后：
  - 来源材料 `-1`
  - 成品 `+1`
  - 灵石按阶位扣除
- 背包中有 `spell-fragment-*` 时，Residence 出现对应合成配方
- 合成后：
  - 残本 `-1`
  - 完整功法 `+1`
  - 灵石按阶位扣除
- 无来源物时，不出现对应配方
- `Tier 4 / 5` 配方不出现在 live 动作列表

### 3. 解锁动作

- 使用武器成品可解锁对应 `WeaponLoadoutId`
- 使用完整功法可解锁对应 `SpellLoadoutId`
- 解锁成功后物品消耗
- 解锁后不会自动装备
- 已解锁时再次使用同类物品：
  - 报错
  - 物品保留

### 4. 掉落来源

- `survey-wilderness` 只会额外掉落 `Tier 1` 来源物
- 丙级 `search-fortune` 只会额外掉落 `Tier 1` 来源物
- 丙级守关胜利只会额外掉落 `Tier 1` 来源物
- 乙级 `search-fortune` / 守关胜利只会额外掉落 `Tier 2` 来源物
- 甲级 `search-fortune` / 守关胜利只会额外掉落 `Tier 3` 来源物
- 地宫远征 `completed/withdrew` 的报告奖励符合 grade 对应阶位
- `Tier 4 / 5` 来源物在所有 live 来源里都不会出现

### 5. 回归验证

- 现有突破材料链不回归
- 现有丹药、符箓、买卖、使用不回归
- 现有 starter 武器和 starter 法术不回归
- 现有 `equip-weapon:*` / `equip-spell:*` 不回归
- 现有战斗装配读取和战斗结算不回归

## Acceptance Criteria

满足下面四句话时，本计划视为落地完成：

1. 玩家可以在 live 中从荒原或对应地宫拿到 `1-3 阶` 武器来源材料或功法残本
2. 玩家可以在洞府把来源物加工成武器成品或完整功法
3. 玩家可以通过使用成品物品永久解锁对应的武器或法术装配
4. `4/5 阶` 数据已经预埋，但 live 中看不到、拿不到、也不会误掉落

## Assumptions

- 本轮不做 Residence 升级系统；`1-3 阶` 打造和合成都只依赖现有 `level: 1` 洞府
- 本轮不做多残本拼装；按你冻结的规则执行：`1 份残本 -> 1 次洞府合成 -> 1 本完整功法`
- 本轮不做武器与功法的市场交易
- 本轮不做重复解锁后的返还、拆解、转化
- 本轮不修改现有战斗平衡，只补来源链、掉落、加工和解锁
