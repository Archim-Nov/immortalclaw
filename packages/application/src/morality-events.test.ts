import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { buildAuthenticatedAgentActions } from "./agent-actions.js";
import * as application from "./index.js";

function createAgentProfile(selectedCultivatorId: string): AgentProfileRecord {
  return {
    agentId: "agent-morality",
    name: "Morality Agent",
    selectedCultivatorId,
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    lastSeenAt: "2026-03-27T00:00:00.000Z",
  };
}

test("buildAuthenticatedAgentActions adds a generic morality-choice inbox hint only once", async () => {
  const world = createSeedWorld() as ReturnType<typeof createSeedWorld> & {
    pendingMoralityChoices?: Record<string, unknown>;
  };
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators[string] & {
    pendingMoralityChoiceId?: string | null;
  };
  cultivator.pendingMoralityChoiceId = "choice-1";
  world.pendingMoralityChoices = {
    "choice-1": {
      id: "choice-1",
      cultivatorId: cultivator.id,
      createdAtTick: 0,
      expiresAtTick: 6,
      title: "Crossroads Beggar",
      prompt: "Choose how to act.",
      options: [
        { id: "aid", label: "Aid", summary: "Help", moralityDelta: 3, effectBundle: {} },
        { id: "loot", label: "Loot", summary: "Exploit", moralityDelta: -3, effectBundle: {} },
      ],
    },
  };

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [
          {
            actionId: "cultivate",
            label: "Cultivate",
            description: "Baseline action.",
            durationTicks: 3,
            kind: "timed" as const,
          },
        ];
      },
      async readWorld() {
        return world;
      },
    } as never,
    agent: createAgentProfile(cultivator.id),
  });

  assert.equal(
    payload.actions.filter((action) => action.actionId === ("resolve-morality-event-choice" as never)).length,
    1,
  );
});

test("application package exports morality event workflow helpers", () => {
  const api = application as typeof application & {
    readAuthenticatedPendingMoralityChoice?: unknown;
    chooseAuthenticatedMoralityChoice?: unknown;
  };

  assert.equal(typeof api.readAuthenticatedPendingMoralityChoice, "function");
  assert.equal(typeof api.chooseAuthenticatedMoralityChoice, "function");
});
