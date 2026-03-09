import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivatorState,
  getStrategySnapshot,
  performAction,
  syncCultivatorFromPersona,
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
  assert.ok(state.sect?.name);
});

test("agent persona sync auto-provisions and reuses a single character", () => {
  const world = createSeedWorld();

  const first = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
    startingPath: "alchemy",
  });
  const second = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
    pronouns: "she/her",
    temperament: "calm",
    startingPath: "sword",
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.selectedCultivatorId, second.selectedCultivatorId);
  assert.equal(
    getAgentBindingInfo(world, "openclaw-main").selectedCultivatorId,
    first.selectedCultivatorId,
  );

  const state = getCultivatorState(world, first.selectedCultivatorId);
  assert.equal(state.cultivator.name, "Liu Ruyan");
  assert.equal(state.cultivator.pronouns, "she/her");
  assert.equal(state.cultivator.temperament, "calm");
});

test("studying a manual adds technique and strategy recommends safe progression", () => {
  const world = createSeedWorld();
  const before = getCultivatorState(world, "yun-zhong-he");
  const beforeManualCount = before.inventory["sword-manual"];
  const beforeTechniqueCount = before.cultivation.techniques.length;

  const act = performAction(world, "yun-zhong-he", "study-sword-manual");
  assert.equal(act.accepted, true);

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(beforeManualCount, 1);
  assert.equal(state.inventory["sword-manual"], 0);
  assert.ok(state.cultivation.techniques.length >= beforeTechniqueCount);
  assert.ok(state.statusEffects.some((effect) => effect.id === "insight"));

  const strategy = getStrategySnapshot(world, "yun-zhong-he");
  assert.equal(strategy.cultivatorId, "yun-zhong-he");
  assert.ok(strategy.recommendedSequence.length > 0);
});
