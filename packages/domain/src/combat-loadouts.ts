import type {
  WeaponLoadoutDefinition,
  SpellLoadoutDefinition,
  WeaponFamilyId,
  WeaponTypeId,
  SpellBranchId,
  WeaponLoadoutId,
  SpellLoadoutId,
} from "./model.js";

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

// ---- Weapon Loadouts (20 weapon types × 1 starter each) ----
const WEAPON_LOADOUT_DEFS: Record<any, WeaponLoadoutDefinition> = {
  // Quick family
  "starter-sword": {
    id: "starter-sword" as WeaponLoadoutId,
    name: "初心剑",
    weaponTypeId: "sword",
    attackPowerBonus: 0,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 15,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-dual-swords": {
    id: "starter-dual-swords" as WeaponLoadoutId,
    name: "初心双剑",
    weaponTypeId: "dual-swords",
    attackPowerBonus: 2,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-dagger": {
    id: "starter-dagger" as WeaponLoadoutId,
    name: "初心匕首",
    weaponTypeId: "dagger",
    attackPowerBonus: -2,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 12,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-gauntlets": {
    id: "starter-gauntlets" as WeaponLoadoutId,
    name: "初心拳套",
    weaponTypeId: "gauntlets",
    attackPowerBonus: 1,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 14,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Heavy family
  "starter-saber": {
    id: "starter-saber" as WeaponLoadoutId,
    name: "初心刀",
    weaponTypeId: "saber",
    attackPowerBonus: 3,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 20,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-greatsaber": {
    id: "starter-greatsaber" as WeaponLoadoutId,
    name: "初心巨刀",
    weaponTypeId: "greatsaber",
    attackPowerBonus: 6,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 25,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-axe": {
    id: "starter-axe" as WeaponLoadoutId,
    name: "初心斧",
    weaponTypeId: "axe",
    attackPowerBonus: 4,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 22,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-hammer": {
    id: "starter-hammer" as WeaponLoadoutId,
    name: "初心锤",
    weaponTypeId: "hammer",
    attackPowerBonus: 5,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 24,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Polearm family
  "starter-spear": {
    id: "starter-spear" as WeaponLoadoutId,
    name: "初心枪",
    weaponTypeId: "spear",
    attackPowerBonus: 2,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-halberd": {
    id: "starter-halberd" as WeaponLoadoutId,
    name: "初心戟",
    weaponTypeId: "halberd",
    attackPowerBonus: 4,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 20,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-staff": {
    id: "starter-staff" as WeaponLoadoutId,
    name: "初心棍",
    weaponTypeId: "staff",
    attackPowerBonus: 1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 16,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-hook-sickle": {
    id: "starter-hook-sickle" as WeaponLoadoutId,
    name: "初心钩镰",
    weaponTypeId: "hook-sickle",
    attackPowerBonus: 2,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 17,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Flexible family
  "starter-whip": {
    id: "starter-whip" as WeaponLoadoutId,
    name: "初心鞭",
    weaponTypeId: "whip",
    attackPowerBonus: 1,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 16,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-chain-blade": {
    id: "starter-chain-blade" as WeaponLoadoutId,
    name: "初心链刃",
    weaponTypeId: "chain-blade",
    attackPowerBonus: 2,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 17,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-meteor-hammer": {
    id: "starter-meteor-hammer" as WeaponLoadoutId,
    name: "初心流星锤",
    weaponTypeId: "meteor-hammer",
    attackPowerBonus: 3,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 21,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-silk-ribbon": {
    id: "starter-silk-ribbon" as WeaponLoadoutId,
    name: "初心绫",
    weaponTypeId: "silk-ribbon",
    attackPowerBonus: 0,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 15,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Ranged-Mystic family
  "starter-bow": {
    id: "starter-bow" as WeaponLoadoutId,
    name: "初心弓",
    weaponTypeId: "bow",
    attackPowerBonus: 1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 16,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-crossbow": {
    id: "starter-crossbow" as WeaponLoadoutId,
    name: "初心弩",
    weaponTypeId: "crossbow",
    attackPowerBonus: 2,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-fan": {
    id: "starter-fan" as WeaponLoadoutId,
    name: "初心扇",
    weaponTypeId: "fan",
    attackPowerBonus: 0,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 14,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-umbrella": {
    id: "starter-umbrella" as WeaponLoadoutId,
    name: "初心伞",
    weaponTypeId: "umbrella",
    attackPowerBonus: -1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 13,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
};

export const WEAPON_LOADOUT_DEFINITIONS = WEAPON_LOADOUT_DEFS as Record<WeaponLoadoutId, WeaponLoadoutDefinition>;

// ---- Spell Loadouts (15 spell branches × 1 starter each) ----
const SPELL_LOADOUT_DEFS: Record<any, SpellLoadoutDefinition> = {
  // Metal element
  "starter-metal-edge": {
    id: "starter-metal-edge" as SpellLoadoutId,
    name: "初心金锋",
    spellBranchId: "metal-edge",
    attackPowerBonus: 2,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 20,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-metal-guard": {
    id: "starter-metal-guard" as SpellLoadoutId,
    name: "初心金罡",
    spellBranchId: "metal-guard",
    attackPowerBonus: 0,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-metal-break": {
    id: "starter-metal-break" as SpellLoadoutId,
    name: "初心金破",
    spellBranchId: "metal-break",
    attackPowerBonus: 1,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 19,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Wood element
  "starter-wood-growth": {
    id: "starter-wood-growth" as SpellLoadoutId,
    name: "初心木生",
    spellBranchId: "wood-growth",
    attackPowerBonus: 0,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 16,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-wood-bind": {
    id: "starter-wood-bind" as SpellLoadoutId,
    name: "初心木缠",
    spellBranchId: "wood-bind",
    attackPowerBonus: 1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-wood-bloom": {
    id: "starter-wood-bloom" as SpellLoadoutId,
    name: "初心木茂",
    spellBranchId: "wood-bloom",
    attackPowerBonus: -1,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 15,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Water element
  "starter-water-frost": {
    id: "starter-water-frost" as SpellLoadoutId,
    name: "初心水寒",
    spellBranchId: "water-frost",
    attackPowerBonus: 1,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 19,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-water-illusion": {
    id: "starter-water-illusion" as SpellLoadoutId,
    name: "初心水幻",
    spellBranchId: "water-illusion",
    attackPowerBonus: 0,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 17,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-water-flow": {
    id: "starter-water-flow" as SpellLoadoutId,
    name: "初心水润",
    spellBranchId: "water-flow",
    attackPowerBonus: -1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 16,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Fire element
  "starter-fire-blaze": {
    id: "starter-fire-blaze" as SpellLoadoutId,
    name: "初心火炽",
    spellBranchId: "fire-blaze",
    attackPowerBonus: 3,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 22,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-fire-smelt": {
    id: "starter-fire-smelt" as SpellLoadoutId,
    name: "初心火炼",
    spellBranchId: "fire-smelt",
    attackPowerBonus: 1,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 19,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-fire-burst": {
    id: "starter-fire-burst" as SpellLoadoutId,
    name: "初心火激",
    spellBranchId: "fire-burst",
    attackPowerBonus: 2,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 20,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },

  // Earth element
  "starter-earth-wall": {
    id: "starter-earth-wall" as SpellLoadoutId,
    name: "初心土壁",
    spellBranchId: "earth-wall",
    attackPowerBonus: 0,
    coreSkillCategory: "tactic",
    coreSkillSpiritCost: 18,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-earth-suppress": {
    id: "starter-earth-suppress" as SpellLoadoutId,
    name: "初心土镇",
    spellBranchId: "earth-suppress",
    attackPowerBonus: 1,
    coreSkillCategory: "brute",
    coreSkillSpiritCost: 20,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
  "starter-earth-vein": {
    id: "starter-earth-vein" as SpellLoadoutId,
    name: "初心土脉",
    spellBranchId: "earth-vein",
    attackPowerBonus: -1,
    coreSkillCategory: "finesse",
    coreSkillSpiritCost: 17,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
  },
};

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
