import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  hydrateWorldState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
  toPersistedWorldState,
} from "./index.js";
import type { ActionId, Cultivator, WorldState } from "./model.js";
import type { ResolvedCombatSkill } from "./combat-skills.js";
import {
  prepareRegionalFighter,
  regionalCatalog,
  regionalCraftStoneCost,
  spendRegionalCraftFiber,
  tideWindow,
} from "./regional-dungeons.js";
import type { BattleCombatant } from "./party-battle.js";

const LEADER_ID = "yun-zhong-he";

const STATE_DUNGEONS: Array<{ stateId: string; name: string; band: string; drop: string }> = [
  { stateId: "qingzhou", name: "青岚药窟", band: "筑基", drop: "青岚露芯" },
  { stateId: "yangzhou", name: "听潮钟窟", band: "筑基中期", drop: "潮钟碎片" },
  { stateId: "shuzhou", name: "栈云断索", band: "筑基", drop: "云栈纤维" },
  { stateId: "wanzhou", name: "茶桥旧席", band: "金丹前期", drop: "旧茶纹" },
  { stateId: "zhongzhou", name: "衡碑试衡", band: "金丹中期", drop: "衡石碎片" },
  { stateId: "youzhou", name: "猎霜夜巡", band: "金丹后期", drop: "霜猎骨" },
  { stateId: "leizhou", name: "焦雷祭坛", band: "元婴", drop: "焦雷芯" },
  { stateId: "cangzhou", name: "盐风沉舶", band: "元婴后期", drop: "盐纹晶" },
  { stateId: "liangzhou", name: "砂门闭关", band: "化神", drop: "镇沙符页" },
];

function leader(world: WorldState): Cultivator {
  const cultivator = world.cultivators[LEADER_ID];
  assert.ok(cultivator);
  return cultivator;
}

function ready(cultivator: Cultivator, level: number, locationId: string): void {
  cultivator.realmLevel = level;
  cultivator.realm = level >= 13 ? "化神" : level >= 10 ? "元婴" : level >= 7 ? "金丹" : level >= 4 ? "筑基" : "炼气";
  cultivator.locationId = locationId;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.activeJobId = null;
}

function actionIds(world: WorldState, cultivatorId: string): string[] {
  return listAvailableActions(world, cultivatorId).map((action) => action.actionId);
}

function assertChinese(text: string): void {
  assert.match(text, /[\u4e00-\u9fff]/);
  assert.equal(/欢迎|请您|很高兴为|客服/.test(text), false, text);
}

test("each state has its own dungeon, and three shorter caves sit beside them", () => {
  const catalog = regionalCatalog();
  assert.equal(catalog.length, 12);
  for (const expected of STATE_DUNGEONS) {
    const row = catalog.find((entry) => entry.stateId === expected.stateId);
    assert.ok(row);
    assert.equal(row.name, expected.name);
    assert.equal(row.band, expected.band);
    assert.equal(row.signatureName, expected.drop);
    assert.equal(row.where, "state");
  }
  const bands = new Set(catalog.filter((entry) => entry.stateId).map((entry) => entry.minRealm));
  assert.ok(bands.has(4));
  assert.ok(bands.has(7));
  assert.ok(bands.has(10));
  assert.ok(bands.has(13));
  assert.equal(catalog.find((entry) => entry.id === "wanderer-cave")?.where, "main-city");
  assert.equal(catalog.find((entry) => entry.id === "merchant-hold")?.where, "main-city");
  assert.equal(catalog.find((entry) => entry.id === "ancient-vigil")?.where, "sect-outpost");
  assert.equal(catalog.find((entry) => entry.id === "ancient-vigil")?.name, "古修闭关室");
});

test("an agent in 青州 reads the herb cave, and the ranked floors stay where they were", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 4, "qingzhou:main-city");
  const view = getCultivatorState(world, cultivator.id).regionalDungeons;
  assert.ok(view);
  const names = view.places.map((place) => place.name);
  assert.deepEqual(names, ["青岚药窟", "散修旧洞", "游商暗仓"]);
  const herb = view.places[0]!;
  assert.equal(herb.open, true);
  assert.equal(herb.actionId, "enter-regional:qinglan-herb-cave");
  assert.equal(herb.band, "筑基");
  assert.equal(herb.signatureName, "青岚露芯");
  assert.match(herb.mechanic, /等露/);
  assert.match(herb.advice, /青岚坡/);
  assert.equal(view.places.find((place) => place.name === "游商暗仓")?.open, false);
  assert.match(view.places.find((place) => place.name === "游商暗仓")?.lockReason ?? "", /金丹/);
  assert.ok(actionIds(world, cultivator.id).includes("enter-regional:qinglan-herb-cave"));
  assert.equal(actionIds(world, cultivator.id).includes("enter-regional:tide-bell-cave"), false);
  const guidance = getCultivatorState(world, cultivator.id).agentGuidance.priorities.join("");
  assert.match(guidance, /青岚药窟/);

  ready(cultivator, 4, "yangzhou:main-city");
  const yang = getCultivatorState(world, cultivator.id).regionalDungeons;
  assert.equal(yang?.places.some((place) => place.name === "青岚药窟"), false);
  assert.equal(yang?.places.some((place) => place.name === "听潮钟窟"), true);

  ready(cultivator, 4, "qingzhou:dungeon-c");
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  const gate = getCultivatorState(world, cultivator.id);
  assert.match(gate.dungeon?.advice ?? "", /练手|旧驿石廊/);
  assert.match(gate.dungeon?.advice ?? "", /青岚药窟/);
  const mysteries = (gate.dungeon?.rankYieldHints ?? []).map((hint) => hint.mysteryName).filter(Boolean);
  assert.equal(mysteries.includes("青岚药窟"), false);
  const ids = actionIds(world, cultivator.id);
  assert.ok(ids.some((id) => id.startsWith("enter-dungeon:") || id.startsWith("start-dungeon-expedition:")));
  assert.ok(ids.includes("enter-regional:qinglan-herb-cave"));
});

test("realm, a wound, and a cooldown each keep the door shut", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 3, "qingzhou:main-city");
  const low = getCultivatorState(world, cultivator.id).regionalDungeons?.places.find((place) => place.id === "qinglan-herb-cave");
  assert.equal(low?.open, false);
  assert.match(low?.lockReason ?? "", /筑基/);
  assert.equal(actionIds(world, cultivator.id).includes("enter-regional:qinglan-herb-cave"), false);
  assert.ok(actionIds(world, cultivator.id).includes("enter-regional:wanderer-cave"));

  ready(cultivator, 4, "qingzhou:main-city");
  cultivator.injuryTicksRemaining = 2;
  const hurt = getCultivatorState(world, cultivator.id).regionalDungeons?.places.find((place) => place.id === "qinglan-herb-cave");
  assert.match(hurt?.lockReason ?? "", /伤/);
  assert.equal(actionIds(world, cultivator.id).includes("enter-regional:qinglan-herb-cave"), false);

  cultivator.injuryTicksRemaining = 0;
  cultivator.regionalCooldowns = { "qinglan-herb-cave": 16 };
  world.tick = 4;
  const cooling = getCultivatorState(world, cultivator.id).regionalDungeons?.places.find((place) => place.id === "qinglan-herb-cave");
  assert.match(cooling?.lockReason ?? "", /第16刻/);
  assert.equal(cooling?.cooldownUntilTick, 16);
  assert.throws(
    () => performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave"),
    /第16刻/,
  );
});

test("waiting for the dew carries the core, a sighting, and a cooldown", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 4, "qingzhou:main-city");
  const stones = cultivator.spiritStones;
  performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave");
  const pending = getCultivatorState(world, cultivator.id).regionalDungeons?.active;
  assert.equal(pending?.name, "青岚药窟");
  assert.equal(pending?.safeOptionId, "qinglan-wait");
  assert.deepEqual(pending?.options.map((option) => option.label), ["等露", "割藤", "拔根"]);
  for (const option of pending?.options ?? []) assertChinese(option.description);

  const persisted = hydrateWorldState(toPersistedWorldState(world));
  const saved = persisted.cultivators[LEADER_ID]!;
  performAction(persisted, saved.id, "regional-choice:qinglan-wait");
  assert.equal(saved.activeJobId, null);
  assert.equal(saved.inventory["qinglan-dew-core"], 1);
  assert.ok(saved.spiritStones > stones);
  assert.equal(saved.regionalReport?.outcome, "cleared");
  assert.equal(saved.regionalReport?.signatureName, "青岚露芯");
  assertChinese(saved.regionalReport?.line ?? "");
  assert.match(saved.travelNotes?.map((note) => note.detail).join("") ?? "", /见闻/);
  const digest = getCultivatorState(persisted, saved.id).digest?.summary ?? "";
  assert.match(digest, /见闻/);
  assert.equal(saved.regionalCooldowns?.["qinglan-herb-cave"], 16);
  assert.throws(() => performAction(persisted, saved.id, "enter-regional:qinglan-herb-cave"), /第16刻/);

  const quiet = createSeedWorld();
  const quietLeader = leader(quiet);
  ready(quietLeader, 4, "qingzhou:main-city");
  performAction(quiet, quietLeader.id, "enter-regional:qinglan-herb-cave");
  advanceWorld(quiet, 2);
  assert.equal(quietLeader.activeJobId, null);
  assert.equal(quietLeader.inventory["qinglan-dew-core"], 1);
  assert.equal(quietLeader.regionalReport?.outcome, "cleared");
});

test("the dark hold costs stones and a wound, and does not give the crystal", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 12, "cangzhou:main-city");
  const stones = cultivator.spiritStones;
  performAction(world, cultivator.id, "enter-regional:salt-wreck");
  performAction(world, cultivator.id, "regional-choice:salt-dark");
  assert.equal(cultivator.inventory["salt-pattern-crystal"], 0);
  assert.equal(cultivator.spiritStones, stones - 24);
  assert.equal(cultivator.injuryTicksRemaining, 4);
  assert.equal(cultivator.regionalReport?.outcome, "failed");
  assert.match(cultivator.regionalReport?.line ?? "", /暗舱/);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "deviation" && effect.remainingTicks >= 2));
  assertChinese(cultivator.travelNotes?.[0]?.detail ?? "");
});

test("the tide bell only opens for the first eight ticks of the day", () => {
  assert.equal(tideWindow(0).open, true);
  assert.equal(tideWindow(7).open, true);
  assert.equal(tideWindow(8).open, false);
  assert.equal(tideWindow(8).opensAt, 24);

  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 5, "yangzhou:main-city");
  assert.equal(getCultivatorState(world, cultivator.id).regionalDungeons?.places.find((place) => place.id === "tide-bell-cave")?.open, true);
  world.tick = 8;
  const closed = getCultivatorState(world, cultivator.id).regionalDungeons?.places.find((place) => place.id === "tide-bell-cave");
  assert.equal(closed?.open, false);
  assert.match(closed?.lockReason ?? "", /潮退了/);
  assert.equal(closed?.opensAtTick, 24);
  assert.equal(actionIds(world, cultivator.id).includes("enter-regional:tide-bell-cave"), false);
  assert.throws(() => performAction(world, cultivator.id, "enter-regional:tide-bell-cave"), /潮退了/);
});

test("two companions must agree, and the drop stays in the leader's bag", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 4, "qingzhou:main-city");
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-regional-mate", name: "苏晚" });
  const mate = world.cultivators[summary.selectedCultivatorId]!;
  mate.locationId = "qingzhou:main-city";
  mate.injuryTicksRemaining = 0;
  mate.activeJobId = null;
  performAction(world, cultivator.id, `chat-up:${mate.id}`);
  performAction(world, cultivator.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations ?? {})[0];
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);

  performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave");
  assert.equal(world.regionalRuns?.[cultivator.id]?.companionIds.includes(mate.id), true);
  assert.ok(actionIds(world, mate.id).includes("regional-choice:qinglan-wait"));
  const first = performAction(world, mate.id, "regional-choice:qinglan-pull");
  assert.match(first.summary, /放了下来/);
  assert.equal(cultivator.inventory["qinglan-dew-core"], 0);
  assert.ok(cultivator.activeJobId);

  const splitVote = performAction(world, cultivator.id, "regional-choice:qinglan-wait");
  assert.match(splitVote.summary, /放了下来/);
  assert.equal(cultivator.inventory["qinglan-dew-core"], 0);
  performAction(world, mate.id, "regional-choice:qinglan-wait");
  assert.equal(cultivator.inventory["qinglan-dew-core"], 1);
  assert.equal(mate.inventory["qinglan-dew-core"], 0);
  assert.match(mate.regionalReport?.line ?? "", /袋子里/);
  assert.equal(mate.regionalReport?.sharedLeaderId, cultivator.id);
  assert.equal(mate.regionalReport?.signatureName, "青岚露芯");
  assert.match(mate.travelNotes?.map((note) => note.detail).join("") ?? "", /见闻/);

  const split = createSeedWorld();
  const lead = leader(split);
  ready(lead, 4, "qingzhou:main-city");
  const other = syncCultivatorFromPersona(split, { agentId: "agent-regional-timeout", name: "石不语" });
  const companion = split.cultivators[other.selectedCultivatorId]!;
  companion.locationId = "qingzhou:main-city";
  companion.injuryTicksRemaining = 0;
  companion.activeJobId = null;
  performAction(split, lead.id, `chat-up:${companion.id}`);
  performAction(split, lead.id, `party-invite:${companion.id}`);
  const secondInvite = Object.keys(split.partyInvitations ?? {})[0];
  assert.ok(secondInvite);
  performAction(split, companion.id, `accept-party:${secondInvite}`);
  performAction(split, lead.id, "enter-regional:qinglan-herb-cave");
  performAction(split, companion.id, "regional-choice:qinglan-pull");
  advanceWorld(split, 2);
  assert.equal(lead.inventory["qinglan-dew-core"], 1);
  assert.equal(lead.regionalReport?.outcome, "cleared");
  assert.match(lead.regionalReport?.line ?? "", /露/);
});

test("sitting out the vigil keeps the ash until the hours are done", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 10, "qingzhou:sect-outpost:cang-mu-gu");
  const places = getCultivatorState(world, cultivator.id).regionalDungeons?.places ?? [];
  assert.ok(places.some((place) => place.id === "ancient-vigil" && place.open));
  assert.equal(places.find((place) => place.id === "ancient-vigil")?.party, false);
  performAction(world, cultivator.id, "enter-regional:ancient-vigil");
  performAction(world, cultivator.id, "regional-choice:vigil-sit");
  assert.equal(cultivator.inventory["vigil-ash"], 0);
  assert.equal(getCultivatorState(world, cultivator.id).regionalDungeons?.active?.phase, "vigil");
  assert.ok(cultivator.activeJobId);
  advanceWorld(world, 4);
  assert.equal(cultivator.activeJobId, null);
  assert.equal(cultivator.inventory["vigil-ash"], 1);
  assert.equal(cultivator.regionalReport?.outcome, "sat");
  assertChinese(cultivator.regionalReport?.line ?? "");

  const left = createSeedWorld();
  const sitter = leader(left);
  ready(sitter, 10, "qingzhou:sect-outpost:cang-mu-gu");
  const qi = sitter.qi;
  performAction(left, sitter.id, "enter-regional:ancient-vigil");
  performAction(left, sitter.id, "regional-choice:vigil-sit");
  performAction(left, sitter.id, "leave-regional");
  assert.equal(sitter.inventory["vigil-ash"], 0);
  assert.equal(sitter.qi, qi - 12);
  assert.equal(sitter.regionalReport?.outcome, "withdrew");
  assert.match(sitter.regionalReport?.line ?? "", /坐到一半/);
  assert.equal(sitter.activeJobId, null);
});

test("a sealed gate keeps the weapon and drops the spells", () => {
  const spell: ResolvedCombatSkill = {
    id: "water-frost-tier-2",
    name: "霜寒",
    role: "dps",
    roles: ["dps"],
    channel: "spell",
    spiritCost: 2,
    qiCost: 0,
    cooldown: 0,
    target: "enemy",
    power: 8,
    guardRatio: 0,
    wardRatio: 0,
    healRatio: 0,
    hitBonus: 0,
    critBonus: 0,
    slow: false,
    focus: false,
    shred: 1,
    summary: "挂一层霜。",
  };
  const strike: ResolvedCombatSkill = { ...spell, id: "basic-strike", name: "随手一击", channel: "weapon", summary: "用兵器打一下。" };
  const base: BattleCombatant = {
    id: "fighter",
    name: "试手",
    side: "party",
    role: "dps",
    hp: 80,
    maxHp: 80,
    weaponAttack: 12,
    spellAttack: 12,
    defense: 6,
    speed: 8,
    hit: 70,
    dodge: 4,
    crit: 5,
    critDamage: 140,
    guardHeart: 0,
    spirit: 20,
    maxSpirit: 20,
    skills: [spell, strike],
  };
  const sealed = prepareRegionalFighter(base, { sealSpells: true, hpRatio: 0.8 });
  assert.deepEqual(sealed.skills.map((skill) => skill.id), ["basic-strike"]);
  assert.equal(sealed.hp, 64);
  assert.equal(prepareRegionalFighter(base, {}).skills.length, 2);
});

test("meditation uses a regional aid only when the realm's own aid is missing", () => {
  const sit = (level: number, items: Array<"qinglan-dew-core" | "core-nourish-dew" | "old-tea-pattern">) => {
    const world = createSeedWorld();
    const cultivator = leader(world);
    ready(cultivator, level, cultivator.residence.locationId);
    cultivator.realmProgress = 10;
    for (const itemId of items) cultivator.inventory[itemId] = 1;
    performAction(world, cultivator.id, "cultivate");
    advanceWorld(world, 6);
    return cultivator;
  };
  const plain = sit(4, []);
  const fed = sit(4, ["qinglan-dew-core"]);
  assert.equal(fed.realmProgress - plain.realmProgress, 4);
  assert.equal(fed.inventory["qinglan-dew-core"], 0);
  const core = sit(7, ["core-nourish-dew", "old-tea-pattern"]);
  assert.equal(core.inventory["core-nourish-dew"], 0);
  assert.equal(core.inventory["old-tea-pattern"], 1);
});

test("one strand of cloud fiber takes a fifth off a single craft", () => {
  assert.equal(regionalCraftStoneCost({ inventory: { "cloud-plank-fiber": 0 } } as Cultivator, 30), 30);
  assert.equal(regionalCraftStoneCost({ inventory: { "cloud-plank-fiber": 1 } } as Cultivator, 30), 24);
  const holder = { inventory: { "cloud-plank-fiber": 1 } } as Cultivator;
  spendRegionalCraftFiber(holder, 30, 24);
  assert.equal(holder.inventory["cloud-plank-fiber"], 0);
  spendRegionalCraftFiber(holder, 30, 30);

  const craft = (fiber: boolean) => {
    const world = createSeedWorld();
    const cultivator = leader(world);
    ready(cultivator, 4, cultivator.residence.locationId);
    cultivator.inventory["beast-core"] = 1;
    cultivator.inventory["spirit-ore"] = 1;
    if (fiber) cultivator.inventory["cloud-plank-fiber"] = 1;
    const before = cultivator.spiritStones;
    performAction(world, cultivator.id, "residence-produce:recipe-healing-pill" as ActionId);
    advanceWorld(world, 3);
    return { paid: before - cultivator.spiritStones, fiber: cultivator.inventory["cloud-plank-fiber"] };
  };
  const bare = craft(false);
  const lined = craft(true);
  assert.equal(lined.paid, Math.floor(bare.paid * 0.8));
  assert.equal(lined.fiber, 0);
});

test("cutting the vine is a fight the cultivator can finish, and leaving is not", () => {
  const world = createSeedWorld();
  const cultivator = leader(world);
  ready(cultivator, 4, "qingzhou:main-city");
  performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave");
  performAction(world, cultivator.id, "regional-choice:qinglan-cut");
  assert.equal(cultivator.regionalReport?.outcome, "cleared");
  assert.equal(cultivator.inventory["qinglan-dew-core"], 1);
  assert.match(cultivator.regionalReport?.line ?? "", /活藤/);
  assert.match(cultivator.regionalReport?.line ?? "", /缠绕/);
  const combat = getCultivatorState(world, cultivator.id).recentCombats[0];
  assert.equal(combat?.enemyName, "活藤");
  assert.equal(combat?.combatRounds?.[0]?.outcome, "win");

  const gone = createSeedWorld();
  const leaving = leader(gone);
  ready(leaving, 4, "qingzhou:main-city");
  const stones = leaving.spiritStones;
  performAction(gone, leaving.id, "enter-regional:qinglan-herb-cave");
  performAction(gone, leaving.id, "leave-regional");
  assert.equal(leaving.inventory["qinglan-dew-core"], 0);
  assert.equal(leaving.spiritStones, stones - 6);
  assert.equal(leaving.regionalReport?.outcome, "withdrew");
  assert.match(leaving.regionalReport?.line ?? "", /瓶子是空的/);
});
