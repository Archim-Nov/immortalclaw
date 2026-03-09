import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createCultivator,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivatorState,
  listCultivators,
  performAction,
  selectCultivatorForAgent,
} from "./index.js";

test("cultivation action creates a job and advances realm progress after ticks", () => {
  const world = createSeedWorld();

  const result = performAction(world, "yun-zhong-he", "cultivate");
  assert.equal(result.accepted, true);
  assert.ok(result.job);

  const before = getCultivatorState(world, "yun-zhong-he");
  assert.equal(before.currentJob?.actionId, "cultivate");

  const tickSummary = advanceWorld(world, 4);
  assert.equal(tickSummary.completedJobs.length, 1);

  const after = getCultivatorState(world, "yun-zhong-he");
  assert.equal(after.currentJob, null);
  assert.ok(after.cultivator.realmProgress > before.cultivator.realmProgress);
});

test("joining the sect updates sect state immediately", () => {
  const world = createSeedWorld();

  performAction(world, "yun-zhong-he", "travel-sect-gate");
  advanceWorld(world, 1);
  const result = performAction(world, "yun-zhong-he", "join-sect");

  assert.equal(result.accepted, true);
  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.sect?.name, "青云宗");
});

test("agents can create and select their own characters", () => {
  const world = createSeedWorld();

  const first = createCultivator(world, {
    agentId: "openclaw-main",
    name: "柳如烟",
    genderPresentation: "female",
    startingPath: "alchemy",
  });
  const second = createCultivator(world, {
    agentId: "openclaw-main",
    name: "韩天河",
    genderPresentation: "male",
    startingPath: "sword",
  });

  const listed = listCultivators(world, "openclaw-main");
  assert.equal(listed.length, 2);
  assert.equal(getAgentBindingInfo(world, "openclaw-main").selectedCultivatorId, second.id);

  const selection = selectCultivatorForAgent(world, "openclaw-main", first.id);
  assert.equal(selection.selectedCultivatorId, first.id);
  assert.equal(getAgentBindingInfo(world, "openclaw-main").selectedCultivatorId, first.id);
  assert.equal(first.isSelected, true);
});
