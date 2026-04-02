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
  assert.ok(state.agentGuidance.priorities.some((entry) => /wilderness/i.test(entry)));
});

test("progression-material needs route guidance to dungeon expeditions", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.realm = "筑基" as typeof cultivator.realm;
  cultivator.realmLevel = 4;
  cultivator.realmProgress = 100;
  cultivator.spiritStones = 900;
  cultivator.inventory["foundation-common"] = 0;
  cultivator.inventory["foundation-stage-1-special"] = 0;
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  cultivator.injuryTicksRemaining = 0;

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(
    state.agentGuidance.suggestedActions.some((actionId) => String(actionId).startsWith("start-dungeon-expedition:rank-")),
  );
  assert.ok(state.agentGuidance.priorities.some((entry) => /dungeon/i.test(entry)));
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

  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.ok(state.agentGuidance.suggestedActions.includes("enter-bahuang:balanced"));
  assert.ok(state.agentGuidance.priorities.some((entry) => /bahuang/i.test(entry)));
});
