import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import { createEmptyInventory } from "../../domain/src/seed.js";
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
      realm: "炼气",
      realmLevel: 1,
      realmPhase: "\u524d\u671f",
      realmProgress: 0,
      status: "idle",
      location: "Qinghe City",
      locationId: "qingzhou:main-city",
      spiritStones: 360,
      qi: 100,
      maxQi: 100,
      spiritualPower: 100,
      maxSpiritualPower: 100,
      reputation: 12,
      lifespan: 160,
      age: 19,
      genderPresentation: "female",
      pronouns: "she/her",
      origin: "Frost Harbor",
      temperament: "Calm and exacting",
      moralityScore: 0,
      moralityAlignment: "正道",
    },
    cultivation: {
      mainTechnique: "Loose Breathing",
      techniques: ["Loose Breathing", "Light Body"],
    },
    combatProfile: {
      battleReadiness: "ready",
      attackChannel: "weapon",
      coreCombatStats: {
        weaponAttack: 50,
        spellAttack: 50,
        physicalDefense: 30,
        spellDefense: 30,
        speed: 100,
        hit: 80,
        dodge: 20,
        crit: 10,
        critDamage: 150,
        guardHeart: 5,
      },
      combatTraits: [],
      equippedWeaponLoadout: null,
      equippedSpellLoadout: null,
      unlockedWeaponLoadouts: [],
      unlockedSpellLoadouts: [],
    },
    sect: null,
    neutralSect: null,
    bahuang: null,
    wilderness: null,
    guixu: null,
    inventory: {
      ...createEmptyInventory(),
      "healing-pill": 1,
      "qi-pill": 1,
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
      core_temperament_description: "Plans first, then moves.",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "Patient observer",
      secondary_temperament_description: "Watches before speaking.",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "Water-Earth / Latent Guard",
      behavior_aspect_description: "Holds ground and redirects force.",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "Seek truth",
      cultivation_motive_description: "Wants to understand how the world works.",
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      spirit_root_description: "Two roots, water and earth.",
      overall_confidence: "high",
    },
    registrationEffects: {
      dominantElements: [
        { id: "water", label: "Water", score: 11 },
        { id: "earth", label: "Earth", score: 9 },
      ],
      modifiers: [],
    },
    breakthrough: null,
    realmPath: {
      stage: "炼气",
      phase: "前期",
      level: 1,
      nextStage: "炼气",
      nextLevel: 2,
      category: "minor",
      where: "炼气的材料坊市买得到。",
      risk: "这一阶是小突破，材料齐了就会成。",
      outcome: "仍在炼气里往前一层。",
      catalogTier: null,
      goals: ["材料齐了，回洞府破境。"],
    },
    dungeon: null,
    dungeonExpedition: {
      active: null,
      lastReport: null,
    },
    derivedState: {
      readiness: "ready",
      recoveryState: "healthy",
      activityContext: "stationed",
      daoPotential: {
        score: 50,
        tier: "adept",
        breakdown: {
          realmBase: 20,
          attributeAverage: 20,
          detailedAttributeModifier: 8,
          readinessModifier: 1,
          statusModifier: 1,
        },
      },
    },
    onboarding: {
      stage: "registered",
      completedStages: [],
      recommendedActions: ["take-mortal-task"],
      hint: "Ready to start.",
      recommendedOnly: true,
      allowsFreeExploration: true,
    },
    decisionPolicy: {
      tutorialMode: "optional",
      tutorialRequired: false,
      freeExplorationAllowed: true,
      priorityOrder: [
        "owner-command",
        "safety",
        "runtime-guidance",
        "onboarding",
        "free-exploration",
      ],
      summary: "Owner intent can override onboarding. Safety comes before tutorials. Free exploration is allowed.",
    },
    socialLinks: [],
    residences: [],
    activeResidence: null,
    agentGuidance: {
      warnings: [],
      priorities: ["Earn more spirit stones."],
      suggestedActions: ["take-mortal-task"],
    },
    travelogue: {
      mood: "心绪平稳",
      notes: [],
    },
    registrationProfile: null,
    residenceContext: null,
    productionQueue: [],
    pendingGifts: [],
    localCommissions: [],
    endgame: { guixuCompletedNodeIds: [], originHeartAwakened: false },
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
    world: {
      async readWorld() {
        return world;
      },
      async transactWorld(mutator) {
        return mutator(world);
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
    auth: {
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
  assert.equal(payload.presentation.version, 5);
  assert.equal(
    payload.presentation.templates.some((template) => template.id === "dossier"),
    true,
  );
  assert.equal(
    payload.presentation.templates.some((template) => template.id === "dungeon-wake"),
    false,
  );
  assert.equal(payload.agent.name, "Su Mingyue");
  assert.equal(payload.agent.selectedCultivatorId, payload.selectedCultivatorId);
  assert.equal(payload.cultivator.name, "Su Mingyue");
  assert.equal(payload.onboarding.stage, "registered");
  assert.equal(payload.decisionPolicy.tutorialMode, "optional");
  assert.deepEqual(payload.agentGuidance.suggestedActions, ["take-mortal-task"]);
  assert.equal(payload.registration?.core_temperament, "Calm strategist");
  assert.equal(payload.registrationEffects?.dominantElements[0]?.id, "water");
  assert.equal(payload.registrationProfile?.spiritRoot.label, "Water-Earth dual root");
  assert.match(payload.message, /Identity confirmed as Su Mingyue/i);
  assert.match(payload.message, /Current state: 炼气前期, location Qinghe City, status idle, readiness ready, recovery healthy/i);
  assert.match(payload.message, /Recommended next action: take-mortal-task/i);
  assert.match(payload.message, /Core temperament: Calm strategist/i);
});
