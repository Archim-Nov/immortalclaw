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
  cultivator.realmLevel = 1;
  cultivator.totalContribution = 220;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 160;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 150;
  inventory["eight-wastes-pass"] = 1;

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

  assert.deepEqual(world.wildernessLayers, {});
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
