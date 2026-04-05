# 轻量战斗状态运行时落地计划

**Goal:** 在现有 V2 战斗装配层上，单独落地一套轻量、可解释、表驱动的战斗状态运行时，让法术装配上的状态接口不再只是占位字段，而是真正能在战斗里挂上、刷新、结算、写日志。

**Relationship:**

- Shared V2 loadout base: `docs/plans/2026-04-05-combat-gameplay-v2.md`
- Spell content supplement: `docs/plans/2026-04-05-combat-lightweight-spell-status-v2.md`
- Gap-closure supplement: `docs/plans/2026-04-05-combat-gameplay-v2-gap-closure.md`
- Behavior spec for this plan: `docs/specs/combat-lightweight-spell-status-v2/spec.md`
- Spell packaging appendix: `docs/specs/combat-lightweight-spell-status-v2/spell-loadout-packaging.md`

## Summary

这份计划只负责一个问题：

> 当法术动作命中后，状态在代码里到底怎么生成、怎么保存、怎么生效、怎么消失。

它不再负责法术名字表、75 套法术包装表、5 档法术数值表本身，那些归法术补充计划。

它负责的是战斗运行时，也就是：

- 状态接口长什么样
- 状态实例存在哪里
- 普通法术和法术核心技分别触发什么
- 同名状态怎么刷新
- 回合末哪些状态会 tick
- 哪些状态是“持续一回合”，哪些状态是“下次被打中就消耗”
- 日志和状态视图里怎么把这些变化讲明白

一句话解释：

> 这份计划不是再造一个大而全的 RPG 状态框架，而是把已经定好的法术状态规格，接成一套真正能跑的战斗内小系统。

## Scope

这份计划拥有下面这些内容：

- 战斗内状态专用类型定义
- 状态定义表和状态钩子表的运行时结构
- 状态实例在战斗快照中的存储方式
- 命中后挂状态、同名刷新、回合末 tick、触发后消耗
- 状态对先手、命中、会心、防御、受伤、回血、回灵等数值的修正读取
- 状态日志与状态视图
- 配套测试与回归验证

这份计划不拥有下面这些内容：

- 15 条法术分支和 75 套法术装配的内容表
- 五大家族和 100 套武器装配的内容表
- 世界常驻 `statusEffects` 的长期系统
- 驱散、净化、场域、叠层、状态命中率、状态抗性
- PvP、组队、副本特殊规则

## Design Constraints

为了让系统保持轻量，这份运行时计划固定采用下面几条硬限制：

1. 战斗状态与世界状态分离  
   现在 `Cultivator.statusEffects` 更像世界常驻状态，它按世界 tick 走。  
   本计划新增的是**战斗内状态**，它按战斗回合走。  
   两者不要混用。

2. 同名状态不叠层，只刷新  
   同一个状态再次挂上时，不增加层数，只重置持续时间和数值。

3. 一次法术动作最多挂两条状态  
   普通法术命中只挂第一层。  
   法术核心技命中挂第一层和第二层。

4. 不做脚本化状态  
   每种状态效果必须落到固定的 `effectKind` 枚举里，不允许每个状态自带一段临时逻辑。

5. 武器状态钩子先保留为空  
   这轮运行时先把法术状态跑通，武器侧默认不发状态。

## Runtime Data Model

### 1. Add dedicated combat status IDs

- 新增 `CombatStatusId`，专门标识战斗内状态。
- 不复用当前全局 `StatusEffectId`。
- 当前第一版至少包含：
  - `armor-break`
  - `entangle`
  - `rejuvenation`
  - `burning`
  - `stone-guard`
  - `gold-mark`
  - `sharpen`
  - `spell-break`
  - `growth-blessing`
  - `rooted`
  - `spirit-breath`
  - `frostbite`
  - `illusion-blur`
  - `soften-force`
  - `melt-armor`
  - `ignite-mark`
  - `flame-seal`
  - `suppression`
  - `stabilize`
  - `earth-wall`

### 2. Add status definition shape

新增 `CombatStatusDefinition`，至少包含：

- `id`
- `name`
- `description`
- `targetSide`
- `durationRounds`
- `stacking = "refresh"`
- `effectKind`
- `tierValues`
- `expiryMode`
- `triggerWindow`

字段解释：

- `effectKind`
  - 这条状态属于哪种固定效果类别，比如“减防”或“回合末回血”
- `tierValues`
  - 1 到 5 档分别对应多大强度
- `expiryMode`
  - 是按回合自然到期，还是命中一次后消耗
- `triggerWindow`
  - 这条状态在什么时候生效，比如“常驻修正”“回合末触发”“被核心技命中时触发”

### 3. Add hook definition shape

新增 `StatusHookDefinition`，至少包含：

- `id`
- `applications`

其中 `applications` 是一个数组，每一项至少要有：

- `statusId`
- `targetSide`

它的作用是：

- 装配上仍然只挂 `basicAttackStatusHookIds` / `coreSkillStatusHookIds`
- 真正命中时，运行时通过 hook 表把这些 ID 翻译成“该给谁挂哪些状态”

### 4. Add combat status instance shape

新增 `CombatStatusInstance`，至少包含：

- `id`
- `name`
- `sourceLoadoutId`
- `sourceActionType`
- `remainingRounds`
- `magnitude`
- `effectKind`
- `expiryMode`
- `triggerWindow`
- `consumed`

这里的“实例”，你可以理解成：

> 这是战斗现场真正挂在某个人身上的那一条状态，不是配置模板。

### 5. Store combat statuses on combat snapshots

- 在 `CombatSnapshot` 上新增：
  - `combatStatuses: CombatStatusInstance[]`
- 不要把战斗状态写回 `Cultivator.statusEffects`
- 也不要让战斗状态在战斗结束后自动残留到世界层

原因很简单：

- 世界状态是长期状态
- 战斗状态是短期状态
- 两者生命周期和结算节奏不一样，混在一起后面一定难维护

## Status Categories

为了避免偷长逻辑，第一版把状态效果收口成下面几类固定行为：

### A. 常驻数值修正类

这些状态在有效期间，每次读取战斗属性时都生效：

- `defense_down`
- `initiative_down`
- `dodge_down`
- `accuracy_up`
- `accuracy_down`
- `crit_up`
- `crit_down`
- `damage_taken_down`
- `core_skill_damage_taken_up`
- `core_skill_damage_taken_down`
- `fire_damage_taken_up`
- `healing_power_up`
- `damage_dealt_down`
- `guard_heart_up`

### B. 回合末 tick 类

这些状态只在回合末触发一次：

- `heal_over_time`
- `damage_over_time`
- `spirit_regen`

### C. 一次性消费类

这些状态在命中特定事件后立刻消费：

- `next_damage_taken_down`
- `next_core_skill_damage_taken_up`
- `next_core_skill_damage_taken_down`
- `next_fire_damage_taken_up`

这类状态需要额外支持：

- 命中后消费
- 如果一整回合没触发，也能按持续时间到期

## Status Registry Plan

### 1. Add dedicated config module

新增一个专门的战斗状态配置模块，比如：

- `combat-statuses.ts`

里面至少导出：

- `COMBAT_STATUS_DEFINITIONS`
- `STATUS_HOOK_DEFINITIONS`

### 2. Freeze the 20 current status definitions

根据现有 spec，把 20 个状态全部转成运行时定义。

第一层主状态：

- 裂甲
- 缠绕
- 回春
- 焚灼
- 岩甲

第二层派生状态：

- 金锋刻印
- 锐化
- 断法
- 生长祝福
- 定根
- 生息
- 霜寒
- 幻惑
- 化劲
- 熔甲
- 激燃标记
- 烈焰印记
- 镇压
- 稳固
- 地壁

### 3. Build hook definitions from spell rules

最小落地方式如下：

- 普通法术 hook
  - 只挂该分支的 `primaryStatusId`
- 法术核心技 hook
  - 挂该分支的 `primaryStatusId`
  - 再挂该分支的 `secondaryStatusId`

可以直接做成：

- `spell:<branchId>:basic`
- `spell:<branchId>:core`

这样一来：

- 装配不直接写复杂状态逻辑
- 引擎也不用到处判断“如果是水法术就挂回春”
- 所有状态发射规则都能在 hook 表里读出来

## Engine Integration Plan

### 1. Resolve status hooks only on successful spell hits

- 只有走 `spell` 通道时，才去解析法术状态 hook
- 只有攻击结果是 `hit` 或 `crit`，才真正挂状态
- `miss` 不挂状态
- `escape` 不参与状态逻辑

### 2. Add a single status-application pipeline

新增一条固定流水线：

1. 动作命中
2. 收集当前动作的 hook IDs
3. 读取 hook 定义，展开为具体状态申请
4. 根据档位取 `tierValues`
5. 生成或刷新状态实例
6. 把本回合发生的状态变化写进 round log

### 3. Same-name refresh semantics

当目标身上已经有同名状态时：

- 不新增第二条实例
- 直接覆盖：
  - `remainingRounds`
  - `magnitude`
  - `sourceLoadoutId`
  - `sourceActionType`

这样能保证：

- 系统简单
- 日志清晰
- 不会出现一大串相同状态叠满屏

### 4. Round-end tick pipeline

每回合结束时固定执行：

1. 结算所有 `round_end` 类状态
2. 处理回血、持续伤害、回灵
3. 记录 tick 日志
4. 所有状态 `remainingRounds - 1`
5. 删掉已经到期或已经消费掉的状态

注意：

- `heal_over_time` 用当前状态 `magnitude` 回血
- `damage_over_time` 用当前状态 `magnitude` 掉血
- `spirit_regen` 回灵也必须受 `maxSpirit` 上限约束

### 5. Pre-resolution modifiers

在下面这些结算点前，要统一读取活动状态修正：

- 判先手前：读取 `initiative` 类修正
- 判命中前：读取 `accuracy` / `dodge` 类修正
- 算伤害前：读取 `defense` / `damage taken` / `damage dealt` 类修正
- 算治疗前：读取 `healing power` 类修正

不要把状态逻辑散落到很多小 if 里。  
统一做法是：

- 先把活动状态归并成一组临时修正值
- 再把这些修正值送入现有战斗公式

### 6. Consumption-based statuses

第一版里有几条状态是“下次触发就消耗”的：

- 金锋刻印
- 断法
- 化劲
- 激燃标记
- 地壁

这类状态需要补一层“消费规则”：

- 当匹配事件发生时，先应用修正
- 应用成功后把状态标记为 `consumed = true`
- 当前回合结束清理掉已消费状态

这里的“匹配事件”可以理解成：

- “下次受到核心技伤害”
- “下次受到任意伤害”
- “下次受到火系伤害”

### 7. Death and overflow rules

- 回合末持续伤害可以直接导致战斗结束
- 回合末治疗不能超过最大气血
- 回灵不能超过最大灵力
- 如果状态 tick 后一方死亡，本回合后续 tick 继续不继续，需要固定规则：
  - 建议第一版采用“按既定顺序把本回合 tick 跑完，再统一检查结算”
  - 这样日志更稳定，也更好测

## View And Logging Plan

### 1. State view exposure

在 `combatProfile` 之外，战斗态视图需要能看到：

- 当前激活状态列表
- 每条状态的：
  - 名称
  - 来源法术
  - 剩余回合
  - 当前强度
  - 目标方向

如果角色不在战斗中，可以不展示战斗状态列表。

### 2. Round-log exposure

`CombatRoundLog` 需要新增几个状态相关字段：

- `appliedStatuses`
- `refreshedStatuses`
- `consumedStatuses`
- `expiredStatuses`
- `tickEvents`

每个日志项至少要能回答：

- 这条状态是谁施加的
- 施加给了谁
- 是新挂上去还是刷新
- 强度是多少
- 是自然到期还是被消费掉

### 3. Explainability requirement

战报必须能讲清楚下面这些句子：

- “普通水法命中，给自己挂上回春”
- “水系核心技命中，给自己挂回春，并给对方挂霜寒”
- “裂甲被刷新到 2 回合”
- “焚灼在回合末造成了持续伤害”
- “化劲在下一次受伤时触发并被消耗”

如果日志做不到这几句，这套状态系统就还不够可解释。

## Migration And Compatibility

### 1. Do not break existing loadout fields

- 保留当前装配上的：
  - `basicAttackStatusHookIds`
  - `coreSkillStatusHookIds`
- 新运行时直接消费这两个字段，不重新发明第三套入口

### 2. Keep weapon hooks empty for now

- 武器装配继续允许保留这两个字段
- 但当前武器波次默认都为空数组
- 引擎必须允许“有这个接口，但现在没有武器状态”

### 3. Do not leak combat statuses into world statuses

- 战斗结束时，不把 `combatStatuses` 合并回 `Cultivator.statusEffects`
- 以后如果真的有“战斗造成长伤”这类需求，再单独做转写规则

## Test Plan

### A. Type and config completeness

- 20 个战斗状态都存在定义
- 每个状态都有：
  - `effectKind`
  - `durationRounds`
  - `tierValues`
  - `expiryMode`
  - `triggerWindow`
- 每条法术分支都能生成：
  - `basic` hook
  - `core` hook

### B. Hook-resolution tests

- 普通法术只展开第一层状态
- 核心技展开第一层 + 第二层
- 武器 hook 为空时不会误挂状态
- `miss` 时不挂状态

### C. Instance and refresh tests

- 首次命中会创建状态实例
- 再次命中同名状态只刷新，不叠层
- 刷新后来源装配和强度会更新

### D. Modifier tests

- 裂甲会降低防御
- 缠绕会降低先手和闪避
- 岩甲 / 化劲 / 地壁 会降低受伤
- 锐化会提高命中和会心
- 幻惑会降低命中和会心
- 镇压会降低伤害和先手

### E. Round-end tick tests

- 回春在回合末回血
- 焚灼在回合末掉血
- 生息在回合末回灵
- 回血和回灵不会溢出上限

### F. Consumption tests

- 金锋刻印只在下一次受到核心技伤害时生效并消费
- 断法只在下一次释放或承受核心技相关事件时消费
- 化劲在下一次受伤时生效并消费
- 激燃标记在下一次核心技命中后消费
- 地壁在下一次受伤后消费

### G. Logging tests

- round log 记录新增、刷新、tick、消费、过期
- 日志能区分“挂状态”和“状态自然生效”
- 战斗快照能保留当时的活动状态上下文

### H. Boundary tests

- 战斗状态不会写入世界常驻 `statusEffects`
- 非战斗流程不会意外读取 `combatStatuses`
- 旧 V1/V2 战斗回归测试继续通过

## Suggested Delivery Order

为了减少一次改太多的风险，建议按下面顺序落地：

1. 先补类型定义  
   把 `CombatStatusDefinition`、`StatusHookDefinition`、`CombatStatusInstance` 定下来。

2. 再补配置表  
   把 20 个状态定义和每条法术分支的 `basic/core` hook 全部写出来。

3. 再接快照存储  
   把 `combatStatuses` 放进 `CombatSnapshot`。

4. 再接命中挂状态  
   只先做“命中后挂上去 + 同名刷新”。

5. 再接状态修正读取  
   让先手、命中、伤害真正吃到状态修正。

6. 最后接回合末 tick 和消费逻辑  
   这是最复杂的一层，放在最后最稳。

7. 最后补日志和测试收口  
   确保 agent 和人都能看懂战报。

## Assumptions

- 第一版状态运行时只服务法术侧，不扩展武器状态内容。
- 第一版状态运行时是战斗内短状态，不与世界层常驻状态合并。
- 第一版仍然坚持“不叠层、无驱散、无抗性、无状态命中率”的轻量边界。
- 如果后续某个状态发现需要特殊逻辑，优先先看能不能归到现有 `effectKind`，不要立刻加新的脚本机制。
