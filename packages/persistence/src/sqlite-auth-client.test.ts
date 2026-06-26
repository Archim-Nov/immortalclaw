import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createSqliteAuthClient } from "./sqlite-auth-client.js";
import type { SqliteDatabaseLike } from "./sqlite-schema.js";

function createClient(now?: () => string) {
  const db = new DatabaseSync(":memory:");
  const auth = createSqliteAuthClient({
    database: db as unknown as SqliteDatabaseLike,
    now,
  });
  return { db, auth };
}

function sequentialClock() {
  let tick = 0;
  return () => `2026-03-10T00:00:0${tick++}Z`;
}

test("saveAgentProfile persists profiles and listAgentProfiles returns them", async () => {
  const { auth } = createClient();

  const profile = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
    origin: "Frost Harbor",
  });
  const listed = await auth.listAgentProfiles();
  const fetched = await auth.getAgentProfile("agent-1");

  assert.equal(profile.agentId, "agent-1");
  assert.equal(profile.origin, "Frost Harbor");
  assert.equal(listed.length, 1);
  assert.equal(fetched?.selectedCultivatorId, "cultivator-1");
  assert.equal(await auth.getAgentProfile("missing"), null);
});

test("saveAgentProfile validates required fields", async () => {
  const { auth } = createClient();
  await assert.rejects(
    () => auth.saveAgentProfile({ agentId: "  ", name: "x", selectedCultivatorId: "c" }),
    /agentId is required/,
  );
  await assert.rejects(
    () => auth.saveAgentProfile({ agentId: "a", name: "  ", selectedCultivatorId: "c" }),
    /requires a name/,
  );
  await assert.rejects(
    () => auth.saveAgentProfile({ agentId: "a", name: "x", selectedCultivatorId: "  " }),
    /selectedCultivatorId is required/,
  );
});

test("saveAgentProfile preserves createdAt and merges webhook on update", async () => {
  const { auth } = createClient(sequentialClock());

  const first = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
    webhookUrl: "https://hooks.example/agent-1",
  });
  const second = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Renamed",
    selectedCultivatorId: "cultivator-1",
  });

  assert.equal(second.createdAt, first.createdAt);
  assert.notEqual(second.updatedAt, first.updatedAt);
  assert.equal(second.name, "Su Renamed");
  assert.equal(second.webhookUrl, "https://hooks.example/agent-1");
});

test("issueAgentCredential issues an immortal_sk_ credential that authenticates", async () => {
  const { auth } = createClient();
  await auth.saveAgentProfile({ agentId: "agent-1", name: "Su", selectedCultivatorId: "cultivator-1" });

  const { credential } = await auth.issueAgentCredential("agent-1");
  assert.match(credential, /^immortal_sk_[0-9a-f]{32}$/);
  assert.equal((await auth.authenticateAgent(credential))?.agentId, "agent-1");
});

test("issuing a new credential revokes the previous one", async () => {
  const { auth } = createClient();
  await auth.saveAgentProfile({ agentId: "agent-1", name: "Su", selectedCultivatorId: "cultivator-1" });

  const first = await auth.issueAgentCredential("agent-1");
  const second = await auth.issueAgentCredential("agent-1");

  assert.equal(await auth.authenticateAgent(first.credential), null);
  assert.equal((await auth.authenticateAgent(second.credential))?.agentId, "agent-1");
});

test("issueAgentCredential throws for an unknown agent", async () => {
  const { auth } = createClient();
  await assert.rejects(() => auth.issueAgentCredential("ghost"), /Agent not found/);
});

test("resetAgentCredential rotates with correct current and rejects wrong/revoked", async () => {
  const { auth } = createClient();
  await auth.saveAgentProfile({ agentId: "agent-1", name: "Su", selectedCultivatorId: "cultivator-1" });

  const issued = await auth.issueAgentCredential("agent-1");
  const reset = await auth.resetAgentCredential("agent-1", issued.credential);

  assert.match(reset.credential, /^immortal_sk_/);
  assert.equal(await auth.authenticateAgent(issued.credential), null);
  assert.equal((await auth.authenticateAgent(reset.credential))?.agentId, "agent-1");

  // the now-revoked old credential can no longer be used as "current"
  await assert.rejects(() => auth.resetAgentCredential("agent-1", issued.credential), /does not belong/);
  // an unrelated credential string is rejected
  await assert.rejects(() => auth.resetAgentCredential("agent-1", "immortal_sk_wrong"), /does not belong/);
});

test("authenticateAgent returns null for empty/unknown credentials", async () => {
  const { auth } = createClient();
  assert.equal(await auth.authenticateAgent("   "), null);
  assert.equal(await auth.authenticateAgent("immortal_sk_unknown"), null);
});

test("touchAgent updates the credential last_seen_at surfaced by authenticate", async () => {
  const { auth } = createClient(sequentialClock());
  await auth.saveAgentProfile({ agentId: "agent-1", name: "Su", selectedCultivatorId: "cultivator-1" });
  const issued = await auth.issueAgentCredential("agent-1");

  await auth.touchAgent("agent-1");
  const profile = await auth.authenticateAgent(issued.credential);
  // last_seen_at advanced past the issue timestamp via the sequential clock
  assert.ok(profile?.lastSeenAt && profile.lastSeenAt > "2026-03-10T00:00:01Z");
});

test("listAgentProfiles orders by updated_at desc", async () => {
  const { auth } = createClient(sequentialClock());
  await auth.saveAgentProfile({ agentId: "agent-1", name: "A", selectedCultivatorId: "c1" });
  await auth.saveAgentProfile({ agentId: "agent-2", name: "B", selectedCultivatorId: "c2" });

  const list = await auth.listAgentProfiles();
  assert.deepEqual(
    list.map((profile) => profile.agentId),
    ["agent-2", "agent-1"],
  );
});
