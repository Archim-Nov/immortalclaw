import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, type WorldState } from "@immortal-claw/domain";
import type { AgentProfileRecord } from "@immortal-claw/persistence";
import { createTestApp } from "./test-helpers.js";

function createAgentProfile(selectedCultivatorId: string): AgentProfileRecord {
  return {
    agentId: `agent-${selectedCultivatorId}`,
    name: `Agent ${selectedCultivatorId}`,
    selectedCultivatorId,
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    lastSeenAt: "2026-03-27T00:00:00.000Z",
  };
}

function createAuthedApp(initialWorld: WorldState, selectedCultivatorId: string) {
  let currentWorld = structuredClone(initialWorld);
  const app = createTestApp({
    world: {
      async readWorld() {
        return structuredClone(currentWorld);
      },
      async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
        const draft = structuredClone(currentWorld);
        const result = mutator(draft);
        currentWorld = draft;
        return structuredClone(result);
      },
      async listAvailableActions() {
        return [];
      },
      async getCultivatorState(cultivatorId: string) {
        return (await import("@immortal-claw/domain")).getCultivatorState(currentWorld, cultivatorId);
      },
      async getCultivationRegistration() {
        return null;
      },
    },
    auth: {
      async authenticateAgent() {
        return createAgentProfile(selectedCultivatorId);
      },
      async touchAgent() {
        return;
      },
    },
  });

  return {
    app,
    readWorld() {
      return structuredClone(currentWorld);
    },
  };
}

test("morality routes expose pending event choices, resolve them, and surface one generic inbox action", async () => {
  const world = createSeedWorld() as WorldState & {
    pendingMoralityChoices?: Record<string, unknown>;
  };
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators[string] & {
    moralityScore?: number;
    pendingMoralityChoiceId?: string | null;
  };
  cultivator.moralityScore = 0;
  cultivator.pendingMoralityChoiceId = "choice-1";
  world.pendingMoralityChoices = {
    "choice-1": {
      id: "choice-1",
      cultivatorId: cultivator.id,
      createdAtTick: world.tick,
      expiresAtTick: world.tick + 6,
      title: "Crossroads Beggar",
      prompt: "Choose whether to protect the road or exploit the panic.",
      options: [
        {
          id: "aid",
          label: "Aid the traveler",
          summary: "Keep order and help.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "loot",
          label: "Loot the traveler",
          summary: "Take a quick gain.",
          moralityDelta: -3,
          effectBundle: {
            spiritStones: 45,
          },
        },
      ],
    },
  };

  const runtime = createAuthedApp(world, cultivator.id);

  const actionsResponse = await runtime.app.request("https://runtime.test/agent/actions", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const actionsPayload = await actionsResponse.json() as {
    actions: Array<{ actionId: string }>;
  };

  assert.equal(actionsResponse.status, 200);
  assert.equal(
    actionsPayload.actions.filter((action) => action.actionId === "resolve-morality-event-choice").length,
    1,
  );

  const pendingResponse = await runtime.app.request("https://runtime.test/agent/events/pending", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const pendingPayload = await pendingResponse.json() as {
    choice: {
      choiceId: string;
      options: Array<{ id: string }>;
    } | null;
  };

  assert.equal(pendingResponse.status, 200);
  assert.equal(pendingPayload.choice?.choiceId, "choice-1");
  assert.equal(pendingPayload.choice?.options.length, 2);

  const chooseResponse = await runtime.app.request("https://runtime.test/agent/events/choose", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      choiceId: "choice-1",
      optionId: "aid",
    }),
  });
  const choosePayload = await chooseResponse.json() as {
    moralityScore?: number;
    moralityAlignment?: string;
    summary?: string;
  };

  assert.equal(chooseResponse.status, 200);
  assert.equal(choosePayload.moralityScore, 3);
  assert.equal(choosePayload.moralityAlignment, "\u6b63\u9053");
  assert.match(choosePayload.summary ?? "", /aid|traveler|choice/i);

  const stateResponse = await runtime.app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const statePayload = await stateResponse.json() as {
    cultivator: {
      moralityScore?: number;
      moralityAlignment?: string;
    };
  };

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.cultivator.moralityScore, 3);
  assert.equal(statePayload.cultivator.moralityAlignment, "\u6b63\u9053");
});
