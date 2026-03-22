import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, syncCultivatorFromPersona } from "../../domain/src/runtime.js";
import type { TickSummary } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import {
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

test("resolveMessageWebhookTarget returns null when recipient has no webhook", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId, webhookUrl: null })];

  const target = resolveMessageWebhookTarget(world, sync.selectedCultivatorId, "Someone", 5, profiles);
  assert.equal(target, null);
});
