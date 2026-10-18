import {
  computeEffectiveMainAttributes,
  createEmptyMainAttributeGrowth,
  deriveDetailedAttributes,
  deriveMainAttributes,
  physicalDefense,
  spellAttack,
  weaponAttack,
} from "./attributes.js";
import {
  getSpellLoadoutDefinition,
  getWeaponLoadoutDefinition,
  WEAPON_FAMILY_DEFINITIONS,
  WEAPON_TYPE_DEFINITIONS,
} from "./combat-loadouts.js";
import type { CombatSnapshot, Cultivator, SpellTier } from "./model.js";

export const buildCultivatorCombatSnapshot = (
  cultivator: Cultivator,
  escapeAllowed: boolean,
): CombatSnapshot => {
  const baselineMainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const mainAttrs = computeEffectiveMainAttributes(
    baselineMainAttrs,
    cultivator.mainAttributeGrowth ?? createEmptyMainAttributeGrowth(),
    cultivator.mainAttributePercentageBonus ?? 0,
  );
  const detailedAttrs = deriveDetailedAttributes(mainAttrs);
  const maxHp = Math.max(60, Math.round(80 + (mainAttrs.gengu * 2) + (mainAttrs.tipu * 0.5)));
  const spirit = cultivator.spiritualPower;
  const maxSpirit = cultivator.maxSpiritualPower;

  const weaponLoadout = cultivator.equippedWeaponLoadoutId
    ? getWeaponLoadoutDefinition(cultivator.equippedWeaponLoadoutId)
    : null;
  const spellLoadout = cultivator.equippedSpellLoadoutId
    ? getSpellLoadoutDefinition(cultivator.equippedSpellLoadoutId)
    : null;
  const wAtk = weaponAttack(mainAttrs) + (weaponLoadout?.attackPowerBonus ?? 0);
  const sAtk = spellAttack(mainAttrs) + (spellLoadout?.attackPowerBonus ?? 0);
  const defaultChannel: "weapon" | "spell" = sAtk > wAtk ? "spell" : "weapon";
  const defaultLoadout = defaultChannel === "weapon" ? weaponLoadout : spellLoadout;
  const defaultAttack = defaultChannel === "weapon" ? wAtk : sAtk;
  const defaultCoreSkillSpiritCost = defaultLoadout?.coreSkillSpiritCost ?? Math.max(1, Math.round(maxSpirit * 0.10));
  const defaultCoreSkillPreferredRoute = defaultLoadout?.coreSkillCategory ?? null;

  const weaponTier = (weaponLoadout?.weaponTier ?? 1) as SpellTier;
  const weaponFamilyId = weaponLoadout?.weaponFamilyId ?? null;
  const weaponTypeId = weaponLoadout?.weaponTypeId ?? null;
  const familyDef = weaponFamilyId ? WEAPON_FAMILY_DEFINITIONS[weaponFamilyId] : null;
  const typeDef = weaponTypeId ? WEAPON_TYPE_DEFINITIONS[weaponTypeId] : null;
  const applyBonusStat = (baseStat: number, bonusProfile: { stat: string; values: readonly number[] } | undefined): number => {
    if (!bonusProfile) return baseStat;
    return baseStat + (bonusProfile.values[weaponTier - 1] ?? 0);
  };
  let speed = Math.round(detailedAttrs.sudu);
  let hit = Math.round(detailedAttrs.mingzhong);
  let dodge = Math.round(detailedAttrs.shanbi);
  let crit = Math.round(detailedAttrs.huixin);
  let critDamage = Math.round(detailedAttrs.baoshang);
  let guardHeart = Math.round(detailedAttrs.huxin);
  let tenacity = 0;
  if (familyDef) {
    const b = familyDef.bonusProfile;
    speed = applyBonusStat(speed, b.stat1.stat === "speed" ? b.stat1 : b.stat2.stat === "speed" ? b.stat2 : undefined);
    hit = applyBonusStat(hit, b.stat1.stat === "hit" ? b.stat1 : b.stat2.stat === "hit" ? b.stat2 : undefined);
    dodge = applyBonusStat(dodge, b.stat1.stat === "dodge" ? b.stat1 : b.stat2.stat === "dodge" ? b.stat2 : undefined);
    crit = applyBonusStat(crit, b.stat1.stat === "crit" ? b.stat1 : b.stat2.stat === "crit" ? b.stat2 : undefined);
    critDamage = applyBonusStat(critDamage, b.stat1.stat === "critDamage" ? b.stat1 : b.stat2.stat === "critDamage" ? b.stat2 : undefined);
    guardHeart = applyBonusStat(guardHeart, b.stat1.stat === "guardHeart" ? b.stat1 : b.stat2.stat === "guardHeart" ? b.stat2 : undefined);
    tenacity += (b.stat1.stat === "tenacity" ? b.stat1.values[weaponTier - 1] ?? 0 : 0) + (b.stat2.stat === "tenacity" ? b.stat2.values[weaponTier - 1] ?? 0 : 0);
  }
  if (typeDef) {
    const tb = typeDef.typeBonusProfile;
    speed = applyBonusStat(speed, tb.stat === "speed" ? tb : undefined);
    hit = applyBonusStat(hit, tb.stat === "hit" ? tb : undefined);
    dodge = applyBonusStat(dodge, tb.stat === "dodge" ? tb : undefined);
    crit = applyBonusStat(crit, tb.stat === "crit" ? tb : undefined);
    critDamage = applyBonusStat(critDamage, tb.stat === "critDamage" ? tb : undefined);
    guardHeart = applyBonusStat(guardHeart, tb.stat === "guardHeart" ? tb : undefined);
    tenacity += tb.stat === "tenacity" ? tb.values[weaponTier - 1] ?? 0 : 0;
  }
  guardHeart += tenacity;

  return {
    hp: maxHp,
    maxHp,
    attack: defaultAttack,
    defense: physicalDefense(mainAttrs),
    speed,
    hit,
    dodge,
    crit,
    critDamage,
    guardHeart,
    spirit,
    maxSpirit,
    coreSkillSpiritCost: defaultCoreSkillSpiritCost,
    coreSkillPreferredRoute: defaultCoreSkillPreferredRoute,
    equippedLoadoutId: defaultLoadout?.id ?? null,
    basicAttackStatusHookIds: defaultLoadout?.basicAttackStatusHookIds ?? [],
    coreSkillStatusHookIds: defaultLoadout?.coreSkillStatusHookIds ?? [],
    escapeAllowed,
    weaponAttack: wAtk,
    spellAttack: sAtk,
    weaponLoadoutId: weaponLoadout?.id ?? null,
    spellLoadoutId: spellLoadout?.id ?? null,
    weaponCoreSkillSpiritCost: weaponLoadout?.coreSkillSpiritCost ?? 0,
    spellCoreSkillSpiritCost: spellLoadout?.coreSkillSpiritCost ?? 0,
    weaponCoreSkillPreferredRoute: weaponLoadout?.coreSkillCategory ?? null,
    spellCoreSkillPreferredRoute: spellLoadout?.coreSkillCategory ?? null,
    combatStatuses: [],
  };
};
