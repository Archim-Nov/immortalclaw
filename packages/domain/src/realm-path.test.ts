import assert from "node:assert/strict";
import test from "node:test";
import { computeDaoPotential } from "./economy.js";
import { createCultivator } from "./engine.js";
import { advanceWorld, createSeedWorld, getCultivatorState, performAction } from "./index.js";
import type { Cultivator, ItemId, WeaponLoadoutId } from "./model.js";
import {
  NASCENT_DROP_IDS,
  SPIRIT_DROP_IDS,
  breakthroughDropPool,
  rankBandForRealmLevel,
} from "./realm-path.js";
import { listNextUnlocks, type SkillContext } from "./combat-skills.js";

function finish(world: ReturnType<typeof createSeedWorld>, id: string) {
  for (let step = 0; step < 16 && world.cultivators[id]?.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
}

function give(cultivator: Cultivator, ids: readonly ItemId[]) {
  for (const id of ids) cultivator.inventory[id] = (cultivator.inventory[id] ?? 0) + 1;
}

const NASCENT_GATE: readonly ItemId[] = ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "nine-turn-golden-marrow"];
const SPIRIT_GATE: readonly ItemId[] = ["divine-thought-crystal", "heaven-soul-silk", "divine-pattern-stone", "shatter-nascent-lotus"];

test("甲级掉落按层分开，炼气池不跟着层数变", () => {
  const low = breakthroughDropPool("golden-spirit-flower", 1);
  assert.ok(low.includes("dragon-radiance-crystal"));
  assert.equal(low.includes("nine-turn-golden-marrow"), false);
  assert.equal(low.some((id) => (NASCENT_DROP_IDS as readonly string[]).includes(id)), false);
  assert.equal(low.some((id) => (SPIRIT_DROP_IDS as readonly string[]).includes(id)), false);

  const mid = breakthroughDropPool("golden-spirit-flower", 4);
  assert.ok(mid.includes("infant-fire-lotus"));
  assert.ok(mid.includes("nine-turn-golden-marrow"));
  assert.equal(mid.includes("shatter-nascent-lotus"), false);

  const high = breakthroughDropPool("golden-spirit-flower", 7);
  assert.ok(high.includes("shatter-nascent-lotus"));
  assert.ok(high.includes("golden-spirit-flower"));

  assert.deepEqual(breakthroughDropPool("cloud-heart-grass", 1), breakthroughDropPool("cloud-heart-grass", 9));
  assert.equal(breakthroughDropPool("cloud-heart-grass", 9).includes("infant-fire-lotus"), false);

  assert.deepEqual(rankBandForRealmLevel(3), { minRank: 7, maxRank: 9 });
  assert.deepEqual(rankBandForRealmLevel(9), { minRank: 7, maxRank: 9 });
  assert.deepEqual(rankBandForRealmLevel(10), { minRank: 4, maxRank: 6 });
  assert.deepEqual(rankBandForRealmLevel(12), { minRank: 7, maxRank: 9 });
});

test("炼气仍走坊市，金丹后期才把下一境写成元婴", () => {
  const world = createSeedWorld();
  const early = getCultivatorState(world, "yun-zhong-he");
  assert.equal(early.cultivator.realm, "炼气");
  assert.equal(early.breakthrough?.specialRequirement.itemId, "meridian-lotus-essence");
  assert.match(early.realmPath.goals.join(""), /坊市/);
  assert.equal(early.realmPath.goals.join("").includes("元婴"), false);
  assert.equal(early.realmPath.risk.includes("走火"), false);
  assert.equal(early.digest?.nextStep, undefined);
  assert.match(early.digest?.summary ?? "", /过得平常/);

  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "金丹";
  cultivator.realmLevel = 9;
  cultivator.realmProgress = 100;
  const late = getCultivatorState(world, cultivator.id);
  assert.equal(late.breakthrough?.targetRealm, "元婴");
  assert.equal(late.breakthrough?.marketBuyable, false);
  assert.equal(late.breakthrough?.specialRequirement.itemId, "nine-turn-golden-marrow");
  assert.match(late.breakthrough?.materialSources.map((source) => source.note).join(""), /四层/);
  assert.equal(late.realmPath.catalogTier, "大圆满");
  assert.match(late.realmPath.goals.join(""), /婴火莲/);
  assert.match(late.realmPath.risk, /走火/);
  assert.match(late.digest?.nextStep ?? "", /元婴/);
  assert.match(late.digest?.summary ?? "", /过得平常/);
  assert.match(late.digest?.summary ?? "", /元婴/);
});

test("甲级一层不掉元婴灵材，四层和七层会掉", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 9;
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 0 },
    乙: { highestClearedRank: 0 },
    甲: { highestClearedRank: 8 },
  };

  const seen = (rank: number) => {
    const found = new Set<ItemId>();
    for (let i = 0; i < 24; i += 1) {
      performAction(world, cultivator.id, `search-fortune:rank-${rank}` as "search-fortune:rank-1");
      finish(world, cultivator.id);
      for (const id of [...NASCENT_DROP_IDS, ...SPIRIT_DROP_IDS]) {
        if ((cultivator.inventory[id] ?? 0) > 0) found.add(id);
      }
    }
    return found;
  };

  const rankOne = seen(1);
  assert.equal([...rankOne].some((id) => (NASCENT_DROP_IDS as readonly string[]).includes(id)), false);
  assert.equal([...rankOne].some((id) => (SPIRIT_DROP_IDS as readonly string[]).includes(id)), false);

  for (const id of [...NASCENT_DROP_IDS, ...SPIRIT_DROP_IDS]) cultivator.inventory[id] = 0;
  const rankFour = seen(4);
  assert.ok([...rankFour].some((id) => (NASCENT_DROP_IDS as readonly string[]).includes(id)));
  assert.equal([...rankFour].some((id) => (SPIRIT_DROP_IDS as readonly string[]).includes(id)), false);

  for (const id of [...NASCENT_DROP_IDS, ...SPIRIT_DROP_IDS]) cultivator.inventory[id] = 0;
  const rankSeven = seen(7);
  assert.ok([...rankSeven].some((id) => (SPIRIT_DROP_IDS as readonly string[]).includes(id)));
});

test("金丹后期能破进元婴，失败会受伤，小突破必成，化神剑这时才装备得上", () => {
  const prepared = (tick: number, level: number, realm: Cultivator["realm"], items: readonly ItemId[]) => {
    const world = createSeedWorld();
    world.tick = tick;
    const created = createCultivator(world, { name: "破境的人" });
    const cultivator = world.cultivators[created.id]!;
    cultivator.realm = realm;
    cultivator.realmLevel = level;
    cultivator.realmProgress = 100;
    cultivator.spiritStones = 2000;
    give(cultivator, items);
    return { world, cultivator };
  };

  let success: ReturnType<typeof prepared> | null = null;
  let failure: ReturnType<typeof prepared> | null = null;
  for (let tick = 1; tick < 40 && (!success || !failure); tick += 1) {
    const attempt = prepared(tick, 9, "金丹", NASCENT_GATE);
    const beforeReputation = getCultivatorState(attempt.world, attempt.cultivator.id).cultivator.reputation;
    performAction(attempt.world, attempt.cultivator.id, "residence-breakthrough");
    finish(attempt.world, attempt.cultivator.id);
    if (attempt.cultivator.realmLevel === 10 && !success) {
      success = attempt;
      assert.equal(attempt.cultivator.realm, "元婴");
      assert.equal(attempt.cultivator.maxQi, 148);
      assert.equal(attempt.cultivator.maxSpiritualPower, 140);
      assert.equal(attempt.cultivator.mainAttributePercentageBonus, 8);
      assert.equal(getCultivatorState(attempt.world, attempt.cultivator.id).cultivator.reputation, beforeReputation + 8);
    } else if (attempt.cultivator.realmLevel === 9 && !failure) {
      failure = attempt;
      assert.equal(attempt.cultivator.realmProgress, 60);
      assert.ok(attempt.cultivator.injuryTicksRemaining >= 6);
      assert.ok(attempt.cultivator.statusEffects.some((effect) => effect.id === "deviation"));
    }
  }
  assert.ok(success);
  assert.ok(failure);

  const minor = prepared(3, 10, "元婴", ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "nurture-nascent-dew"]);
  const qiBefore = minor.cultivator.maxQi;
  performAction(minor.world, minor.cultivator.id, "residence-breakthrough");
  finish(minor.world, minor.cultivator.id);
  assert.equal(minor.cultivator.realmLevel, 11);
  assert.equal(minor.cultivator.maxQi, qiBefore + 24);

  const gate = prepared(2, 9, "金丹", NASCENT_GATE);
  gate.cultivator.unlockedWeaponLoadoutIds = [
    ...gate.cultivator.unlockedWeaponLoadoutIds,
    "sword-tier-4" as WeaponLoadoutId,
    "sword-tier-5" as WeaponLoadoutId,
  ];
  gate.cultivator.skillProficiency = { "quick-flurry": 24 };
  assert.throws(() => performAction(gate.world, gate.cultivator.id, "equip-weapon:sword-tier-4"), /元婴/);
  gate.cultivator.equippedWeaponLoadoutId = "sword-tier-4" as WeaponLoadoutId;
  const blocked = getCultivatorState(gate.world, gate.cultivator.id).combatProfile.nextUnlocks ?? [];
  const dragon = blocked.find((entry) => entry.name === "游龙九转");
  assert.equal(dragon?.blockedBy, "境界");
  assert.match(dragon?.seek ?? "", /元婴/);
  assert.match(dragon?.seek ?? "", /四层/);

  const opened = success!;
  opened.cultivator.unlockedWeaponLoadoutIds = [
    ...opened.cultivator.unlockedWeaponLoadoutIds,
    "sword-tier-4" as WeaponLoadoutId,
  ];
  opened.cultivator.skillProficiency = { "quick-flurry": 24 };
  performAction(opened.world, opened.cultivator.id, "equip-weapon:sword-tier-4");
  const names = (getCultivatorState(opened.world, opened.cultivator.id).combatProfile.availableSkills ?? []).map((skill) => skill.name);
  assert.ok(names.includes("游龙九转"));

  let spirit: ReturnType<typeof prepared> | null = null;
  for (let tick = 1; tick < 40 && !spirit; tick += 1) {
    const attempt = prepared(tick + 80, 12, "元婴", SPIRIT_GATE);
    performAction(attempt.world, attempt.cultivator.id, "residence-breakthrough");
    finish(attempt.world, attempt.cultivator.id);
    if (attempt.cultivator.realm === "化神") spirit = attempt;
  }
  assert.ok(spirit);
  spirit.cultivator.unlockedWeaponLoadoutIds = [
    ...spirit.cultivator.unlockedWeaponLoadoutIds,
    "sword-tier-5" as WeaponLoadoutId,
  ];
  performAction(spirit.world, spirit.cultivator.id, "equip-weapon:sword-tier-5");
  assert.equal(spirit.cultivator.equippedWeaponLoadoutId, "sword-tier-5");

  const ctx: SkillContext = {
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: null,
    spellElement: null,
    rootElements: ["metal"],
    weaponAttack: 40,
    spellAttack: 36,
    defense: 20,
    realmLevel: 9,
    weaponTier: 4,
    proficiency: { "quick-flurry": 24 },
    manualTierByElement: { metal: 4 },
  };
  const listed = listNextUnlocks(ctx).find((entry) => entry.name === "游龙九转");
  assert.equal(listed?.blockedBy, "境界");
});

test("元婴的道势高于同状态的金丹", () => {
  const world = createSeedWorld();
  const base = world.cultivators["yun-zhong-he"]!;
  const core = computeDaoPotential({ ...base, realm: "金丹", realmLevel: 9 });
  const nascent = computeDaoPotential({ ...base, realm: "元婴", realmLevel: 10 });
  const spirit = computeDaoPotential({ ...base, realm: "化神", realmLevel: 13 });
  assert.ok(nascent.score > core.score);
  assert.ok(spirit.score > nascent.score);
});

test("已通关的甲级地宫把元婴指向四到六层，不送回一层", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 9 },
  };
  cultivator.realm = "元婴";
  cultivator.realmLevel = 10;
  const nascent = getCultivatorState(world, cultivator.id).dungeon?.recommendedRank ?? 0;
  assert.ok(nascent >= 4 && nascent <= 6);

  cultivator.realm = "金丹";
  cultivator.realmLevel = 9;
  const core = getCultivatorState(world, cultivator.id).dungeon?.recommendedRank ?? 0;
  assert.ok(core >= 7 && core <= 9);

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.realm = "炼气";
  cultivator.realmLevel = 3;
  const qi = getCultivatorState(world, cultivator.id).dungeon?.recommendedRank ?? 0;
  assert.ok(qi >= 7 && qi <= 9);
});
