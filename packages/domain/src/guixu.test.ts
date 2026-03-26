import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";

function asFutureActionId(value: string) {
  return value as never;
}

function prepareGuixuCandidate() {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const inventory = cultivator.inventory as Record<string, number>;

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "閲戜腹" as typeof cultivator.realm;
  cultivator.realmLevel = 2;
  cultivator.totalContribution = 260;
  cultivator.qi = cultivator.maxQi = 160;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 150;
  inventory["eight-wastes-pass"] = 1;

  return { world, cultivator, inventory };
}

test("wilderness attunement can unlock the Guixu threshold node", () => {
  const { world, cultivator } = prepareGuixuCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("withdraw-from-wilderness"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  const actions = listAvailableActions(world, cultivator.id);
  const unlockAction = actions.find((action) => action.actionId === "unlock-guixu:guixu-threshold-gate");

  assert.ok(unlockAction);

  const result = performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  const state = getCultivatorState(world, cultivator.id) as ReturnType<typeof getCultivatorState> & {
    guixu?: {
      wildernessAttunement: number;
      unlockedNodeIds: string[];
      sharedUnlockedNodeIds: string[];
    };
  };

  assert.equal(result.accepted, true);
  assert.ok((state.guixu?.wildernessAttunement ?? 0) >= 2);
  assert.ok(state.guixu?.unlockedNodeIds.includes("guixu-threshold-gate"));
});

test("shared Guixu nodes unlock once and become available to other cultivators", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  const second = syncCultivatorFromPersona(world, {
    agentId: "agent-guixu-peer",
    name: "Shen Qing",
  });
  const secondCultivator = world.cultivators[second.selectedCultivatorId]!;
  const secondInventory = secondCultivator.inventory as Record<string, number>;

  secondCultivator.locationId = "qingzhou:dungeon-a";
  secondCultivator.realm = "閲戜腹" as typeof secondCultivator.realm;
  secondCultivator.realmLevel = 1;
  secondInventory["eight-wastes-pass"] = 1;

  performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("withdraw-from-wilderness"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));

  const result = performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));
  const otherActions = listAvailableActions(world, secondCultivator.id);

  assert.equal(result.accepted, true);
  assert.ok(otherActions.some((action) => action.actionId === "explore-guixu:guixu-ancient-seal"));
});

test("exploring Guixu resolves endgame events and grants exclusive rewards", () => {
  const { world, cultivator, inventory } = prepareGuixuCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-wilderness:eight-wastes-threshold"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("withdraw-from-wilderness"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));

  const result = performAction(world, cultivator.id, asFutureActionId("explore-guixu:guixu-ancient-seal"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }

  assert.equal(result.accepted, true);
  assert.ok((inventory["legendary-artifact"] ?? 0) > 0);
  assert.ok(
    world.worldEvents.some((event) => event.tags.includes("guixu") && event.tags.includes("endgame")),
  );
});
