import assert from "node:assert/strict";
import test from "node:test";

import { previewBahuangWakes } from "./bahuang-service.js";
import { canEnterBahuang } from "./bahuang-service.js";
import {
  BAHUANG_REWARD_BEFORE,
  dungeonPassCount,
  maybeEightWastesPass,
  wildernessPassHits,
} from "./eight-wastes-pass.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import type { WildernessProgress } from "./model.js";
import { EIGHT_WASTES_CONTENT } from "./seed.js";
import { bahuangBands } from "./wild-places.js";

const CULTIVATOR_ID = "yun-zhong-he";

function hittingSeed(source: "survey" | "hunt" | "beat" | "layer"): string {
  for (let index = 0; index < 400; index += 1) {
    const seed = `${source}-seed-${index}`;
    if (wildernessPassHits(source, seed)) return seed;
  }
  throw new Error(`no hitting seed for ${source}`);
}

function blankStay(): WildernessProgress {
  return {
    cultivatorId: CULTIVATOR_ID,
    layerId: "starter-wilderness-tier-1",
    enteredAtTick: 0,
    ticksSurvived: 4,
    remainingSurvivalTicks: 4,
    status: "active",
    lastEventId: null,
  };
}

test("buying an 八荒令 still works and the receipt is Chinese", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.spiritStones = 2000;
  const before = cultivator.spiritStones;
  const card = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "buy-eight-wastes-pass");
  assert.ok(card);
  assert.match(card.label, /八荒令/);
  assert.equal(/[A-Za-z]/.test(card.label), false);

  const bought = performAction(world, CULTIVATOR_ID, "buy-eight-wastes-pass");
  assert.equal(bought.accepted, true);
  assert.match(bought.summary, /八荒令/);
  assert.match(bought.summary, /灵石/);
  assert.equal(/[A-Za-z]/.test(bought.summary), false);
  assert.equal(cultivator.inventory["eight-wastes-pass"], 1);
  assert.ok(cultivator.spiritStones < before);
  assert.equal(world.itemDefinitions["eight-wastes-pass"].trade.buyBasePrice, 800);
  assert.equal(world.itemDefinitions["eight-wastes-pass"].trade.sellBasePrice, 200);
  assert.equal(world.itemDefinitions["eight-wastes-pass"].tags.includes("wilderness-loot"), true);
  assert.equal(world.itemDefinitions["eight-wastes-pass"].tags.includes("dungeon-loot"), true);
  assert.equal(world.itemDefinitions["eight-wastes-pass"].tags.includes("wilderness-expansion"), false);
});

test("wilderness survey, hunt, beat, and layer rolls can grant one 八荒令, and a stay does not stack", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:wilderness";
  const stay = blankStay();
  const line = maybeEightWastesPass({
    world,
    cultivator,
    source: "survey",
    seed: hittingSeed("survey"),
    placeName: "青岚坡",
    progress: stay,
  });
  assert.match(line ?? "", /青岚坡里摸到一枚八荒令/);
  assert.equal(/[A-Za-z]/.test(line ?? "x"), false);
  assert.equal(cultivator.inventory["eight-wastes-pass"], 1);
  assert.equal(stay.passFound, true);
  const notes = cultivator.travelNotes?.map((note) => `${note.title} ${note.detail}`).join("\n") ?? "";
  assert.match(notes, /八荒令/);

  const again = maybeEightWastesPass({
    world,
    cultivator,
    source: "hunt",
    seed: hittingSeed("hunt"),
    placeName: "青岚坡",
    progress: stay,
  });
  assert.equal(again, null);
  assert.equal(cultivator.inventory["eight-wastes-pass"], 1);

  for (const source of ["beat", "layer"] as const) {
    const fresh = createSeedWorld();
    const person = fresh.cultivators[CULTIVATOR_ID]!;
    const granted = maybeEightWastesPass({
      world: fresh,
      cultivator: person,
      source,
      seed: hittingSeed(source),
      placeName: "青岚坡",
    });
    assert.match(granted ?? "", /摸到一枚八荒令/);
    assert.equal(person.inventory["eight-wastes-pass"], 1);
  }
});

test("a won wilderness hunt can put an 八荒令 in the bag and say so", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 5000;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 5000;
  cultivator.inventory["eight-wastes-pass"] = 0;

  let found = false;
  for (let attempt = 0; attempt < 36 && !found; attempt += 1) {
    cultivator.locationId = "qingzhou:wilderness";
    cultivator.injuryTicksRemaining = 0;
    cultivator.qi = cultivator.maxQi;
    cultivator.spiritualPower = cultivator.maxSpiritualPower;
    cultivator.activeJobId = null;
    performAction(world, CULTIVATOR_ID, "hunt-mine-beast" as never);
    let guard = 0;
    while (cultivator.activeJobId && guard < 12) {
      advanceWorld(world, 1);
      guard += 1;
    }
    found = (cultivator.inventory["eight-wastes-pass"] ?? 0) > 0;
  }

  assert.equal(found, true);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const told = [
    ...state.travelogue.notes.map((note) => `${note.title} ${note.detail}`),
    state.recentCombats[0]?.summary ?? "",
  ].join("\n");
  assert.match(told, /摸到一枚八荒令/);
  assert.equal(/[A-Za-z]/.test(told.split("摸到一枚八荒令")[0]?.slice(-40) ?? ""), false);
});

test("dungeon ranks 4 and above can carry an 八荒令 out, and low ranks or an abort cannot", () => {
  assert.equal(dungeonPassCount({ rank: 1, outcome: "completed", seed: "low" }), 0);
  assert.equal(dungeonPassCount({ rank: 3, outcome: "withdrew", seed: "low" }), 0);
  assert.equal(dungeonPassCount({ rank: 8, outcome: "aborted", seed: "stop" }), 0);
  assert.equal(dungeonPassCount({ rank: 8, outcome: "catastrophic", seed: "fall" }), 0);

  let granted = false;
  let skipped = false;
  for (let index = 0; index < 80; index += 1) {
    const count = dungeonPassCount({ rank: 5, outcome: "withdrew", seed: `mid-${index}` });
    if (count === 1) granted = true;
    if (count === 0) skipped = true;
  }
  assert.equal(granted, true);
  assert.equal(skipped, true);

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  const hints = getCultivatorState(world, CULTIVATOR_ID).dungeon?.rankYieldHints ?? [];
  assert.equal(hints.find((hint) => hint.rank === 1)?.notableSecondaryDrops.includes("eight-wastes-pass"), false);
  cultivator.dungeonProgress["丙"].highestClearedRank = 6;
  const opened = getCultivatorState(world, CULTIVATOR_ID).dungeon?.rankYieldHints ?? [];
  assert.equal(opened.find((hint) => hint.rank === 4)?.notableSecondaryDrops.includes("eight-wastes-pass"), true);
  assert.equal(opened.find((hint) => hint.rank === 7)?.notableSecondaryDrops.includes("eight-wastes-pass"), true);
  const card = opened.find((hint) => hint.rank === 4)?.notableSecondaryDropCards?.find((entry) => entry.itemId === "eight-wastes-pass");
  assert.equal(card?.itemName, "八荒令");

  cultivator.inventory["eight-wastes-pass"] = 0;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:balanced" as never);
  const aborted = performAction(world, CULTIVATOR_ID, "abort-dungeon-expedition");
  assert.equal(aborted.accepted, true);
  assert.equal(cultivator.inventory["eight-wastes-pass"] ?? 0, 0);
  assert.equal((aborted.summary ?? "").includes("八荒令"), false);

  let carried = false;
  for (let attempt = 0; attempt < 24 && !carried; attempt += 1) {
    const run = createSeedWorld();
    const person = run.cultivators[CULTIVATOR_ID]!;
    run.tick = attempt * 17;
    person.locationId = "qingzhou:dungeon-c";
    person.dungeonProgress["丙"].highestClearedRank = 3;
    person.injuryTicksRemaining = 0;
    person.qi = person.maxQi = 4000;
    person.spiritualPower = person.maxSpiritualPower = 4000;
    person.inventory["eight-wastes-pass"] = 0;
    performAction(run, CULTIVATOR_ID, "enter-dungeon:rank-4:conservative" as never);
    person.injuryTicksRemaining = 1;
    let guard = 0;
    while (person.activeJobId && guard < 10) {
      advanceWorld(run, 1);
      guard += 1;
    }
    const report = run.dungeonExpeditionReports[CULTIVATOR_ID];
    if (report?.outcome === "withdrew" && (person.inventory["eight-wastes-pass"] ?? 0) > 0) {
      assert.match(report.summary, /八荒令/);
      assert.equal(report.secondaryDrops["eight-wastes-pass"], 1);
      assert.equal(report.secondaryDropCards?.find((entry) => entry.itemId === "eight-wastes-pass")?.itemName, "八荒令");
      assert.equal(/[A-Za-z]/.test(report.summary), false, report.summary);
      carried = true;
    }
  }
  assert.equal(carried, true);
});

test("bahuang rewards sit above the old table, and a deep retreat still beats two wilderness mines", () => {
  const table = EIGHT_WASTES_CONTENT.rewardTable;
  assert.ok(table.spiritStones.min > BAHUANG_REWARD_BEFORE.spiritMin);
  assert.ok(table.spiritStones.max > BAHUANG_REWARD_BEFORE.spiritMax);
  assert.ok(table.completionBonus.spiritStones > BAHUANG_REWARD_BEFORE.completionStones);
  assert.ok(table.completionBonus.realmProgress > BAHUANG_REWARD_BEFORE.completionProgress);
  assert.ok(EIGHT_WASTES_CONTENT.retreatCost.spiritStoneLoss > BAHUANG_REWARD_BEFORE.retreatStones);
  assert.equal(table.spiritStones.min, 90);
  assert.equal(table.spiritStones.max, 220);
  assert.equal(table.completionBonus.spiritStones, 560);
  assert.equal(EIGHT_WASTES_CONTENT.entryRequirement.minWildernessAttunement, 40);
  assert.equal(EIGHT_WASTES_CONTENT.entryRequirement.minContribution, 120);

  let floor = 0;
  for (let depth = 1; depth <= 6; depth += 1) {
    const scale = 1 + Math.floor(depth / 3) * 0.25;
    floor += Math.floor(table.spiritStones.min * scale);
  }
  const mineCeilingForSameTime = 189 * 2;
  assert.ok(floor - EIGHT_WASTES_CONTENT.retreatCost.spiritStoneLoss > mineCeilingForSameTime);

  const dust = previewBahuangWakes({
    cultivatorId: CULTIVATOR_ID,
    status: "active",
    depth: 1,
    supplies: { rations: 4, talismans: 0 },
    pressure: 0,
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    encounteredWakeNodes: [],
    pendingWakeNodeIndex: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    rewards: { spiritStones: 0, items: {}, realmProgress: 0 },
  });
  const pocket = dust.flatMap((wake) => wake.options).find((option) => option.optionId.endsWith("-pocket"));
  assert.match(pocket?.description ?? "", /二十八枚灵石/);
});

test("a bahuang run still wakes at most three times, and the new sightings stay with their band", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 120;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 5000;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 5000;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 40;
  world.tick = 10;
  assert.equal(canEnterBahuang(cultivator, cultivator.locationId, world).allowed, true);

  cultivator.totalContribution = 119;
  assert.equal(canEnterBahuang(cultivator, cultivator.locationId, world).allowed, false);
  cultivator.totalContribution = 120;

  performAction(world, CULTIVATOR_ID, "enter-bahuang:aggressive" as never);
  assert.equal(cultivator.inventory["eight-wastes-pass"], 0);
  let most = 0;
  let guard = 0;
  while (world.bahuangProgress[CULTIVATOR_ID]?.status === "active" && guard < 40) {
    most = Math.max(most, world.bahuangProgress[CULTIVATOR_ID]?.encounteredWakeNodes.length ?? 0);
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.ok(most >= 1);
  assert.ok(most <= 3);

  const [dust, stele, ravine] = bahuangBands();
  assert.ok((dust?.sightings.length ?? 0) >= 7);
  assert.ok((stele?.sightings.length ?? 0) >= 7);
  assert.ok((ravine?.sightings.length ?? 0) >= 7);
  assert.match(dust?.sightings.join("\n") ?? "", /井沿/);
  assert.match(stele?.sightings.join("\n") ?? "", /碗/);
  assert.match(ravine?.sightings.join("\n") ?? "", /灯盏/);
  assert.equal((dust?.sightings.join("\n") ?? "").includes("碑仆"), false);
  assert.equal((ravine?.sightings.join("\n") ?? "").includes("沙客"), false);
});
