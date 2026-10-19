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

test("player-sect recruitment hint stays in Chinese without action ids or routes", async () => {
  const world = createSeedWorld();
  const seedCultivatorId = Object.keys(world.cultivators)[0];
  if (!seedCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }
  world.cultivators["cultivator-9"] = {
    ...world.cultivators[seedCultivatorId]!,
    id: "cultivator-9",
    sectId: null,
    neutralSectId: null,
    pendingMoralityChoiceId: null,
    locationId: "qingzhou:main-city",
  };
  world.sects["qing-yun-sect"] = {
    id: "qing-yun-sect",
    name: "青云宗",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: "cultivator-9",
    treasury: 0,
    memberIds: [],
    spiritVeins: [],
    headquarters: "qingzhou:sect-outpost:qing-yun-sect",
    titleSlots: [],
    titleUpdateInterval: 2880,
    lastTitleUpdateTick: 0,
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
    admissionPolicyUpdatedAtTick: 0,
  };

  const readWorld = async () => world;
  const plain = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [];
      },
      readWorld,
    },
    agent: createAgentProfile(),
  });
  const hinted = plain.actions.find((action) => action.actionId === "open-player-sect-recruitment");
  assert.ok(hinted);
  assert.match(hinted.description, /报名/);
  assert.equal(hinted.description.includes("join-neutral-sect"), false);
  assert.equal(hinted.description.includes("join-sect"), false);
  assert.equal(hinted.description.includes("/agent/"), false);
  assert.equal(hinted.description.includes("open-player-sect-recruitment"), false);

  const withJoin = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [{
          actionId: "join-sect",
          label: "入门：青云宗（玩家宗门）",
          description: "可以直接入门。",
          durationTicks: 0,
          kind: "immediate",
        }];
      },
      readWorld,
    },
    agent: createAgentProfile(),
  });
  const direct = withJoin.actions.find((action) => action.actionId === "open-player-sect-recruitment");
  assert.ok(direct);
  assert.match(direct.description, /直接入门/);
  assert.equal(direct.description.includes("join-sect"), false);
  assert.equal(direct.description.includes("/agent/"), false);
});

test("morality fork hint speaks Chinese and keeps the route off the sentence", async () => {
  const world = createSeedWorld();
  const seedCultivatorId = Object.keys(world.cultivators)[0];
  if (!seedCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }
  world.cultivators["cultivator-9"] = {
    ...world.cultivators[seedCultivatorId]!,
    id: "cultivator-9",
    pendingMoralityChoiceId: "morality-choice-19",
    locationId: "qingzhou:main-city",
  };
  world.pendingMoralityChoices["morality-choice-19"] = {
    id: "morality-choice-19",
    cultivatorId: "cultivator-9",
    createdAtTick: 0,
    expiresAtTick: 6,
    title: "学徒的篮子",
    prompt: "这一筐要不要送下去。",
    options: [
      { id: "deliver", label: "把整筐送下去", summary: "送到棚里。", moralityDelta: 1, effectBundle: {} },
      { id: "skim-herbs", label: "拿走好的那几株", summary: "好叶子不在了。", moralityDelta: -1, effectBundle: {} },
    ],
  };

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [];
      },
      async readWorld() {
        return world;
      },
    },
    agent: createAgentProfile(),
  });
  const hint = payload.actions.find((action) => action.actionId === "resolve-morality-event-choice");
  assert.ok(hint);
  assert.equal(hint.label, "道心岔路待选");
  assert.match(hint.description, /「学徒的篮子」还停在眼前/);
  assert.match(hint.description, /可以把整筐送下去，也可以拿走好的那几株/);
  assert.match(hint.description, /这张不是寻常行动/);
  assert.match(hint.description, /要在道心这一处自己选/);
  for (const text of [hint.label, hint.description]) {
    assert.equal(text.includes("/agent/act"), false);
    assert.equal(text.includes("/agent/events/choose"), false);
    assert.equal(text.includes("POST"), false);
    assert.equal(text.includes("choiceId"), false);
    assert.equal(text.includes("optionId"), false);
    assert.equal(text.includes("deliver"), false);
    assert.equal(text.includes("skim-herbs"), false);
    assert.equal(text.includes("morality-choice-19"), false);
  }
  assert.deepEqual(hint.routing, {
    path: "/agent/events/choose",
    choiceId: "morality-choice-19",
    optionIds: ["deliver", "skim-herbs"],
  });
});
