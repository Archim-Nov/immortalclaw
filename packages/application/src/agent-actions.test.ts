import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type { AvailableAction } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { buildAuthenticatedAgentActions } from "./agent-actions.js";

function createAgentProfile(): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-9",
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
  };
}

test("buildAuthenticatedAgentActions assembles agent view plus available actions in application", async () => {
  const calls: { cultivatorId?: string } = {};
  const actions: AvailableAction[] = [
    {
      actionId: "cultivate",
      label: "Cultivate",
      description: "Breathe in spiritual energy and refine it into qi.",
      durationTicks: 4,
      kind: "timed",
    },
  ];
  const world = createSeedWorld();
  const seedCultivatorId = Object.keys(world.cultivators)[0];
  if (!seedCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }
  world.cultivators["cultivator-9"] = {
    ...world.cultivators[seedCultivatorId]!,
    id: "cultivator-9",
    pendingMoralityChoiceId: null,
  };

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions(cultivatorId) {
        calls.cultivatorId = cultivatorId;
        return actions;
      },
      async readWorld() {
        return world;
      },
    },
    agent: createAgentProfile(),
  });

  assert.equal(calls.cultivatorId, "cultivator-9");
  assert.equal(payload.agent.agentId, "agent-1");
  assert.equal(payload.cultivatorId, "cultivator-9");
  assert.deepEqual(payload.actions, actions);
});

test("buildAuthenticatedAgentActions does not append generic inbox actions during an active dungeon expedition", async () => {
  const world = createSeedWorld();
  const seedCultivatorId = Object.keys(world.cultivators)[0];
  if (!seedCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  world.cultivators["cultivator-9"] = {
    ...world.cultivators[seedCultivatorId]!,
    id: "cultivator-9",
    activeJobId: "job-expedition",
    pendingMoralityChoiceId: "morality-choice-1",
  };
  (world as typeof world & {
    dungeonExpeditions?: Record<string, unknown>;
  }).dungeonExpeditions = {
    "cultivator-9": {
      cultivatorId: "cultivator-9",
      jobId: "job-expedition",
      locationId: "qingzhou:dungeon-c",
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      startedAtTick: 0,
      stepIndex: 2,
      maxSteps: 10,
      nextResolutionTick: 9,
      searchSteps: 1,
      guardianSteps: 1,
      primaryMaterialCount: 2,
      secondaryDrops: {},
      spiritStoneGain: 120,
      realmProgressGain: 8,
      unlockedNextRank: false,
      lastResolvedAction: "search",
      flavorEventTitles: [],
      strategy: {
        posture: "balanced",
        bias: "survival-first",
        pushPreference: "neutral",
      },
      wakeNodesEncountered: 0,
      maxWakeNodes: 2,
      pendingWakeNode: null,
      pendingWakeNodeDeadlineTick: null,
      resolvedWakeNodeCount: 0,
    },
  };
  world.jobs["job-expedition"] = {
    id: "job-expedition",
    cultivatorId: "cultivator-9",
    actionId: "start-dungeon-expedition:rank-1:balanced" as never,
    label: "Dungeon expedition",
    remainingTicks: 24,
    totalTicks: 30,
  };
  world.pendingMoralityChoices["morality-choice-1"] = {
    id: "morality-choice-1",
    cultivatorId: "cultivator-9",
    createdAtTick: 0,
    expiresAtTick: 6,
    title: "A crossroads",
    prompt: "Choose a path.",
    options: [
      { id: "aid", label: "Aid", summary: "Help them.", moralityDelta: 1, effectBundle: {} },
      { id: "ignore", label: "Ignore", summary: "Walk away.", moralityDelta: -1, effectBundle: {} },
    ],
  };

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [{
          actionId: "abort-dungeon-expedition" as never,
          label: "Abort dungeon expedition",
          description: "Return to safety now.",
          durationTicks: 0,
          kind: "immediate",
        }];
      },
      async readWorld() {
        return world;
      },
    },
    agent: createAgentProfile(),
  });

  assert.deepEqual(
    payload.actions.map((action) => action.actionId),
    ["abort-dungeon-expedition"],
  );
});
