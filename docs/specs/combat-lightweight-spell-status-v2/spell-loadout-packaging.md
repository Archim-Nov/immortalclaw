# 75 套法术装配包装表

## 这份文档是干什么的

这份文档是 `docs/specs/combat-lightweight-spell-status-v2/spec.md` 的配套附录。

主 spec 负责回答“规则是什么”，这份附录负责回答“75 套具体法术装配长什么样”。

你可以把这里的每一条都理解成一张将来会落进配置表的卡片。

一张卡片至少回答 8 个问题：

- 它属于哪个灵根
- 它属于哪条法术分支
- 它的攻击类型是什么
- 它是第几档
- 它的攻击加成是多少
- 它的核心技耗灵是多少
- 它的主状态是什么
- 它的派生状态是什么

## 字段解释

### 1. 灵根

这里的“灵根”，就是这套法术的五行归属：

- 金
- 木
- 水
- 火
- 土

### 2. 攻击类型

这里的“攻击类型”，不是“物理/法术伤害类型”，而是**这套法术的核心技更偏哪种战斗风格**。

当前固定为 3 种：

- `蛮力（爆发型）`
- `巧劲（机动型）`
- `战术（布局型）`

通俗理解：

- `蛮力`：更像正面重打
- `巧劲`：更像抢节奏、卡身位
- `战术`：更像布局、反制、换收益

### 3. 等级强度

这里的“等级强度”，就是之前冻结的 `5` 档：

- `1档 = 入门篇`
- `2档 = 熟练篇`
- `3档 = 精修篇`
- `4档 = 真诀篇`
- `5档 = 秘传篇`

### 4. ID 规则

- `1档` 保留当前运行时已有的 `starter-*` ID
- `2-5档` 统一使用 `branch-tier-N` 的格式

例子：

- `starter-metal-edge`
- `metal-edge-tier-2`
- `metal-edge-tier-3`

### 5. 状态钩子固定规则

为了避免把配置表写乱，这里统一冻结：

- `basicAttackStatusHookIds = [primaryStatusId]`
- `coreSkillStatusHookIds = [primaryStatusId, secondaryStatusId]`

也就是说：

- 普通法术只挂主状态
- 法术核心技挂主状态 + 派生状态

## 包装总则

- 同一分支的 5 档只改数值，不改玩法规则。
- 同一分支的 5 档都沿用同一组：
  - `spellBranchId`
  - `灵根`
  - `攻击类型`
  - `primaryStatusId`
  - `secondaryStatusId`
- 这一版的包装表是**目标配置**。
- 如果当前运行时代码里的 starter 占位值和这里不同，以这份文档为下一轮实现目标。

## 金灵根法术包装

### 金·锋刃

- 灵根：金
- 攻击类型：蛮力（爆发型）
- 主状态：裂甲
- 派生状态：金锋刻印

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-metal-edge` | 金·锋刃·入门篇 | 1档 | `2` | `20` |
| `metal-edge-tier-2` | 金·锋刃·熟练篇 | 2档 | `5` | `28` |
| `metal-edge-tier-3` | 金·锋刃·精修篇 | 3档 | `9` | `38` |
| `metal-edge-tier-4` | 金·锋刃·真诀篇 | 4档 | `13` | `49` |
| `metal-edge-tier-5` | 金·锋刃·秘传篇 | 5档 | `18` | `62` |

### 金·罡御

- 灵根：金
- 攻击类型：巧劲（机动型）
- 主状态：裂甲
- 派生状态：锐化

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-metal-guard` | 金·罡御·入门篇 | 1档 | `1` | `18` |
| `metal-guard-tier-2` | 金·罡御·熟练篇 | 2档 | `4` | `25` |
| `metal-guard-tier-3` | 金·罡御·精修篇 | 3档 | `7` | `34` |
| `metal-guard-tier-4` | 金·罡御·真诀篇 | 4档 | `11` | `45` |
| `metal-guard-tier-5` | 金·罡御·秘传篇 | 5档 | `16` | `58` |

### 金·破禁

- 灵根：金
- 攻击类型：战术（布局型）
- 主状态：裂甲
- 派生状态：断法

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-metal-break` | 金·破禁·入门篇 | 1档 | `1` | `19` |
| `metal-break-tier-2` | 金·破禁·熟练篇 | 2档 | `3` | `27` |
| `metal-break-tier-3` | 金·破禁·精修篇 | 3档 | `6` | `36` |
| `metal-break-tier-4` | 金·破禁·真诀篇 | 4档 | `10` | `47` |
| `metal-break-tier-5` | 金·破禁·秘传篇 | 5档 | `15` | `60` |

## 木灵根法术包装

### 木·生息

- 灵根：木
- 攻击类型：蛮力（爆发型）
- 主状态：缠绕
- 派生状态：生长祝福

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-wood-growth` | 木·生息·入门篇 | 1档 | `1` | `18` |
| `wood-growth-tier-2` | 木·生息·熟练篇 | 2档 | `4` | `25` |
| `wood-growth-tier-3` | 木·生息·精修篇 | 3档 | `7` | `34` |
| `wood-growth-tier-4` | 木·生息·真诀篇 | 4档 | `11` | `45` |
| `wood-growth-tier-5` | 木·生息·秘传篇 | 5档 | `16` | `58` |

### 木·缠束

- 灵根：木
- 攻击类型：巧劲（机动型）
- 主状态：缠绕
- 派生状态：定根

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-wood-bind` | 木·缠束·入门篇 | 1档 | `1` | `18` |
| `wood-bind-tier-2` | 木·缠束·熟练篇 | 2档 | `3` | `24` |
| `wood-bind-tier-3` | 木·缠束·精修篇 | 3档 | `6` | `33` |
| `wood-bind-tier-4` | 木·缠束·真诀篇 | 4档 | `10` | `44` |
| `wood-bind-tier-5` | 木·缠束·秘传篇 | 5档 | `15` | `56` |

### 木·丰茂

- 灵根：木
- 攻击类型：战术（布局型）
- 主状态：缠绕
- 派生状态：生息

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-wood-bloom` | 木·丰茂·入门篇 | 1档 | `0` | `16` |
| `wood-bloom-tier-2` | 木·丰茂·熟练篇 | 2档 | `3` | `23` |
| `wood-bloom-tier-3` | 木·丰茂·精修篇 | 3档 | `6` | `31` |
| `wood-bloom-tier-4` | 木·丰茂·真诀篇 | 4档 | `10` | `42` |
| `wood-bloom-tier-5` | 木·丰茂·秘传篇 | 5档 | `15` | `54` |

## 水灵根法术包装

### 水·寒流

- 灵根：水
- 攻击类型：蛮力（爆发型）
- 主状态：回春
- 派生状态：霜寒

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-water-frost` | 水·寒流·入门篇 | 1档 | `2` | `19` |
| `water-frost-tier-2` | 水·寒流·熟练篇 | 2档 | `5` | `27` |
| `water-frost-tier-3` | 水·寒流·精修篇 | 3档 | `8` | `36` |
| `water-frost-tier-4` | 水·寒流·真诀篇 | 4档 | `12` | `48` |
| `water-frost-tier-5` | 水·寒流·秘传篇 | 5档 | `17` | `61` |

### 水·幻流

- 灵根：水
- 攻击类型：巧劲（机动型）
- 主状态：回春
- 派生状态：幻惑

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-water-illusion` | 水·幻流·入门篇 | 1档 | `0` | `17` |
| `water-illusion-tier-2` | 水·幻流·熟练篇 | 2档 | `3` | `24` |
| `water-illusion-tier-3` | 水·幻流·精修篇 | 3档 | `6` | `32` |
| `water-illusion-tier-4` | 水·幻流·真诀篇 | 4档 | `10` | `43` |
| `water-illusion-tier-5` | 水·幻流·秘传篇 | 5档 | `15` | `55` |

### 水·润泽

- 灵根：水
- 攻击类型：战术（布局型）
- 主状态：回春
- 派生状态：化劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-water-flow` | 水·润泽·入门篇 | 1档 | `-1` | `16` |
| `water-flow-tier-2` | 水·润泽·熟练篇 | 2档 | `3` | `23` |
| `water-flow-tier-3` | 水·润泽·精修篇 | 3档 | `6` | `31` |
| `water-flow-tier-4` | 水·润泽·真诀篇 | 4档 | `10` | `42` |
| `water-flow-tier-5` | 水·润泽·秘传篇 | 5档 | `15` | `54` |

## 火灵根法术包装

### 火·炽焰

- 灵根：火
- 攻击类型：蛮力（爆发型）
- 主状态：焚灼
- 派生状态：熔甲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-fire-blaze` | 火·炽焰·入门篇 | 1档 | `3` | `22` |
| `fire-blaze-tier-2` | 火·炽焰·熟练篇 | 2档 | `6` | `30` |
| `fire-blaze-tier-3` | 火·炽焰·精修篇 | 3档 | `10` | `40` |
| `fire-blaze-tier-4` | 火·炽焰·真诀篇 | 4档 | `15` | `52` |
| `fire-blaze-tier-5` | 火·炽焰·秘传篇 | 5档 | `21` | `66` |

### 火·激燃

- 灵根：火
- 攻击类型：巧劲（机动型）
- 主状态：焚灼
- 派生状态：激燃标记

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-fire-burst` | 火·激燃·入门篇 | 1档 | `2` | `20` |
| `fire-burst-tier-2` | 火·激燃·熟练篇 | 2档 | `5` | `28` |
| `fire-burst-tier-3` | 火·激燃·精修篇 | 3档 | `8` | `37` |
| `fire-burst-tier-4` | 火·激燃·真诀篇 | 4档 | `12` | `49` |
| `fire-burst-tier-5` | 火·激燃·秘传篇 | 5档 | `18` | `63` |

### 火·炼化

- 灵根：火
- 攻击类型：战术（布局型）
- 主状态：焚灼
- 派生状态：烈焰印记

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-fire-smelt` | 火·炼化·入门篇 | 1档 | `1` | `19` |
| `fire-smelt-tier-2` | 火·炼化·熟练篇 | 2档 | `4` | `27` |
| `fire-smelt-tier-3` | 火·炼化·精修篇 | 3档 | `7` | `36` |
| `fire-smelt-tier-4` | 火·炼化·真诀篇 | 4档 | `11` | `48` |
| `fire-smelt-tier-5` | 火·炼化·秘传篇 | 5档 | `16` | `60` |

## 土灵根法术包装

### 土·岩壁

- 灵根：土
- 攻击类型：巧劲（机动型）
- 主状态：岩甲
- 派生状态：稳固

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-earth-wall` | 土·岩壁·入门篇 | 1档 | `-1` | `18` |
| `earth-wall-tier-2` | 土·岩壁·熟练篇 | 2档 | `3` | `24` |
| `earth-wall-tier-3` | 土·岩壁·精修篇 | 3档 | `6` | `33` |
| `earth-wall-tier-4` | 土·岩壁·真诀篇 | 4档 | `10` | `44` |
| `earth-wall-tier-5` | 土·岩壁·秘传篇 | 5档 | `15` | `56` |

### 土·镇岳

- 灵根：土
- 攻击类型：蛮力（爆发型）
- 主状态：岩甲
- 派生状态：镇压

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-earth-suppress` | 土·镇岳·入门篇 | 1档 | `2` | `20` |
| `earth-suppress-tier-2` | 土·镇岳·熟练篇 | 2档 | `5` | `28` |
| `earth-suppress-tier-3` | 土·镇岳·精修篇 | 3档 | `8` | `37` |
| `earth-suppress-tier-4` | 土·镇岳·真诀篇 | 4档 | `12` | `49` |
| `earth-suppress-tier-5` | 土·镇岳·秘传篇 | 5档 | `18` | `63` |

### 土·地脉

- 灵根：土
- 攻击类型：战术（布局型）
- 主状态：岩甲
- 派生状态：地壁

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-earth-vein` | 土·地脉·入门篇 | 1档 | `0` | `18` |
| `earth-vein-tier-2` | 土·地脉·熟练篇 | 2档 | `3` | `25` |
| `earth-vein-tier-3` | 土·地脉·精修篇 | 3档 | `6` | `34` |
| `earth-vein-tier-4` | 土·地脉·真诀篇 | 4档 | `10` | `45` |
| `earth-vein-tier-5` | 土·地脉·秘传篇 | 5档 | `15` | `58` |

## 给后续实现的直接提示

如果下一步要落代码，这份包装表可以直接拆成三层：

1. `branch 元数据表`
   - 决定灵根、攻击类型、主状态、派生状态

2. `tier 数值表`
   - 决定每档的 `attackPowerBonus`、`coreSkillSpiritCost`

3. `75 套具体 loadout 表`
   - 决定最终的 `id` 和展示名

这样写代码会比把 75 条全硬编码进一个超长对象里更稳，也更方便你后面自己改数值。
