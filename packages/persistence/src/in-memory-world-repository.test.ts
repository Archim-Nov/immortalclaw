import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, saveCultivationRegistration, type CultivationRegistrationRecord } from "../../domain/src/runtime.js";
import { createInMemoryWorldRepository } from "./in-memory-world-repository.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "A",
      Q2: "B",
      Q3: "C",
      Q4: "D",
      Q5: "A",
      Q6: "B",
      Q7: "C",
      Q8: "D",
      Q9: "A",
      Q10: "B",
      Q11: "C",
      Q12: "D",
      Q13: "A",
      Q14: "B",
      Q15: "C",
      Q16: "D",
      Q17: "A",
      Q18: "B",
    },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      behavior_aspect: "Water / Observation",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 8,
      },
      spirit_root_result: "Water single root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator with clear water dominance.",
  };
}

test("readWorld seeds state and getWorldMetadata reflects the current tick", async () => {
  const repository = createInMemoryWorldRepository();

  const world = await repository.readWorld();
  const metadata = await repository.getWorldMetadata();

  assert.equal(metadata.tick, world.tick);
  assert.equal(metadata.updatedAt, world.updatedAt);
});

test("transactWorld persists world mutations while returning a cloned result", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const mutatedCultivator = await repository.transactWorld((draftWorld) => {
    draftWorld.cultivators[cultivatorId].spiritStones += 42;
    return draftWorld.cultivators[cultivatorId];
  });

  mutatedCultivator.spiritStones = -1;

  const refreshedWorld = await repository.readWorld();
  assert.equal(refreshedWorld.cultivators[cultivatorId].spiritStones, world.cultivators[cultivatorId].spiritStones + 42);
  assert.notEqual(refreshedWorld.cultivators[cultivatorId].spiritStones, mutatedCultivator.spiritStones);
});

test("auth methods persist profiles and credentials", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const profile = await repository.saveAgentProfile({
    agentId: "agent-profile-test",
    name: "Su Mingyue",
    selectedCultivatorId: cultivatorId,
    origin: "Frost Harbor",
  });
  const issued = await repository.issueAgentCredential(profile.agentId);
  const authenticated = await repository.authenticateAgent(issued.credential);
  const reset = await repository.resetAgentCredential(profile.agentId, issued.credential);
  const stale = await repository.authenticateAgent(issued.credential);
  const refreshed = await repository.authenticateAgent(reset.credential);

  assert.equal(profile.agentId, "agent-profile-test");
  assert.equal(authenticated?.agentId, profile.agentId);
  assert.equal(reset.agentId, profile.agentId);
  assert.equal(stale, null);
  assert.equal(refreshed?.agentId, profile.agentId);
});

test("world methods expose action, registration, and tick behavior", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const actions = await repository.listAvailableActions(cultivatorId);
  const action = actions[0];

  assert.ok(action);

  const actionResult = await repository.performAction(cultivatorId, action.actionId);
  const summary = await repository.advanceWorld(1);
  const latestTickRun = await repository.getLatestTickRun();

  await repository.transactWorld((draftWorld) => {
    saveCultivationRegistration(draftWorld, cultivatorId, createRegistrationRecord(), "agent-1");
    return null;
  });

  const registration = await repository.getCultivationRegistration(cultivatorId);

  assert.equal(actionResult.cultivatorId, cultivatorId);
  assert.equal(latestTickRun?.tick, summary.tick);
  assert.ok(registration);
});
