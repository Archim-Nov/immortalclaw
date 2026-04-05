import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";

function asFutureActionId(value: string) {
  return value as never;
}

function prepareWildernessWorker() {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return { world, cultivator };
}

test("wilderness keeps mining and hunting as independent resource actions", () => {
  const { world, cultivator } = prepareWildernessWorker();
  const beforeStones = cultivator.spiritStones;
  const beforeOre = cultivator.inventory["spirit-ore"];
  const beforeCore = cultivator.inventory["beast-core"];

  const actions = listAvailableActions(world, cultivator.id);
  assert.ok(actions.some((action) => action.actionId === "mine-spirit-stones"));
  assert.ok(actions.some((action) => action.actionId === "hunt-mine-beast"));
  assert.equal(actions.some((action) => action.actionId === "survey-wilderness"), false);

  const mineResult = performAction(world, cultivator.id, asFutureActionId("mine-spirit-stones"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }
  cultivator.injuryTicksRemaining = 0;
  const huntResult = performAction(world, cultivator.id, asFutureActionId("hunt-mine-beast"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }

  assert.equal(mineResult.accepted, true);
  assert.equal(huntResult.accepted, true);
  assert.ok(cultivator.spiritStones > beforeStones);
  assert.ok(cultivator.inventory["spirit-ore"] >= beforeOre);
  assert.ok(cultivator.inventory["beast-core"] >= beforeCore);
  assert.equal(getCultivatorState(world, cultivator.id).wilderness, null);
});

test("wilderness expedition verbs are isolated from routine resource gathering", () => {
  const { world, cultivator } = prepareWildernessWorker();

  const wildernessActions = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.equal(wildernessActions.includes("survey-wilderness"), false);
  assert.equal(
    wildernessActions.some((actionId) => String(actionId).startsWith("enter-wilderness:")),
    true,
    "wilderness nodes should expose the live tier-1 wilderness entry action",
  );

  cultivator.locationId = "qingzhou:dungeon-a";

  const layerActions = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.equal(layerActions.some((actionId) => String(actionId).startsWith("enter-wilderness:")), false);
});

test("regular wilderness resource loop keeps wake frequency at zero", () => {
  const { world, cultivator } = prepareWildernessWorker();

  performAction(world, cultivator.id, asFutureActionId("mine-spirit-stones"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, asFutureActionId("hunt-mine-beast"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }

  const state = getCultivatorState(world, cultivator.id);

  assert.equal(state.wilderness, null);
  assert.equal(state.dungeonExpedition.wakeNodeHint ?? null, null);
});
