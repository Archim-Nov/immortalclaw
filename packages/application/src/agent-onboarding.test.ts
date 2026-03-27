import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type {
  AgentProfileRecord,
} from "../../persistence/src/world-repository.js";
import type { CultivatorStateView } from "../../domain/src/runtime.js";
import { buildAuthenticatedAgentState } from "./agent-onboarding.js";

function createState(): CultivatorStateView {
  return {
    tick: 12,
    cultivator: {
      id: "cultivator-9",
      name: "Su Mingyue",
      realm: "炼气",
      realmLevel: 1,
      realmProgress: 14,
      status: "idle",
      location: "Qinghe City",
      spiritStones: 420,
      qi: 100,
      maxQi: 100,
      spiritualPower: 100,
      maxSpiritualPower: 100,
      reputation: 18,
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
    sect: null,
    neutralSect: null,
    wilderness: null,
    guixu: null,
    inventory: {
      "healing-pill": 1,
      "qi-pill": 1,
      "ward-talisman": 0,
      "spirit-ore": 0,
      "ruin-fragment": 0,
      "beast-core": 0,
      "eight-wastes-pass": 0,
      "ancient-artifact": 0,
      "legendary-artifact": 0,
      "sword-manual": 0,
      "alchemy-manual": 0,
      "array-manual": 0,
    },
    inventoryDetails: [],
    currentJob: null,
    nearbyOpportunities: [],
    statusEffects: [],
    factionReputation: [],
    recentEvents: [],
    recentCombats: [],
    registration: null,
    registrationEffects: null,
    derivedState: {
      readiness: "ready",
      recoveryState: "healthy",
      activityContext: "stationed",
      daoPotential: {
        score: 52,
        tier: "adept",
        breakdown: {
          realmBase: 20,
          attributeAverage: 20,
          detailedAttributeModifier: 8,
          readinessModifier: 2,
          statusModifier: 2,
        },
      },
    },
    onboarding: {
      stage: "registered",
      completedStages: [],
      nextAction: "take-mortal-task",
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
    agentGuidance: {
      warnings: [],
      priorities: [],
      suggestedActions: ["take-mortal-task"],
    },
  };
}

test("buildAuthenticatedAgentState assembles agent view plus cultivator state in application", async () => {
  const calls: { cultivatorId?: string } = {};
  const world = createSeedWorld();
  const seedCultivatorId = Object.keys(world.cultivators)[0];
  if (!seedCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }
  world.cultivators["cultivator-9"] = {
    ...world.cultivators[seedCultivatorId]!,
    id: "cultivator-9",
    registrationRecord: null,
  };
  const agent: AgentProfileRecord = {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-9",
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
  };

  const payload = await buildAuthenticatedAgentState({
    world: {
      async getCultivatorState(cultivatorId) {
        calls.cultivatorId = cultivatorId;
        return createState();
      },
      async readWorld() {
        return world;
      },
    },
    agent,
  });

  assert.equal(calls.cultivatorId, "cultivator-9");
  assert.equal(payload.agent.agentId, "agent-1");
  assert.equal(payload.agent.name, "Su Mingyue");
  assert.equal(payload.cultivator.id, "cultivator-9");
  assert.equal(payload.tick, 12);
  assert.equal(payload.mainAttributes.gengu, 50);
  assert.equal(payload.detailedAttributes.qixue_shangxian, 800);
  assert.deepEqual(payload.fiveElementScores, { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 });
  assert.equal(payload.neutralSect, null);
  assert.equal(payload.onboarding.recommendedOnly, true);
  assert.equal(payload.decisionPolicy.priorityOrder[0], "owner-command");
});
