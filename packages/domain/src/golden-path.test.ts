import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createCultivator,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./engine.js";
import { createSeedWorld } from "./seed.js";

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
  }
}

test("golden path onboarding reaches completed within 36 ticks", () => {
  const world = createSeedWorld();
  const summary = createCultivator(world, {
    name: "Golden Path Disciple",
  });
  const cultivatorId = summary.id;
  const starterState = world.cultivators[cultivatorId]!.locationId.split(":")[0];
  const wildernessLocationId = `${starterState}:wilderness`;
  const mainCityLocationId = `${starterState}:main-city`;

  const checkpoints: string[] = [];
  const readStage = () => getCultivatorState(world, cultivatorId).onboarding.stage;

  checkpoints.push(readStage());
  assert.equal(readStage(), "registered");

  performAction(world, cultivatorId, "take-mortal-task");
  runUntilIdle(world, cultivatorId);
  checkpoints.push(readStage());
  assert.equal(readStage(), "first-action");

  performAction(world, cultivatorId, `travel-to:${wildernessLocationId}`);
  runUntilIdle(world, cultivatorId);
  performAction(world, cultivatorId, `travel-to:${mainCityLocationId}`);
  runUntilIdle(world, cultivatorId);
  checkpoints.push(readStage());
  assert.equal(readStage(), "first-travel");

  const questBoard = world.questBoards[world.cultivators[cultivatorId]!.locationId];
  assert.ok(questBoard);
  const baseQuest = questBoard.quests.find((quest) => quest.category === "base");
  assert.ok(baseQuest);
  performAction(world, cultivatorId, `accept-quest:${baseQuest!.id}`);
  const activeQuest = world.cultivators[cultivatorId]!.activeQuests[0]!;
  activeQuest.successRate = 100;
  performAction(world, cultivatorId, `execute-quest:${activeQuest.id}`);
  runUntilIdle(world, cultivatorId);
  checkpoints.push(readStage());
  assert.equal(readStage(), "first-quest");

  performAction(world, cultivatorId, "residence-meditate");
  runUntilIdle(world, cultivatorId);
  checkpoints.push(readStage());
  assert.equal(readStage(), "first-residence-cultivation");

  world.cultivators[cultivatorId]!.realmProgress = 95;
  performAction(world, cultivatorId, "cultivate");
  runUntilIdle(world, cultivatorId);
  checkpoints.push(readStage());
  assert.equal(readStage(), "completed");

  assert.ok(world.tick <= 36, `golden path tick budget exceeded: ${world.tick}`);

  const finalState = getCultivatorState(world, cultivatorId);
  assert.deepEqual(finalState.onboarding.completedStages, [
    "registered",
    "first-action",
    "first-travel",
    "first-quest",
    "first-residence-cultivation",
    "first-breakthrough",
    "completed",
  ]);
  assert.equal(finalState.onboarding.stage, "completed");
  assert.equal(finalState.sect, null);
  assert.ok(world.cultivators[cultivatorId]!.realmLevel >= 2);
  assert.ok(checkpoints.length >= 6);
});

test("onboarding nextAction gives actionable fallback choices", () => {
  const world = createSeedWorld();
  const summary = createCultivator(world, {
    name: "Guide Target",
  });
  const cultivatorId = summary.id;
  const starterState = world.cultivators[cultivatorId]!.locationId.split(":")[0];

  const initial = getCultivatorState(world, cultivatorId).onboarding;
  assert.equal(initial.stage, "registered");
  assert.equal(initial.nextAction, "take-mortal-task");

  performAction(world, cultivatorId, "take-mortal-task");
  runUntilIdle(world, cultivatorId);

  const next = getCultivatorState(world, cultivatorId).onboarding;
  assert.equal(next.stage, "first-action");
  assert.equal(next.nextAction, `travel-to:${starterState}:wilderness`);

  const actions = new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
  assert.ok(actions.has(next.nextAction));
});
