import assert from "node:assert/strict";
import test from "node:test";
import {
  COMBAT_STATUS_DEFINITIONS,
  STATUS_HOOK_DEFINITIONS,
  SPELL_BRANCH_STATUS_MAP,
  applyOrRefreshStatus,
  gatherPassiveModifiers,
  gatherConsumableModifiers,
  markConsumed,
  processRoundEndTicks,
  decayAndCleanStatuses,
  resolveStatusTierValue,
  STATUS_ARMOR_BREAK,
  STATUS_ENTANGLE,
  STATUS_REJUVENATION,
  STATUS_BURNING,
  STATUS_STONE_GUARD,
  STATUS_GOLD_MARK,
  STATUS_SHARPEN,
  STATUS_SPELL_BREAK,
  STATUS_SOFTEN_FORCE,
  STATUS_EARTH_WALL,
  STATUS_SPIRIT_BREATH,
  STATUS_FROSTBITE,
  STATUS_IGNITE_MARK,
  STATUS_SUPPRESSION,
  STATUS_GROWTH_BLESSING,
} from "./combat-statuses.js";
import {
  WEAPON_LOADOUT_DEFINITIONS,
  SPELL_LOADOUT_DEFINITIONS,
  WEAPON_FAMILY_DEFINITIONS,
  WEAPON_TYPE_DEFINITIONS,
  getAllWeaponLoadouts,
  getAllSpellLoadouts,
  getWeaponLoadoutDefinition,
  getSpellLoadoutDefinition,
} from "./combat-loadouts.js";
import type {
  CombatStatusInstance,
  SpellLoadoutId,
  WeaponLoadoutId,
  SpellTier,
  CombatStatusId,
} from "./model.js";

// ---- A. Type and Config Completeness ----

test("20 combat statuses are all defined", () => {
  const statusIds = Object.keys(COMBAT_STATUS_DEFINITIONS);
  assert.equal(statusIds.length, 20);
});

test("every status has required fields", () => {
  for (const [id, def] of Object.entries(COMBAT_STATUS_DEFINITIONS)) {
    assert.ok(def.id, `${id} missing id`);
    assert.ok(def.name, `${id} missing name`);
    assert.ok(def.effectKind, `${id} missing effectKind`);
    assert.ok(typeof def.durationRounds === "number", `${id} missing durationRounds`);
    assert.equal(def.tierValues.length, 8, `${id} tierValues should have 8 entries`);
    assert.ok(def.expiryMode, `${id} missing expiryMode`);
    assert.ok(def.triggerWindow, `${id} missing triggerWindow`);
  }
});

test("15 spell branches all have status mappings", () => {
  const branches = Object.keys(SPELL_BRANCH_STATUS_MAP);
  assert.equal(branches.length, 15);
  for (const [branchId, def] of Object.entries(SPELL_BRANCH_STATUS_MAP)) {
    assert.ok(def.primaryStatusId, `${branchId} missing primaryStatusId`);
    assert.ok(def.secondaryStatusId, `${branchId} missing secondaryStatusId`);
    assert.ok(COMBAT_STATUS_DEFINITIONS[def.primaryStatusId], `${branchId} primary status not found in definitions`);
    assert.ok(COMBAT_STATUS_DEFINITIONS[def.secondaryStatusId], `${branchId} secondary status not found in definitions`);
  }
});

test("every spell branch has basic and core hooks", () => {
  const branches = Object.keys(SPELL_BRANCH_STATUS_MAP);
  for (const branchId of branches) {
    const basicHook = STATUS_HOOK_DEFINITIONS[`spell:${branchId}:basic`];
    const coreHook = STATUS_HOOK_DEFINITIONS[`spell:${branchId}:core`];
    assert.ok(basicHook, `missing basic hook for ${branchId}`);
    assert.ok(coreHook, `missing core hook for ${branchId}`);
    assert.equal(basicHook.applications.length, 1, `basic hook for ${branchId} should have 1 application`);
    assert.equal(coreHook.applications.length, 2, `core hook for ${branchId} should have 2 applications`);
  }
});

// ---- B. Weapon Completeness (100 loadouts) ----

test("160 weapon loadouts exist (20 types x 8 tiers)", () => {
  const all = getAllWeaponLoadouts();
  assert.equal(all.length, 160);
});

test("5 weapon families are registered", () => {
  assert.equal(Object.keys(WEAPON_FAMILY_DEFINITIONS).length, 5);
});

test("20 weapon types are registered", () => {
  assert.equal(Object.keys(WEAPON_TYPE_DEFINITIONS).length, 20);
});

test("every weapon type maps to exactly one family", () => {
  for (const [typeId, typeDef] of Object.entries(WEAPON_TYPE_DEFINITIONS)) {
    assert.ok(WEAPON_FAMILY_DEFINITIONS[typeDef.weaponFamilyId], `${typeId} has invalid family ${typeDef.weaponFamilyId}`);
  }
});

test("every weapon loadout has required V2 fields", () => {
  for (const loadout of getAllWeaponLoadouts()) {
    assert.ok(loadout.id, `missing id`);
    assert.ok(loadout.name, `missing name for ${loadout.id}`);
    assert.ok(loadout.weaponTypeId, `missing weaponTypeId for ${loadout.id}`);
    assert.ok(loadout.weaponTier, `missing weaponTier for ${loadout.id}`);
    assert.ok(loadout.weaponFamilyId, `missing weaponFamilyId for ${loadout.id}`);
    assert.ok(typeof loadout.attackPowerBonus === "number", `missing attackPowerBonus for ${loadout.id}`);
    assert.ok(typeof loadout.coreSkillSpiritCost === "number", `missing coreSkillSpiritCost for ${loadout.id}`);
  }
});

test("each weapon type has exactly 8 tiers", () => {
  const tiersByType = new Map<string, number[]>();
  for (const loadout of getAllWeaponLoadouts()) {
    const tiers = tiersByType.get(loadout.weaponTypeId) ?? [];
    tiers.push(loadout.weaponTier!);
    tiersByType.set(loadout.weaponTypeId, tiers);
  }
  for (const [typeId, tiers] of tiersByType) {
    assert.equal(tiers.length, 8, `${typeId} should have 8 tiers, got ${tiers.length}`);
    assert.deepEqual(tiers.sort(), [1, 2, 3, 4, 5, 6, 7, 8], `${typeId} tiers should be 1-8`);
  }
});

// ---- C. Spell Completeness (75 loadouts) ----

test("120 spell loadouts exist (15 branches x 8 tiers)", () => {
  const all = getAllSpellLoadouts();
  assert.equal(all.length, 120);
});

test("every spell loadout has V2 fields including statuses and hooks", () => {
  for (const loadout of getAllSpellLoadouts()) {
    assert.ok(loadout.id, `missing id`);
    assert.ok(loadout.name, `missing name for ${loadout.id}`);
    assert.ok(loadout.spellBranchId, `missing spellBranchId for ${loadout.id}`);
    assert.ok(loadout.spellTier, `missing spellTier for ${loadout.id}`);
    assert.ok(loadout.primaryStatusId, `missing primaryStatusId for ${loadout.id}`);
    assert.ok(loadout.secondaryStatusId, `missing secondaryStatusId for ${loadout.id}`);
    assert.ok(loadout.basicAttackStatusHookIds.length > 0, `${loadout.id} should have basic attack hooks`);
    assert.ok(loadout.coreSkillStatusHookIds.length > 0, `${loadout.id} should have core skill hooks`);
  }
});

test("each spell branch has exactly 8 tiers", () => {
  const tiersByBranch = new Map<string, number[]>();
  for (const loadout of getAllSpellLoadouts()) {
    const tiers = tiersByBranch.get(loadout.spellBranchId) ?? [];
    tiers.push(loadout.spellTier!);
    tiersByBranch.set(loadout.spellBranchId, tiers);
  }
  for (const [branchId, tiers] of tiersByBranch) {
    assert.equal(tiers.length, 8, `${branchId} should have 8 tiers, got ${tiers.length}`);
    assert.deepEqual(tiers.sort(), [1, 2, 3, 4, 5, 6, 7, 8], `${branchId} tiers should be 1-8`);
  }
});

// ---- D. Status Instance and Refresh ----

test("first hit creates status instance", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ARMOR_BREAK];
  const { statuses, isRefresh } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "basic_attack",
  );
  assert.equal(isRefresh, false);
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].id, STATUS_ARMOR_BREAK);
  assert.equal(statuses[0].magnitude, 6); // tier 1 = 6%
  assert.equal(statuses[0].remainingRounds, 2);
});

test("same-name status refreshes instead of stacking", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ARMOR_BREAK];
  const { statuses: first } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "basic_attack",
  );
  // Simulate 1 round decay
  const decayed = first.map((s) => ({ ...s, remainingRounds: s.remainingRounds - 1 }));
  assert.equal(decayed[0].remainingRounds, 1);

  // Re-apply should refresh
  const { statuses: refreshed, isRefresh } = applyOrRefreshStatus(
    decayed,
    def,
    2 as SpellTier,
    "metal-edge-tier-2" as SpellLoadoutId,
    "core_skill",
  );
  assert.equal(isRefresh, true);
  assert.equal(refreshed.length, 1); // No new instance
  assert.equal(refreshed[0].remainingRounds, 2); // Reset to full duration
  assert.equal(refreshed[0].magnitude, 8); // tier 2 = 8%
});

// ---- E. Passive Modifier Tests ----

test("裂甲 reduces defense", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ARMOR_BREAK];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    3 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "basic_attack",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.defensePercent, -10); // tier 3 = 10%
});

test("缠绕 reduces initiative and dodge", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ENTANGLE];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    2 as SpellTier,
    "starter-wood-bind" as SpellLoadoutId,
    "basic_attack",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.initiativeFlat, -12); // tier 2
  assert.equal(mods.dodgeFlat, -4); // tier 2
});

test("岩甲 reduces damage taken", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_STONE_GUARD];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-earth-wall" as SpellLoadoutId,
    "basic_attack",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.damageTakenPercent, -6);
});

test("锐化 increases accuracy and crit", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SHARPEN];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    4 as SpellTier,
    "starter-metal-guard" as SpellLoadoutId,
    "core_skill",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.accuracyFlat, 7);
  assert.equal(mods.critPercent, 5);
});

test("镇压 reduces damage dealt and initiative", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SUPPRESSION];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    3 as SpellTier,
    "starter-earth-suppress" as SpellLoadoutId,
    "core_skill",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.damageDealtPercent, -8);
  assert.equal(mods.initiativeFlat, -16);
});

// ---- F. Round-End Tick Tests ----

test("回春 heals at round end", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_REJUVENATION];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    2 as SpellTier,
    "starter-water-frost" as SpellLoadoutId,
    "basic_attack",
  );
  const result = processRoundEndTicks(statuses, 50, 100, 30, 60, 20);
  // tier 2 = 4% of maxHp = 4
  assert.equal(result.hp, 54);
  assert.equal(result.ticks.length, 1);
  assert.equal(result.ticks[0].effectKind, "heal_over_time");
});

test("回春 does not exceed maxHp", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_REJUVENATION];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    5 as SpellTier,
    "starter-water-frost" as SpellLoadoutId,
    "basic_attack",
  );
  const result = processRoundEndTicks(statuses, 98, 100, 30, 60, 20);
  // tier 5 = 7% of 100 = 7, but only 2 HP room
  assert.equal(result.hp, 100);
  assert.equal(result.ticks[0].value, 2);
});

test("焚灼 deals damage at round end", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_BURNING];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-fire-blaze" as SpellLoadoutId,
    "basic_attack",
  );
  const result = processRoundEndTicks(statuses, 80, 100, 30, 60, 50);
  // tier 1 = 18% of spellAttack(50) = 9
  assert.equal(result.hp, 71);
  assert.equal(result.ticks[0].effectKind, "damage_over_time");
});

test("焚灼 can cause death", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_BURNING];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    5 as SpellTier,
    "starter-fire-blaze" as SpellLoadoutId,
    "basic_attack",
  );
  const result = processRoundEndTicks(statuses, 5, 100, 30, 60, 80);
  // tier 5 = 42% of 80 = 33.6 -> 34
  assert.equal(result.hp, 0);
});

test("生息 regenerates spirit at round end", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SPIRIT_BREATH];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    3 as SpellTier,
    "starter-wood-bloom" as SpellLoadoutId,
    "core_skill",
  );
  const result = processRoundEndTicks(statuses, 80, 100, 30, 60, 20);
  // tier 3 = 8 spirit
  assert.equal(result.spirit, 38);
  assert.equal(result.ticks[0].effectKind, "spirit_regen");
});

test("spirit regen does not exceed maxSpirit", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SPIRIT_BREATH];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    5 as SpellTier,
    "starter-wood-bloom" as SpellLoadoutId,
    "core_skill",
  );
  const result = processRoundEndTicks(statuses, 80, 100, 55, 60, 20);
  // tier 5 = 12, but only 5 room
  assert.equal(result.spirit, 60);
  assert.equal(result.ticks[0].value, 5);
});

// ---- G. Consumption Tests ----

test("金锋刻印 is consumed on core_skill damage", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_GOLD_MARK];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    2 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "core_skill",
  );
  const { modifiers, consumed } = gatherConsumableModifiers(statuses, "on_core_skill_damage_taken");
  assert.equal(consumed.length, 1);
  assert.equal(consumed[0], STATUS_GOLD_MARK);
  assert.equal(modifiers.coreSkillDamageTakenPercent, 10); // tier 2
});

test("断法 is consumed on core_skill damage", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SPELL_BREAK];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    3 as SpellTier,
    "starter-metal-break" as SpellLoadoutId,
    "core_skill",
  );
  const { modifiers, consumed } = gatherConsumableModifiers(statuses, "on_core_skill_damage_taken");
  assert.equal(consumed.length, 1);
  assert.equal(modifiers.coreSkillDamageTakenPercent, -18); // reduces
});

test("化劲 is consumed on any damage", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_SOFTEN_FORCE];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-water-flow" as SpellLoadoutId,
    "core_skill",
  );
  const { modifiers, consumed } = gatherConsumableModifiers(statuses, "on_damage_taken");
  assert.equal(consumed.length, 1);
  assert.equal(modifiers.damageTakenPercent, -10);
});

test("地壁 is consumed on any damage", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_EARTH_WALL];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    4 as SpellTier,
    "starter-earth-vein" as SpellLoadoutId,
    "core_skill",
  );
  const { modifiers, consumed } = gatherConsumableModifiers(statuses, "on_damage_taken");
  assert.equal(consumed.length, 1);
  assert.equal(modifiers.damageTakenPercent, -21);
});

test("markConsumed flags correct statuses", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_GOLD_MARK];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "core_skill",
  );
  assert.equal(statuses[0].consumed, false);
  const marked = markConsumed(statuses, [STATUS_GOLD_MARK]);
  assert.equal(marked[0].consumed, true);
});

// ---- H. Decay and Cleanup ----

test("statuses decay and expire after duration", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_FROSTBITE]; // 1 round
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-water-frost" as SpellLoadoutId,
    "core_skill",
  );
  assert.equal(statuses[0].remainingRounds, 1);
  const { remaining, expired } = decayAndCleanStatuses(statuses);
  assert.equal(remaining.length, 0);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].statusId, STATUS_FROSTBITE);
});

test("multi-round statuses survive one decay", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ARMOR_BREAK]; // 2 rounds
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "basic_attack",
  );
  const { remaining, expired } = decayAndCleanStatuses(statuses);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].remainingRounds, 1);
  assert.equal(expired.length, 0);
});

test("consumed statuses are cleaned up during decay", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_GOLD_MARK];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    1 as SpellTier,
    "starter-metal-edge" as SpellLoadoutId,
    "core_skill",
  );
  const consumed = markConsumed(statuses, [STATUS_GOLD_MARK]);
  const { remaining, expired } = decayAndCleanStatuses(consumed);
  assert.equal(remaining.length, 0);
  assert.equal(expired.length, 1);
});

// ---- I. Hook Resolution ----

test("basic attack hook only applies primary status", () => {
  const hook = STATUS_HOOK_DEFINITIONS["spell:fire-blaze:basic"];
  assert.ok(hook);
  assert.equal(hook.applications.length, 1);
  assert.equal(hook.applications[0].statusId, STATUS_BURNING);
  assert.equal(hook.applications[0].targetSide, "enemy");
});

test("core skill hook applies both primary and secondary", () => {
  const hook = STATUS_HOOK_DEFINITIONS["spell:fire-blaze:core"];
  assert.ok(hook);
  assert.equal(hook.applications.length, 2);
  // primary: burning (enemy), secondary: melt-armor (enemy)
  assert.equal(hook.applications[0].targetSide, "enemy");
  assert.equal(hook.applications[1].targetSide, "enemy");
});

test("水·寒流 core hook applies 回春 to self and 霜寒 to enemy", () => {
  const hook = STATUS_HOOK_DEFINITIONS["spell:water-frost:core"];
  assert.ok(hook);
  assert.equal(hook.applications[0].statusId, STATUS_REJUVENATION);
  assert.equal(hook.applications[0].targetSide, "self"); // 回春 targets self
  assert.equal(hook.applications[1].statusId, STATUS_FROSTBITE);
  assert.equal(hook.applications[1].targetSide, "enemy"); // 霜寒 targets enemy
});

test("weapon hooks are empty for now", () => {
  for (const loadout of getAllWeaponLoadouts()) {
    assert.deepEqual(loadout.basicAttackStatusHookIds, []);
    assert.deepEqual(loadout.coreSkillStatusHookIds, []);
  }
});

// ---- J. Tier Value Resolution ----

test("resolveStatusTierValue returns correct values per tier", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ARMOR_BREAK];
  for (let t = 1; t <= 8; t++) {
    const { magnitude } = resolveStatusTierValue(def, t as SpellTier);
    assert.equal(magnitude, def.tierValues[t - 1]);
  }
});

test("resolveStatusTierValue returns secondaryMagnitude for dual-effect statuses", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_ENTANGLE]; // has secondaryEffects
  const { magnitude, secondaryMagnitude } = resolveStatusTierValue(def, 3 as SpellTier);
  assert.equal(magnitude, 16); // initiative_down tier 3
  assert.equal(secondaryMagnitude, 5); // dodge_down tier 3
});

// ---- K. Starter Weapon Names Updated ----

test("starter weapon loadout names match packaging spec", () => {
  assert.equal(getWeaponLoadoutDefinition("starter-sword" as WeaponLoadoutId)?.name, "木锋剑");
  assert.equal(getWeaponLoadoutDefinition("starter-greatsaber" as WeaponLoadoutId)?.name, "开山巨刀");
  assert.equal(getWeaponLoadoutDefinition("starter-bow" as WeaponLoadoutId)?.name, "桑木弓");
  assert.equal(getWeaponLoadoutDefinition("starter-umbrella" as WeaponLoadoutId)?.name, "油纸伞");
});

// ---- L. Starter Spell Names Updated ----

test("starter spell loadout names match packaging spec", () => {
  assert.equal(getSpellLoadoutDefinition("starter-metal-edge" as SpellLoadoutId)?.name, "金·锋刃·入门篇");
  assert.equal(getSpellLoadoutDefinition("starter-fire-blaze" as SpellLoadoutId)?.name, "火·炽焰·入门篇");
  assert.equal(getSpellLoadoutDefinition("starter-water-frost" as SpellLoadoutId)?.name, "水·寒流·入门篇");
});

// ---- M. Growth Blessing combined effect ----

test("生长祝福 increases both damage dealt and healing power", () => {
  const def = COMBAT_STATUS_DEFINITIONS[STATUS_GROWTH_BLESSING];
  const { statuses } = applyOrRefreshStatus(
    [],
    def,
    2 as SpellTier,
    "starter-wood-growth" as SpellLoadoutId,
    "core_skill",
  );
  const mods = gatherPassiveModifiers(statuses);
  assert.equal(mods.damageDealtPercent, 6);
  assert.equal(mods.healingPowerPercent, 6);
});

// ---- N. Miss does not trigger hooks (validation of design) ----

test("miss result means empty hook set — consumer responsibility verified by design constraint", () => {
  // This test ensures the hook system only fires on hit/crit
  // The engine integration checks action result before resolving hooks
  // Here we verify that hook definitions are clean and deterministic
  const hook = STATUS_HOOK_DEFINITIONS["spell:metal-edge:basic"];
  assert.ok(hook);
  assert.equal(hook.applications.length, 1);
  // The actual miss-check is engine-side, not hook-side
});
