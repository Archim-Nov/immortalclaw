import assert from "node:assert/strict";
import test from "node:test";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { resetAuthenticatedAgentCredential } from "./agent-credential.js";

function createAgentProfile(): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-9",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
  };
}

test("resetAuthenticatedAgentCredential formats the reset response in application", async () => {
  const calls: { agentId?: string; currentCredential?: string } = {};

  const payload = await resetAuthenticatedAgentCredential({
    auth: {
      async resetAgentCredential(agentId, currentCredential) {
        calls.agentId = agentId;
        calls.currentCredential = currentCredential;
        return {
          agentId,
          credential: "immortal_sk_new",
        };
      },
    },
    agent: createAgentProfile(),
    currentCredential: "immortal_sk_old",
  });

  assert.equal(calls.agentId, "agent-1");
  assert.equal(calls.currentCredential, "immortal_sk_old");
  assert.equal(payload.ok, true);
  assert.equal(payload.agentId, "agent-1");
  assert.equal(payload.credential, "immortal_sk_new");
  assert.match(payload.message, /Save the new credential now/i);
});
