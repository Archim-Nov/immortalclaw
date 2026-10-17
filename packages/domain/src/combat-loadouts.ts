import type {
  WeaponLoadoutDefinition,
  SpellLoadoutDefinition,
  WeaponFamilyId,
  WeaponTypeId,
  SpellBranchId,
  WeaponLoadoutId,
  SpellLoadoutId,
  WeaponFamilyDefinition,
  WeaponTypeDefinition,
  WeaponTier,
  SpellTier,
  CombatStatusId,
  CombatStyle,
} from "./model.js";
import { SPELL_BRANCH_STATUS_MAP } from "./combat-statuses.js";

// ---- Weapon Family Definitions ----
export const WEAPON_FAMILY_MAP: Record<WeaponFamilyId, readonly WeaponTypeId[]> = {
  quick: ["sword", "dual-swords", "dagger", "gauntlets"],
  heavy: ["saber", "greatsaber", "axe", "hammer"],
  polearm: ["spear", "halberd", "staff", "hook-sickle"],
  flexible: ["whip", "chain-blade", "meteor-hammer", "silk-ribbon"],
  "ranged-mystic": ["bow", "crossbow", "fan", "umbrella"],
};

export const WEAPON_FAMILY_NAMES: Record<WeaponFamilyId, string> = {
  quick: "轻快型",
  heavy: "沉重型",
  polearm: "长兵型",
  flexible: "柔性型",
  "ranged-mystic": "远程秘术型",
};

export const WEAPON_TYPE_NAMES: Record<WeaponTypeId, string> = {
  sword: "剑",
  "dual-swords": "双剑",
  dagger: "匕首",
  gauntlets: "拳套",
  saber: "刀",
  greatsaber: "巨刀",
  axe: "斧",
  hammer: "锤",
  spear: "枪",
  halberd: "戟",
  staff: "棍",
  "hook-sickle": "钩镰",
  whip: "鞭",
  "chain-blade": "链刃",
  "meteor-hammer": "流星锤",
  "silk-ribbon": "绫",
  bow: "弓",
  crossbow: "弩",
  fan: "扇",
  umbrella: "伞",
};

// ---- Spell Branch Definitions ----
export const SPELL_BRANCH_ELEMENT_MAP: Record<SpellBranchId, "metal" | "wood" | "water" | "fire" | "earth"> = {
  "metal-edge": "metal",
  "metal-guard": "metal",
  "metal-break": "metal",
  "wood-growth": "wood",
  "wood-bind": "wood",
  "wood-bloom": "wood",
  "water-frost": "water",
  "water-illusion": "water",
  "water-flow": "water",
  "fire-blaze": "fire",
  "fire-smelt": "fire",
  "fire-burst": "fire",
  "earth-wall": "earth",
  "earth-suppress": "earth",
  "earth-vein": "earth",
};

export const SPELL_BRANCH_NAMES: Record<SpellBranchId, string> = {
  "metal-edge": "金/锋刃",
  "metal-guard": "金/罡御",
  "metal-break": "金/破禁",
  "wood-growth": "木/生息",
  "wood-bind": "木/缠束",
  "wood-bloom": "木/丰茂",
  "water-frost": "水/寒流",
  "water-illusion": "水/幻流",
  "water-flow": "水/润泽",
  "fire-blaze": "火/炽焰",
  "fire-smelt": "火/炼化",
  "fire-burst": "火/激燃",
  "earth-wall": "土/岩壁",
  "earth-suppress": "土/镇岳",
  "earth-vein": "土/地脉",
};

// ---- Weapon Family Metadata ----
export const WEAPON_FAMILY_DEFINITIONS: Record<WeaponFamilyId, WeaponFamilyDefinition> = {
  quick: {
    id: "quick",
    name: "轻快家族",
    memberWeaponTypes: ["sword", "dual-swords", "dagger", "gauntlets"],
    bonusProfile: {
      stat1: { stat: "speed", values: [4, 5, 6, 7, 8, 9, 10, 11] },
      stat2: { stat: "dodge", values: [3, 4, 5, 6, 7, 8, 9, 10] },
    },
  },
  heavy: {
    id: "heavy",
    name: "沉重家族",
    memberWeaponTypes: ["saber", "greatsaber", "axe", "hammer"],
    bonusProfile: {
      stat1: { stat: "tenacity", values: [5, 7, 9, 11, 13, 15, 17, 19] },
      stat2: { stat: "critDamage", values: [5, 7, 9, 11, 13, 15, 17, 19] },
    },
  },
  polearm: {
    id: "polearm",
    name: "长兵家族",
    memberWeaponTypes: ["spear", "halberd", "staff", "hook-sickle"],
    bonusProfile: {
      stat1: { stat: "hit", values: [4, 5, 6, 7, 8, 9, 10, 11] },
      stat2: { stat: "speed", values: [1, 2, 3, 4, 5, 6, 7, 8] },
    },
  },
  flexible: {
    id: "flexible",
    name: "柔变家族",
    memberWeaponTypes: ["whip", "chain-blade", "meteor-hammer", "silk-ribbon"],
    bonusProfile: {
      stat1: { stat: "dodge", values: [3, 4, 5, 6, 7, 8, 9, 10] },
      stat2: { stat: "crit", values: [1, 2, 3, 4, 5, 6, 7, 8] },
    },
  },
  "ranged-mystic": {
    id: "ranged-mystic",
    name: "远术家族",
    memberWeaponTypes: ["bow", "crossbow", "fan", "umbrella"],
    bonusProfile: {
      stat1: { stat: "hit", values: [3, 4, 5, 6, 7, 8, 9, 10] },
      stat2: { stat: "guardHeart", values: [3, 4, 5, 6, 7, 8, 9, 10] },
    },
  },
};

// ---- Weapon Type Metadata ----
export const WEAPON_TYPE_DEFINITIONS: Record<WeaponTypeId, WeaponTypeDefinition> = {
  sword: { id: "sword", name: "剑", weaponFamilyId: "quick", coreSkillCategory: "finesse", typeBonusProfile: { stat: "hit", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  "dual-swords": { id: "dual-swords", name: "双剑", weaponFamilyId: "quick", coreSkillCategory: "finesse", typeBonusProfile: { stat: "crit", values: [1, 2, 3, 4, 5, 6, 7, 8] } },
  dagger: { id: "dagger", name: "匕首", weaponFamilyId: "quick", coreSkillCategory: "finesse", typeBonusProfile: { stat: "critDamage", values: [6, 8, 10, 12, 14, 16, 18, 20] } },
  gauntlets: { id: "gauntlets", name: "拳套", weaponFamilyId: "quick", coreSkillCategory: "finesse", typeBonusProfile: { stat: "tenacity", values: [3, 4, 5, 6, 7, 8, 9, 10] } },
  saber: { id: "saber", name: "刀", weaponFamilyId: "heavy", coreSkillCategory: "brute", typeBonusProfile: { stat: "crit", values: [1, 2, 3, 4, 5, 6, 7, 8] } },
  greatsaber: { id: "greatsaber", name: "巨刀", weaponFamilyId: "heavy", coreSkillCategory: "brute", typeBonusProfile: { stat: "critDamage", values: [8, 10, 12, 14, 16, 18, 20, 22] } },
  axe: { id: "axe", name: "斧", weaponFamilyId: "heavy", coreSkillCategory: "brute", typeBonusProfile: { stat: "hit", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  hammer: { id: "hammer", name: "锤", weaponFamilyId: "heavy", coreSkillCategory: "brute", typeBonusProfile: { stat: "guardHeart", values: [4, 5, 6, 7, 8, 9, 10, 11] } },
  spear: { id: "spear", name: "枪", weaponFamilyId: "polearm", coreSkillCategory: "tactic", typeBonusProfile: { stat: "speed", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  halberd: { id: "halberd", name: "戟", weaponFamilyId: "polearm", coreSkillCategory: "tactic", typeBonusProfile: { stat: "critDamage", values: [5, 7, 9, 11, 13, 15, 17, 19] } },
  staff: { id: "staff", name: "棍", weaponFamilyId: "polearm", coreSkillCategory: "tactic", typeBonusProfile: { stat: "dodge", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  "hook-sickle": { id: "hook-sickle", name: "钩镰", weaponFamilyId: "polearm", coreSkillCategory: "tactic", typeBonusProfile: { stat: "crit", values: [1, 2, 3, 4, 5, 6, 7, 8] } },
  whip: { id: "whip", name: "鞭", weaponFamilyId: "flexible", coreSkillCategory: "finesse", typeBonusProfile: { stat: "speed", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  "chain-blade": { id: "chain-blade", name: "链刃", weaponFamilyId: "flexible", coreSkillCategory: "finesse", typeBonusProfile: { stat: "hit", values: [2, 3, 4, 5, 6, 7, 8, 9] } },
  "meteor-hammer": { id: "meteor-hammer", name: "流星锤", weaponFamilyId: "flexible", coreSkillCategory: "brute", typeBonusProfile: { stat: "critDamage", values: [6, 8, 10, 12, 14, 16, 18, 20] } },
  "silk-ribbon": { id: "silk-ribbon", name: "绫", weaponFamilyId: "flexible", coreSkillCategory: "tactic", typeBonusProfile: { stat: "guardHeart", values: [3, 4, 5, 6, 7, 8, 9, 10] } },
  bow: { id: "bow", name: "弓", weaponFamilyId: "ranged-mystic", coreSkillCategory: "tactic", typeBonusProfile: { stat: "crit", values: [1, 2, 3, 4, 5, 6, 7, 8] } },
  crossbow: { id: "crossbow", name: "弩", weaponFamilyId: "ranged-mystic", coreSkillCategory: "tactic", typeBonusProfile: { stat: "critDamage", values: [5, 7, 9, 11, 13, 15, 17, 19] } },
  fan: { id: "fan", name: "扇", weaponFamilyId: "ranged-mystic", coreSkillCategory: "finesse", typeBonusProfile: { stat: "speed", values: [1, 2, 3, 4, 5, 6, 7, 8] } },
  umbrella: { id: "umbrella", name: "伞", weaponFamilyId: "ranged-mystic", coreSkillCategory: "tactic", typeBonusProfile: { stat: "guardHeart", values: [4, 5, 6, 7, 8, 9, 10, 11] } },
};

// ---- Weapon Loadouts (20 types × 8 tiers = 160) ----
type WLD = WeaponLoadoutDefinition;
function wl(id: string, name: string, typeId: WeaponTypeId, tier: WeaponTier, apb: number, cost: number): WLD {
  const typeDef = WEAPON_TYPE_DEFINITIONS[typeId];
  return {
    id: id as WeaponLoadoutId,
    name,
    weaponTypeId: typeId,
    weaponTier: tier,
    weaponFamilyId: typeDef.weaponFamilyId,
    attackPowerBonus: apb,
    coreSkillCategory: typeDef.coreSkillCategory,
    coreSkillSpiritCost: cost,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  };
}

const WEAPON_LOADOUT_DEFS: Record<any, WeaponLoadoutDefinition> = {
  // === Quick Family ===
  // Sword
  "starter-sword":       wl("starter-sword",       "木锋剑",   "sword", 1,  0, 15),
  "sword-tier-2":        wl("sword-tier-2",        "青钢剑",   "sword", 2,  2, 20),
  "sword-tier-3":        wl("sword-tier-3",        "寒星剑",   "sword", 3,  4, 26),
  "sword-tier-4":        wl("sword-tier-4",        "游龙剑",   "sword", 4,  6, 33),
  "sword-tier-5":        wl("sword-tier-5",        "天游剑",   "sword", 5,  8, 41),
  // Dual-Swords
  "starter-dual-swords":    wl("starter-dual-swords",    "归燕双剑",   "dual-swords", 1,  1, 16),
  "dual-swords-tier-2":     wl("dual-swords-tier-2",     "流光双剑",   "dual-swords", 2,  3, 22),
  "dual-swords-tier-3":     wl("dual-swords-tier-3",     "逐月双剑",   "dual-swords", 3,  5, 28),
  "dual-swords-tier-4":     wl("dual-swords-tier-4",     "断水双剑",   "dual-swords", 4,  7, 36),
  "dual-swords-tier-5":     wl("dual-swords-tier-5",     "天衡双剑",   "dual-swords", 5,  9, 44),
  // Dagger
  "starter-dagger":       wl("starter-dagger",       "藏锋匕",   "dagger", 1, -1, 12),
  "dagger-tier-2":        wl("dagger-tier-2",        "破影匕",   "dagger", 2,  1, 17),
  "dagger-tier-3":        wl("dagger-tier-3",        "夜行匕",   "dagger", 3,  3, 23),
  "dagger-tier-4":        wl("dagger-tier-4",        "追魂匕",   "dagger", 4,  5, 29),
  "dagger-tier-5":        wl("dagger-tier-5",        "星陨匕",   "dagger", 5,  7, 37),
  // Gauntlets
  "starter-gauntlets":    wl("starter-gauntlets",    "练骨拳套",   "gauntlets", 1,  0, 14),
  "gauntlets-tier-2":     wl("gauntlets-tier-2",     "震脉拳套",   "gauntlets", 2,  2, 19),
  "gauntlets-tier-3":     wl("gauntlets-tier-3",     "裂石拳套",   "gauntlets", 3,  4, 25),
  "gauntlets-tier-4":     wl("gauntlets-tier-4",     "伏龙拳套",   "gauntlets", 4,  6, 32),
  "gauntlets-tier-5":     wl("gauntlets-tier-5",     "镇岳拳套",   "gauntlets", 5,  8, 40),

  // === Heavy Family ===
  // Saber
  "starter-saber":       wl("starter-saber",       "雁翎刀",   "saber", 1,  2, 20),
  "saber-tier-2":        wl("saber-tier-2",        "玄铁刀",   "saber", 2,  4, 26),
  "saber-tier-3":        wl("saber-tier-3",        "赤纹刀",   "saber", 3,  6, 33),
  "saber-tier-4":        wl("saber-tier-4",        "断岳刀",   "saber", 4,  8, 41),
  "saber-tier-5":        wl("saber-tier-5",        "天问刀",   "saber", 5, 11, 50),
  // Greatsaber
  "starter-greatsaber":   wl("starter-greatsaber",   "开山巨刀",   "greatsaber", 1,  3, 22),
  "greatsaber-tier-2":    wl("greatsaber-tier-2",    "断岭巨刀",   "greatsaber", 2,  5, 29),
  "greatsaber-tier-3":    wl("greatsaber-tier-3",    "镇关巨刀",   "greatsaber", 3,  7, 37),
  "greatsaber-tier-4":    wl("greatsaber-tier-4",    "裂岳巨刀",   "greatsaber", 4, 10, 46),
  "greatsaber-tier-5":    wl("greatsaber-tier-5",    "霸川巨刀",   "greatsaber", 5, 13, 56),
  // Axe
  "starter-axe":          wl("starter-axe",          "劈林斧",   "axe", 1,  2, 21),
  "axe-tier-2":           wl("axe-tier-2",           "断岩斧",   "axe", 2,  4, 28),
  "axe-tier-3":           wl("axe-tier-3",           "裂阵斧",   "axe", 3,  6, 35),
  "axe-tier-4":           wl("axe-tier-4",           "震山斧",   "axe", 4,  9, 44),
  "axe-tier-5":           wl("axe-tier-5",           "开天斧",   "axe", 5, 12, 53),
  // Hammer
  "starter-hammer":       wl("starter-hammer",       "碎石锤",   "hammer", 1,  3, 22),
  "hammer-tier-2":        wl("hammer-tier-2",        "震骨锤",   "hammer", 2,  5, 29),
  "hammer-tier-3":        wl("hammer-tier-3",        "撼岳锤",   "hammer", 3,  7, 37),
  "hammer-tier-4":        wl("hammer-tier-4",        "镇关锤",   "hammer", 4,  9, 45),
  "hammer-tier-5":        wl("hammer-tier-5",        "玄岳锤",   "hammer", 5, 12, 54),

  // === Polearm Family ===
  // Spear
  "starter-spear":        wl("starter-spear",        "白蜡枪",   "spear", 1,  1, 18),
  "spear-tier-2":         wl("spear-tier-2",         "穿云枪",   "spear", 2,  3, 24),
  "spear-tier-3":         wl("spear-tier-3",         "逐星枪",   "spear", 3,  5, 30),
  "spear-tier-4":         wl("spear-tier-4",         "断潮枪",   "spear", 4,  7, 38),
  "spear-tier-5":         wl("spear-tier-5",         "天游枪",   "spear", 5,  9, 46),
  // Halberd
  "starter-halberd":      wl("starter-halberd",      "月牙戟",   "halberd", 1,  2, 19),
  "halberd-tier-2":       wl("halberd-tier-2",       "玄锋戟",   "halberd", 2,  4, 25),
  "halberd-tier-3":       wl("halberd-tier-3",       "破军戟",   "halberd", 3,  6, 32),
  "halberd-tier-4":       wl("halberd-tier-4",       "镇河戟",   "halberd", 4,  8, 40),
  "halberd-tier-5":       wl("halberd-tier-5",       "天阙戟",   "halberd", 5, 10, 48),
  // Staff
  "starter-staff":        wl("starter-staff",        "青藤棍",   "staff", 1,  0, 16),
  "staff-tier-2":         wl("staff-tier-2",         "乌木棍",   "staff", 2,  2, 21),
  "staff-tier-3":         wl("staff-tier-3",         "沉水棍",   "staff", 3,  4, 27),
  "staff-tier-4":         wl("staff-tier-4",         "流云棍",   "staff", 4,  6, 34),
  "staff-tier-5":         wl("staff-tier-5",         "镇海棍",   "staff", 5,  8, 42),
  // Hook-Sickle
  "starter-hook-sickle":  wl("starter-hook-sickle",  "飞钩镰",   "hook-sickle", 1,  1, 17),
  "hook-sickle-tier-2":   wl("hook-sickle-tier-2",   "断索镰",   "hook-sickle", 2,  3, 23),
  "hook-sickle-tier-3":   wl("hook-sickle-tier-3",   "穿林镰",   "hook-sickle", 3,  5, 29),
  "hook-sickle-tier-4":   wl("hook-sickle-tier-4",   "逐月镰",   "hook-sickle", 4,  7, 36),
  "hook-sickle-tier-5":   wl("hook-sickle-tier-5",   "天罗镰",   "hook-sickle", 5,  9, 44),

  // === Flexible Family ===
  // Whip
  "starter-whip":         wl("starter-whip",         "软藤鞭",   "whip", 1,  0, 16),
  "whip-tier-2":          wl("whip-tier-2",          "青鳞鞭",   "whip", 2,  2, 21),
  "whip-tier-3":          wl("whip-tier-3",          "逐风鞭",   "whip", 3,  4, 27),
  "whip-tier-4":          wl("whip-tier-4",          "断潮鞭",   "whip", 4,  6, 34),
  "whip-tier-5":          wl("whip-tier-5",          "游龙鞭",   "whip", 5,  8, 42),
  // Chain-Blade
  "starter-chain-blade":   wl("starter-chain-blade",   "链牙刃",   "chain-blade", 1,  1, 17),
  "chain-blade-tier-2":    wl("chain-blade-tier-2",    "追星链刃", "chain-blade", 2,  3, 22),
  "chain-blade-tier-3":    wl("chain-blade-tier-3",    "玄锁链刃", "chain-blade", 3,  5, 28),
  "chain-blade-tier-4":    wl("chain-blade-tier-4",    "破空链刃", "chain-blade", 4,  7, 35),
  "chain-blade-tier-5":    wl("chain-blade-tier-5",    "天狩链刃", "chain-blade", 5,  9, 43),
  // Meteor-Hammer
  "starter-meteor-hammer":  wl("starter-meteor-hammer",  "流火锤",     "meteor-hammer", 1,  2, 20),
  "meteor-hammer-tier-2":   wl("meteor-hammer-tier-2",   "碎岩流星锤", "meteor-hammer", 2,  4, 26),
  "meteor-hammer-tier-3":   wl("meteor-hammer-tier-3",   "断岳流星锤", "meteor-hammer", 3,  6, 33),
  "meteor-hammer-tier-4":   wl("meteor-hammer-tier-4",   "镇河流星锤", "meteor-hammer", 4,  8, 41),
  "meteor-hammer-tier-5":   wl("meteor-hammer-tier-5",   "天坠流星锤", "meteor-hammer", 5, 11, 50),
  // Silk-Ribbon
  "starter-silk-ribbon":   wl("starter-silk-ribbon",   "绮罗绫",   "silk-ribbon", 1, -1, 15),
  "silk-ribbon-tier-2":    wl("silk-ribbon-tier-2",    "流霞绫",   "silk-ribbon", 2,  1, 20),
  "silk-ribbon-tier-3":    wl("silk-ribbon-tier-3",    "织月绫",   "silk-ribbon", 3,  3, 26),
  "silk-ribbon-tier-4":    wl("silk-ribbon-tier-4",    "天纱绫",   "silk-ribbon", 4,  5, 32),
  "silk-ribbon-tier-5":    wl("silk-ribbon-tier-5",    "归元绫",   "silk-ribbon", 5,  7, 40),

  // === Ranged-Mystic Family ===
  // Bow
  "starter-bow":          wl("starter-bow",          "桑木弓",   "bow", 1,  0, 16),
  "bow-tier-2":           wl("bow-tier-2",           "雕翎弓",   "bow", 2,  2, 21),
  "bow-tier-3":           wl("bow-tier-3",           "追月弓",   "bow", 3,  4, 27),
  "bow-tier-4":           wl("bow-tier-4",           "穿云弓",   "bow", 4,  6, 34),
  "bow-tier-5":           wl("bow-tier-5",           "落星弓",   "bow", 5,  8, 42),
  // Crossbow
  "starter-crossbow":     wl("starter-crossbow",     "机括弩",   "crossbow", 1,  1, 18),
  "crossbow-tier-2":      wl("crossbow-tier-2",      "追电弩",   "crossbow", 2,  3, 24),
  "crossbow-tier-3":      wl("crossbow-tier-3",      "穿甲弩",   "crossbow", 3,  5, 31),
  "crossbow-tier-4":      wl("crossbow-tier-4",      "震岳弩",   "crossbow", 4,  7, 39),
  "crossbow-tier-5":      wl("crossbow-tier-5",      "天工弩",   "crossbow", 5,  9, 48),
  // Fan
  "starter-fan":          wl("starter-fan",          "纸骨扇",   "fan", 1, -1, 14),
  "fan-tier-2":           wl("fan-tier-2",           "青羽扇",   "fan", 2,  1, 19),
  "fan-tier-3":           wl("fan-tier-3",           "断流扇",   "fan", 3,  3, 25),
  "fan-tier-4":           wl("fan-tier-4",           "玄光扇",   "fan", 4,  5, 31),
  "fan-tier-5":           wl("fan-tier-5",           "云阙扇",   "fan", 5,  7, 39),
  // Umbrella
  "starter-umbrella":     wl("starter-umbrella",     "油纸伞",   "umbrella", 1, -2, 13),
  "umbrella-tier-2":      wl("umbrella-tier-2",      "玄骨伞",   "umbrella", 2,  0, 18),
  "umbrella-tier-3":      wl("umbrella-tier-3",      "流云伞",   "umbrella", 3,  2, 24),
  "umbrella-tier-4":      wl("umbrella-tier-4",      "护心伞",   "umbrella", 4,  4, 30),
  "umbrella-tier-5":      wl("umbrella-tier-5",      "天幕伞",   "umbrella", 5,  6, 38),
};

const LATER_WEAPON_NAMES: Record<WeaponTypeId, readonly [string, string, string]> = {
  sword: ["空游剑", "并真剑", "渡劫剑"],
  "dual-swords": ["裂空双剑", "合真双剑", "劫外双剑"],
  dagger: ["虚无匕", "并影匕", "渡影匕"],
  gauntlets: ["碎空拳套", "合脉拳套", "渡劫拳套"],
  saber: ["断空刀", "并岳刀", "渡川刀"],
  greatsaber: ["开虚巨刀", "合川巨刀", "劫外巨刀"],
  axe: ["裂界斧", "并山斧", "渡岳斧"],
  hammer: ["镇空锤", "合岳锤", "渡劫锤"],
  spear: ["破虚枪", "并潮枪", "渡云枪"],
  halberd: ["虚阙戟", "合阙戟", "劫阙戟"],
  staff: ["定空棍", "并海棍", "渡风棍"],
  "hook-sickle": ["空钩镰", "合钩镰", "渡劫镰"],
  whip: ["缠虚鞭", "并龙鞭", "乘风鞭"],
  "chain-blade": ["碎空链刃", "合狩链刃", "劫外链刃"],
  "meteor-hammer": ["虚坠流星锤", "并坠流星锤", "渡坠流星锤"],
  "silk-ribbon": ["空纱绫", "合元绫", "劫纱绫"],
  bow: ["贯虚弓", "并星弓", "渡星弓"],
  crossbow: ["裂界弩", "合工弩", "劫外弩"],
  fan: ["空纹扇", "并阙扇", "乘风扇"],
  umbrella: ["虚幕伞", "合幕伞", "渡劫伞"],
};

const LATER_WEAPON_COST = [10, 22, 36] as const;

for (const typeId of Object.keys(WEAPON_TYPE_DEFINITIONS) as WeaponTypeId[]) {
  const tier5 = Object.values(WEAPON_LOADOUT_DEFS).find(
    (weapon) => weapon.weaponTypeId === typeId && weapon.weaponTier === 5,
  );
  if (!tier5) throw new Error(`missing tier 5 weapon for ${typeId}`);
  for (let step = 0; step < 3; step += 1) {
    const tier = (6 + step) as WeaponTier;
    const id = `${typeId}-tier-${tier}`;
    WEAPON_LOADOUT_DEFS[id] = wl(
      id,
      LATER_WEAPON_NAMES[typeId][step]!,
      typeId,
      tier,
      tier5.attackPowerBonus + (step + 1) * 2,
      tier5.coreSkillSpiritCost + LATER_WEAPON_COST[step]!,
    );
  }
}

export const WEAPON_LOADOUT_DEFINITIONS = WEAPON_LOADOUT_DEFS as Record<WeaponLoadoutId, WeaponLoadoutDefinition>;

// ---- Spell Loadouts (15 branches × 8 tiers = 120) ----
type SLD = SpellLoadoutDefinition;
function sl(id: string, name: string, branchId: SpellBranchId, tier: SpellTier, apb: number, cost: number, style: CombatStyle): SLD {
  const branch = SPELL_BRANCH_STATUS_MAP[branchId];
  const basicHook = `spell:${branchId}:basic`;
  const coreHook = `spell:${branchId}:core`;
  return {
    id: id as SpellLoadoutId,
    name,
    spellBranchId: branchId,
    spellTier: tier,
    primaryStatusId: branch.primaryStatusId,
    secondaryStatusId: branch.secondaryStatusId,
    attackPowerBonus: apb,
    coreSkillCategory: style,
    coreSkillSpiritCost: cost,
    basicAttackStatusHookIds: [basicHook],
    coreSkillStatusHookIds: [coreHook],
  };
}

const SPELL_LOADOUT_DEFS: Record<any, SpellLoadoutDefinition> = {
  // === Metal Element ===
  // Metal-Edge (蛮力)
  "starter-metal-edge":    sl("starter-metal-edge",    "金·锋刃·入门篇", "metal-edge", 1,  2, 20, "brute"),
  "metal-edge-tier-2":     sl("metal-edge-tier-2",     "金·锋刃·熟练篇", "metal-edge", 2,  5, 28, "brute"),
  "metal-edge-tier-3":     sl("metal-edge-tier-3",     "金·锋刃·精修篇", "metal-edge", 3,  9, 38, "brute"),
  "metal-edge-tier-4":     sl("metal-edge-tier-4",     "金·锋刃·真诀篇", "metal-edge", 4, 13, 49, "brute"),
  "metal-edge-tier-5":     sl("metal-edge-tier-5",     "金·锋刃·秘传篇", "metal-edge", 5, 18, 62, "brute"),
  // Metal-Guard (巧劲)
  "starter-metal-guard":   sl("starter-metal-guard",   "金·罡御·入门篇", "metal-guard", 1,  1, 18, "finesse"),
  "metal-guard-tier-2":    sl("metal-guard-tier-2",    "金·罡御·熟练篇", "metal-guard", 2,  4, 25, "finesse"),
  "metal-guard-tier-3":    sl("metal-guard-tier-3",    "金·罡御·精修篇", "metal-guard", 3,  7, 34, "finesse"),
  "metal-guard-tier-4":    sl("metal-guard-tier-4",    "金·罡御·真诀篇", "metal-guard", 4, 11, 45, "finesse"),
  "metal-guard-tier-5":    sl("metal-guard-tier-5",    "金·罡御·秘传篇", "metal-guard", 5, 16, 58, "finesse"),
  // Metal-Break (战术)
  "starter-metal-break":   sl("starter-metal-break",   "金·破禁·入门篇", "metal-break", 1,  1, 19, "tactic"),
  "metal-break-tier-2":    sl("metal-break-tier-2",    "金·破禁·熟练篇", "metal-break", 2,  3, 27, "tactic"),
  "metal-break-tier-3":    sl("metal-break-tier-3",    "金·破禁·精修篇", "metal-break", 3,  6, 36, "tactic"),
  "metal-break-tier-4":    sl("metal-break-tier-4",    "金·破禁·真诀篇", "metal-break", 4, 10, 47, "tactic"),
  "metal-break-tier-5":    sl("metal-break-tier-5",    "金·破禁·秘传篇", "metal-break", 5, 15, 60, "tactic"),

  // === Wood Element ===
  // Wood-Growth (蛮力)
  "starter-wood-growth":   sl("starter-wood-growth",   "木·生息·入门篇", "wood-growth", 1,  1, 18, "brute"),
  "wood-growth-tier-2":    sl("wood-growth-tier-2",    "木·生息·熟练篇", "wood-growth", 2,  4, 25, "brute"),
  "wood-growth-tier-3":    sl("wood-growth-tier-3",    "木·生息·精修篇", "wood-growth", 3,  7, 34, "brute"),
  "wood-growth-tier-4":    sl("wood-growth-tier-4",    "木·生息·真诀篇", "wood-growth", 4, 11, 45, "brute"),
  "wood-growth-tier-5":    sl("wood-growth-tier-5",    "木·生息·秘传篇", "wood-growth", 5, 16, 58, "brute"),
  // Wood-Bind (巧劲)
  "starter-wood-bind":     sl("starter-wood-bind",     "木·缠束·入门篇", "wood-bind", 1,  1, 18, "finesse"),
  "wood-bind-tier-2":      sl("wood-bind-tier-2",      "木·缠束·熟练篇", "wood-bind", 2,  3, 24, "finesse"),
  "wood-bind-tier-3":      sl("wood-bind-tier-3",      "木·缠束·精修篇", "wood-bind", 3,  6, 33, "finesse"),
  "wood-bind-tier-4":      sl("wood-bind-tier-4",      "木·缠束·真诀篇", "wood-bind", 4, 10, 44, "finesse"),
  "wood-bind-tier-5":      sl("wood-bind-tier-5",      "木·缠束·秘传篇", "wood-bind", 5, 15, 56, "finesse"),
  // Wood-Bloom (战术)
  "starter-wood-bloom":    sl("starter-wood-bloom",    "木·丰茂·入门篇", "wood-bloom", 1,  0, 16, "tactic"),
  "wood-bloom-tier-2":     sl("wood-bloom-tier-2",     "木·丰茂·熟练篇", "wood-bloom", 2,  3, 23, "tactic"),
  "wood-bloom-tier-3":     sl("wood-bloom-tier-3",     "木·丰茂·精修篇", "wood-bloom", 3,  6, 31, "tactic"),
  "wood-bloom-tier-4":     sl("wood-bloom-tier-4",     "木·丰茂·真诀篇", "wood-bloom", 4, 10, 42, "tactic"),
  "wood-bloom-tier-5":     sl("wood-bloom-tier-5",     "木·丰茂·秘传篇", "wood-bloom", 5, 15, 54, "tactic"),

  // === Water Element ===
  // Water-Frost (蛮力)
  "starter-water-frost":   sl("starter-water-frost",   "水·寒流·入门篇", "water-frost", 1,  2, 19, "brute"),
  "water-frost-tier-2":    sl("water-frost-tier-2",    "水·寒流·熟练篇", "water-frost", 2,  5, 27, "brute"),
  "water-frost-tier-3":    sl("water-frost-tier-3",    "水·寒流·精修篇", "water-frost", 3,  8, 36, "brute"),
  "water-frost-tier-4":    sl("water-frost-tier-4",    "水·寒流·真诀篇", "water-frost", 4, 12, 48, "brute"),
  "water-frost-tier-5":    sl("water-frost-tier-5",    "水·寒流·秘传篇", "water-frost", 5, 17, 61, "brute"),
  // Water-Illusion (巧劲)
  "starter-water-illusion": sl("starter-water-illusion", "水·幻流·入门篇", "water-illusion", 1,  0, 17, "finesse"),
  "water-illusion-tier-2":  sl("water-illusion-tier-2",  "水·幻流·熟练篇", "water-illusion", 2,  3, 24, "finesse"),
  "water-illusion-tier-3":  sl("water-illusion-tier-3",  "水·幻流·精修篇", "water-illusion", 3,  6, 32, "finesse"),
  "water-illusion-tier-4":  sl("water-illusion-tier-4",  "水·幻流·真诀篇", "water-illusion", 4, 10, 43, "finesse"),
  "water-illusion-tier-5":  sl("water-illusion-tier-5",  "水·幻流·秘传篇", "water-illusion", 5, 15, 55, "finesse"),
  // Water-Flow (战术)
  "starter-water-flow":    sl("starter-water-flow",    "水·润泽·入门篇", "water-flow", 1, -1, 16, "tactic"),
  "water-flow-tier-2":     sl("water-flow-tier-2",     "水·润泽·熟练篇", "water-flow", 2,  3, 23, "tactic"),
  "water-flow-tier-3":     sl("water-flow-tier-3",     "水·润泽·精修篇", "water-flow", 3,  6, 31, "tactic"),
  "water-flow-tier-4":     sl("water-flow-tier-4",     "水·润泽·真诀篇", "water-flow", 4, 10, 42, "tactic"),
  "water-flow-tier-5":     sl("water-flow-tier-5",     "水·润泽·秘传篇", "water-flow", 5, 15, 54, "tactic"),

  // === Fire Element ===
  // Fire-Blaze (蛮力)
  "starter-fire-blaze":    sl("starter-fire-blaze",    "火·炽焰·入门篇", "fire-blaze", 1,  3, 22, "brute"),
  "fire-blaze-tier-2":     sl("fire-blaze-tier-2",     "火·炽焰·熟练篇", "fire-blaze", 2,  6, 30, "brute"),
  "fire-blaze-tier-3":     sl("fire-blaze-tier-3",     "火·炽焰·精修篇", "fire-blaze", 3, 10, 40, "brute"),
  "fire-blaze-tier-4":     sl("fire-blaze-tier-4",     "火·炽焰·真诀篇", "fire-blaze", 4, 15, 52, "brute"),
  "fire-blaze-tier-5":     sl("fire-blaze-tier-5",     "火·炽焰·秘传篇", "fire-blaze", 5, 21, 66, "brute"),
  // Fire-Burst (巧劲)
  "starter-fire-burst":    sl("starter-fire-burst",    "火·激燃·入门篇", "fire-burst", 1,  2, 20, "finesse"),
  "fire-burst-tier-2":     sl("fire-burst-tier-2",     "火·激燃·熟练篇", "fire-burst", 2,  5, 28, "finesse"),
  "fire-burst-tier-3":     sl("fire-burst-tier-3",     "火·激燃·精修篇", "fire-burst", 3,  8, 37, "finesse"),
  "fire-burst-tier-4":     sl("fire-burst-tier-4",     "火·激燃·真诀篇", "fire-burst", 4, 12, 49, "finesse"),
  "fire-burst-tier-5":     sl("fire-burst-tier-5",     "火·激燃·秘传篇", "fire-burst", 5, 18, 63, "finesse"),
  // Fire-Smelt (战术)
  "starter-fire-smelt":    sl("starter-fire-smelt",    "火·炼化·入门篇", "fire-smelt", 1,  1, 19, "tactic"),
  "fire-smelt-tier-2":     sl("fire-smelt-tier-2",     "火·炼化·熟练篇", "fire-smelt", 2,  4, 27, "tactic"),
  "fire-smelt-tier-3":     sl("fire-smelt-tier-3",     "火·炼化·精修篇", "fire-smelt", 3,  7, 36, "tactic"),
  "fire-smelt-tier-4":     sl("fire-smelt-tier-4",     "火·炼化·真诀篇", "fire-smelt", 4, 11, 48, "tactic"),
  "fire-smelt-tier-5":     sl("fire-smelt-tier-5",     "火·炼化·秘传篇", "fire-smelt", 5, 16, 60, "tactic"),

  // === Earth Element ===
  // Earth-Wall (巧劲)
  "starter-earth-wall":    sl("starter-earth-wall",    "土·岩壁·入门篇", "earth-wall", 1, -1, 18, "finesse"),
  "earth-wall-tier-2":     sl("earth-wall-tier-2",     "土·岩壁·熟练篇", "earth-wall", 2,  3, 24, "finesse"),
  "earth-wall-tier-3":     sl("earth-wall-tier-3",     "土·岩壁·精修篇", "earth-wall", 3,  6, 33, "finesse"),
  "earth-wall-tier-4":     sl("earth-wall-tier-4",     "土·岩壁·真诀篇", "earth-wall", 4, 10, 44, "finesse"),
  "earth-wall-tier-5":     sl("earth-wall-tier-5",     "土·岩壁·秘传篇", "earth-wall", 5, 15, 56, "finesse"),
  // Earth-Suppress (蛮力)
  "starter-earth-suppress": sl("starter-earth-suppress", "土·镇岳·入门篇", "earth-suppress", 1,  2, 20, "brute"),
  "earth-suppress-tier-2":  sl("earth-suppress-tier-2",  "土·镇岳·熟练篇", "earth-suppress", 2,  5, 28, "brute"),
  "earth-suppress-tier-3":  sl("earth-suppress-tier-3",  "土·镇岳·精修篇", "earth-suppress", 3,  8, 37, "brute"),
  "earth-suppress-tier-4":  sl("earth-suppress-tier-4",  "土·镇岳·真诀篇", "earth-suppress", 4, 12, 49, "brute"),
  "earth-suppress-tier-5":  sl("earth-suppress-tier-5",  "土·镇岳·秘传篇", "earth-suppress", 5, 18, 63, "brute"),
  // Earth-Vein (战术)
  "starter-earth-vein":    sl("starter-earth-vein",    "土·地脉·入门篇", "earth-vein", 1,  0, 18, "tactic"),
  "earth-vein-tier-2":     sl("earth-vein-tier-2",     "土·地脉·熟练篇", "earth-vein", 2,  3, 25, "tactic"),
  "earth-vein-tier-3":     sl("earth-vein-tier-3",     "土·地脉·精修篇", "earth-vein", 3,  6, 34, "tactic"),
  "earth-vein-tier-4":     sl("earth-vein-tier-4",     "土·地脉·真诀篇", "earth-vein", 4, 10, 45, "tactic"),
  "earth-vein-tier-5":     sl("earth-vein-tier-5",     "土·地脉·秘传篇", "earth-vein", 5, 15, 58, "tactic"),
};

const LATER_SPELL_CHAPTER = ["炼虚篇", "合体篇", "大乘篇"] as const;
const LATER_SPELL_COST = [10, 22, 36] as const;

for (const branchId of Object.keys(SPELL_BRANCH_ELEMENT_MAP) as SpellBranchId[]) {
  const tier5 = Object.values(SPELL_LOADOUT_DEFS).find(
    (spell) => spell.spellBranchId === branchId && spell.spellTier === 5,
  );
  if (!tier5) throw new Error(`missing tier 5 spell for ${branchId}`);
  const stem = tier5.name.replace(/秘传篇$/, "");
  for (let step = 0; step < 3; step += 1) {
    const tier = (6 + step) as SpellTier;
    const id = `${branchId}-tier-${tier}`;
    SPELL_LOADOUT_DEFS[id] = sl(
      id,
      `${stem}${LATER_SPELL_CHAPTER[step]}`,
      branchId,
      tier,
      tier5.attackPowerBonus + (step + 1) * 4,
      tier5.coreSkillSpiritCost + LATER_SPELL_COST[step]!,
      tier5.coreSkillCategory,
    );
  }
}

export const SPELL_LOADOUT_DEFINITIONS = SPELL_LOADOUT_DEFS as Record<SpellLoadoutId, SpellLoadoutDefinition>;

// ---- Utility Functions ----
export function getWeaponLoadoutDefinition(loadoutId: WeaponLoadoutId): WeaponLoadoutDefinition | null {
  return WEAPON_LOADOUT_DEFINITIONS[loadoutId] ?? null;
}

export function getSpellLoadoutDefinition(loadoutId: SpellLoadoutId): SpellLoadoutDefinition | null {
  return SPELL_LOADOUT_DEFINITIONS[loadoutId] ?? null;
}

export function getAllWeaponLoadouts(): WeaponLoadoutDefinition[] {
  return Object.values(WEAPON_LOADOUT_DEFINITIONS);
}

export function getAllSpellLoadouts(): SpellLoadoutDefinition[] {
  return Object.values(SPELL_LOADOUT_DEFINITIONS);
}

export function getWeaponLoadoutsByFamily(familyId: WeaponFamilyId): WeaponLoadoutDefinition[] {
  const weaponTypes = WEAPON_FAMILY_MAP[familyId];
  return Object.values(WEAPON_LOADOUT_DEFINITIONS).filter((loadout) =>
    weaponTypes.includes(loadout.weaponTypeId)
  );
}

export function getSpellLoadoutsByElement(element: "metal" | "wood" | "water" | "fire" | "earth"): SpellLoadoutDefinition[] {
  return Object.values(SPELL_LOADOUT_DEFINITIONS).filter(
    (loadout) => SPELL_BRANCH_ELEMENT_MAP[loadout.spellBranchId] === element
  );
}

export function getWeaponFamilyDefinition(familyId: WeaponFamilyId): WeaponFamilyDefinition {
  return WEAPON_FAMILY_DEFINITIONS[familyId];
}

export function getWeaponTypeDefinition(typeId: WeaponTypeId): WeaponTypeDefinition {
  return WEAPON_TYPE_DEFINITIONS[typeId];
}

export function getWeaponFamilyForType(typeId: WeaponTypeId): WeaponFamilyId {
  return WEAPON_TYPE_DEFINITIONS[typeId].weaponFamilyId;
}
