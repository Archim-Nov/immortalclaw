import assert from "node:assert/strict";
import test from "node:test";
import { createCultivator } from "./engine.js";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import { bandForLevel } from "./combat-content.js";
import { realmPhaseForLevel, realmStageForLevel } from "./realms.js";
import { ensureSpiritVeins } from "./sect-life.js";
import {
  MAHAYANA_GATHER_IDS,
  UNITY_GATHER_IDS,
  VOID_GATHER_IDS,
} from "./above-spirit.js";
import type { Cultivator, ItemId, WorldState } from "./model.js";

function finish(world: WorldState, id: string) {
  for (let step = 0; step < 16 && world.cultivators[id]?.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
}

function give(cultivator: Cultivator, ids: readonly ItemId[]) {
  for (const id of ids) cultivator.inventory[id] = (cultivator.inventory[id] ?? 0) + 1;
}

function outpostId(world: WorldState): string {
  const found = Object.values(world.locations).find((location) => location.nodeType === "sect-outpost");
  if (!found) throw new Error("seed world has no sect outpost");
  return found.id;
}

function clearSpot(world: WorldState, locationId: string, keepId: string) {
  for (const other of Object.values(world.cultivators)) {
    if (other.id !== keepId && other.locationId === locationId) other.locationId = "qingzhou:main-city";
  }
}

const VOID = ["void-grain-sand", "empty-silk", "rift-boundary-stone"] as const;
const UNITY = ["twin-soul-ash", "joined-dao-jade", "heaven-man-thread"] as const;
const MAHAYANA = ["kalpa-pillar-shard", "great-vehicle-ash", "wind-feather"] as const;

function prepare(level: number, realm: Cultivator["realm"], items: readonly ItemId[]) {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "破境的人" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.realm = realm;
  cultivator.realmLevel = level;
  cultivator.realmProgress = 100;
  cultivator.spiritStones = 2000;
  cultivator.injuryTicksRemaining = 0;
  give(cultivator, items);
  return { world, cultivator };
}

const NARRATIVE_ACTION_IDS = [
  "raise-void-altar",
  "begin-void-seal",
  "seal-void-seal",
  "break-void-array",
  "hold-unity-rite",
  "begin-twin-lamp",
  "seal-twin-lamp",
  "join-heaven-token",
  "face-heaven-pillar",
  "hold-mahayana-platform",
  "begin-wind-crossing",
  "seal-wind-crossing",
] as const;

function assertNarrativeHasNoActionIds(text: string) {
  for (const id of NARRATIVE_ACTION_IDS) {
    assert.equal(text.includes(id), false, id);
  }
}

function narrativeOf(world: WorldState, id: string) {
  const state = getCultivatorState(world, id);
  return [
    state.realmPath.sequence?.join("") ?? "",
    state.realmPath.goals.join(""),
    state.realmPath.risk,
    state.digest?.nextStep ?? "",
    state.realmPath.resources?.join("") ?? "",
  ].join("");
}

test("炼虚、合体、大乘接在化神后面，仍分前中后期", () => {
  assert.equal(realmStageForLevel(15), "化神");
  assert.equal(realmPhaseForLevel(15), "后期");
  assert.equal(realmStageForLevel(16), "炼虚");
  assert.equal(realmPhaseForLevel(16), "前期");
  assert.equal(realmStageForLevel(17), "炼虚");
  assert.equal(realmPhaseForLevel(17), "中期");
  assert.equal(realmStageForLevel(18), "炼虚");
  assert.equal(realmPhaseForLevel(18), "后期");
  assert.equal(realmStageForLevel(19), "合体");
  assert.equal(realmPhaseForLevel(19), "前期");
  assert.equal(realmStageForLevel(21), "合体");
  assert.equal(realmPhaseForLevel(21), "后期");
  assert.equal(realmStageForLevel(22), "大乘");
  assert.equal(realmPhaseForLevel(22), "前期");
  assert.equal(realmStageForLevel(24), "大乘");
  assert.equal(realmPhaseForLevel(24), "后期");
  assert.equal(bandForLevel(16).tier, 5);
  assert.equal(bandForLevel(24).manualRank, "化神");
});

test("化神后期立炼虚台，不守神台", () => {
  const late = prepare(15, "化神", [...VOID, "void-altar-seal"]);
  const state = getCultivatorState(late.world, late.cultivator.id);
  assert.equal(state.realmPath.method, "void-altar");
  assert.equal(state.realmPath.methodName, "炼虚台");
  assert.equal(state.breakthrough?.method, "void-altar");
  assert.equal(state.breakthrough?.methodName, "炼虚台");
  assert.equal(state.breakthrough?.targetRealm, "炼虚");
  assert.equal(state.breakthrough?.targetLevel, 16);
  assert.notEqual(state.realmPath.method, "divine-vigil");
  const told = narrativeOf(late.world, late.cultivator.id);
  assert.match(told, /炼虚台/);
  assertNarrativeHasNoActionIds(told);
  assert.equal(listAvailableActions(late.world, late.cultivator.id).some((action) => action.actionId === "raise-void-altar"), false);
  assert.equal(listAvailableActions(late.world, late.cultivator.id).some((action) => action.actionId === "hold-divine-platform"), false);

  late.cultivator.locationId = outpostId(late.world);
  assert.equal(listAvailableActions(late.world, late.cultivator.id).some((action) => action.actionId === "raise-void-altar"), false);
  assert.throws(
    () => performAction(late.world, late.cultivator.id, "raise-void-altar"),
    /荒野|甲级/,
  );
  assert.throws(
    () => performAction(late.world, late.cultivator.id, "hold-divine-platform"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /炼虚台/);
      assert.equal(error.message.includes("hold-divine-platform"), false);
      assert.equal(error.message.includes("raise-void-altar"), false);
      return true;
    },
  );

  const wrong = prepare(15, "化神", [...VOID, "void-imprint-dew"]);
  wrong.cultivator.locationId = "qingzhou:wilderness";
  assert.throws(() => performAction(wrong.world, wrong.cultivator.id, "raise-void-altar"), /材料/);
  assert.equal(wrong.cultivator.inventory["void-imprint-dew"], 1);
  assert.equal(wrong.cultivator.inventory["void-grain-sand"], 1);
  assert.equal(wrong.cultivator.realmLevel, 15);

  let soloFailure = false;
  let sharedFailure = false;
  let success = false;
  for (let tick = 1; tick < 70 && (!soloFailure || !sharedFailure || !success); tick += 1) {
    const alone = prepare(15, "化神", [...VOID, "void-altar-seal"]);
    alone.world.tick = tick;
    alone.cultivator.locationId = "qingzhou:wilderness";
    clearSpot(alone.world, "qingzhou:wilderness", alone.cultivator.id);
    performAction(alone.world, alone.cultivator.id, "raise-void-altar");
    finish(alone.world, alone.cultivator.id);
    if (alone.cultivator.realm === "炼虚") {
      success = true;
      assert.equal(alone.cultivator.realmLevel, 16);
      assert.match(alone.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /炼虚台/);
    } else if (!soloFailure) {
      soloFailure = true;
      assert.ok(alone.cultivator.injuryTicksRemaining >= 10);
      assert.equal(alone.cultivator.realmProgress, 60);
      assert.match(alone.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /一个人扛/);
    }

    const shared = prepare(15, "化神", [...VOID, "void-altar-seal"]);
    shared.world.tick = tick + 300;
    shared.cultivator.locationId = "qingzhou:wilderness";
    clearSpot(shared.world, "qingzhou:wilderness", shared.cultivator.id);
    const mate = createCultivator(shared.world, { name: "分台的人" });
    const companion = shared.world.cultivators[mate.id]!;
    companion.locationId = "qingzhou:wilderness";
    performAction(shared.world, shared.cultivator.id, "raise-void-altar");
    finish(shared.world, shared.cultivator.id);
    if (shared.cultivator.realmLevel === 15 && !sharedFailure) {
      sharedFailure = true;
      assert.equal(shared.cultivator.injuryTicksRemaining, 6);
      assert.ok(companion.injuryTicksRemaining >= 2);
      assert.match(companion.lifeLog?.map((event) => event.text).join("") ?? "", /炼虚台/);
    }
  }
  assert.ok(soloFailure);
  assert.ok(sharedFailure);
  assert.ok(success);
});

test("炼虚前期在驻地落虚空印，中期走碎虚阵", () => {
  const early = prepare(16, "炼虚", [...VOID, "void-imprint-dew"]);
  assert.throws(
    () => performAction(early.world, early.cultivator.id, "raise-void-altar"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /虚空印/);
      assert.equal(error.message.includes("raise-void-altar"), false);
      assert.equal(error.message.includes("begin-void-seal"), false);
      return true;
    },
  );
  early.cultivator.locationId = outpostId(early.world);
  clearSpot(early.world, early.cultivator.locationId, early.cultivator.id);
  const before = early.cultivator.inventory["void-imprint-dew"];
  performAction(early.world, early.cultivator.id, "begin-void-seal");
  finish(early.world, early.cultivator.id);
  assert.equal(early.cultivator.realmLevel, 16);
  assert.equal(early.cultivator.inventory["void-imprint-dew"], before);
  assert.equal(getCultivatorState(early.world, early.cultivator.id).breakthrough?.rite?.method, "void-seal");
  performAction(early.world, early.cultivator.id, "seal-void-seal");
  assert.equal(early.cultivator.realmLevel, 17);
  assert.equal(early.cultivator.inventory["void-imprint-dew"], before - 1);
  assert.equal(early.cultivator.injuryTicksRemaining, 4);
  const life = early.cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
  assert.match(life, /虚空印/);
  assertNarrativeHasNoActionIds(life);

  const watched = prepare(16, "炼虚", [...VOID, "void-imprint-dew"]);
  watched.cultivator.locationId = outpostId(watched.world);
  const witness = createCultivator(watched.world, { name: "看印的人" });
  watched.world.cultivators[witness.id]!.locationId = watched.cultivator.locationId;
  performAction(watched.world, watched.cultivator.id, "begin-void-seal");
  finish(watched.world, watched.cultivator.id);
  performAction(watched.world, watched.cultivator.id, "seal-void-seal");
  assert.equal(watched.cultivator.realmLevel, 17);
  assert.equal(watched.cultivator.injuryTicksRemaining, 0);
  assert.match(watched.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /看印的人/);

  const mid = prepare(17, "炼虚", [...VOID, "shattered-array-banner"]);
  mid.cultivator.locationId = "qingzhou:wilderness";
  clearSpot(mid.world, "qingzhou:wilderness", mid.cultivator.id);
  performAction(mid.world, mid.cultivator.id, "break-void-array");
  finish(mid.world, mid.cultivator.id);
  assert.equal(mid.cultivator.realmLevel, 18);
  assert.equal(mid.cultivator.realm, "炼虚");
  assert.equal(mid.cultivator.injuryTicksRemaining, 4);
});

test("炼虚后期走合道仪，进入合体", () => {
  const home = prepare(18, "炼虚", [...UNITY, "unity-rite-slip"]);
  assert.equal(listAvailableActions(home.world, home.cultivator.id).some((action) => action.actionId === "hold-unity-rite"), false);
  assert.throws(() => performAction(home.world, home.cultivator.id, "hold-unity-rite"), /驻地/);
  home.cultivator.locationId = "qingzhou:wilderness";
  assert.throws(() => performAction(home.world, home.cultivator.id, "hold-unity-rite"), /驻地/);

  let entered = false;
  for (let tick = 1; tick < 80 && !entered; tick += 1) {
    const attempt = prepare(18, "炼虚", [...UNITY, "unity-rite-slip"]);
    attempt.world.tick = tick;
    attempt.cultivator.locationId = outpostId(attempt.world);
    performAction(attempt.world, attempt.cultivator.id, "hold-unity-rite");
    finish(attempt.world, attempt.cultivator.id);
    if (attempt.cultivator.realm === "合体") {
      entered = true;
      assert.equal(attempt.cultivator.realmLevel, 19);
      assert.match(attempt.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /合道仪/);
    }
  }
  assert.ok(entered);
});

test("合体在洞府守双魂灯，驻地合符，荒野立天劫柱", () => {
  const lamp = prepare(19, "合体", [...UNITY, "twin-lamp-oil"]);
  const before = lamp.cultivator.inventory["twin-lamp-oil"];
  performAction(lamp.world, lamp.cultivator.id, "begin-twin-lamp");
  finish(lamp.world, lamp.cultivator.id);
  assert.equal(lamp.cultivator.inventory["twin-lamp-oil"], before);
  assert.equal(lamp.cultivator.realmLevel, 19);
  advanceWorld(lamp.world, 9);
  assert.throws(() => performAction(lamp.world, lamp.cultivator.id, "seal-twin-lamp"), /灭了/);
  assert.equal(lamp.cultivator.inventory["twin-lamp-oil"], before);
  performAction(lamp.world, lamp.cultivator.id, "begin-twin-lamp");
  finish(lamp.world, lamp.cultivator.id);
  performAction(lamp.world, lamp.cultivator.id, "seal-twin-lamp");
  assert.equal(lamp.cultivator.realmLevel, 20);
  assert.equal(lamp.cultivator.injuryTicksRemaining, 0);
  assert.equal(lamp.cultivator.inventory["twin-lamp-oil"], before - 1);

  const token = prepare(20, "合体", [...UNITY, "heaven-man-token"]);
  token.cultivator.locationId = outpostId(token.world);
  clearSpot(token.world, token.cultivator.locationId, token.cultivator.id);
  performAction(token.world, token.cultivator.id, "join-heaven-token");
  finish(token.world, token.cultivator.id);
  assert.equal(token.cultivator.realmLevel, 21);
  assert.equal(token.cultivator.injuryTicksRemaining, 4);
  assertNarrativeHasNoActionIds(token.cultivator.lifeLog?.map((event) => event.text).join("") ?? "");

  let pillar = false;
  for (let tick = 1; tick < 80 && !pillar; tick += 1) {
    const attempt = prepare(21, "合体", [...MAHAYANA, "heaven-pillar-core"]);
    attempt.world.tick = tick;
    attempt.cultivator.locationId = "qingzhou:wilderness";
    clearSpot(attempt.world, "qingzhou:wilderness", attempt.cultivator.id);
    performAction(attempt.world, attempt.cultivator.id, "face-heaven-pillar");
    finish(attempt.world, attempt.cultivator.id);
    if (attempt.cultivator.realm === "大乘") {
      pillar = true;
      assert.equal(attempt.cultivator.realmLevel, 22);
      assert.match(attempt.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /天劫柱/);
    }
  }
  assert.ok(pillar);
});

test("大乘守劫台、乘风渡，后期没有下一阶", () => {
  const platform = prepare(22, "大乘", [...MAHAYANA, "kalpa-platform-dust"]);
  platform.cultivator.locationId = "qingzhou:wilderness";
  clearSpot(platform.world, "qingzhou:wilderness", platform.cultivator.id);
  performAction(platform.world, platform.cultivator.id, "hold-mahayana-platform");
  finish(platform.world, platform.cultivator.id);
  assert.equal(platform.cultivator.realmLevel, 23);
  assert.equal(platform.cultivator.injuryTicksRemaining, 4);

  const wind = prepare(23, "大乘", [...MAHAYANA, "wind-crossing-sail"]);
  wind.cultivator.locationId = "qingzhou:dungeon-a";
  assert.throws(() => performAction(wind.world, wind.cultivator.id, "begin-wind-crossing"), /甲级门口没有这阵风/);
  wind.cultivator.locationId = "qingzhou:wilderness";
  clearSpot(wind.world, "qingzhou:wilderness", wind.cultivator.id);
  const sail = wind.cultivator.inventory["wind-crossing-sail"];
  performAction(wind.world, wind.cultivator.id, "begin-wind-crossing");
  finish(wind.world, wind.cultivator.id);
  assert.equal(wind.cultivator.inventory["wind-crossing-sail"], sail);
  performAction(wind.world, wind.cultivator.id, "seal-wind-crossing");
  assert.equal(wind.cultivator.realmLevel, 24);
  assert.equal(wind.cultivator.realm, "大乘");
  assert.equal(wind.cultivator.inventory["wind-crossing-sail"], sail - 1);
  assert.equal(getCultivatorState(wind.world, wind.cultivator.id).breakthrough, null);
  const told = narrativeOf(wind.world, wind.cultivator.id);
  assert.match(told, /大乘后期/);
  assert.match(told, /乘风灰/);
  assertNarrativeHasNoActionIds(told);
});

test("凉州灵脉按境界多给一份，化神中期没有这份", () => {
  const pools = [
    { level: 15, realm: "化神" as const, ids: VOID_GATHER_IDS },
    { level: 18, realm: "炼虚" as const, ids: UNITY_GATHER_IDS },
    { level: 21, realm: "合体" as const, ids: MAHAYANA_GATHER_IDS },
  ];
  for (const row of pools) {
    const world = createSeedWorld();
    ensureSpiritVeins(world);
    const created = createCultivator(world, { name: "收脉的人" });
    const cultivator = world.cultivators[created.id]!;
    cultivator.realm = row.realm;
    cultivator.realmLevel = row.level;
    cultivator.locationId = "liangzhou:sect-outpost:zhen-huang-cheng";
    cultivator.injuryTicksRemaining = 0;
    performAction(world, cultivator.id, "join-neutral-sect:zhen-huang-cheng");
    const vein = world.spiritVeins?.["liangzhou:spirit-vein"];
    assert.ok(vein);
    assert.equal(vein.band, "spirit");
    vein.ownerKind = "neutral";
    vein.ownerId = "zhen-huang-cheng";
    vein.pouch = [{ itemId: "divine-thought-crystal", count: 1 }];
    cultivator.locationId = vein.locationId;
    const beforeCrystal = cultivator.inventory["divine-thought-crystal"] ?? 0;
    performAction(world, cultivator.id, `gather-vein:${vein.id}`);
    finish(world, cultivator.id);
    assert.equal(cultivator.inventory["divine-thought-crystal"], beforeCrystal + 1);
    assert.ok(row.ids.some((itemId) => (cultivator.inventory[itemId] ?? 0) > 0));
    const life = cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
    assert.match(life, /这一境又分出/);
    assertNarrativeHasNoActionIds(life);
  }

  const early = createSeedWorld();
  ensureSpiritVeins(early);
  const created = createCultivator(early, { name: "还在化神的人" });
  const cultivator = early.cultivators[created.id]!;
  cultivator.realm = "化神";
  cultivator.realmLevel = 14;
  cultivator.locationId = "liangzhou:sect-outpost:zhen-huang-cheng";
  cultivator.injuryTicksRemaining = 0;
  performAction(early, cultivator.id, "join-neutral-sect:zhen-huang-cheng");
  const vein = early.spiritVeins?.["liangzhou:spirit-vein"];
  assert.ok(vein);
  vein.ownerKind = "neutral";
  vein.ownerId = "zhen-huang-cheng";
  vein.pouch = [{ itemId: "divine-thought-crystal", count: 1 }];
  cultivator.locationId = vein.locationId;
  performAction(early, cultivator.id, `gather-vein:${vein.id}`);
  finish(early, cultivator.id);
  const laterIds = [...VOID_GATHER_IDS, ...UNITY_GATHER_IDS, ...MAHAYANA_GATHER_IDS];
  assert.ok(laterIds.every((itemId) => (cultivator.inventory[itemId] ?? 0) === 0));
  assert.equal((cultivator.lifeLog ?? []).some((event) => event.text.includes("这一境又分出")), false);
});
