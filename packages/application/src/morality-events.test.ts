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
      title: "学徒的篮子",
      prompt: "这一筐要不要送下去。",
      options: [
        { id: "deliver", label: "把整筐送下去", summary: "送到棚里。", moralityDelta: 3, effectBundle: {} },
        { id: "skim-herbs", label: "拿走好的那几株", summary: "好叶子不在了。", moralityDelta: -3, effectBundle: {} },
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

  const hints = payload.actions.filter((action) => action.actionId === ("resolve-morality-event-choice" as never));
  assert.equal(hints.length, 1);
  const hint = hints[0]!;
  assert.equal(hint.label, "道心岔路待选");
  assert.match(hint.description, /学徒的篮子/);
  assert.match(hint.description, /把整筐送下去/);
  assert.match(hint.description, /拿走好的那几株/);
  assert.match(hint.description, /道心/);
  assert.equal(hint.label.includes("/agent/"), false);
  assert.equal(hint.description.includes("/agent/"), false);
  assert.equal(hint.description.includes("POST"), false);
  assert.equal(hint.description.includes("choiceId"), false);
  assert.equal(hint.description.includes("optionId"), false);
  assert.equal(hint.description.includes("deliver"), false);
  assert.equal(hint.description.includes("skim-herbs"), false);
  assert.deepEqual(hint.routing, {
    path: "/agent/events/choose",
    choiceId: "choice-1",
    optionIds: ["deliver", "skim-herbs"],
  });
});

test("application package exports morality event workflow helpers", () => {
  const api = application as typeof application & {
    readAuthenticatedPendingMoralityChoice?: unknown;
    chooseAuthenticatedMoralityChoice?: unknown;
  };

  assert.equal(typeof api.readAuthenticatedPendingMoralityChoice, "function");
  assert.equal(typeof api.chooseAuthenticatedMoralityChoice, "function");
});
