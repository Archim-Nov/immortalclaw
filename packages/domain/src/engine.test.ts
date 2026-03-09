import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRegistrationRecord } from "./index.js";
import {
  advanceWorld,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivationRegistration,
  getCultivatorState,
  getStrategySnapshot,
  performAction,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
} from "./index.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record" as const,
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
      Q4: "C",
      Q5: "C",
      Q6: "C",
      Q7: "C",
      Q8: "A",
      Q9: "C",
      Q10: "C",
      Q11: "C",
      Q12: "C",
      Q13: "B",
      Q14: "B",
      Q15: "B",
      Q16: "B",
      Q17: "C",
      Q18: "B",
    },
    result: {
      core_temperament: "潜渊型",
      secondary_temperament: "观澜型",
      behavior_aspect: "水土 / 潜守",
      cultivation_motive: "求真知",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_result: "水偏灵根",
      confidence: {
        core: "high" as const,
        behavior: "high" as const,
        motive: "medium" as const,
        overall: "high" as const,
      },
    },
    summary: "其心性偏潜守，行路以观势为先，求知之念最重。",
  };
}

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

test("registration records save and surface through cultivator state", () => {
  const world = createSeedWorld();

  const saved = saveCultivationRegistration(
    world,
    "yun-zhong-he",
    createRegistrationRecord(),
    "openclaw-main",
  );

  assert.equal(saved.cultivator_id, "yun-zhong-he");
  assert.equal(saved.agent_id, "openclaw-main");
  assert.ok(saved.saved_at);

  const stored = getCultivationRegistration(world, "yun-zhong-he");
  assert.equal(stored?.saved_at, saved.saved_at);
  assert.equal(stored?.result.core_temperament, "潜渊型");
  assert.equal(stored?.result.behavior_aspect, "水土 / 潜守");

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.deepEqual(state.registration, {
    saved_at: saved.saved_at ?? null,
    core_temperament: "潜渊型",
    secondary_temperament: "观澜型",
    behavior_aspect: "水土 / 潜守",
    cultivation_motive: "求真知",
    spirit_root_result: "水偏灵根",
    overall_confidence: "high",
  });
});
