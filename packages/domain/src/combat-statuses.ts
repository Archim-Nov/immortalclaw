import type {
  CombatStatusDefinition,
  CombatStatusId,
  StatusHookDefinition,
  StatusHookId,
  SpellBranchId,
  SpellBranchDefinition,
  SpellTier,
  CombatStatusInstance,
  CombatActionType,
  WeaponLoadoutId,
  SpellLoadoutId,
  StatusEffectKind,
  StatusTargetSide,
} from "./model.js";

// ---- Combat Status IDs ----
// Layer 1: 5 element primary statuses
export const STATUS_ARMOR_BREAK = "armor-break" as CombatStatusId; // 裂甲
export const STATUS_ENTANGLE = "entangle" as CombatStatusId; // 缠绕
export const STATUS_REJUVENATION = "rejuvenation" as CombatStatusId; // 回春
export const STATUS_BURNING = "burning" as CombatStatusId; // 焚灼
export const STATUS_STONE_GUARD = "stone-guard" as CombatStatusId; // 岩甲

// Layer 2: 15 branch-specific secondary statuses
export const STATUS_GOLD_MARK = "gold-mark" as CombatStatusId; // 金锋刻印
export const STATUS_SHARPEN = "sharpen" as CombatStatusId; // 锐化
export const STATUS_SPELL_BREAK = "spell-break" as CombatStatusId; // 断法
export const STATUS_GROWTH_BLESSING = "growth-blessing" as CombatStatusId; // 生长祝福
export const STATUS_ROOTED = "rooted" as CombatStatusId; // 定根
export const STATUS_SPIRIT_BREATH = "spirit-breath" as CombatStatusId; // 生息
export const STATUS_FROSTBITE = "frostbite" as CombatStatusId; // 霜寒
export const STATUS_ILLUSION_BLUR = "illusion-blur" as CombatStatusId; // 幻惑
export const STATUS_SOFTEN_FORCE = "soften-force" as CombatStatusId; // 化劲
export const STATUS_MELT_ARMOR = "melt-armor" as CombatStatusId; // 熔甲
export const STATUS_IGNITE_MARK = "ignite-mark" as CombatStatusId; // 激燃标记
export const STATUS_FLAME_SEAL = "flame-seal" as CombatStatusId; // 烈焰印记
export const STATUS_SUPPRESSION = "suppression" as CombatStatusId; // 镇压
export const STATUS_STABILIZE = "stabilize" as CombatStatusId; // 稳固
export const STATUS_EARTH_WALL = "earth-wall" as CombatStatusId; // 地壁

// ---- 20 Combat Status Definitions ----
export const COMBAT_STATUS_DEFINITIONS: Record<CombatStatusId, CombatStatusDefinition> = {
  // === Layer 1: Element Primary Statuses ===
  [STATUS_ARMOR_BREAK]: {
    id: STATUS_ARMOR_BREAK,
    name: "裂甲",
    description: "降低目标防御",
    targetSide: "enemy",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "defense_down",
    tierValues: [6, 8, 10, 12, 14], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_ENTANGLE]: {
    id: STATUS_ENTANGLE,
    name: "缠绕",
    description: "降低目标先手和闪避",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "initiative_down",
    tierValues: [8, 12, 16, 20, 24], // flat initiative
    expiryMode: "round_decay",
    triggerWindow: "passive",
    secondaryEffects: {
      effectKind: "dodge_down",
      tierValues: [3, 4, 5, 6, 7],
    },
  },
  [STATUS_REJUVENATION]: {
    id: STATUS_REJUVENATION,
    name: "回春",
    description: "每回合结束回复气血",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "heal_over_time",
    tierValues: [3, 4, 5, 6, 7], // percent of maxHp
    expiryMode: "round_decay",
    triggerWindow: "round_end",
  },
  [STATUS_BURNING]: {
    id: STATUS_BURNING,
    name: "焚灼",
    description: "每回合结束造成持续伤害",
    targetSide: "enemy",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "damage_over_time",
    tierValues: [18, 24, 30, 36, 42], // percent of spellAttack
    expiryMode: "round_decay",
    triggerWindow: "round_end",
  },
  [STATUS_STONE_GUARD]: {
    id: STATUS_STONE_GUARD,
    name: "岩甲",
    description: "降低自身受到的伤害",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "damage_taken_down",
    tierValues: [6, 8, 10, 12, 14], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },

  // === Layer 2: Branch Secondary Statuses ===
  [STATUS_GOLD_MARK]: {
    id: STATUS_GOLD_MARK,
    name: "金锋刻印",
    description: "下次受到核心技伤害提高",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "next_core_skill_damage_taken_up",
    tierValues: [8, 10, 12, 14, 16], // percent
    expiryMode: "consume_on_trigger",
    triggerWindow: "on_core_skill_damage_taken",
  },
  [STATUS_SHARPEN]: {
    id: STATUS_SHARPEN,
    name: "锐化",
    description: "提高自身命中和会心",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "accuracy_up",
    tierValues: [4, 5, 6, 7, 8], // flat accuracy
    expiryMode: "round_decay",
    triggerWindow: "passive",
    secondaryEffects: {
      effectKind: "crit_up",
      tierValues: [2, 3, 4, 5, 6], // percent
    },
  },
  [STATUS_SPELL_BREAK]: {
    id: STATUS_SPELL_BREAK,
    name: "断法",
    description: "下次核心技伤害降低",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "next_core_skill_damage_taken_down",
    tierValues: [12, 15, 18, 21, 24], // percent
    expiryMode: "consume_on_trigger",
    triggerWindow: "on_core_skill_damage_taken",
  },
  [STATUS_GROWTH_BLESSING]: {
    id: STATUS_GROWTH_BLESSING,
    name: "生长祝福",
    description: "提高自身伤害和治疗效率",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "damage_and_healing_up",
    tierValues: [4, 6, 8, 10, 12], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_ROOTED]: {
    id: STATUS_ROOTED,
    name: "定根",
    description: "降低目标先手",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "initiative_down_extra",
    tierValues: [12, 16, 20, 24, 28], // flat initiative
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_SPIRIT_BREATH]: {
    id: STATUS_SPIRIT_BREATH,
    name: "生息",
    description: "每回合结束回复灵力",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "spirit_regen",
    tierValues: [4, 6, 8, 10, 12], // flat spirit
    expiryMode: "round_decay",
    triggerWindow: "round_end",
  },
  [STATUS_FROSTBITE]: {
    id: STATUS_FROSTBITE,
    name: "霜寒",
    description: "降低目标先手",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "initiative_down_extra",
    tierValues: [10, 14, 18, 22, 26], // flat initiative
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_ILLUSION_BLUR]: {
    id: STATUS_ILLUSION_BLUR,
    name: "幻惑",
    description: "降低目标命中和会心",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "accuracy_down",
    tierValues: [4, 5, 6, 7, 8], // flat accuracy
    expiryMode: "round_decay",
    triggerWindow: "passive",
    secondaryEffects: {
      effectKind: "crit_down",
      tierValues: [2, 3, 4, 5, 6], // percent
    },
  },
  [STATUS_SOFTEN_FORCE]: {
    id: STATUS_SOFTEN_FORCE,
    name: "化劲",
    description: "下次受到伤害降低",
    targetSide: "self",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "next_damage_taken_down",
    tierValues: [10, 12, 14, 16, 18], // percent
    expiryMode: "consume_on_trigger",
    triggerWindow: "on_damage_taken",
  },
  [STATUS_MELT_ARMOR]: {
    id: STATUS_MELT_ARMOR,
    name: "熔甲",
    description: "额外降低目标防御",
    targetSide: "enemy",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "defense_down",
    tierValues: [4, 6, 8, 10, 12], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_IGNITE_MARK]: {
    id: STATUS_IGNITE_MARK,
    name: "激燃标记",
    description: "下次受到核心技伤害提高",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "next_core_skill_damage_taken_up",
    tierValues: [10, 13, 16, 19, 22], // percent
    expiryMode: "consume_on_trigger",
    triggerWindow: "on_core_skill_damage_taken",
  },
  [STATUS_FLAME_SEAL]: {
    id: STATUS_FLAME_SEAL,
    name: "烈焰印记",
    description: "提高后续火系伤害",
    targetSide: "enemy",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "fire_damage_taken_up",
    tierValues: [8, 10, 12, 14, 16], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
  },
  [STATUS_SUPPRESSION]: {
    id: STATUS_SUPPRESSION,
    name: "镇压",
    description: "降低目标伤害和先手",
    targetSide: "enemy",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "damage_dealt_down",
    tierValues: [4, 6, 8, 10, 12], // percent
    expiryMode: "round_decay",
    triggerWindow: "passive",
    secondaryEffects: {
      effectKind: "initiative_down",
      tierValues: [8, 12, 16, 20, 24],
    },
  },
  [STATUS_STABILIZE]: {
    id: STATUS_STABILIZE,
    name: "稳固",
    description: "提高自身护心和闪避",
    targetSide: "self",
    durationRounds: 2,
    stacking: "refresh",
    effectKind: "guard_heart_up",
    tierValues: [4, 5, 6, 7, 8], // flat/percent guardHeart
    expiryMode: "round_decay",
    triggerWindow: "passive",
    secondaryEffects: {
      effectKind: "dodge_up",
      tierValues: [4, 5, 6, 7, 8],
    },
  },
  [STATUS_EARTH_WALL]: {
    id: STATUS_EARTH_WALL,
    name: "地壁",
    description: "下次受到伤害降低",
    targetSide: "self",
    durationRounds: 1,
    stacking: "refresh",
    effectKind: "next_damage_taken_down",
    tierValues: [12, 15, 18, 21, 24], // percent
    expiryMode: "consume_on_trigger",
    triggerWindow: "on_damage_taken",
  },
} as Record<CombatStatusId, CombatStatusDefinition>;

// ---- Spell Branch to Status Mapping ----
export const SPELL_BRANCH_STATUS_MAP: Record<SpellBranchId, SpellBranchDefinition> = {
  "metal-edge": { id: "metal-edge", element: "metal", primaryStatusId: STATUS_ARMOR_BREAK, secondaryStatusId: STATUS_GOLD_MARK },
  "metal-guard": { id: "metal-guard", element: "metal", primaryStatusId: STATUS_ARMOR_BREAK, secondaryStatusId: STATUS_SHARPEN },
  "metal-break": { id: "metal-break", element: "metal", primaryStatusId: STATUS_ARMOR_BREAK, secondaryStatusId: STATUS_SPELL_BREAK },
  "wood-growth": { id: "wood-growth", element: "wood", primaryStatusId: STATUS_ENTANGLE, secondaryStatusId: STATUS_GROWTH_BLESSING },
  "wood-bind": { id: "wood-bind", element: "wood", primaryStatusId: STATUS_ENTANGLE, secondaryStatusId: STATUS_ROOTED },
  "wood-bloom": { id: "wood-bloom", element: "wood", primaryStatusId: STATUS_ENTANGLE, secondaryStatusId: STATUS_SPIRIT_BREATH },
  "water-frost": { id: "water-frost", element: "water", primaryStatusId: STATUS_REJUVENATION, secondaryStatusId: STATUS_FROSTBITE },
  "water-illusion": { id: "water-illusion", element: "water", primaryStatusId: STATUS_REJUVENATION, secondaryStatusId: STATUS_ILLUSION_BLUR },
  "water-flow": { id: "water-flow", element: "water", primaryStatusId: STATUS_REJUVENATION, secondaryStatusId: STATUS_SOFTEN_FORCE },
  "fire-blaze": { id: "fire-blaze", element: "fire", primaryStatusId: STATUS_BURNING, secondaryStatusId: STATUS_MELT_ARMOR },
  "fire-smelt": { id: "fire-smelt", element: "fire", primaryStatusId: STATUS_BURNING, secondaryStatusId: STATUS_FLAME_SEAL },
  "fire-burst": { id: "fire-burst", element: "fire", primaryStatusId: STATUS_BURNING, secondaryStatusId: STATUS_IGNITE_MARK },
  "earth-wall": { id: "earth-wall", element: "earth", primaryStatusId: STATUS_STONE_GUARD, secondaryStatusId: STATUS_STABILIZE },
  "earth-suppress": { id: "earth-suppress", element: "earth", primaryStatusId: STATUS_STONE_GUARD, secondaryStatusId: STATUS_SUPPRESSION },
  "earth-vein": { id: "earth-vein", element: "earth", primaryStatusId: STATUS_STONE_GUARD, secondaryStatusId: STATUS_EARTH_WALL },
};

// ---- Status Hook Definitions ----
// Each spell branch has a basic-attack hook (primary only) and core-skill hook (primary + secondary)
function buildSpellHooks(): Record<StatusHookId, StatusHookDefinition> {
  const hooks: Record<StatusHookId, StatusHookDefinition> = {};
  const branchIds = Object.keys(SPELL_BRANCH_STATUS_MAP) as SpellBranchId[];
  for (const branchId of branchIds) {
    const branch = SPELL_BRANCH_STATUS_MAP[branchId];
    const primaryDef = COMBAT_STATUS_DEFINITIONS[branch.primaryStatusId];
    const secondaryDef = COMBAT_STATUS_DEFINITIONS[branch.secondaryStatusId];

    const basicHookId = `spell:${branchId}:basic` as StatusHookId;
    hooks[basicHookId] = {
      id: basicHookId,
      applications: [
        { statusId: branch.primaryStatusId, targetSide: primaryDef.targetSide },
      ],
    };

    const coreHookId = `spell:${branchId}:core` as StatusHookId;
    hooks[coreHookId] = {
      id: coreHookId,
      applications: [
        { statusId: branch.primaryStatusId, targetSide: primaryDef.targetSide },
        { statusId: branch.secondaryStatusId, targetSide: secondaryDef.targetSide },
      ],
    };
  }
  return hooks;
}

export const STATUS_HOOK_DEFINITIONS: Record<StatusHookId, StatusHookDefinition> = buildSpellHooks();

// ---- Status Runtime Helpers ----

export function getCombatStatusDefinition(statusId: CombatStatusId): CombatStatusDefinition | null {
  return COMBAT_STATUS_DEFINITIONS[statusId] ?? null;
}

export function getStatusHookDefinition(hookId: StatusHookId): StatusHookDefinition | null {
  return STATUS_HOOK_DEFINITIONS[hookId] ?? null;
}

export function resolveStatusTierValue(
  statusDef: CombatStatusDefinition,
  tier: SpellTier,
): { magnitude: number; secondaryMagnitude?: number } {
  const magnitude = statusDef.tierValues[tier - 1];
  const secondaryMagnitude = statusDef.secondaryEffects
    ? statusDef.secondaryEffects.tierValues[tier - 1]
    : undefined;
  return { magnitude, secondaryMagnitude };
}

export function applyOrRefreshStatus(
  statuses: CombatStatusInstance[],
  statusDef: CombatStatusDefinition,
  tier: SpellTier,
  sourceLoadoutId: WeaponLoadoutId | SpellLoadoutId,
  sourceActionType: CombatActionType,
): { statuses: CombatStatusInstance[]; isRefresh: boolean } {
  const { magnitude, secondaryMagnitude } = resolveStatusTierValue(statusDef, tier);
  const existingIdx = statuses.findIndex((s) => s.id === statusDef.id);

  if (existingIdx >= 0) {
    // Refresh: replace duration, magnitude, source
    const updated = statuses.map((s, i) =>
      i === existingIdx
        ? {
            ...s,
            remainingRounds: statusDef.durationRounds,
            magnitude,
            secondaryMagnitude,
            sourceLoadoutId,
            sourceActionType,
            consumed: false,
          }
        : s,
    );
    return { statuses: updated, isRefresh: true };
  }

  // New instance
  const instance: CombatStatusInstance = {
    id: statusDef.id,
    name: statusDef.name,
    sourceLoadoutId,
    sourceActionType,
    remainingRounds: statusDef.durationRounds,
    magnitude,
    secondaryMagnitude,
    effectKind: statusDef.effectKind,
    secondaryEffects: statusDef.secondaryEffects
      ? { effectKind: statusDef.secondaryEffects.effectKind, magnitude: secondaryMagnitude! }
      : undefined,
    expiryMode: statusDef.expiryMode,
    triggerWindow: statusDef.triggerWindow,
    consumed: false,
  };
  return { statuses: [...statuses, instance], isRefresh: false };
}

export interface StatusModifiers {
  defensePercent: number;
  initiativeFlat: number;
  dodgeFlat: number;
  accuracyFlat: number;
  critPercent: number;
  damageTakenPercent: number;
  damageDealtPercent: number;
  guardHeartFlat: number;
  healingPowerPercent: number;
  coreSkillDamageTakenPercent: number;
  fireDamageTakenPercent: number;
}

export function gatherPassiveModifiers(statuses: readonly CombatStatusInstance[]): StatusModifiers {
  const mods: StatusModifiers = {
    defensePercent: 0,
    initiativeFlat: 0,
    dodgeFlat: 0,
    accuracyFlat: 0,
    critPercent: 0,
    damageTakenPercent: 0,
    damageDealtPercent: 0,
    guardHeartFlat: 0,
    healingPowerPercent: 0,
    coreSkillDamageTakenPercent: 0,
    fireDamageTakenPercent: 0,
  };

  for (const s of statuses) {
    if (s.consumed) continue;
    if (s.triggerWindow !== "passive") continue;

    applyEffectToModifiers(mods, s.effectKind, s.magnitude);
    if (s.secondaryEffects) {
      applyEffectToModifiers(mods, s.secondaryEffects.effectKind, s.secondaryEffects.magnitude);
    }
  }
  return mods;
}

function applyEffectToModifiers(mods: StatusModifiers, kind: StatusEffectKind, magnitude: number): void {
  switch (kind) {
    case "defense_down":
      mods.defensePercent -= magnitude;
      break;
    case "initiative_down":
    case "initiative_down_extra":
      mods.initiativeFlat -= magnitude;
      break;
    case "dodge_down":
      mods.dodgeFlat -= magnitude;
      break;
    case "dodge_up":
      mods.dodgeFlat += magnitude;
      break;
    case "accuracy_up":
      mods.accuracyFlat += magnitude;
      break;
    case "accuracy_down":
      mods.accuracyFlat -= magnitude;
      break;
    case "crit_up":
      mods.critPercent += magnitude;
      break;
    case "crit_down":
      mods.critPercent -= magnitude;
      break;
    case "damage_taken_down":
      mods.damageTakenPercent -= magnitude;
      break;
    case "core_skill_damage_taken_up":
    case "next_core_skill_damage_taken_up":
      mods.coreSkillDamageTakenPercent += magnitude;
      break;
    case "core_skill_damage_taken_down":
    case "next_core_skill_damage_taken_down":
      mods.coreSkillDamageTakenPercent -= magnitude;
      break;
    case "fire_damage_taken_up":
    case "next_fire_damage_taken_up":
      mods.fireDamageTakenPercent += magnitude;
      break;
    case "healing_power_up":
      mods.healingPowerPercent += magnitude;
      break;
    case "damage_dealt_down":
      mods.damageDealtPercent -= magnitude;
      break;
    case "guard_heart_up":
      mods.guardHeartFlat += magnitude;
      break;
    case "damage_and_healing_up":
      mods.damageDealtPercent += magnitude;
      mods.healingPowerPercent += magnitude;
      break;
    case "next_damage_taken_down":
      mods.damageTakenPercent -= magnitude;
      break;
    default:
      break;
  }
}

export function gatherConsumableModifiers(
  statuses: CombatStatusInstance[],
  event: "on_damage_taken" | "on_core_skill_damage_taken" | "on_fire_damage_taken",
): { modifiers: StatusModifiers; consumed: CombatStatusId[] } {
  const mods: StatusModifiers = {
    defensePercent: 0,
    initiativeFlat: 0,
    dodgeFlat: 0,
    accuracyFlat: 0,
    critPercent: 0,
    damageTakenPercent: 0,
    damageDealtPercent: 0,
    guardHeartFlat: 0,
    healingPowerPercent: 0,
    coreSkillDamageTakenPercent: 0,
    fireDamageTakenPercent: 0,
  };
  const consumed: CombatStatusId[] = [];

  for (const s of statuses) {
    if (s.consumed) continue;
    if (s.expiryMode !== "consume_on_trigger") continue;
    if (s.triggerWindow !== event) continue;

    applyEffectToModifiers(mods, s.effectKind, s.magnitude);
    consumed.push(s.id);
  }
  return { modifiers: mods, consumed };
}

export function markConsumed(statuses: CombatStatusInstance[], consumedIds: readonly CombatStatusId[]): CombatStatusInstance[] {
  if (consumedIds.length === 0) return statuses;
  return statuses.map((s) =>
    consumedIds.includes(s.id) ? { ...s, consumed: true } : s,
  );
}

export interface TickEvent {
  statusId: CombatStatusId;
  statusName: string;
  effectKind: StatusEffectKind;
  value: number;
}

export function processRoundEndTicks(
  statuses: CombatStatusInstance[],
  currentHp: number,
  maxHp: number,
  currentSpirit: number,
  maxSpirit: number,
  spellAttack: number,
): { hp: number; spirit: number; ticks: TickEvent[] } {
  let hp = currentHp;
  let spirit = currentSpirit;
  const ticks: TickEvent[] = [];

  for (const s of statuses) {
    if (s.consumed) continue;
    if (s.triggerWindow !== "round_end") continue;

    if (s.effectKind === "heal_over_time") {
      const healAmount = Math.max(1, Math.round((s.magnitude / 100) * maxHp));
      const actualHeal = Math.min(healAmount, maxHp - hp);
      hp += actualHeal;
      ticks.push({ statusId: s.id, statusName: s.name, effectKind: s.effectKind, value: actualHeal });
    } else if (s.effectKind === "damage_over_time") {
      const damage = Math.max(1, Math.round((s.magnitude / 100) * spellAttack));
      hp = Math.max(0, hp - damage);
      ticks.push({ statusId: s.id, statusName: s.name, effectKind: s.effectKind, value: damage });
    } else if (s.effectKind === "spirit_regen") {
      const regenAmount = Math.min(s.magnitude, maxSpirit - spirit);
      spirit += regenAmount;
      ticks.push({ statusId: s.id, statusName: s.name, effectKind: s.effectKind, value: regenAmount });
    }
  }
  return { hp, spirit, ticks };
}

export function decayAndCleanStatuses(statuses: CombatStatusInstance[]): {
  remaining: CombatStatusInstance[];
  expired: { statusId: CombatStatusId; statusName: string }[];
} {
  const expired: { statusId: CombatStatusId; statusName: string }[] = [];
  const remaining: CombatStatusInstance[] = [];

  for (const s of statuses) {
    if (s.consumed) {
      expired.push({ statusId: s.id, statusName: s.name });
      continue;
    }
    const newRemaining = s.remainingRounds - 1;
    if (newRemaining <= 0) {
      expired.push({ statusId: s.id, statusName: s.name });
    } else {
      remaining.push({ ...s, remainingRounds: newRemaining });
    }
  }
  return { remaining, expired };
}
