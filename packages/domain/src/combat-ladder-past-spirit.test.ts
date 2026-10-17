import assert from "node:assert/strict";
import test from "node:test";
import { WEAPON_TYPE_DEFINITIONS } from "./combat-loadouts.js";
import { CATALOG_ELEMENTS, CATALOG_FAMILIES, CONTENT_SKILLS } from "./combat-catalog.js";
import { bandForLevel, loadoutDropTier } from "./combat-content.js";
import { listResolvedSkills, type SkillContext } from "./combat-skills.js";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import type { ItemId, SpellLoadoutId, WeaponLoadoutId, WeaponTypeId, WorldState } from "./model.js";
import { ensureSpiritVeins } from "./sect-life.js";

const ACTION_LEAK = /[a-z][a-z0-9]*-[a-z0-9:-]+/;
const LATER_RANKS = ["炼虚", "合体", "大乘"] as const;

function finish(world: WorldState, id: string) {
  for (let step = 0; step < 16 && world.cultivators[id]?.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
}

function unlockWeapon(ids: string[], tiers: number[]) {
  for (const tier of tiers) ids.push(`sword-tier-${tier}` as WeaponLoadoutId);
}

function unlockSpell(ids: string[], branch: string, tiers: number[]) {
  for (const tier of tiers) ids.push(`${branch}-tier-${tier}` as SpellLoadoutId);
}

function assertNoActionLeak(text: string, label: string) {
  const found = text.match(ACTION_LEAK);
  assert.equal(found, null, `${label} leaked ${found?.[0] ?? ""}`);
}

test("炼虚、合体、大乘 each keep a full weapon and root ladder", () => {
  const names = CONTENT_SKILLS.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length);

  for (const family of CATALOG_FAMILIES) {
    const rows = CONTENT_SKILLS.filter((skill) => skill.families?.includes(family));
    for (const rank of LATER_RANKS) {
      assert.ok(rows.filter((skill) => skill.manualRank === rank).length >= 2, `${family}:${rank}`);
    }
  }

  for (const element of CATALOG_ELEMENTS) {
    const rows = CONTENT_SKILLS.filter((skill) => skill.elements?.includes(element));
    for (const rank of LATER_RANKS) {
      assert.ok(rows.filter((skill) => skill.manualRank === rank).length >= 2, `${element}:${rank}`);
    }
  }

  const gate = { 炼虚: [16, 6], 合体: [19, 7], 大乘: [22, 8] } as const;
  for (const typeId of Object.keys(WEAPON_TYPE_DEFINITIONS) as WeaponTypeId[]) {
    const kept = CONTENT_SKILLS.find((skill) => skill.id === `late-type-${typeId}`);
    assert.equal(kept?.manualRank, "化神");
    for (const rank of LATER_RANKS) {
      const signature = CONTENT_SKILLS.find((skill) => skill.weaponTypes?.includes(typeId) && skill.manualRank === rank);
      assert.ok(signature, `${typeId}:${rank}`);
      assert.equal(signature?.minRealmLevel, gate[rank][0]);
      assert.equal(signature?.minTier, gate[rank][1]);
    }
  }

  for (const skill of CONTENT_SKILLS) {
    if (!LATER_RANKS.includes(skill.manualRank as typeof LATER_RANKS[number])) continue;
    assertNoActionLeak(`${skill.name}${skill.summary}`, skill.id);
  }
});

test("化神装备不上大乘的招，大乘学会以后才出得来", () => {
  const blocked = listResolvedSkills(fullSword({ realmLevel: 15, weaponTier: 8, manualTier: 8 }));
  const blockedNames = blocked.map((skill) => skill.name);
  assert.equal(blockedNames.includes("渡劫一剑"), false);
  assert.equal(blockedNames.includes("劫金一斩"), false);
  assert.equal(blockedNames.includes("渡劫九变"), false);

  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "化神";
  cultivator.realmLevel = 15;
  unlockWeapon(cultivator.unlockedWeaponLoadoutIds, [8]);
  const listed = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.equal(listed.includes("equip-weapon:sword-tier-8"), false);
  assert.throws(() => performAction(world, cultivator.id, "equip-weapon:sword-tier-8"), /大乘/);

  const ready = createSeedWorld();
  const mahayana = ready.cultivators["yun-zhong-he"]!;
  mahayana.realm = "大乘";
  mahayana.realmLevel = 22;
  mahayana.skillProficiency = { "quick-flurry": 24, "metal-edge-cut": 24 };
  unlockWeapon(mahayana.unlockedWeaponLoadoutIds, [8]);
  unlockSpell(mahayana.unlockedSpellLoadoutIds, "metal-edge", [8]);
  const equipped = performAction(ready, mahayana.id, "equip-weapon:sword-tier-8");
  assert.equal(equipped.accepted, true);
  assert.match(equipped.summary, /渡劫剑/);
  const names = getCultivatorState(ready, mahayana.id).combatProfile.availableSkills?.map((skill) => skill.name) ?? [];
  assert.ok(names.includes("渡劫一剑"));
  assert.ok(names.includes("渡劫九变"));
  assert.ok(names.includes("劫金一斩"));

  const lowWeapon = createSeedWorld();
  const swordOnly = lowWeapon.cultivators["yun-zhong-he"]!;
  swordOnly.realm = "大乘";
  swordOnly.realmLevel = 22;
  swordOnly.skillProficiency = { "quick-flurry": 24, "metal-edge-cut": 24 };
  unlockWeapon(swordOnly.unlockedWeaponLoadoutIds, [5]);
  unlockSpell(swordOnly.unlockedSpellLoadoutIds, "metal-edge", [8]);
  performAction(lowWeapon, swordOnly.id, "equip-weapon:sword-tier-5");
  const lowWeaponNames = getCultivatorState(lowWeapon, swordOnly.id).combatProfile.availableSkills?.map((skill) => skill.name) ?? [];
  assert.equal(lowWeaponNames.includes("渡劫一剑"), false);
  assert.equal(lowWeaponNames.includes("渡劫九变"), false);
  assert.ok(lowWeaponNames.includes("劫金一斩"));

  const lowManual = createSeedWorld();
  const bookOnly = lowManual.cultivators["yun-zhong-he"]!;
  bookOnly.realm = "大乘";
  bookOnly.realmLevel = 22;
  bookOnly.skillProficiency = { "quick-flurry": 24, "metal-edge-cut": 24 };
  unlockWeapon(bookOnly.unlockedWeaponLoadoutIds, [8]);
  unlockSpell(bookOnly.unlockedSpellLoadoutIds, "metal-edge", [5]);
  performAction(lowManual, bookOnly.id, "equip-weapon:sword-tier-8");
  const lowManualNames = getCultivatorState(lowManual, bookOnly.id).combatProfile.availableSkills?.map((skill) => skill.name) ?? [];
  assert.ok(lowManualNames.includes("渡劫一剑"));
  assert.equal(lowManualNames.includes("劫金一斩"), false);
});

test("大乘的下一阶坊市不卖，宗门换得到，句子里没有行动标识", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "大乘";
  cultivator.realmLevel = 22;
  cultivator.spiritStones = 4000;
  cultivator.neutralSectId = "qingzhou-wanderers";
  cultivator.neutralContribution = 580;
  unlockWeapon(cultivator.unlockedWeaponLoadoutIds, [2, 3, 4, 5, 6, 7]);
  const state = getCultivatorState(world, cultivator.id);
  assert.equal(state.combatProfile.nextWeapon?.name, "渡劫剑");
  assert.equal(state.combatProfile.nextWeapon?.soldAtShop, false);
  assert.equal(state.combatProfile.nextWeapon?.reachable, true);
  assert.deepEqual(
    (state.combatProfile.nextWeapon?.paths ?? []).map((path) => path.kind),
    ["秘境", "灵脉", "配方", "宗门", "任务", "破境"],
  );
  const actions = listAvailableActions(world, cultivator.id);
  assert.equal(actions.some((action) => action.actionId === "buy-next-weapon"), false);
  assert.throws(() => performAction(world, cultivator.id, "buy-next-weapon"), /坊市不卖/);
  const exchange = actions.find((action) => action.actionId === "exchange-sect-weapon");
  assert.equal(exchange?.costs?.spiritStones, 2600);
  assertNoActionLeak(`${exchange?.label ?? ""}${exchange?.description ?? ""}`, "exchange");
  performAction(world, cultivator.id, "exchange-sect-weapon");
  assert.equal(cultivator.inventory["weapon-item-sword-tier-8" as ItemId], 1);
  assert.equal(cultivator.neutralContribution, 580);
});

test("化神看得到炼虚的下一式，说明里不写行动标识", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "化神";
  cultivator.realmLevel = 15;
  cultivator.skillProficiency = { "quick-flurry": 24, "metal-edge-cut": 24, "wood-heal": 24 };
  unlockWeapon(cultivator.unlockedWeaponLoadoutIds, [2, 3, 4, 5]);
  unlockSpell(cultivator.unlockedSpellLoadoutIds, "metal-edge", [2, 3, 4, 5]);
  unlockSpell(cultivator.unlockedSpellLoadoutIds, "wood-growth", [5]);
  performAction(world, cultivator.id, "equip-weapon:sword-tier-5");
  const state = getCultivatorState(world, cultivator.id);
  const unlocks = state.combatProfile.nextUnlocks ?? [];
  const later = unlocks.filter((entry) => LATER_RANKS.includes(entry.manualRank as typeof LATER_RANKS[number]));
  assert.ok(later.length >= 4);
  assert.ok(later.every((entry) => entry.blockedBy === "境界"));
  assert.ok(later.some((entry) => entry.realm === "炼虚"));
  for (const entry of later) {
    assertNoActionLeak(`${entry.need}${entry.seek}${entry.name}`, entry.name);
  }
  const gear = [state.combatProfile.nextWeapon, state.combatProfile.nextManual];
  for (const offer of gear) {
    if (!offer) continue;
    assertNoActionLeak(offer.seek, offer.name);
    for (const path of offer.paths ?? []) assertNoActionLeak(path.line, `${offer.name}:${path.kind}`);
  }
  const path = state.realmPath;
  assertNoActionLeak(
    [path.where, path.risk, path.outcome, path.methodName ?? "", ...(path.sequence ?? []), ...path.goals, ...(path.resources ?? [])].join(""),
    "realmPath",
  );
  assert.equal(path.catalogTier, "化神");
  assert.equal(bandForLevel(16).manualRank, "炼虚");
  assert.equal(bandForLevel(24).manualRank, "大乘");
});

test("神纹天隙和凉州灵脉只在人到了这一档、低阶已经齐了的时候掉高阶锻材", () => {
  const spirit = createSeedWorld().cultivators["yun-zhong-he"]!;
  spirit.realm = "化神";
  spirit.realmLevel = 15;
  assert.equal(loadoutDropTier(spirit, "甲", 7), 5);
  spirit.realm = "炼虚";
  spirit.realmLevel = 16;
  unlockWeapon(spirit.unlockedWeaponLoadoutIds, [2, 3, 4, 5]);
  unlockSpell(spirit.unlockedSpellLoadoutIds, "metal-edge", [2, 3, 4, 5]);
  assert.equal(loadoutDropTier(spirit, "甲", 7), 6);
  assert.equal(loadoutDropTier(spirit, "甲", 4), 4);

  const early = createSeedWorld();
  const before = early.cultivators["yun-zhong-he"]!;
  before.realm = "化神";
  before.realmLevel = 15;
  unlockWeapon(before.unlockedWeaponLoadoutIds, [2, 3, 4, 5]);
  unlockSpell(before.unlockedSpellLoadoutIds, "metal-edge", [2, 3, 4, 5]);
  gatherLiangzhou(early, before.id);
  assert.equal(before.inventory["weapon-material-sword-tier-6" as ItemId] ?? 0, 0);
  assert.equal(before.inventory["spell-fragment-metal-edge-tier-6" as ItemId] ?? 0, 0);
  assert.equal((before.lifeLog ?? []).some((event) => event.text.includes("另有一份")), false);

  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "炼虚";
  cultivator.realmLevel = 16;
  unlockWeapon(cultivator.unlockedWeaponLoadoutIds, [2, 3, 4, 5]);
  unlockSpell(cultivator.unlockedSpellLoadoutIds, "metal-edge", [2, 3, 4, 5]);
  gatherLiangzhou(world, cultivator.id);
  const material = cultivator.inventory["weapon-material-sword-tier-6" as ItemId] ?? 0;
  const fragment = cultivator.inventory["spell-fragment-metal-edge-tier-6" as ItemId] ?? 0;
  assert.equal(material + fragment, 1);
  const life = cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
  assert.match(life, /另有一份/);
  assert.match(life, /锻材|残本/);
  assert.equal(life.includes("weapon-material-sword-tier-6"), false);
  assert.equal(life.includes("spell-fragment-metal-edge-tier-6"), false);
  assertNoActionLeak(life, "vein");
});

function fullSword(partial: { realmLevel: number; weaponTier: number; manualTier: number }): SkillContext {
  const proficiency: Record<string, number> = {};
  for (const skill of CONTENT_SKILLS) proficiency[skill.id] = 24;
  return {
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
    rootElements: ["metal", "wood"],
    weaponAttack: 80,
    spellAttack: 70,
    defense: 30,
    realmLevel: partial.realmLevel,
    weaponTier: partial.weaponTier,
    proficiency,
    manualTierByElement: { metal: partial.manualTier, wood: partial.manualTier },
  };
}

function gatherLiangzhou(world: WorldState, id: string) {
  ensureSpiritVeins(world);
  const cultivator = world.cultivators[id]!;
  cultivator.locationId = "liangzhou:sect-outpost:zhen-huang-cheng";
  cultivator.injuryTicksRemaining = 0;
  performAction(world, id, "join-neutral-sect:zhen-huang-cheng");
  const vein = world.spiritVeins?.["liangzhou:spirit-vein"];
  assert.ok(vein);
  vein.ownerKind = "neutral";
  vein.ownerId = "zhen-huang-cheng";
  vein.pouch = [{ itemId: "divine-thought-crystal", count: 1 }];
  cultivator.locationId = vein.locationId;
  performAction(world, id, `gather-vein:${vein.id}`);
  finish(world, id);
}
