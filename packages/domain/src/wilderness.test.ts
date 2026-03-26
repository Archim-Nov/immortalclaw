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

function prepareEightWastesCandidate() {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const inventory = cultivator.inventory as Record<string, number>;

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "绛戝熀" as typeof cultivator.realm;
  cultivator.realmLevel = 3;
  cultivator.totalContribution = 220;
  cultivator.qi = cultivator.maxQi = 140;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 130;
  inventory["eight-wastes-pass"] = 1;

  return { world, cultivator, inventory };
}

test("qualified cultivators can enter the Eight Wastes with a ticket and see expedition state", () => {
  const { world, cultivator, inventory } = prepareEightWastesCandidate();

  const actions = listAvailableActions(world, cultivator.id);
  const enterAction = actions.find((action) => action.actionId === "enter-wilderness:eight-wastes-threshold");

  assert.ok(enterAction);

  const result = performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  const state = getCultivatorState(world, cultivator.id) as ReturnType<typeof getCultivatorState> & {
    wilderness: {
      layerId: string;
      ticksSurvived: number;
      remainingSurvivalTicks: number;
      status: string;
    } | null;
  };

  assert.equal(result.accepted, true);
  assert.equal(inventory["eight-wastes-pass"], 0);
  assert.ok(state.wilderness);
  assert.equal(state.wilderness?.layerId, "eight-wastes-threshold");
  assert.equal(state.wilderness?.ticksSurvived, 0);
  assert.equal(state.wilderness?.status, "active");
  assert.ok((state.wilderness?.remainingSurvivalTicks ?? 0) > 0);
});

test("active Eight Wastes expeditions apply survival pressure and force retreat on timeout", () => {
  const { world, cultivator } = prepareEightWastesCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  const qiBefore = cultivator.qi;
  const spiritualBefore = cultivator.spiritualPower;

  advanceWorld(world, 3);
  const finalState = getCultivatorState(world, cultivator.id) as ReturnType<typeof getCultivatorState> & {
    wilderness: unknown;
  };

  assert.ok(cultivator.qi < qiBefore);
  assert.ok(cultivator.spiritualPower < spiritualBefore);
  assert.equal(finalState.wilderness, null);
  assert.notEqual(cultivator.locationId, "qingzhou:dungeon-a");
  assert.ok(
    world.worldEvents.some((event) => event.tags.includes("wilderness") && event.tags.includes("retreat")),
  );
});

test("surveying the Eight Wastes resolves dedicated events and can award high-value drops", () => {
  const { world, cultivator, inventory } = prepareEightWastesCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  const result = performAction(world, cultivator.id, asFutureActionId("survey-wilderness"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }

  assert.equal(result.accepted, true);
  assert.ok((inventory["ancient-artifact"] ?? 0) > 0);
  assert.ok(
    world.worldEvents.some((event) => event.tags.includes("wilderness") && event.tags.includes("guardian")),
  );
});
