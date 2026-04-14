import assert from "node:assert/strict";
import test from "node:test";

import { createSeedWorld, getCultivatorState } from "./index.js";

const CULTIVATOR_ID = "yun-zhong-he";

test("low spirit stones routes guidance to wilderness base-material actions", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:wilderness";
  cultivator.spiritStones = 40;
  cultivator.injuryTicksRemaining = 0;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(
    state.agentGuidance.suggestedActions.includes("mine-spirit-stones")
      || state.agentGuidance.suggestedActions.includes("hunt-mine-beast"),
  );
  assert.ok(state.agentGuidance.priorities.some((entry) => /荒野|wilderness/i.test(entry)));
});

test("progression-material needs route guidance to dungeon expeditions", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.realm = "金丹" as typeof cultivator.realm;
  cultivator.realmLevel = 7;
  cultivator.realmProgress = 100;
  cultivator.spiritStones = 900;
  // L7→8 needs golden-spirit-flower, purple-celestial-leaf, star-fall-sand + flowing-aurora-core (non-buyable)
  cultivator.inventory["golden-spirit-flower"] = 0;
  cultivator.inventory["purple-celestial-leaf"] = 0;
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  cultivator.injuryTicksRemaining = 0;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(
    state.agentGuidance.suggestedActions.some((actionId) => String(actionId).startsWith("start-dungeon-expedition:rank-")),
  );
  assert.ok(state.agentGuidance.priorities.some((entry) => /副本|dungeon/i.test(entry)));
});

test("high-realm rare-reward needs route guidance to bahuang", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹" as typeof cultivator.realm;
  cultivator.realmLevel = 7;
  cultivator.totalContribution = 260;
  cultivator.spiritStones = 1500;
  cultivator.inventory["eight-wastes-pass"] = 1;
  cultivator.inventory["ancient-artifact"] = 0;
  cultivator.injuryTicksRemaining = 0;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(state.agentGuidance.suggestedActions.includes("enter-bahuang:balanced"));
  assert.ok(state.agentGuidance.priorities.some((entry) => /八荒|bahuang/i.test(entry)));
});

test("injured cultivator in wilderness gets safety-first travel as suggestedActions[0]", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:wilderness";
  cultivator.injuryTicksRemaining = 5;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritStones = 500;
  cultivator.realmProgress = 50;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  // Layer 1 recovery should dominate
  assert.ok(state.agentGuidance.warnings.some((w) => /受伤/.test(w)), "should warn about injury");
  assert.ok(state.agentGuidance.warnings.some((w) => /无法直接疗伤/.test(w)), "should warn location cannot heal");
  const first = state.agentGuidance.suggestedActions[0];
  assert.ok(
    first?.startsWith("travel-to:") || first === "heal",
    `first action should be travel to safe/heal, got: ${first}`,
  );
});

test("poisoned cultivator at residence gets residence-heal as top action", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = cultivator.residence.locationId;
  cultivator.injuryTicksRemaining = 0;
  cultivator.statusEffects.push({
    id: "poisoned",
    name: "Poisoned",
    description: "Loses qi each tick.",
    source: "test",
    remainingTicks: 4,
    intensity: 1,
  });

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(state.agentGuidance.warnings.some((w) => /中毒/.test(w)));
  assert.ok(
    state.agentGuidance.suggestedActions.includes("residence-heal")
      || state.agentGuidance.suggestedActions.includes("heal"),
    "at residence, poisoned cultivator should get residence-heal or heal",
  );
});

test("healthy cultivator at main city gets location-appropriate priorities", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritStones = 500;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  // No recovery warnings
  assert.equal(state.agentGuidance.warnings.length, 0, "healthy cultivator should have no warnings");
  // Location layer should describe main city
  assert.ok(state.agentGuidance.priorities.some((p) => /主城|交易|任务/.test(p)), "should describe main city activities");
});

test("recovery layer takes priority over breakthrough when both trigger", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = cultivator.residence.locationId;
  cultivator.injuryTicksRemaining = 5;
  cultivator.qi = cultivator.maxQi;
  cultivator.realmProgress = 100;
  cultivator.spiritStones = 2000;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  // Recovery warning should exist
  assert.ok(state.agentGuidance.warnings.some((w) => /受伤/.test(w)));
  // First action should be recovery, not breakthrough
  const first = state.agentGuidance.suggestedActions[0];
  assert.ok(
    first === "residence-heal" || first === "heal" || first?.startsWith("travel-to:"),
    `first action should be healing, not breakthrough, got: ${first}`,
  );
});

test("same cultivator state produces different guidance at different locations", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritStones = 500;

  // At residence
  cultivator.locationId = cultivator.residence.locationId;
  const residenceState = getCultivatorState(world, CULTIVATOR_ID);
  const residencePriorities = residenceState.agentGuidance.priorities.join("|");

  // At wilderness
  cultivator.locationId = "qingzhou:wilderness";
  const wildernessState = getCultivatorState(world, CULTIVATOR_ID);
  const wildernessPriorities = wildernessState.agentGuidance.priorities.join("|");

  assert.notEqual(
    residencePriorities,
    wildernessPriorities,
    "guidance priorities should differ between residence and wilderness",
  );
});

test("all guidance output uses Chinese text for warnings and priorities", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  // Trigger multiple layers
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.injuryTicksRemaining = 3;
  cultivator.spiritStones = 50;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  for (const warning of state.agentGuidance.warnings) {
    assert.ok(
      /[\u4e00-\u9fff]/.test(warning),
      `warning should contain Chinese characters: "${warning}"`,
    );
  }
  for (const priority of state.agentGuidance.priorities) {
    assert.ok(
      /[\u4e00-\u9fff]/.test(priority),
      `priority should contain Chinese characters: "${priority}"`,
    );
  }
});
