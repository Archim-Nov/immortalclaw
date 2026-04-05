# PVP 战斗接入实施计划

**Relationship:**

- 共享战斗装配底座：`docs/plans/2026-04-05-combat-gameplay-v2.md`
- PVE 事件遭遇整合基线：`docs/plans/2026-04-05-combat-encounter-event-integration-v2.md`
- 敌人配置 & 遭遇构筑注册表：`packages/domain/src/encounters/`
- 荒原事件池：`packages/domain/src/wilderness-events.ts`
- 动作派发入口：`packages/domain/src/engine.ts` → `performAction`

## Summary

这份计划负责把 **PVP 战斗**接入现有的战斗引擎，复用已有的 `CombatJobState`、`resolveOneRound`、`CombatLogEntry` 等完整回合制战斗底层。

PVP 不需要新造一套战斗系统，只需要：

1. 把"对手快照"从 `EnemyConfigDefinition` 换成另一个真实修士的属性
2. 新增两个触发入口（主城动作 + 荒野事件）
3. 定义修士对修士的规则差异（逃跑、奖惩、匹配）

## 核心设计原则

- **复用战斗底层**：PVP 战斗走 `initializeCombatJobState` → `resolveOneRound` → `finalizeCombat` 同一条路径，不做平行系统
- **敌方快照来自真实修士**：把对手修士的当前属性、装备、境界生成一份 `CombatSnapshot`，填入 `enemySnapshot`
- **异步对局**：修仙世界是自动推演的，不存在"等对方操作"的实时对战；PVP 对局在同一个 tick 内完整解算
- **结果对称**：双方都收到战斗日志，但奖惩可以不对称（挑战者承担更大风险）

## 入口 1：主城切磋挑战（Timed Action）

### 动作定义

```
TimedActionId: `challenge-cultivator:${targetCultivatorId}`
```

### 前置条件

| 条件 | 说明 |
|------|------|
| 发起者在主城 (`kind === "safe"`) | 切磋是安全区域内的正式挑战 |
| 目标修士在**同一地点** | `cultivator.locationId === target.locationId` |
| 目标修士**未在战斗中** | `target.activeJobId` 为空或所属 job 不是战斗类型 |
| 发起者**未在战斗中** | 同上 |
| 发起者 HP/气血不低于 50% | 防止拿残血白送 |
| 发起者与目标**不在同一宗门** | 同门不能在主城互打（后续可开放宗门演武场） |
| 境界差距 ≤ 2 阶 | 防止高阶碾压无意义对局 |

### 战斗参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `maxRounds` | 7 | 切磋不是死战 |
| `escapeAllowed` | `true`（双方都可） | 切磋允许认输退出 |
| `encounterBuildId` | `"pvp-city-duel"` | 新增 encounter build |
| `battleSourceKind` | `"pvp-duel"` | 使用已预留的类型 |
| `combatMode` | `"full"` | 走完整回合制 |
| `enemyScale` | `1` | 不做属性膨胀，真实对打 |

### 对手快照生成

不走 `EnemyConfigDefinition`，新增 `buildCultivatorCombatSnapshot(cultivator)` 函数：

```
function buildCultivatorCombatSnapshot(
  target: Cultivator,
): CombatSnapshot
```

逻辑与 `initializeCombatJobState` 中生成 `playerSnapshot` 的逻辑**完全一致**：

1. `deriveMainAttributes(target.registrationRecord)` 算主属性
2. `deriveDetailedAttributes(mainAttrs)` 算详细属性
3. 读取 `target.equippedWeaponLoadoutId` / `target.equippedSpellLoadoutId` 计算武器/法术攻击力
4. 应用武器家族加成、武器类型加成
5. 生成完整 `CombatSnapshot`

也就是说，`playerSnapshot` 和 `enemySnapshot` 用一样的代码路径，只是输入修士不同。

### CombatJobState 扩展

```typescript
export interface CombatJobState {
  // ...existing fields...
  pvpTargetCultivatorId?: string;  // PVP 对局的目标修士 ID
}
```

### 战斗流程

```
performAction(world, challengerId, `challenge-cultivator:${targetId}`)
  → 前置条件检查
  → buildCultivatorCombatSnapshot(target) 生成对手快照
  → 构造 EncounterTemplate（使用对手名称和快照属性）
  → initializeCombatJobState(world, challenger, template, 1, "pvp-city-duel")
  → 覆写 enemySnapshot（用真实对手快照替换 template 生成的）
  → state.pvpTargetCultivatorId = targetId
  → startJob + setCombatJobState
  → advanceWorld tick 推演 → resolveOneRound × N
  → finalizeCombat
  → 双方各自收到 CombatLogEntry
```

### 输赢结算

| 结果 | 发起者（挑战者） | 目标（被挑战者） |
|------|-----------------|-----------------|
| 挑战者胜 | +15 灵石, +2 州声望, 战斗日志 | -5 灵石, 战斗日志 |
| 目标胜 | -10 灵石, 战斗日志 | +10 灵石, +1 州声望, 战斗日志 |
| 挑战者逃跑 | -8 灵石, -1 州声望, 战斗日志(retreated) | +5 灵石, 战斗日志 |
| 目标逃跑 | +8 灵石, 战斗日志 | -3 灵石, 战斗日志(retreated) |
| 回合耗尽(平局) | 战斗日志(平局) | 战斗日志(平局) |

**关键设计**：主城切磋不造成 `injuryTicks`（不真正受伤），但战斗日志里的 `damageTaken` 照实记录。切磋是名次和声望的较量，不是生死搏杀。

## 入口 2：荒野修士遭遇（Wilderness Event）

### 事件定义

新增 `WildernessEventDefinition` 条目，挂载 `combatMode: "full"` 和 PVP encounter build：

```typescript
"wilderness-cultivator-clash": {
  eventId: "wilderness-cultivator-clash",
  title: "Cultivator Clash",
  content: "Another cultivator blocks the path ahead and shows no intention of yielding. "
           + "Their spiritual pressure is unmistakable — this will end in a fight.",
  summary: "fought a rival cultivator in the wilderness",
  severity: "high",
  tags: ["wilderness", "pvp", "cultivator"],
  qiDamage: 0,      // 战斗系统内结算
  spiritualDamage: 0,
  injuryTicks: 2,    // 荒野 PVP 会受伤
  encounterBuildId: "pvp-wilderness-clash" as EncounterBuildId,
  combatMode: "full",
}

"wilderness-cultivator-ambush": {
  eventId: "wilderness-cultivator-ambush",
  title: "Cultivator Ambush",
  content: "A figure drops from the ridge line without warning. "
           + "By the time you register the threat, their first strike is already in motion.",
  summary: "was ambushed by a hostile cultivator",
  severity: "high",
  tags: ["wilderness", "pvp", "cultivator", "ambush"],
  qiDamage: 0,
  spiritualDamage: 0,
  injuryTicks: 3,
  encounterBuildId: "pvp-wilderness-ambush" as EncounterBuildId,
  combatMode: "full",
}
```

### 对手匹配逻辑

当事件抽到 `pvp` 标签事件时，需要从世界状态中匹配一个真实修士作为对手：

```
function matchWildernessOpponent(
  world: WorldState,
  cultivator: Cultivator,
  seed: number,
): Cultivator | null
```

匹配规则：

| 优先级 | 条件 | 说明 |
|--------|------|------|
| 1 | 在同一 `stateId`（同一州域） | 不能跨州遭遇 |
| 2 | 当前位于荒野节点或正在旅行 | 只有在外面的人才可能被遇到 |
| 3 | 境界差距 ≤ 1 阶 | 荒野遭遇比主城切磋更严格 |
| 4 | **不在同一宗门** | 同门不对打 |
| 5 | **不在战斗中** | activeJobId 不是战斗 job |

如果没有匹配到真实修士 → **降级为 PVE**：使用一个新的"散修"敌人配置（`wilderness-rogue-cultivator`），属性根据当前修士境界动态缩放，保持叙事一致性（"一个不知名的散修挡了你的路"）。

### 散修降级配置

新增 `EnemyConfigDefinition`：

```
"wilderness-rogue-cultivator": {
  id: "wilderness-rogue-cultivator",
  name: "Rogue Cultivator",
  nameCn: "散修",
  // 基础属性设为中等，实际使用时乘以境界系数
  contextTags: ["wilderness", "cultivator"],
  rewardBias: ["salvage", "cultivation-aid"],
}
```

缩放函数：

```
function scaleRogueCultivator(
  config: EnemyConfigDefinition,
  opponentRealm: RealmStage,
): EncounterTemplate
```

按对手所在境界阶段乘以固定系数（练气 ×0.7、筑基 ×1.0、金丹 ×1.3、元婴 ×1.6），保证散修降级仍然能给出合理压力。

### 荒野 PVP 输赢结算

荒野对打和主城切磋**不同**，这里是有代价的：

| 结果 | 胜者 | 败者 |
|------|------|------|
| 一方胜 | +20 灵石, `beast-core` ×1, 战斗日志 | 强制撤退, 2 tick 受伤, -15 灵石, 战斗日志 |
| 一方逃跑 | +10 灵石, 战斗日志 | 强制撤退, 1 tick 受伤, -5 灵石, 战斗日志 |
| 回合耗尽 | 双方各 1 tick 受伤, 战斗日志 | 同左 |

## PVP 战斗规则差异（相对 PVE）

| 规则维度 | PVE | PVP |
|----------|-----|-----|
| `enemySnapshot` 来源 | `EnemyConfigDefinition` → `enemyConfigToEncounterTemplate` | 真实修士 → `buildCultivatorCombatSnapshot` |
| `escapeAllowed` | PVE 敌人不可逃，玩家视情况 | **双方都可以逃** |
| 逃跑判定 | 速度差 + `retreatChance` | 速度差 + `retreatChance`（完全复用） |
| `maxRounds` | 5-8（按敌人配置） | 主城 7, 荒野 7 |
| 状态效果 | 完全生效 | 完全生效（PVP 法术/武器同样触发 status） |
| 战斗结束后受伤 | 按 `injuryTicks` | 主城 0, 荒野 2-3 |
| `battleSourceKind` | `"pve-direct"` / `"pve-event"` | `"pvp-duel"` / `"pvp-arena"`（荒野用 duel） |
| `combatMode` | 事件内容决定 | 固定 `"full"` |
| 行动选择 | `selectCombatAction` 自动 | 同，完全反映修士 loadout 和属性 |
| 攻击通道 | `resolveAttackChannel` 自动 | 同，完全复用 |

### 先手判定

PVP 先手判定和 PVE 完全一致（`resolveInitiative`），基于双方 `speed` + 随机扰动。

荒野伏击事件（`wilderness-cultivator-ambush`）给予**伏击方第一回合 +20 先手加成**，通过 `CombatJobState` 添加：

```typescript
ambushBonus?: { side: "player" | "enemy"; initiativeBonus: number; rounds: number };
```

第一回合由 `resolveOneRound` 消费后清除。

### 对局日志

PVP 对局的 `CombatLogEntry` 额外字段：

```typescript
export interface CombatLogEntry {
  // ...existing fields...
  pvpOpponentCultivatorId?: string;  // PVP 对手真实 ID
  pvpOpponentName?: string;          // PVP 对手名称
  pvpBattleKind?: "city-duel" | "wilderness-clash" | "wilderness-ambush";
}
```

双方各自生成一条 `CombatLogEntry`，`cultivatorId` 是自己，`pvpOpponentCultivatorId` 是对方。

## 新增 Encounter Build

```typescript
// catalog.ts 新增
"pvp-city-duel": {
  id: "pvp-city-duel",
  name: "City Duel",
  nameCn: "主城切磋",
  battleSourceKind: "pvp-duel",
  enemyConfigIds: [],  // PVP 不引用固定敌人配置
  encounterFamily: "event-encounter",
  contextTags: ["cultivator"],
  rewardBias: ["cultivation-aid"],
},
"pvp-wilderness-clash": {
  id: "pvp-wilderness-clash",
  name: "Wilderness Cultivator Clash",
  nameCn: "荒野修士冲突",
  battleSourceKind: "pvp-duel",
  enemyConfigIds: [],
  encounterFamily: "event-encounter",
  contextTags: ["wilderness", "cultivator"],
  rewardBias: ["salvage", "cultivation-aid"],
},
"pvp-wilderness-ambush": {
  id: "pvp-wilderness-ambush",
  name: "Wilderness Cultivator Ambush",
  nameCn: "荒野修士伏击",
  battleSourceKind: "pvp-duel",
  enemyConfigIds: [],
  encounterFamily: "event-encounter",
  contextTags: ["wilderness", "cultivator", "ambush"],
  rewardBias: ["salvage", "weapon-material"],
},
```

## 实施步骤

### Phase 1：基础设施

1. 新增 `buildCultivatorCombatSnapshot(cultivator)` 函数（从 `initializeCombatJobState` 中提取玩家快照生成逻辑）
2. `CombatJobState` 添加 `pvpTargetCultivatorId?: string`
3. `CombatLogEntry` 添加 `pvpOpponentCultivatorId?`, `pvpOpponentName?`, `pvpBattleKind?`
4. 添加 PVP encounter builds 到 catalog
5. 添加 `wilderness-rogue-cultivator` 敌人配置到 enemy-configs
6. 添加 `ambushBonus` 字段到 `CombatJobState`，`resolveOneRound` 消费逻辑

### Phase 2：主城切磋入口

1. `TimedActionId` 添加 `challenge-cultivator:${string}`
2. `performAction` 添加 `challenge-cultivator` 分支
3. 前置条件校验（同城、非战斗、境界差、宗门）
4. 使用 `buildCultivatorCombatSnapshot` 生成对手快照
5. 走 `initializeCombatJobState` → `setCombatJobState`
6. `resolveEnhancedJob` 中区分 PVP 结算（双方日志 + 灵石 + 声望）

### Phase 3：荒野遭遇入口

1. 新增 `matchWildernessOpponent` 匹配函数
2. 新增 `scaleRogueCultivator` 降级缩放函数
3. 添加 2 个荒野 PVP 事件到 `WILDERNESS_EVENT_POOL`
4. 在 `wilderness-service.ts` 事件结算中检测 PVP 事件 → 走 PVP 战斗路径
5. 伏击事件接入 `ambushBonus` 机制

### Phase 4：日志和可观测性

1. PVP 战斗日志双向生成
2. `addWorldEvent` 生成世界事件广播（"某某在某地击败了某某"）
3. 确保 agent 可读性（战斗日志 summary 包含双方名字和入口类型）

### Phase 5：测试

1. 主城切磋动作：正常对打、境界差被拒、同门被拒、残血被拒
2. 荒野遭遇事件：匹配到真实修士、降级为散修、伏击先手加成
3. 战斗规则：双方逃跑、回合耗尽、灵石结算、受伤结算
4. 对局日志：双方各自生成、字段完整性
5. 回归：现有 PVE 战斗不受影响

## 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 异步对局 vs 实时 | 异步（同 tick 内解算） | 世界是自动推演的，不存在等对方操作的场景 |
| 主城切磋不受伤 | 是 | 主城是安全区，切磋是名次较量 |
| 荒野 PVP 受伤 | 是 | 荒野是危险区域，遇到就是真打 |
| 匹配不到时降级 PVE | 是 | 保持叙事一致性，不会因为没人配就什么都不发生 |
| 境界限制 | 主城 ≤ 2 阶，荒野 ≤ 1 阶 | 防止无意义碾压，荒野更严格因为有实际伤害 |
| 伏击先手加成 | +20 initiative bonus 第一回合 | 伏击在叙事上应该有优势，但不至于无解 |
| PVP 复用 resolveOneRound | 完全复用 | 不做平行战斗系统，保证一致性 |
