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
      spirit_root_result: "Water-biased root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator with a strong water leaning.",
  };
}

test("registerAgent can persist a canonical registration record in the same call", async () => {
  const repository = createInMemoryWorldRepository();

  const registration = await repository.registerAgent({
    name: "Su Mingyue",
    llmProvider: "openai",
    llmModelName: "gpt-5",
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
