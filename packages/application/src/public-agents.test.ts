import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import { buildPublicAgentDirectory, buildPublicAgentState } from "./public-agents.js";

test("buildPublicAgentDirectory returns only agents that still map to world cultivators", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const payload = await buildPublicAgentDirectory({
    repository: {
      async readWorld() {
        return world;
      },
      async listAgentProfiles() {
        return [
          {
            agentId: "agent-1",
            name: "Su Mingyue",
            selectedCultivatorId: cultivatorId,
            webhookUrl: null,
            webhookSecret: null,
            createdAt: "2026-03-17T00:00:00.000Z",
            updatedAt: "2026-03-17T00:00:00.000Z",
            lastSeenAt: "2026-03-17T00:00:00.000Z",
          },
          {
            agentId: "stale-agent",
            name: "Stale",
            selectedCultivatorId: "missing-cultivator",
            webhookUrl: null,
            webhookSecret: null,
            createdAt: "2026-03-17T00:00:00.000Z",
            updatedAt: "2026-03-17T00:00:00.000Z",
            lastSeenAt: "2026-03-17T00:00:00.000Z",
          },
        ];
      },
    },
  });

  assert.equal(payload.agents.length, 1);
  assert.equal(payload.agents[0]?.agentId, "agent-1");
  assert.equal(payload.agents[0]?.cultivator.id, cultivatorId);
  assert.equal(payload.agents[0]?.cultivator.status, "idle");
});

test("buildPublicAgentState assembles the stat-page payload for a registered agent", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const payload = await buildPublicAgentState({
    repository: {
      async readWorld() {
        return world;
      },
      async getAgentProfile() {
        return {
          agentId: "agent-1",
          name: "Su Mingyue",
          selectedCultivatorId: cultivatorId,
          webhookUrl: null,
          webhookSecret: null,
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          lastSeenAt: "2026-03-17T00:00:00.000Z",
        };
      },
      async getCultivatorState(inputCultivatorId) {
        return {
          tick: 0,
          cultivator: {
            id: inputCultivatorId,
            name: world.cultivators[inputCultivatorId]!.name,
            realm: world.cultivators[inputCultivatorId]!.realm,
            realmLevel: world.cultivators[inputCultivatorId]!.realmLevel,
            realmProgress: world.cultivators[inputCultivatorId]!.realmProgress,
            status: world.cultivators[inputCultivatorId]!.status,
            location: world.locations[world.cultivators[inputCultivatorId]!.locationId]!.name,
            spiritStones: world.cultivators[inputCultivatorId]!.spiritStones,
            qi: world.cultivators[inputCultivatorId]!.qi,
            maxQi: world.cultivators[inputCultivatorId]!.maxQi,
            spiritualPower: world.cultivators[inputCultivatorId]!.spiritualPower,
            maxSpiritualPower: world.cultivators[inputCultivatorId]!.maxSpiritualPower,
            karma: world.cultivators[inputCultivatorId]!.karma,
            reputation: world.cultivators[inputCultivatorId]!.reputation,
            lifespan: world.cultivators[inputCultivatorId]!.lifespan,
          },
          cultivation: { mainTechnique: "Loose Breathing", techniques: ["Loose Breathing"] },
          sect: null,
          tribulation: {
            nextTribulationTick: 100,
            tribulationType: "None",
            difficulty: 0,
            isWarned: false,
            preparationTime: 100,
            supportScore: 0,
          },
          inventory: world.cultivators[inputCultivatorId]!.inventory,
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
            priorities: [],
            suggestedActions: [],
          },
        };
      },
    },
    agentId: "agent-1",
  });

  assert.ok(payload);
  assert.equal(payload?.agent.agentId, "agent-1");
  assert.equal(payload?.cultivator.id, cultivatorId);
  assert.equal(payload?.mainAttributes.gengu, 50);
  assert.equal(payload?.detailedAttributes.qixue_shangxian, 800);
  assert.deepEqual(payload?.fiveElementScores, { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 });
});
