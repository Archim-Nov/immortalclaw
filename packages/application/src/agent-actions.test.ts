import assert from "node:assert/strict";
import test from "node:test";
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

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions(cultivatorId) {
        calls.cultivatorId = cultivatorId;
        return actions;
      },
      async readWorld() {
        return {
          cultivators: {},
          sects: {},
        } as never;
      },
    },
    agent: createAgentProfile(),
  });

  assert.equal(calls.cultivatorId, "cultivator-9");
  assert.equal(payload.agent.agentId, "agent-1");
  assert.equal(payload.cultivatorId, "cultivator-9");
  assert.deepEqual(payload.actions, actions);
});
