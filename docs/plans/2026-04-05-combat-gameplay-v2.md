# 战斗装配层落地计划：共享底座

> Follow-up alignment supplement: `docs/plans/2026-04-05-combat-gameplay-v2-gap-closure.md`
> Loadout sourcing supplement: `docs/plans/2026-04-05-combat-loadout-sourcing-v2.md`
> Spell supplement plan: `docs/plans/2026-04-05-combat-lightweight-spell-status-v2.md`
> Status runtime supplement plan: `docs/plans/2026-04-05-combat-lightweight-status-runtime-v2.md`
> Weapon supplement plan: `docs/plans/2026-04-05-combat-weapon-family-v2.md`
> Supporting spell spec: `docs/specs/combat-lightweight-spell-status-v2/spec.md`
> Supporting weapon spec: `docs/specs/combat-weapon-family-v2/spec.md`

**Scope note:** 这份主计划只负责 V2 的共享战斗装配底座。法术侧的 75 套包装、分支到状态的绑定、5 档数值包线，归 `combat-lightweight-spell-status-v2` 补充计划。状态在战斗里如何存储、刷新、结算、写日志，归 `combat-lightweight-status-runtime-v2` 补充计划。武器侧的五大家族、20 种武器、100 套包装、两层副属性加成，归 `combat-weapon-family-v2` 补充计划。

## Summary

- 在当前 `动作层（普通攻击 / 核心技 / 逃跑） + 路线层（蛮力 / 巧劲 / 战术）` 之间，新增一层通用的“战斗装配层”。
- 这层不负责定义“具体是哪把武器”或“具体是哪套法术”，只负责统一这些装配在运行时的接入方式。
- 核心技耗灵统一改为读取**具体装配**上的固定值 `coreSkillSpiritCost`，不再从 `maxSpirit` 百分比推导。
- 装配层必须同时服务玩家和敌人，保证双方共用同一套通道选择、核心技合法性判断、战斗快照和日志结构。
- 状态接口先只保留通用挂点，不在这份主计划里展开详细行为。

## Shared Responsibilities

这份主计划只拥有下面这些共享内容：

- 通用装配类型和运行时字段
- 已装备 / 已解锁装配在角色状态中的存储方式
- `equip-weapon:*` 与 `equip-spell:*` 两类即时动作
- 战斗开始和每回合结算时，如何从已装备装配读取数据
- `weapon / spell` 两个通道的统一选择逻辑
- 核心技固定耗灵的合法性判断与实际扣除
- 敌方模板如何挂接到同一套装配底座
- 战斗日志和状态视图里如何展示“本回合用了哪条通道、哪套装配”

下面这些内容不再在主计划里继续展开：

- 法术分支、法术档位、法术状态映射、75 套法术包装
- 武器家族、武器类型、武器档位、100 套武器包装
- 任何具体的状态效果数值
- 任何具体武器或法术的名字表

## Implementation Changes

### 1. Shared loadout typing

- 保留 `WeaponLoadoutId`、`SpellLoadoutId`、`AttackChannel` 这些通用运行时 ID。
- 保留 `WeaponLoadoutDefinition` 与 `SpellLoadoutDefinition` 两种装配定义。
- 两种定义都至少要包含：
  - `id`
  - `name`
  - `attackPowerBonus`
  - `coreSkillCategory`
  - `coreSkillSpiritCost`
  - `basicAttackStatusHookIds`
  - `coreSkillStatusHookIds`
- 武器侧和法术侧各自的专属字段，放到各自补充计划里继续扩展。

### 2. Character state and migration

- `Cultivator` 需要持有：
  - `equippedWeaponLoadoutId`
  - `equippedSpellLoadoutId`
  - `unlockedWeaponLoadoutIds`
  - `unlockedSpellLoadoutIds`
- `CultivatorStateView.combatProfile` 需要能展示：
  - 当前已装备武器装配
  - 当前已装备法术装配
  - 已解锁武器装配列表
  - 已解锁法术装配列表
- 旧存档 hydrate 时，要能补齐缺失字段，保证老角色也能进入 V2 战斗流程。

### 3. Equip actions

- 新增两类即时动作：
  - `equip-weapon:${weaponLoadoutId}`
  - `equip-spell:${spellLoadoutId}`
- 只允许切换到自己已经解锁的装配。
- 已经装备中的装配不应重复生成切换动作。
- 切换动作不应直接改战斗公式，只改“当前装备的是哪一套装配”。

### 4. Combat snapshot and per-action channel selection

- 战斗快照不再只保存一个扁平的 `attack` 或 `coreSkillSpiritCost`。
- 快照需要显式持有武器通道与法术通道各自的战斗数据来源。
- 对于 `basic_attack` 与 `core_skill`：
  - 每个伤害动作都重新比较当前合法通道
  - 读取当前已装备装配
  - 选择本动作要走的 `weapon` 或 `spell`
- `escape` 不参与通道选择。

### 5. Fixed spirit cost for core skills

- 核心技是否合法，不再看 `maxSpirit * percentage`。
- 改为读取当前动作所选装配上的 `coreSkillSpiritCost`。
- 只有 `currentSpirit >= coreSkillSpiritCost` 时，该通道的 `core_skill` 才合法。
- 扣灵时机保持和当前引擎一致：动作真正执行时才扣，若出手前已死则不扣。

### 6. Unified enemy integration

- 敌方模板也必须显式挂接武器装配和法术装配。
- 敌方不要求有完整的“已解锁列表体验”，但底层结构要与玩家兼容。
- 敌我双方都走同一套：
  - 动作选择
  - 通道选择
  - 核心技合法性判断
  - 日志记录结构

### 7. Logging and readability

- `CombatRoundLog` 需要记录本回合实际使用的：
  - `actionType`
  - `attackChannel`
  - `loadoutId`
- 如果是武器通道或法术通道的额外说明字段，也应通过共享结构透传出去，但具体展示细节由补充计划决定。
- 目标是让战报能回答三个问题：
  - 这回合用了普通攻击、核心技还是逃跑
  - 这回合走的是武器还是法术
  - 这回合消耗了哪套装配的固定耗灵

## Out Of Scope

这份主计划不再负责下面这些内容：

- 15 条法术分支与 5 档法术包装的详细表
- 5 个元素主状态与 15 个派生状态的详细表
- 20 种武器类型与 5 档武器包装的详细表
- 五大家族与 20 种武器类型的副属性分配表
- 任何具体武器名、法术名、状态名的最终内容表

这些内容全部转移到独立补充计划中维护，避免主计划变成一个混合大表。

## Test Plan

- 回归当前 `普通攻击 / 核心技 / 逃跑` 的既有测试。
- 验证切换装配动作只会切换到已解锁装配。
- 验证旧存档 hydrate 后能补齐已装备 / 已解锁装配字段。
- 验证 `basic_attack` 和 `core_skill` 都会按动作重新选择 `weapon / spell` 通道。
- 验证核心技固定耗灵来自当前动作使用的具体装配。
- 验证敌方模板也能走同一套装配底座，而不是绕开它。
- 验证战斗日志能正确记录本回合的动作类型、通道和装配来源。

## Assumptions

- 这份主计划只关心“共享底座是否打通”，不关心武器和法术内容是否已经填满。
- 武器和法术后续都可以继续扩表，但不能再反向把这些细节塞回主计划。
- 状态接口继续保留在装配结构上，但具体规则统一在法术补充计划里定义。
