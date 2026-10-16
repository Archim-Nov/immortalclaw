import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, getCultivatorState, performAction } from "../../domain/src/runtime.js";
import { buildPublicAgentDirectory, buildPublicAgentState } from "./public-agents.js";

test("buildPublicAgentDirectory returns only agents that still map to world cultivators", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const payload = await buildPublicAgentDirectory({
    world: {
      async readWorld() {
        return world;
      },
    },
    auth: {
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
  assert.equal(payload.agents[0]?.cultivator.realmPhase, "后期");
  assert.equal(payload.agents[0]?.cultivator.status, "idle");
  const cultivator = world.cultivators[cultivatorId]!;
  const location = world.locations[cultivator.locationId]!;
  assert.equal(payload.agents[0]?.cultivator.locationId, cultivator.locationId);
  assert.equal(payload.agents[0]?.cultivator.stateId, location.stateId);
  assert.equal(payload.agents[0]?.cultivator.location, location.name);
  assert.equal(payload.agents[0]?.cultivator.currentAction, null);
  assert.equal(payload.agents[0]?.cultivator.currentActionLabel, null);
  assert.equal(JSON.stringify(payload).includes("webhookSecret"), false);
});

test("buildPublicAgentDirectory names the running job without leaking the webhook secret", async () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const started = performAction(world, cultivatorId, "cultivate");
  assert.equal(started.accepted, true);

  const payload = await buildPublicAgentDirectory({
    world: {
      async readWorld() {
        return world;
      },
    },
    auth: {
      async listAgentProfiles() {
        return [
          {
            agentId: "agent-1",
            name: "云中鹤",
            selectedCultivatorId: cultivatorId,
            webhookUrl: "https://example.invalid/hook",
            webhookSecret: "super-secret-token",
            createdAt: "2026-03-17T00:00:00.000Z",
            updatedAt: "2026-03-17T00:00:00.000Z",
            lastSeenAt: "2026-03-17T00:00:00.000Z",
          },
        ];
      },
    },
  });

  assert.equal(payload.agents[0]?.cultivator.currentAction, "cultivate");
  assert.equal(payload.agents[0]?.cultivator.currentActionLabel, "运功");
  assert.equal(payload.agents[0]?.cultivator.locationId, "qingzhou:main-city");
  assert.equal(payload.agents[0]?.cultivator.stateId, "qingzhou");
  assert.equal(JSON.stringify(payload).includes("super-secret-token"), false);
  assert.equal(JSON.stringify(payload).includes("example.invalid"), false);
});

test("buildPublicAgentState assembles the stat-page payload for a registered agent", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const payload = await buildPublicAgentState({
    world: {
      async readWorld() {
        return world;
      },
      async getCultivatorState(inputCultivatorId) {
        return getCultivatorState(world, inputCultivatorId);
      },
    },
    auth: {
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
    },
    agentId: "agent-1",
  });

  assert.ok(payload);
  assert.equal(payload?.agent.agentId, "agent-1");
  assert.equal(payload?.cultivator.id, cultivatorId);
  assert.equal(payload?.cultivator.realmPhase, "后期");
  assert.equal(payload?.mainAttributes.gengu, 50);
  assert.equal(payload?.detailedAttributes.qixue_shangxian, 800);
  assert.deepEqual(payload?.fiveElementScores, { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 });

  // Spectator dossier: the full public life of the cultivator travels with the state payload.
  assert.ok(payload?.dossier, "public state should carry a spectator dossier");
  assert.equal(typeof payload?.dossier.tick, "number");
  assert.ok(Array.isArray(payload?.dossier.events));
  assert.ok(Array.isArray(payload?.dossier.combats));
  assert.ok(Array.isArray(payload?.dossier.messages));
  assert.ok(Array.isArray(payload?.dossier.daoHeart));
  assert.ok(payload?.dossier.strategy, "dossier should include a strategy snapshot");
});

test("buildPublicAgentState returns null when detailed state references missing world records", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const payload = await buildPublicAgentState({
    world: {
      async readWorld() {
        return world;
      },
      async getCultivatorState() {
        throw new Error("Location not found: qingzhou:missing-node");
      },
    },
    auth: {
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
    },
    agentId: "agent-1",
  });

  assert.equal(payload, null);
});
