import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRegistrationRecord } from "../../domain/src/runtime.js";
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

function createRegistrationRecordV2(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v2",
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
      label_locale: "zh-CN",
      core_temperament_id: "qian_yuan",
      core_temperament: "",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "以稳定 id 保存、由运行时补足中文展示文案的登记档案。",
  };
}

test("registerAgent can persist a canonical registration record in the same call", async () => {
  const repository = createInMemoryWorldRepository();

  const registration = await repository.registerAgent({
    name: "Su Mingyue",
    record: createRegistrationRecord(),
  });
  const savedRecord = await repository.getCultivationRegistration(registration.selectedCultivatorId);
  const state = await repository.getCultivatorState(registration.selectedCultivatorId);

  assert.ok(savedRecord);
  assert.equal(savedRecord?.cultivator_id, registration.selectedCultivatorId);
  assert.equal(savedRecord?.agent_id, registration.agentId);
  assert.equal(savedRecord?.result.core_temperament, "Calm strategist");
  assert.equal(state.registration?.core_temperament, "Calm strategist");
  assert.ok(state.registrationEffects);
  assert.ok(state.registrationEffects?.dominantElements.some((element) => element.id === "water"));
});

test("registerAgent normalizes v2 taxonomy ids into stored labels and ids", async () => {
  const repository = createInMemoryWorldRepository();

  const registration = await repository.registerAgent({
    name: "Lin Xianlan",
    record: createRegistrationRecordV2(),
  });
  const savedRecord = await repository.getCultivationRegistration(registration.selectedCultivatorId);
  const state = await repository.getCultivatorState(registration.selectedCultivatorId);

  assert.equal(savedRecord?.result.label_locale, "zh-CN");
  assert.equal(savedRecord?.result.core_temperament_id, "qian_yuan");
  assert.equal(savedRecord?.result.core_temperament, "潜渊型");
  assert.equal(savedRecord?.result.behavior_aspect_id, "water-earth");
  assert.equal(savedRecord?.result.behavior_aspect, "水土 / 潜守");
  assert.equal(savedRecord?.result.spirit_root_kind_id, "dual-root");
  assert.equal(savedRecord?.result.spirit_root_result, "水土双灵根");
  assert.equal(state.registration?.core_temperament_id, "qian_yuan");
  assert.equal(state.registration?.behavior_aspect_id, "water-earth");
});

test("sendDirectMessage persists a private message visible to both agents", async () => {
  const repository = createInMemoryWorldRepository();

  const sender = await repository.registerAgent({
    name: "Su Mingyue",
  });
  const recipient = await repository.registerAgent({
    name: "Li Aotian",
  });

  const message = await repository.sendDirectMessage(
    sender.selectedCultivatorId,
    recipient.selectedCultivatorId,
    "Su Mingyue",
    "Private Telepathy",
    "Meet at the sect gate.",
  );

  const senderWorld = await repository.readWorld();
  const senderMessages = senderWorld.messages.filter(
    (entry) => entry.fromCultivatorId === sender.selectedCultivatorId,
  );

  assert.equal(message.fromCultivatorId, sender.selectedCultivatorId);
  assert.equal(message.toCultivatorId, recipient.selectedCultivatorId);
  assert.ok(senderMessages.some((entry) => entry.id === message.id));
});

test("saveAgentProfile and issueAgentCredential persist agent metadata without using registerAgent", async () => {
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

  assert.equal(profile.agentId, "agent-profile-test");
  assert.equal(profile.selectedCultivatorId, cultivatorId);
  assert.equal(authenticated?.agentId, "agent-profile-test");
  assert.equal(authenticated?.selectedCultivatorId, cultivatorId);
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
