import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";

const CULTIVATOR_ID = "yun-zhong-he";

function prepareBahuangCandidate() {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];
  const inventory = cultivator.inventory as Record<string, number>;

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹" as typeof cultivator.realm;
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 160;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 150;
  inventory["eight-wastes-pass"] = 1;
  // Meet wildernessAttunement requirement
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  // Ensure tick is inside entry window (cycle=720, window=120 → tick 0..119 is open)
  world.tick = 10;

  return { world, cultivator, inventory };
}

test("enter-bahuang:balanced appears when cultivator meets requirement at entry location", () => {
  const { world, cultivator } = prepareBahuangCandidate();

  const actions = listAvailableActions(world, cultivator.id);
  assert.ok(actions.some((action) => action.actionId === "enter-bahuang:balanced"));
  assert.equal(actions.some((action) => String(action.actionId).startsWith("enter-wilderness:")), false);
});

test("eight-wastes is no longer modeled as a wilderness layer", () => {
  const world = createSeedWorld();

  assert.ok(world.wildernessLayers["starter-wilderness-tier-1"]);
  assert.equal(
    Object.values(world.wildernessLayers).some((layer) => layer.locationIds.includes("eight-wastes-threshold")),
    false,
  );
  assert.equal(world.itemDefinitions["eight-wastes-pass"].tags.includes("wilderness-expansion"), false);
});

test("entering bahuang creates active world progress and populates state.bahuang", () => {
  const { world, cultivator } = prepareBahuangCandidate();

  const result = performAction(world, cultivator.id, "enter-bahuang:balanced" as never);
  const state = getCultivatorState(world, cultivator.id);

  assert.equal(result.accepted, true);
  assert.ok(world.bahuangProgress[cultivator.id]);
  assert.ok(state.bahuang);
  assert.equal(state.bahuang?.status, "active");
});

test("eight-wastes-pass ticket is consumed on bahuang entry", () => {
  const { world, cultivator, inventory } = prepareBahuangCandidate();

  performAction(world, cultivator.id, "enter-bahuang:conservative" as never);
  assert.equal(inventory["eight-wastes-pass"], 0);
});

test("bahuang expedition advances pressure and eventually exits active status", () => {
  const { world, cultivator } = prepareBahuangCandidate();

  performAction(world, cultivator.id, "enter-bahuang:aggressive" as never);
  advanceWorld(world, 1);
  const early = world.bahuangProgress[cultivator.id];
  assert.ok((early?.pressure ?? 0) > 0);
  assert.ok((early?.depth ?? 0) > 0);

  let safety = 0;

  while (world.bahuangProgress[cultivator.id]?.status === "active" && safety < 30) {
    advanceWorld(world, 1);
    safety += 1;
  }

  assert.notEqual(world.bahuangProgress[cultivator.id]?.status, "active");
});

test("guixu wildernessAttunement increases while progressing bahuang", () => {
  const { world, cultivator } = prepareBahuangCandidate();

  const before = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;
  performAction(world, cultivator.id, "enter-bahuang:balanced" as never);
  advanceWorld(world, 2);
  const after = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;

  assert.ok(after > before);
});

test("retreat-from-bahuang immediately ends the expedition", () => {
  const { world, cultivator } = prepareBahuangCandidate();

  performAction(world, cultivator.id, "enter-bahuang:balanced" as never);
  const retreatResult = performAction(world, cultivator.id, "retreat-from-bahuang" as never);
  const state = getCultivatorState(world, cultivator.id);

  assert.equal(retreatResult.accepted, true);
  assert.equal(world.bahuangProgress[cultivator.id], undefined);
  assert.equal(state.bahuang, null);
});

test("entry denied when tick is outside the entry time window", () => {
  const { world, cultivator } = prepareBahuangCandidate();
  // Move tick outside the 120-tick window
  world.tick = 200;

  const actions = listAvailableActions(world, cultivator.id);
  assert.equal(actions.some((action) => action.actionId === "enter-bahuang:balanced"), false);
});

test("entry denied when realmLevel is below 5", () => {
  const { world, cultivator } = prepareBahuangCandidate();
  cultivator.realmLevel = 4;

  const actions = listAvailableActions(world, cultivator.id);
  assert.equal(actions.some((action) => action.actionId === "enter-bahuang:balanced"), false);
});

test("entry denied when wildernessAttunement is below 40", () => {
  const { world, cultivator } = prepareBahuangCandidate();
  world.guixuProgress.wildernessAttunement[cultivator.id] = 39;

  const actions = listAvailableActions(world, cultivator.id);
  assert.equal(actions.some((action) => action.actionId === "enter-bahuang:balanced"), false);
});

test("eight-wastes-pass can be purchased at market", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];
  cultivator.locationId = "qingzhou:main-city";
  cultivator.spiritStones = 2000;
  world.tick = 5;

  const actions = listAvailableActions(world, cultivator.id);
  assert.ok(actions.some((action) => action.actionId === "buy-eight-wastes-pass"));
});

test("completed bahuang expedition awards completion bonus", () => {
  const { world, cultivator } = prepareBahuangCandidate();
  cultivator.qi = cultivator.maxQi = 5000;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 5000;

  performAction(world, cultivator.id, "enter-bahuang:conservative" as never);
  const stonesBefore = cultivator.spiritStones;

  let safety = 0;
  while (world.bahuangProgress[cultivator.id]?.status === "active" && safety < 30) {
    advanceWorld(world, 1);
    safety += 1;
  }

  // Should have gained at least the completion bonus of 200 spirit stones
  assert.ok(cultivator.spiritStones - stonesBefore >= 200);
  // Should have received an ancient-artifact from completion bonus
  assert.ok((cultivator.inventory["ancient-artifact"] ?? 0) >= 1);
});
