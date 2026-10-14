import assert from "node:assert/strict";
import test from "node:test";
import { WEAPON_TYPE_DEFINITIONS } from "./combat-loadouts.js";
import { CATALOG_ELEMENTS, CATALOG_FAMILIES, CONTENT_SKILLS } from "./combat-catalog.js";
import { dungeonSourceTier } from "./combat-content.js";
import { listNextUnlocks, listResolvedSkills, type SkillContext } from "./combat-skills.js";
import { createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import type { WeaponLoadoutId, WeaponTypeId } from "./model.js";
import { runPartyBattle, type BattleCombatant } from "./party-battle.js";

function blank(partial: Partial<SkillContext> & Pick<SkillContext, "weaponType" | "weaponFamily">): SkillContext {
  return {
    spellBranch: null,
    spellElement: null,
    rootElements: ["metal"],
    weaponAttack: 40,
    spellAttack: 36,
    defense: 20,
    ...partial,
  };
}

function practiced(partial: Partial<SkillContext> & Pick<SkillContext, "weaponType" | "weaponFamily">): SkillContext {
  const proficiency: Record<string, number> = {};
  for (const skill of CONTENT_SKILLS) proficiency[skill.id] = 24;
  proficiency["quick-flurry"] = 24;
  proficiency["heavy-cleave"] = 24;
  proficiency["pole-thrust"] = 24;
  proficiency["flex-lash"] = 24;
  proficiency["range-snipe"] = 24;
  proficiency["metal-edge-cut"] = 24;
  proficiency["wood-heal"] = 24;
  proficiency["water-frost"] = 24;
  proficiency["fire-burst"] = 24;
  proficiency["earth-wall"] = 24;
  return blank({
    realmLevel: 13,
    weaponTier: 5,
    proficiency,
    manualTierByElement: { metal: 5, wood: 5, water: 5, fire: 5, earth: 5 },
    ...partial,
  });
}

function namesOf(ctx: SkillContext): string[] {
  return listResolvedSkills(ctx).map((skill) => skill.name);
}

test("every weapon family and every root school has an early skill and a late skill", () => {
  const names = CONTENT_SKILLS.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(CONTENT_SKILLS.map((skill) => skill.id)).size, CONTENT_SKILLS.length);

  for (const family of CATALOG_FAMILIES) {
    const rows = CONTENT_SKILLS.filter((skill) => skill.families?.includes(family));
    assert.ok(rows.some((skill) => skill.minRealmLevel <= 3), family);
    assert.ok(rows.some((skill) => skill.minRealmLevel >= 13), family);
    assert.ok(rows.filter((skill) => skill.manualRank === "入门").length >= 2, family);
    assert.ok(rows.filter((skill) => skill.manualRank === "小成").length >= 2, family);
    assert.ok(rows.filter((skill) => skill.manualRank === "大成").length >= 2, family);
    assert.ok(rows.filter((skill) => skill.manualRank === "大圆满").length >= 2, family);
  }

  for (const element of CATALOG_ELEMENTS) {
    const rows = CONTENT_SKILLS.filter((skill) => skill.elements?.includes(element));
    assert.ok(rows.some((skill) => skill.minRealmLevel <= 3), element);
    assert.ok(rows.some((skill) => skill.minRealmLevel >= 13), element);
    for (const rank of ["入门", "小成", "大成", "大圆满", "化神"] as const) {
      assert.ok(rows.filter((skill) => skill.manualRank === rank).length >= 2, `${element}:${rank}`);
    }
    const roles = new Set(rows.flatMap((skill) => skill.roles));
    assert.ok(roles.size >= 2, element);
  }

  const types = Object.keys(WEAPON_TYPE_DEFINITIONS) as WeaponTypeId[];
  assert.equal(types.length, 20);
  for (const typeId of types) {
    const signature = CONTENT_SKILLS.find((skill) => skill.id === `late-type-${typeId}`);
    assert.ok(signature, typeId);
    assert.equal(signature?.manualRank, "化神");
    assert.equal(signature?.minRealmLevel, 13);
    assert.equal(signature?.minTier, 5);
  }

  for (const skill of CONTENT_SKILLS) {
    if (skill.power >= 1.5) assert.ok(skill.spiritCost >= 12 && skill.cooldown >= 3, skill.id);
    if (skill.target === "all-enemies") assert.ok(skill.power <= 0.8, skill.id);
    if (skill.spiritCost <= 6 && skill.cooldown <= 1) assert.ok(skill.power <= 1.25, skill.id);
  }
});

test("realm, weapon tier, manual tier, and practice each keep a skill shut", () => {
  const fresh = blank({ weaponType: "sword", weaponFamily: "quick", realmLevel: 1, weaponTier: 1 });
  assert.equal(namesOf(fresh).includes("天游一剑"), false);
  assert.equal(namesOf(fresh).includes("南明离火"), false);
  assert.equal(namesOf(fresh).includes("点剑"), false);

  const lateSword = practiced({
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
    rootElements: ["metal"],
    manualTierByElement: { metal: 5 },
  });
  const swordNames = namesOf(lateSword);
  assert.ok(swordNames.includes("天游一剑"));
  assert.ok(swordNames.includes("轻灵九变"));
  assert.ok(swordNames.includes("天金一斩"));
  assert.equal(swordNames.includes("枪挑日月"), false);
  assert.equal(swordNames.includes("南明离火"), false);

  const lateSpear = practiced({
    weaponType: "spear",
    weaponFamily: "polearm",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["fire"],
    manualTierByElement: { fire: 5 },
  });
  const spearNames = namesOf(lateSpear);
  assert.ok(spearNames.includes("枪挑日月"));
  assert.ok(spearNames.includes("南明离火"));
  assert.equal(spearNames.includes("天游一剑"), false);
  assert.equal(spearNames.includes("天金一斩"), false);

  const lowPractice = practiced({
    weaponType: "sword",
    weaponFamily: "quick",
    proficiency: { "quick-flurry": 6 },
    realmLevel: 4,
    weaponTier: 2,
    manualTierByElement: { metal: 1 },
    spellElement: "metal",
    spellBranch: "metal-edge",
  });
  assert.ok(namesOf(lowPractice).includes("青锋三叠"));
  assert.equal(namesOf(lowPractice).includes("天游一剑"), false);
});

test("a 炼气 profile points at the next realm, and the shop will not sell past it", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");
  const unlocks = state.combatProfile.nextUnlocks ?? [];
  assert.ok(unlocks.some((entry) => entry.blockedBy === "境界"));
  assert.ok(unlocks.some((entry) => entry.kind === "兵器"));
  assert.ok(unlocks.some((entry) => entry.kind === "法术"));
  const actions = listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId);
  assert.equal(actions.includes("buy-next-weapon"), false);
  assert.equal(actions.includes("buy-next-manual"), false);
  assert.equal(state.combatProfile.nextWeapon?.name, "青钢剑");
  assert.equal(state.combatProfile.nextWeapon?.reachable, false);
});

test("筑基 can buy the next sword, and a sect exchange is cheaper once contribution is enough", () => {
  const shop = createSeedWorld();
  const buyer = shop.cultivators["yun-zhong-he"]!;
  buyer.realm = "筑基";
  buyer.realmLevel = 4;
  const offer = listAvailableActions(shop, buyer.id).find((action) => action.actionId === "buy-next-weapon");
  assert.ok(offer);
  assert.equal(offer?.costs?.spiritStones, 270);
  const bought = performAction(shop, buyer.id, "buy-next-weapon");
  assert.equal(bought.accepted, true);
  assert.equal(buyer.spiritStones, 630);
  assert.equal(buyer.inventory["weapon-item-sword-tier-2"], 1);
  performAction(shop, buyer.id, "unlock-loadout:weapon-item-sword-tier-2");
  performAction(shop, buyer.id, "equip-weapon:sword-tier-2" as "equip-weapon:sword-tier-2");
  buyer.skillProficiency = { "quick-flurry": 6 };
  assert.ok(namesOf({
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
    rootElements: ["metal", "wood"],
    weaponAttack: 40,
    spellAttack: 36,
    defense: 18,
    realmLevel: buyer.realmLevel,
    weaponTier: 2,
    manualTierByElement: { metal: 1 },
    proficiency: buyer.skillProficiency,
  }).includes("青锋三叠"));

  const sect = createSeedWorld();
  const member = sect.cultivators["yun-zhong-he"]!;
  member.realm = "筑基";
  member.realmLevel = 4;
  member.neutralSectId = "qingzhou-wanderers";
  member.neutralContribution = 10;
  assert.equal(listAvailableActions(sect, member.id).some((action) => action.actionId === "exchange-sect-weapon"), false);
  member.neutralContribution = 40;
  const exchange = listAvailableActions(sect, member.id).find((action) => action.actionId === "exchange-sect-weapon");
  assert.equal(exchange?.costs?.spiritStones, 180);
  performAction(sect, member.id, "exchange-sect-weapon");
  assert.equal(member.spiritStones, 720);
  assert.equal(member.inventory["weapon-item-sword-tier-2"], 1);
  assert.equal(member.neutralContribution, 40);
});

test("a weapon past the current realm cannot be equipped", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.unlockedWeaponLoadoutIds = [...cultivator.unlockedWeaponLoadoutIds, "sword-tier-5" as WeaponLoadoutId];
  const listed = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.equal(listed.includes("equip-weapon:sword-tier-5"), false);
  assert.throws(() => performAction(world, cultivator.id, "equip-weapon:sword-tier-5"), /化神/);
});

test("dungeon rank decides which source tier comes home", () => {
  assert.equal(dungeonSourceTier("丙", 5), 1);
  assert.equal(dungeonSourceTier("丙", 6), 2);
  assert.equal(dungeonSourceTier("乙", 4), 2);
  assert.equal(dungeonSourceTier("乙", 5), 3);
  assert.equal(dungeonSourceTier("甲", 3), 3);
  assert.equal(dungeonSourceTier("甲", 4), 4);
  assert.equal(dungeonSourceTier("甲", 7), 5);
});

test("weapon leaning still beats spell leaning on the heavy hit, and the other way around", () => {
  const bands = [
    { weapon: "沉斩", spell: "星火", defense: 8 },
    { weapon: "开山势", spell: "焚心", defense: 12 },
    { weapon: "裂岳斩", spell: "熔甲", defense: 18 },
    { weapon: "崩山式", spell: "三昧真火", defense: 28 },
    { weapon: "开天一刀", spell: "南明离火", defense: 40 },
  ];
  for (const band of bands) {
    const weaponSkill = CONTENT_SKILLS.find((skill) => skill.name === band.weapon);
    const spellSkill = CONTENT_SKILLS.find((skill) => skill.name === band.spell);
    assert.ok(weaponSkill && spellSkill);
    const high = 96;
    const low = 60;
    const weaponSide = strike(high, band.defense, weaponSkill.power, weaponSkill.shred);
    const spellSide = strike(low, band.defense, spellSkill.power, spellSkill.shred);
    assert.ok(weaponSide > spellSide, band.weapon);
    const flippedWeapon = strike(low, band.defense, weaponSkill.power, weaponSkill.shred);
    const flippedSpell = strike(high, band.defense, spellSkill.power, spellSkill.shred);
    assert.ok(flippedSpell > flippedWeapon, band.spell);
  }

  const favored = listResolvedSkills(practiced({
    weaponType: "greatsaber",
    weaponFamily: "heavy",
    leaning: "weapon",
    weaponAttack: 160,
    spellAttack: 90,
  })).find((skill) => skill.name === "开天一刀");
  const off = listResolvedSkills(practiced({
    weaponType: "greatsaber",
    weaponFamily: "heavy",
    leaning: "spell",
    weaponAttack: 90,
    spellAttack: 160,
  })).find((skill) => skill.name === "开天一刀");
  assert.ok(favored && off);
  assert.ok(favored.power > off.power);
  assert.equal(favored.aptitude, "favored");
  assert.equal(off.aptitude, "off");
  assert.ok(favored.spiritCost < off.spiritCost);

  const rooted = listResolvedSkills(practiced({
    weaponType: "fan",
    weaponFamily: "ranged-mystic",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["fire"],
    leaning: "balanced",
    manualTierByElement: { fire: 5 },
  })).find((skill) => skill.name === "南明离火");
  const borrowed = listResolvedSkills(practiced({
    weaponType: "fan",
    weaponFamily: "ranged-mystic",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["water"],
    leaning: "balanced",
    manualTierByElement: { fire: 5 },
  })).find((skill) => skill.name === "南明离火");
  assert.ok(rooted && borrowed);
  assert.ok(borrowed.power < rooted.power);
});

test("a 化神 sword and a wood support spend a late skill without ending the fight in one pass", () => {
  const swordSkills = listResolvedSkills(practiced({
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
    rootElements: ["metal"],
    leaning: "weapon",
    weaponAttack: 80,
    spellAttack: 40,
    manualTierByElement: { metal: 5 },
  }));
  const woodSkills = listResolvedSkills(practiced({
    weaponType: "staff",
    weaponFamily: "polearm",
    spellBranch: "wood-growth",
    spellElement: "wood",
    rootElements: ["wood"],
    leaning: "spell",
    weaponAttack: 30,
    spellAttack: 70,
    manualTierByElement: { wood: 5 },
  }));
  const enemy = (id: string, name: string): BattleCombatant => ({
    id,
    name,
    side: "enemy",
    role: "guard",
    hp: 900,
    maxHp: 900,
    weaponAttack: 24,
    spellAttack: 12,
    defense: 40,
    speed: 8,
    hit: 40,
    dodge: 2,
    crit: 1,
    critDamage: 120,
    guardHeart: 8,
    spirit: 40,
    maxSpirit: 40,
    skills: [],
  });
  const result = runPartyBattle({
    allies: [
      body("sword", "剑修", "dps", 80, swordSkills),
      body("wood", "木修", "support", 36, woodSkills),
    ],
    enemies: [enemy("a", "石甲"), enemy("b", "石卫")],
    policy: "balanced",
    seed: "late-realm",
    leaderId: "sword",
  });
  assert.ok(result.roundsPlayed >= 3);
  const text = result.summary.highlights.map((line) => `${line.skillName} ${line.note}`).join("\n");
  assert.match(text, /天游一剑（兵器）/);
  assert.match(text, /（法术）/);
  assert.ok(result.practice.some((entry) => entry.skillIds.some((id) => id.startsWith("late-"))));
});

function strike(attack: number, defense: number, power: number, shred = 1): number {
  const reduced = Math.max(0, Math.round(defense * (shred ?? 1)));
  return Math.max(1, Math.round(Math.max(1, attack - reduced * 0.5) * power));
}

function body(id: string, name: string, role: BattleCombatant["role"], speed: number, skills: BattleCombatant["skills"]): BattleCombatant {
  return {
    id,
    name,
    side: "party",
    role,
    hp: 500,
    maxHp: 500,
    weaponAttack: role === "dps" ? 80 : 30,
    spellAttack: role === "support" ? 70 : 40,
    defense: 30,
    speed,
    hit: 90,
    dodge: 6,
    crit: 8,
    critDamage: 150,
    guardHeart: 6,
    spirit: 120,
    maxSpirit: 120,
    skills,
  };
}

test("炼气 next unlocks from the live context name the realm gate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const unlocks = listNextUnlocks({
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
    rootElements: ["metal", "wood"],
    weaponAttack: 40,
    spellAttack: 36,
    defense: 18,
    realmLevel: cultivator.realmLevel,
    weaponTier: 1,
    manualTierByElement: { metal: 1 },
    proficiency: {},
  });
  assert.ok(unlocks.some((entry) => entry.blockedBy === "境界" && entry.manualRank === "小成"));
  assert.ok(unlocks.every((entry) => entry.seek.length > 0 && entry.need.length > 0));
});
