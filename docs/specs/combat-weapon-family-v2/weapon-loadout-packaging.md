# 100 条武器装配包装表

## 这份文档是干什么的

这份文档是 `docs/specs/combat-weapon-family-v2/spec.md` 的配套附录。

主 spec 负责回答“武器系统规则是什么”，这份附录负责回答“100 条具体武器装配长什么样”。

你可以把它理解成：把 20 种武器类型，全部展开成 5 档后的完整配置草表。

## 固定字段解释

每一条武器装配，至少回答这些问题：

- 它属于哪个家族
- 它属于哪个武器类型
- 它是第几档
- 它的展示名是什么
- 它的 `attackPowerBonus` 是多少
- 它的 `coreSkillSpiritCost` 是多少
- 它继承哪个家族加成
- 它继承哪个类型加成

## 命名总规则

### 档位名

| 档位 | 档位名 |
| --- | --- |
| 1 | 初铸 |
| 2 | 精锻 |
| 3 | 名器 |
| 4 | 灵兵 |
| 5 | 真传 |

### ID 规则

- 1档保留 starter ID
- 2-5档统一使用 `weaponType-tier-N`

### 数值总原则

- 武器的增长要比法术更克制。
- 因为武器本身还有家族副属性和类型副属性。
- 所以武器五档的提升，强调“稳定变强”，不追求“后期爆炸翻倍”。

## 家族加成继承表

| 家族 | 继承加成 |
| --- | --- |
| 轻快家族 | 速度 `4/5/6/7/8`，闪避 `3/4/5/6/7` |
| 沉重家族 | 韧性 `5/7/9/11/13`，暴伤 `5/7/9/11/13%` |
| 长兵家族 | 命中 `4/5/6/7/8`，速度 `1/2/3/4/5` |
| 柔变家族 | 闪避 `3/4/5/6/7`，会心 `1/2/3/4/5%` |
| 远术家族 | 命中 `3/4/5/6/7`，护心 `3/4/5/6/7` |

## 类型加成继承表

| 武器类型 | 继承加成 |
| --- | --- |
| 剑 | 命中 `2/3/4/5/6` |
| 双剑 | 会心 `1/2/3/4/5%` |
| 匕首 | 暴伤 `6/8/10/12/14%` |
| 拳套 | 韧性 `3/4/5/6/7` |
| 刀 | 会心 `1/2/3/4/5%` |
| 巨刀 | 暴伤 `8/10/12/14/16%` |
| 斧 | 命中 `2/3/4/5/6` |
| 锤 | 护心 `4/5/6/7/8` |
| 枪 | 速度 `2/3/4/5/6` |
| 戟 | 暴伤 `5/7/9/11/13%` |
| 棍 | 闪避 `2/3/4/5/6` |
| 钩镰 | 会心 `1/2/3/4/5%` |
| 鞭 | 速度 `2/3/4/5/6` |
| 链刃 | 命中 `2/3/4/5/6` |
| 流星锤 | 暴伤 `6/8/10/12/14%` |
| 绫 | 护心 `3/4/5/6/7` |
| 弓 | 会心 `1/2/3/4/5%` |
| 弩 | 暴伤 `5/7/9/11/13%` |
| 扇 | 速度 `1/2/3/4/5` |
| 伞 | 护心 `4/5/6/7/8` |

## 轻快家族 `quick`

### 剑

- 家族：轻快家族
- 类型加成：命中
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-sword` | 木锋剑 | 1档 | `0` | `15` |
| `sword-tier-2` | 青钢剑 | 2档 | `2` | `20` |
| `sword-tier-3` | 寒星剑 | 3档 | `4` | `26` |
| `sword-tier-4` | 游龙剑 | 4档 | `6` | `33` |
| `sword-tier-5` | 天游剑 | 5档 | `8` | `41` |

### 双剑

- 家族：轻快家族
- 类型加成：会心
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-dual-swords` | 归燕双剑 | 1档 | `1` | `16` |
| `dual-swords-tier-2` | 流光双剑 | 2档 | `3` | `22` |
| `dual-swords-tier-3` | 逐月双剑 | 3档 | `5` | `28` |
| `dual-swords-tier-4` | 断水双剑 | 4档 | `7` | `36` |
| `dual-swords-tier-5` | 天衡双剑 | 5档 | `9` | `44` |

### 匕首

- 家族：轻快家族
- 类型加成：暴伤
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-dagger` | 藏锋匕 | 1档 | `-1` | `12` |
| `dagger-tier-2` | 破影匕 | 2档 | `1` | `17` |
| `dagger-tier-3` | 夜行匕 | 3档 | `3` | `23` |
| `dagger-tier-4` | 追魂匕 | 4档 | `5` | `29` |
| `dagger-tier-5` | 星陨匕 | 5档 | `7` | `37` |

### 拳套

- 家族：轻快家族
- 类型加成：韧性
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-gauntlets` | 练骨拳套 | 1档 | `0` | `14` |
| `gauntlets-tier-2` | 震脉拳套 | 2档 | `2` | `19` |
| `gauntlets-tier-3` | 裂石拳套 | 3档 | `4` | `25` |
| `gauntlets-tier-4` | 伏龙拳套 | 4档 | `6` | `32` |
| `gauntlets-tier-5` | 镇岳拳套 | 5档 | `8` | `40` |

## 沉重家族 `heavy`

### 刀

- 家族：沉重家族
- 类型加成：会心
- 核心技倾向：蛮力

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-saber` | 雁翎刀 | 1档 | `2` | `20` |
| `saber-tier-2` | 玄铁刀 | 2档 | `4` | `26` |
| `saber-tier-3` | 赤纹刀 | 3档 | `6` | `33` |
| `saber-tier-4` | 断岳刀 | 4档 | `8` | `41` |
| `saber-tier-5` | 天问刀 | 5档 | `11` | `50` |

### 巨刀

- 家族：沉重家族
- 类型加成：暴伤
- 核心技倾向：蛮力

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-greatsaber` | 开山巨刀 | 1档 | `3` | `22` |
| `greatsaber-tier-2` | 断岭巨刀 | 2档 | `5` | `29` |
| `greatsaber-tier-3` | 镇关巨刀 | 3档 | `7` | `37` |
| `greatsaber-tier-4` | 裂岳巨刀 | 4档 | `10` | `46` |
| `greatsaber-tier-5` | 霸川巨刀 | 5档 | `13` | `56` |

### 斧

- 家族：沉重家族
- 类型加成：命中
- 核心技倾向：蛮力

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-axe` | 劈林斧 | 1档 | `2` | `21` |
| `axe-tier-2` | 断岩斧 | 2档 | `4` | `28` |
| `axe-tier-3` | 裂阵斧 | 3档 | `6` | `35` |
| `axe-tier-4` | 震山斧 | 4档 | `9` | `44` |
| `axe-tier-5` | 开天斧 | 5档 | `12` | `53` |

### 锤

- 家族：沉重家族
- 类型加成：护心
- 核心技倾向：蛮力

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-hammer` | 碎石锤 | 1档 | `3` | `22` |
| `hammer-tier-2` | 震骨锤 | 2档 | `5` | `29` |
| `hammer-tier-3` | 撼岳锤 | 3档 | `7` | `37` |
| `hammer-tier-4` | 镇关锤 | 4档 | `9` | `45` |
| `hammer-tier-5` | 玄岳锤 | 5档 | `12` | `54` |

## 长兵家族 `polearm`

### 枪

- 家族：长兵家族
- 类型加成：速度
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-spear` | 白蜡枪 | 1档 | `1` | `18` |
| `spear-tier-2` | 穿云枪 | 2档 | `3` | `24` |
| `spear-tier-3` | 逐星枪 | 3档 | `5` | `30` |
| `spear-tier-4` | 断潮枪 | 4档 | `7` | `38` |
| `spear-tier-5` | 天游枪 | 5档 | `9` | `46` |

### 戟

- 家族：长兵家族
- 类型加成：暴伤
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-halberd` | 月牙戟 | 1档 | `2` | `19` |
| `halberd-tier-2` | 玄锋戟 | 2档 | `4` | `25` |
| `halberd-tier-3` | 破军戟 | 3档 | `6` | `32` |
| `halberd-tier-4` | 镇河戟 | 4档 | `8` | `40` |
| `halberd-tier-5` | 天阙戟 | 5档 | `10` | `48` |

### 棍

- 家族：长兵家族
- 类型加成：闪避
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-staff` | 青藤棍 | 1档 | `0` | `16` |
| `staff-tier-2` | 乌木棍 | 2档 | `2` | `21` |
| `staff-tier-3` | 沉水棍 | 3档 | `4` | `27` |
| `staff-tier-4` | 流云棍 | 4档 | `6` | `34` |
| `staff-tier-5` | 镇海棍 | 5档 | `8` | `42` |

### 钩镰

- 家族：长兵家族
- 类型加成：会心
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-hook-sickle` | 飞钩镰 | 1档 | `1` | `17` |
| `hook-sickle-tier-2` | 断索镰 | 2档 | `3` | `23` |
| `hook-sickle-tier-3` | 穿林镰 | 3档 | `5` | `29` |
| `hook-sickle-tier-4` | 逐月镰 | 4档 | `7` | `36` |
| `hook-sickle-tier-5` | 天罗镰 | 5档 | `9` | `44` |

## 柔变家族 `flexible`

### 鞭

- 家族：柔变家族
- 类型加成：速度
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-whip` | 软藤鞭 | 1档 | `0` | `16` |
| `whip-tier-2` | 青鳞鞭 | 2档 | `2` | `21` |
| `whip-tier-3` | 逐风鞭 | 3档 | `4` | `27` |
| `whip-tier-4` | 断潮鞭 | 4档 | `6` | `34` |
| `whip-tier-5` | 游龙鞭 | 5档 | `8` | `42` |

### 链刃

- 家族：柔变家族
- 类型加成：命中
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-chain-blade` | 链牙刃 | 1档 | `1` | `17` |
| `chain-blade-tier-2` | 追星链刃 | 2档 | `3` | `22` |
| `chain-blade-tier-3` | 玄锁链刃 | 3档 | `5` | `28` |
| `chain-blade-tier-4` | 破空链刃 | 4档 | `7` | `35` |
| `chain-blade-tier-5` | 天狩链刃 | 5档 | `9` | `43` |

### 流星锤

- 家族：柔变家族
- 类型加成：暴伤
- 核心技倾向：蛮力

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-meteor-hammer` | 流火锤 | 1档 | `2` | `20` |
| `meteor-hammer-tier-2` | 碎岩流星锤 | 2档 | `4` | `26` |
| `meteor-hammer-tier-3` | 断岳流星锤 | 3档 | `6` | `33` |
| `meteor-hammer-tier-4` | 镇河流星锤 | 4档 | `8` | `41` |
| `meteor-hammer-tier-5` | 天坠流星锤 | 5档 | `11` | `50` |

### 绫

- 家族：柔变家族
- 类型加成：护心
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-silk-ribbon` | 绮罗绫 | 1档 | `-1` | `15` |
| `silk-ribbon-tier-2` | 流霞绫 | 2档 | `1` | `20` |
| `silk-ribbon-tier-3` | 织月绫 | 3档 | `3` | `26` |
| `silk-ribbon-tier-4` | 天纱绫 | 4档 | `5` | `32` |
| `silk-ribbon-tier-5` | 归元绫 | 5档 | `7` | `40` |

## 远术家族 `ranged-mystic`

### 弓

- 家族：远术家族
- 类型加成：会心
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-bow` | 桑木弓 | 1档 | `0` | `16` |
| `bow-tier-2` | 雕翎弓 | 2档 | `2` | `21` |
| `bow-tier-3` | 追月弓 | 3档 | `4` | `27` |
| `bow-tier-4` | 穿云弓 | 4档 | `6` | `34` |
| `bow-tier-5` | 落星弓 | 5档 | `8` | `42` |

### 弩

- 家族：远术家族
- 类型加成：暴伤
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-crossbow` | 机括弩 | 1档 | `1` | `18` |
| `crossbow-tier-2` | 追电弩 | 2档 | `3` | `24` |
| `crossbow-tier-3` | 穿甲弩 | 3档 | `5` | `31` |
| `crossbow-tier-4` | 震岳弩 | 4档 | `7` | `39` |
| `crossbow-tier-5` | 天工弩 | 5档 | `9` | `48` |

### 扇

- 家族：远术家族
- 类型加成：速度
- 核心技倾向：巧劲

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-fan` | 纸骨扇 | 1档 | `-1` | `14` |
| `fan-tier-2` | 青羽扇 | 2档 | `1` | `19` |
| `fan-tier-3` | 断流扇 | 3档 | `3` | `25` |
| `fan-tier-4` | 玄光扇 | 4档 | `5` | `31` |
| `fan-tier-5` | 云阙扇 | 5档 | `7` | `39` |

### 伞

- 家族：远术家族
- 类型加成：护心
- 核心技倾向：战术

| ID | 展示名 | 档位 | attackPowerBonus | coreSkillSpiritCost |
| --- | --- | --- | --- | --- |
| `starter-umbrella` | 油纸伞 | 1档 | `-2` | `13` |
| `umbrella-tier-2` | 玄骨伞 | 2档 | `0` | `18` |
| `umbrella-tier-3` | 流云伞 | 3档 | `2` | `24` |
| `umbrella-tier-4` | 护心伞 | 4档 | `4` | `30` |
| `umbrella-tier-5` | 天幕伞 | 5档 | `6` | `38` |

## 给后续实现的直接提示

如果下一步要落代码，武器侧最稳的拆法是四层：

1. `weapon family metadata`
   - 家族成员和家族加成方向

2. `weapon type metadata`
   - 类型属于哪个家族、类型专属加成方向

3. `weapon tier budget table`
   - 每档的数值包线和固定标签

4. `100 条具体 weapon loadout`
   - 最终的 `id / name / attackPowerBonus / coreSkillSpiritCost`
