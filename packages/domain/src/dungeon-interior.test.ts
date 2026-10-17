import assert from "node:assert/strict";
import test from "node:test";

import {
  bahuangRoomLine,
  floorPack,
  interiorContentCounts,
  interiorRoomBeat,
  interiorWakeDraft,
  interiorWakeEffect,
  pickLateWakeKind,
  regionalEscortName,
  regionalDeeper,
  regionalInterior,
  regionalInteriorIds,
  resolveInteriorSkirmish,
  wildRoomLine,
} from "./dungeon-interior.js";
import { maybeCreateDungeonWakeNode, settleDungeonWakeNode, createDungeonExpeditionProgress } from "./dungeon-expedition-service.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { regionalCatalog } from "./regional-dungeons.js";

const LEADER_ID = "yun-zhong-he";

function assertChinese(text: string): void {
  assert.match(text, /[\u4e00-\u9fff]/);
  assert.equal(/[A-Za-z]/.test(text), false, text);
}

test("interior content adds side rooms, wake scenes, and named packs", () => {
  const counts = interiorContentCounts();
  assert.equal(counts.wakeScenes, 10);
  assert.equal(counts.wakeOptions, 40);
  assert.equal(counts.regionalScenes, 12);
  assert.equal(counts.regionalOptions, 48);
  assert.equal(counts.deeperScenes, 12);
  assert.equal(counts.deeperOptions, 48);
  assert.equal(counts.floorPacks, 8);
  assert.equal(counts.laterPacks, 8);
  assert.equal(counts.regionalEscorts, 12);
  assert.equal(counts.roomLines, 64);

  const lei = floorPack("乙", 1, true).map((foe) => foe.name);
  assert.deepEqual(lei, ["雷枪客", "断法修", "残阵主"]);
  assert.equal(floorPack("乙", 1, true).filter((foe) => foe.flavor === "兵器").length > 0, true);
  assert.equal(floorPack("乙", 1, true).filter((foe) => foe.flavor === "法术").length > 0, true);
  assert.deepEqual(floorPack("乙", 5, false).map((foe) => foe.name), ["沼刃", "缠雾修"]);
  assert.deepEqual(floorPack("乙", 8, true).map((foe) => foe.name), ["铜矛客", "霜术士", "棺前客"]);
  assert.deepEqual(floorPack("丙", 2, false).map((foe) => foe.name), ["石刀客", "火符修"]);
  assert.equal(floorPack("丙", 2, false).some((foe) => foe.name === "灯奴"), false);
  assert.deepEqual(floorPack("丙", 8, true).map((foe) => foe.name), ["灯刃", "石咒修", "驿卒长"]);
  assert.deepEqual(floorPack("甲", 1, true).map((foe) => foe.name), ["火刀客", "焚咒修", "炉前使"]);
  assert.deepEqual(floorPack("甲", 5, true).map((foe) => foe.name), ["莲枪客", "幻莲修", "池上使"]);
  assert.deepEqual(floorPack("甲", 8, false).map((foe) => foe.name), ["纹剑客", "镇印修"]);
  assert.deepEqual(floorPack("乙", 1, false, "later").map((foe) => foe.name), ["雷鞭客", "跳符修"]);
  assert.deepEqual(floorPack("乙", 1, true, "later").map((foe) => foe.name), ["雷鞭客", "跳符修", "阵眼客"]);
  assert.deepEqual(floorPack("丙", 2, false, "later").map((foe) => foe.name), ["砖斧客", "纸符修"]);
  assert.deepEqual(floorPack("丙", 8, true, "later").map((foe) => foe.name), ["灯杆客", "油火修", "夜驿客"]);
  assert.equal(floorPack("丙", 2, false, "later").some((foe) => foe.name === "灯奴"), false);

  for (const id of regionalInteriorIds()) {
    assert.equal(regionalEscortName(id) !== null, true);
    const scene = regionalInterior(id);
    assert.ok(scene);
    assert.ok(scene.options.length >= 3 && scene.options.length <= 4);
    assert.equal(scene.options.filter((option) => option.safe).length, 1);
    assertChinese(scene.prompt);
    const farther = regionalDeeper(id);
    assert.ok(farther);
    assert.equal(farther.options.filter((option) => option.safe).length, 1);
    assertChinese(farther.prompt);
    for (const option of farther.options) {
      assertChinese(option.label);
      assertChinese(option.description);
      assertChinese(option.line);
    }
    for (const option of scene.options) {
      assertChinese(option.label);
      assertChinese(option.description);
      assertChinese(option.line);
    }
  }
  assert.equal(regionalCatalog().length, regionalInteriorIds().length);
});

const FRESH_KINDS = ["trap", "shrine", "chamber", "nest", "sealed", "well", "span", "lantern", "voice", "ford"] as const;

test("late wakes can be a trap, shrine, chamber, nest, or sealed door, and the old fellow path still resolves", () => {
  for (const kind of FRESH_KINDS) {
    const draft = interiorWakeDraft(kind, "aggressive");
    assert.ok(draft);
    assert.equal(draft.options.length, 4);
    assertChinese(draft.context);
    const placed = interiorWakeDraft(kind, "balanced", "雷泽残阵");
    assert.match(placed?.context ?? "", /雷泽残阵/);
    assertChinese(placed?.context ?? "");
    for (const option of draft.options) {
      assertChinese(option.label);
      assertChinese(option.description);
      const effect = interiorWakeEffect(option.optionId);
      assert.ok(effect);
      assert.ok(effect.stoneDelta <= 12 && effect.stoneDelta >= -6);
      assertChinese(effect.beat.detail);
    }
  }

  assert.equal(pickLateWakeKind({
    used: new Set(["moral", "fork", "relic", "loot"]),
    elite: false,
    bank: false,
    roll: 0,
  }), "fellow");

  const fresh = new Set<string>();
  for (let roll = 0; roll < 25; roll += 5) {
    const kind = pickLateWakeKind({ used: new Set(["moral"]), elite: false, bank: false, roll });
    if (kind) fresh.add(kind);
  }
  assert.equal([...fresh].some((kind) => ["trap", "shrine", "chamber", "nest", "sealed"].includes(kind)), true);

  const world = createSeedWorld();
  const cultivator = world.cultivators[LEADER_ID]!;
  const progress = createDungeonExpeditionProgress({
    cultivatorId: cultivator.id,
    jobId: "interior-wake",
    locationId: cultivator.locationId,
    grade: "丙",
    targetRank: 1,
    policy: "balanced",
    startedAtTick: 0,
  });
  progress.stepIndex = 6;
  progress.usedWakeScenes = ["moral", "fork", "relic", "fellow", "loot"];
  const node = maybeCreateDungeonWakeNode({
    progress,
    cultivator,
    actionKind: "search",
    worldTick: 5,
    sectName: null,
  });
  assert.ok(node);
  assert.equal(FRESH_KINDS.includes(node.sceneKind as typeof FRESH_KINDS[number]), true);
  progress.pendingWakeNode = node;
  const settlement = settleDungeonWakeNode(progress, node.defaultOptionId);
  assert.ok(settlement.beat);
  assertChinese(settlement.beat.detail);
  assert.equal(settlement.progress.pendingWakeNode, null);
});

test("a solo 乙 run spends step 6 on a chance and step 8 on a quarrel", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[LEADER_ID]!;
  const make = (grade: "乙" | "甲", rank: 1 | 5 | 8, step: number) => {
    const progress = createDungeonExpeditionProgress({
      cultivatorId: cultivator.id,
      jobId: `yi-wake-${grade}-${rank}-${step}`,
      locationId: cultivator.locationId,
      grade,
      targetRank: rank,
      policy: "balanced",
      startedAtTick: 0,
    });
    progress.stepIndex = step;
    progress.usedWakeScenes = ["moral", "fork", "relic", "fellow", "loot"];
    return maybeCreateDungeonWakeNode({
      progress,
      cultivator,
      actionKind: "search",
      worldTick: step,
      sectName: null,
    });
  };

  const chance = make("乙", 1, 6);
  assert.equal(chance?.sceneKind, "yi-chance");
  assert.match(chance?.context ?? "", /雷泽残阵/);
  assert.equal(chance?.options.length, 4);
  assertChinese(chance?.context ?? "");
  for (const option of chance?.options ?? []) {
    assertChinese(option.label);
    assertChinese(option.description);
  }
  const fog = make("乙", 5, 6);
  assert.match(fog?.context ?? "", /沉雾沼/);
  const coffin = make("乙", 8, 8);
  assert.equal(coffin?.sceneKind, "yi-quarrel");
  assert.match(coffin?.context ?? "", /铜棺窟/);
  assert.equal(coffin?.options.length, 4);

  const progress = createDungeonExpeditionProgress({
    cultivatorId: cultivator.id,
    jobId: "yi-chance-settle",
    locationId: cultivator.locationId,
    grade: "乙",
    targetRank: 1,
    policy: "aggressive",
    startedAtTick: 0,
  });
  progress.stepIndex = 6;
  const aggressive = maybeCreateDungeonWakeNode({
    progress,
    cultivator,
    actionKind: "search",
    worldTick: 1,
    sectName: null,
  });
  assert.equal(aggressive?.defaultOptionId, "pry-spark");
  progress.pendingWakeNode = aggressive;
  const settlement = settleDungeonWakeNode(progress, "pry-spark");
  assert.match(settlement.beat?.detail ?? "", /你选了伸手摘下来/);
  assert.match(settlement.beat?.detail ?? "", /雷泽残阵/);
  assert.equal(settlement.stoneDelta, 8);
  assert.equal(/[A-Za-z]/.test(settlement.beat?.detail ?? ""), false);

  const jia = make("甲", 1, 6);
  assert.notEqual(jia?.sceneKind, "yi-chance");
  assert.notEqual(jia?.sceneKind, "yi-quarrel");
  assert.equal((jia?.context ?? "").includes("残雷"), false);
});

test("the first step of a ranked run leaves a scout line, and a search step can name a mid-pack", () => {
  const scout = interiorRoomBeat({ grade: "乙", rank: 2, step: 1, fought: true });
  assert.equal(scout?.title, "探路");
  assert.match(scout?.detail ?? "", /雷泽残阵/);
  assert.equal(interiorRoomBeat({ grade: "丙", rank: 1, step: 3, fought: false }), null);
  const laterScout = interiorRoomBeat({ grade: "乙", rank: 2, step: 7, fought: false });
  assert.equal(laterScout?.title, "探路");
  assert.match(laterScout?.detail ?? "", /雷泽残阵/);
  assert.notEqual(laterScout?.detail, scout?.detail);

  const world = createSeedWorld();
  const cultivator = world.cultivators[LEADER_ID]!;
  cultivator.locationId = "qingzhou:dungeon-b";
  cultivator.realmLevel = 4;
  cultivator.realm = "筑基";
  cultivator.dungeonProgress["乙"].highestClearedRank = 1;
  cultivator.qi = cultivator.maxQi = 400;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 400;
  performAction(world, cultivator.id, "start-dungeon-expedition:rank-1:conservative" as never);
  advanceWorld(world, 3);
  const progress = world.dungeonExpeditions[cultivator.id];
  assert.ok(progress);
  assert.equal(progress.beats?.some((beat) => beat.title === "探路" && beat.detail.includes("雷泽残阵")), true);

  let sawPack = false;
  for (let tick = 0; tick < 80 && cultivator.activeJobId; tick += 1) {
    advanceWorld(world, 1);
    const rounds = world.dungeonExpeditions[cultivator.id]?.combatRounds
      ?? getCultivatorState(world, cultivator.id).dungeonExpedition.lastReport?.combatRounds
      ?? [];
    if (rounds.some((round) => /雷枪客|断法修|残阵主/.test(round.enemyName))) sawPack = true;
  }
  assert.equal(sawPack, true);
  const state = getCultivatorState(world, cultivator.id);
  const notes = state.travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /见闻/);
});

test("a regional run keeps the signature choice and also offers a side room", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[LEADER_ID]!;
  cultivator.realmLevel = 4;
  cultivator.realm = "筑基";
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.activeJobId = null;
  const before = cultivator.spiritStones;
  performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave");
  const view = getCultivatorState(world, cultivator.id).regionalDungeons?.active;
  assert.deepEqual(view?.options.map((option) => option.label), ["等露", "割藤", "拔根"]);
  assert.equal(view?.interior?.options.length, 4);
  assert.equal(view?.safeOptionId, "qinglan-wait");
  assert.match(view?.interior?.prompt ?? "", /石窝/);
  const ids = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.ok(ids.includes("regional-choice:room-qinglan-look"));
  assert.ok(ids.includes("regional-choice:qinglan-wait"));

  const looked = performAction(world, cultivator.id, "regional-choice:room-qinglan-look");
  assert.match(looked.summary, /石窝/);
  assert.equal(cultivator.inventory["qinglan-dew-core"] ?? 0, 0);
  assert.equal(cultivator.activeJobId !== null, true);
  assert.equal(cultivator.spiritStones, before);
  performAction(world, cultivator.id, "regional-choice:qinglan-wait");
  assert.equal(cultivator.inventory["qinglan-dew-core"], 1);
  assert.equal(cultivator.regionalReport?.signatureName, "青岚露芯");
  const told = (cultivator.travelNotes ?? []).map((note) => note.detail).join("");
  assert.match(told, /见闻/);
  assert.match(told, /石窝/);
});

test("a regional run can answer the farther room without granting the signature drop", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[LEADER_ID]!;
  cultivator.realmLevel = 4;
  cultivator.realm = "筑基";
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.activeJobId = null;
  performAction(world, cultivator.id, "enter-regional:qinglan-herb-cave");
  const view = getCultivatorState(world, cultivator.id).regionalDungeons?.active;
  assert.match(view?.deeper?.prompt ?? "", /还在滴/);
  assert.equal(view?.deeper?.options.length, 4);
  assert.equal(view?.interior?.options.length, 4);
  const ids = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.ok(ids.includes("regional-choice:deep-qinglan-stand"));
  assert.ok(ids.includes("regional-choice:qinglan-wait"));
  const stood = performAction(world, cultivator.id, "regional-choice:deep-qinglan-stand");
  assert.match(stood.summary, /水滴在石头上/);
  assert.equal(cultivator.inventory["qinglan-dew-core"] ?? 0, 0);
  assert.equal(cultivator.activeJobId !== null, true);
  assert.equal(getCultivatorState(world, cultivator.id).regionalDungeons?.active?.deeper, null);
  assert.equal(getCultivatorState(world, cultivator.id).regionalDungeons?.active?.interior?.options.length, 4);
  performAction(world, cultivator.id, "regional-choice:qinglan-wait");
  assert.equal(cultivator.inventory["qinglan-dew-core"], 1);
});

const TRIAL_ALLY = {
  id: "leader",
  name: "试阵",
  side: "party" as const,
  role: "dps" as const,
  hp: 80,
  maxHp: 80,
  weaponAttack: 12,
  spellAttack: 8,
  defense: 6,
  speed: 10,
  hit: 80,
  dodge: 4,
  crit: 4,
  critDamage: 130,
  guardHeart: 0,
  spirit: 20,
  maxSpirit: 20,
  skills: [],
};

function trialSkirmish(grade: "丙" | "乙" | "甲", rank: 1 | 5 | 8, stepIndex: number, seed: string) {
  return resolveInteriorSkirmish({
    grade,
    rank,
    stepIndex,
    actionKind: "search",
    seed,
    allies: [TRIAL_ALLY],
    leaderId: "leader",
    policy: "balanced",
  });
}

test("a later search step names the second pack for that floor", () => {
  const battle = trialSkirmish("乙", 1, 2, "later-pack");
  assert.ok(battle);
  assert.match(battle.summary.enemyName, /雷鞭客/);
  assert.match(battle.summary.enemyName, /跳符修/);
  assert.equal(battle.summary.enemyName.includes("残阵主"), false);
  const elite = resolveInteriorSkirmish({
    grade: "乙",
    rank: 1,
    stepIndex: 5,
    actionKind: "search",
    seed: "later-elite",
    allies: [{
      id: "leader",
      name: "试阵",
      side: "party",
      role: "dps",
      hp: 120,
      maxHp: 120,
      weaponAttack: 16,
      spellAttack: 10,
      defense: 8,
      speed: 10,
      hit: 80,
      dodge: 4,
      crit: 4,
      critDamage: 130,
      guardHeart: 0,
      spirit: 30,
      maxSpirit: 30,
      skills: [],
    }],
    leaderId: "leader",
    policy: "balanced",
  });
  assert.match(elite?.summary.enemyName ?? "", /阵眼客/);

  const third = trialSkirmish("乙", 1, 6, "yi-third");
  assert.ok(third);
  assert.match(third.summary.enemyName, /雷索客/);
  assert.match(third.summary.enemyName, /麻符修/);
  assert.equal(third.summary.enemyName.includes("残阵主"), false);
  assert.equal(third.summary.enemyName.includes("阵脚"), false);
  const fog = trialSkirmish("乙", 5, 6, "yi-fog");
  assert.match(fog?.summary.enemyName ?? "", /沼钩客/);
  assert.match(fog?.summary.enemyName ?? "", /湿咒修/);
  const frost = trialSkirmish("乙", 8, 6, "yi-frost");
  assert.match(frost?.summary.enemyName ?? "", /霜戟客/);
  assert.match(frost?.summary.enemyName ?? "", /铜灯修/);
  assert.equal(trialSkirmish("丙", 1, 6, "bing-quiet"), null);
  assert.equal(trialSkirmish("甲", 1, 6, "jia-quiet"), null);
});

test("wilderness and bahuang room lines name the place", () => {
  assert.match(wildRoomLine("青岚坡", "seed"), /青岚坡/);
  assert.match(bahuangRoomLine("荒尘驿", "seed"), /荒尘驿/);
  assertChinese(wildRoomLine("青岚坡", "seed"));
  assertChinese(bahuangRoomLine("无灯壑", "other"));
});
