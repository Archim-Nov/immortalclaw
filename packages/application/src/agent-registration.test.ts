import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type {
  CultivationRegistrationRecord,
  CultivatorStateView,
} from "../../domain/src/runtime.js";
import type {
  AgentProfileWriteInput,
} from "../../persistence/src/world-repository.js";
import { registerAgentWorkflow } from "./agent-registration.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
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
      label_locale: "en",
      core_temperament_id: "qian_yuan",
      core_temperament: "Calm strategist",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "Patient observer",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "Water-Earth / Latent Guard",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator whose answers map cleanly onto stable taxonomy ids.",
  };
}

function createState(): CultivatorStateView {
  return {
    tick: 0,
    cultivator: {
      id: "cultivator-9",
      name: "Su Mingyue",
      realm: "鐐兼皵",
      realmLevel: 1,
      realmProgress: 0,
      status: "idle",
      location: "Qinghe City",
      spiritStones: 360,
      qi: 100,
      maxQi: 100,
      spiritualPower: 100,
      maxSpiritualPower: 100,
      karma: 0,
      reputation: 12,
      lifespan: 160,
      age: 19,
      genderPresentation: "female",
      pronouns: "she/her",
      origin: "Frost Harbor",
      temperament: "Calm and exacting",
    },
    cultivation: {
      mainTechnique: "Loose Breathing",
      techniques: ["Loose Breathing", "Light Body"],
    },
    sect: null,
    tribulation: {
      nextTribulationTick: 100,
      tribulationType: "None",
      difficulty: 0,
      isWarned: false,
      preparationTime: 100,
      supportScore: 10,
    },
    inventory: {
      "healing-pill": 1,
      "qi-pill": 1,
      "ward-talisman": 0,
      "spirit-ore": 0,
      "ruin-fragment": 0,
      "beast-core": 0,
      "sword-manual": 0,
      "alchemy-manual": 0,
      "array-manual": 0,
    },
    inventoryDetails: [],
    currentJob: null,
    nearbyOpportunities: ["Sell or buy supplies."],
    statusEffects: [],
    factionReputation: [],
    recentEvents: [],
    recentCombats: [],
    registration: {
      saved_at: "2026-03-17T00:00:00.000Z",
      label_locale: "en",
      core_temperament_id: "qian_yuan",
      core_temperament: "Calm strategist",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "Patient observer",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "Water-Earth / Latent Guard",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "Seek truth",
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      overall_confidence: "high",
    },
    registrationEffects: {
      dominantElements: [
        { id: "water", label: "Water", score: 11 },
        { id: "earth", label: "Earth", score: 9 },
      ],
      modifiers: [],
    },
    derivedState: {
      readiness: "ready",
      recoveryState: "healthy",
      activityContext: "settled",
      daoPotential: {
        score: 50,
        tier: "steady",
        nextMilestone: 65,
      },
    },
    onboarding: {
      stage: "registered",
      completedSteps: ["register"],
      nextAction: "take-mortal-task",
      summary: "Ready to start.",
    },
    agentGuidance: {
      warnings: [],
      priorities: ["Earn more spirit stones."],
      suggestedActions: ["take-mortal-task"],
    },
  };
}

test("registerAgentWorkflow assembles the richer registration response in application", async () => {
  const calls: {
    cultivatorId?: string;
    savedProfile?: AgentProfileWriteInput;
    issuedAgentId?: string;
  } = {};
  const registrationRecord = createRegistrationRecord();
  const state = createState();
  const world = createSeedWorld();

  const payload = await registerAgentWorkflow({
    repository: {
      async transactWorld(mutator) {
        return mutator(world);
      },
      async saveAgentProfile(input) {
        calls.savedProfile = input;
        return {
          agentId: input.agentId,
          name: input.name,
          selectedCultivatorId: input.selectedCultivatorId,
          webhookUrl: input.webhookUrl ?? null,
          webhookSecret: input.webhookSecret ?? null,
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          lastSeenAt: "2026-03-17T00:00:00.000Z",
        };
      },
      async issueAgentCredential(agentId) {
        calls.issuedAgentId = agentId;
        return {
          agentId,
          credential: "immortal_sk_test",
        };
      },
      async getCultivatorState(cultivatorId) {
        calls.cultivatorId = cultivatorId;
        return {
          ...state,
          cultivator: {
            ...state.cultivator,
            id: cultivatorId,
            name: calls.savedProfile?.name ?? state.cultivator.name,
          },
        } satisfies CultivatorStateView;
      },
      async getCultivationRegistration(cultivatorId) {
        return world.cultivators[cultivatorId]?.registrationRecord ?? null;
      },
    },
    input: {
      name: "Su Mingyue",
      record: registrationRecord,
      webhookUrl: "https://example.com/hooks/immortal-realm",
    },
    questionnaireSource: "answers",
    baseUrl: "https://runtime.test",
  });

  assert.equal(calls.savedProfile?.name, "Su Mingyue");
  assert.equal(calls.savedProfile?.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.match(String(calls.savedProfile?.webhookSecret), /^whsec_/);
  assert.equal(calls.cultivatorId, calls.savedProfile?.selectedCultivatorId);
  assert.equal(calls.savedProfile?.agentId, calls.issuedAgentId);
  assert.equal(payload.ok, true);
  assert.equal(payload.baseUrl, "https://runtime.test");
  assert.equal(payload.registration?.core_temperament, "Calm strategist");
  assert.equal(payload.registrationEffects?.dominantElements[0]?.id, "water");
  assert.equal(payload.registrationProfile?.spiritRoot.label, "Water-Earth dual root");
  assert.match(payload.message, /Agent registered/i);
  assert.match(payload.message, /Core temperament: Calm strategist/i);
});
