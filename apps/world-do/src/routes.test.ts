import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../../packages/domain/src/runtime.js";
import { createTestApp, createQuestionnaireRegistrationBody } from "./test-helpers.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RegistrationResponse {
  agentId: string;
  credential: string;
}

interface AgentStateResponse {
  agent: {
    agentId: string;
  };
}

interface WorldStatusResponse {
  ok: boolean;
  tick: number;
  lastTickAt: string;
}

interface WorldAgentsResponse {
  agents: unknown[];
}

test("health route returns ok", async () => {
  const app = createTestApp();
  const response = await app.request("https://runtime.test/health");
  const payload = await response.json() as { ok: boolean };

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true });
});

test("public onboarding docs are exposed as markdown", async () => {
  const app = createTestApp();

  const skillResponse = await app.request("https://runtime.test/skill.md");
  const registerResponse = await app.request("https://runtime.test/register.md");

  assert.equal(skillResponse.status, 200);
  assert.match(String(skillResponse.headers.get("content-type")), /text\/markdown/);
  assert.match(await skillResponse.text(), /Immortal Claw: A Persistent Cultivation World for AI Agents/i);

  assert.equal(registerResponse.status, 200);
  assert.match(await registerResponse.text(), /POST \/agent\/register/);
});

test("registration returns a credential and state route accepts it", async () => {
  const app = createTestApp();
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const registerPayload = await registerResponse.json() as RegistrationResponse;

  assert.equal(registerResponse.status, 200);
  assert.match(registerPayload.agentId, UUID_SHAPE);
  assert.equal(typeof registerPayload.credential, "string");

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json() as AgentStateResponse;

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.agentId, registerPayload.agentId);
});

test("world status exposes tick metadata", async () => {
  const app = createTestApp({
    world: {
      async getWorldMetadata() {
        return {
          tick: 12,
          updatedAt: "2026-03-23T00:00:00.000Z",
        };
      },
    },
  });
  const response = await app.request("https://runtime.test/world/status");
  const payload = await response.json() as WorldStatusResponse;

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true, tick: 12, lastTickAt: "2026-03-23T00:00:00.000Z" });
});

test("agent message route rejects missing authorization", async () => {
  const app = createTestApp();
  const response = await app.request("https://runtime.test/agent/messages");
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 401);
  assert.equal(payload.error, "Invalid or expired credential.");
});

test("world agent directory returns registered agents", async () => {
  const app = createTestApp();
  await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });

  const response = await app.request("https://runtime.test/world/agents");
  const payload = await response.json() as WorldAgentsResponse;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.agents));
  assert.equal(payload.agents.length, 1);
});

test("seeded world helper stays available for lifecycle tests", () => {
  const world = createSeedWorld();
  assert.ok(Object.keys(world.cultivators).length > 0);
});
