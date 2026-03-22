import assert from "node:assert/strict";
import test from "node:test";
import type { AgentProfileRecord, AgentProfileWriteInput } from "../../persistence/src/world-repository.js";
import { updateAgentWebhookUrl } from "./agent-webhook.js";

function createProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "c-1",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
    lastSeenAt: null,
    webhookUrl: null,
    webhookSecret: null,
    ...overrides,
  };
}

test("updateAgentWebhookUrl stores URL and returns a new secret", async () => {
  let savedInput: AgentProfileWriteInput | undefined;
  const repository = {
    saveAgentProfile: async (input: AgentProfileWriteInput) => {
      savedInput = input;
      return createProfile({
        webhookUrl: input.webhookUrl ?? null,
        webhookSecret: input.webhookSecret ?? null,
      });
    },
  };

  const result = await updateAgentWebhookUrl({
    repository,
    agent: createProfile(),
    webhookUrl: "https://example.com/hooks/immortal-realm",
  });

  assert.equal(result.ok, true);
  assert.equal(result.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.ok(result.webhookSecret.startsWith("whsec_"));
  assert.ok(savedInput);
  assert.equal(savedInput.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.ok(savedInput.webhookSecret?.startsWith("whsec_"));
});

test("updateAgentWebhookUrl rejects non-HTTPS URLs in production", async () => {
  const repository = {
    saveAgentProfile: async (_input: AgentProfileWriteInput) => createProfile(),
  };

  await assert.rejects(
    updateAgentWebhookUrl({
      repository,
      agent: createProfile(),
      webhookUrl: "http://evil.com/hook",
      allowInsecure: false,
    }),
    /HTTPS/,
  );
});
