import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, performAction } from "./index.js";

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

