import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, syncCultivatorFromPersona } from "../../domain/src/runtime.js";
import type { TickSummary } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import {
  dispatchWebhooks,
  resolveMessageWebhookTarget,
  resolveWebhookTargets,
  signPayload,
} from "./webhook-dispatch.js";

function createProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "c-1",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
    lastSeenAt: null,
    webhookUrl: "https://example.com/hooks/immortal-realm",
    webhookSecret: "whsec_test",
    ...overrides,
  };
}

test("resolveWebhookTargets returns targets for completed jobs", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Meditation completed." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].agentId, "agent-1");
  assert.equal(targets[0].payload.event, "tick");
  assert.equal(targets[0].payload.tick, 10);
  assert.ok(targets[0].payload.reason.includes("Meditation completed."));
});

test("resolveWebhookTargets returns targets for tribulations", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 20,
    advancedTicks: 1,
    completedJobs: [],
    tribulations: [{ cultivatorId: sync.selectedCultivatorId, success: true, summary: "Survived tribulation." }],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].payload.event, "tribulation");
});

test("resolveWebhookTargets excludes agents without webhookUrl", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId, webhookUrl: null })];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Done." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 0);
});

test("resolveWebhookTargets excludes unrelated agents", () => {
  const world = createSeedWorld();
  syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const sync2 = syncCultivatorFromPersona(world, { agentId: "agent-2", name: "Li Aotian" });
  const profiles = [
    createProfile({ agentId: "agent-1", webhookUrl: "https://a.com/hook" }),
    createProfile({ agentId: "agent-2", selectedCultivatorId: sync2.selectedCultivatorId, webhookUrl: "https://b.com/hook" }),
  ];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync2.selectedCultivatorId, actionId: "meditate", summary: "Done." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].agentId, "agent-2");
});

test("resolveWebhookTargets returns multiple targets for multiple events", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 30,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Meditation done." }],
    tribulations: [{ cultivatorId: sync.selectedCultivatorId, success: false, summary: "Failed tribulation." }],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 2);
});

test("resolveMessageWebhookTarget returns target for recipient agent", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];

  const target = resolveMessageWebhookTarget(world, sync.selectedCultivatorId, "Su Mingyue", 5, profiles);
  assert.ok(target);
  assert.equal(target.agentId, "agent-1");
  assert.equal(target.payload.event, "message");
});

test("signPayload returns sha256= prefixed hex string", async () => {
  const sig = await signPayload('{"event":"tick"}', "test-secret");
  assert.ok(sig.startsWith("sha256="));
  assert.match(sig, /^sha256=[0-9a-f]{64}$/);
});

test("signPayload produces different signatures for different secrets", async () => {
  const body = '{"event":"tick"}';
  const sig1 = await signPayload(body, "secret-a");
  const sig2 = await signPayload(body, "secret-b");
  assert.notEqual(sig1, sig2);
});

test("dispatchWebhooks posts signed payloads and ignores delivery failures", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });

    if (String(input).includes("fail")) {
      throw new Error("network down");
    }

    return new Response(null, { status: 202 });
  };

  await dispatchWebhooks(
    [
      {
        agentId: "agent-1",
        webhookUrl: "https://example.com/hooks/immortal-realm",
        webhookSecret: "whsec_one",
        payload: {
          event: "tick",
          tick: 11,
          reason: "Your meditation completed.",
        },
      },
      {
        agentId: "agent-2",
        webhookUrl: "https://fail.example.com/hooks/immortal-realm",
        webhookSecret: "whsec_two",
        payload: {
          event: "message",
          tick: 12,
          reason: "You received a message from Xu Ling.",
        },
      },
    ],
    fetchImpl,
  );

  assert.equal(calls.length, 2);
  const successfulCall = calls.find((call) => call.url === "https://example.com/hooks/immortal-realm");
  assert.ok(successfulCall);
  assert.equal(successfulCall.init?.method, "POST");
  assert.equal(
    (successfulCall.init?.headers as Record<string, string>)["Content-Type"],
    "application/json",
  );
  assert.match(
    (successfulCall.init?.headers as Record<string, string>)["X-Immortal-Signature"],
    /^sha256=[0-9a-f]{64}$/,
  );
  assert.equal(
    successfulCall.init?.body,
    JSON.stringify({
      event: "tick",
      tick: 11,
      reason: "Your meditation completed.",
    }),
  );
});

test("dispatchWebhooks logs delivery failures at debug level", async () => {
  const messages: string[] = [];
  const fetchImpl: typeof fetch = async () => {
    throw new Error("socket hang up");
  };

  await dispatchWebhooks(
    [
      {
        agentId: "agent-2",
        webhookUrl: "https://fail.example.com/hooks/immortal-realm",
        webhookSecret: "whsec_two",
        payload: {
          event: "message",
          tick: 12,
          reason: "You received a message from Xu Ling.",
        },
      },
    ],
    fetchImpl,
    {
      debug(message) {
        messages.push(message);
      },
    },
  );

  assert.equal(messages.length, 1);
  assert.match(messages[0] ?? "", /agent-2/);
  assert.match(messages[0] ?? "", /socket hang up/);
});

test("resolveMessageWebhookTarget returns null when recipient has no webhook", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId, webhookUrl: null })];

  const target = resolveMessageWebhookTarget(world, sync.selectedCultivatorId, "Someone", 5, profiles);
  assert.equal(target, null);
});
