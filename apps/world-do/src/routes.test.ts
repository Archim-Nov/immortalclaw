import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "@immortal-claw/domain";
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
  const heartbeatResponse = await app.request("https://runtime.test/heartbeat.md");

  assert.equal(skillResponse.status, 200);
  assert.match(String(skillResponse.headers.get("content-type")), /text\/markdown/);
  assert.match(await skillResponse.text(), /first breakthrough|neutral sect/i);

  assert.equal(registerResponse.status, 200);
  assert.match(await registerResponse.text(), /Qingzhou|Yangzhou|Wanzhou/);

  assert.equal(heartbeatResponse.status, 200);
  assert.match(await heartbeatResponse.text(), /neutral-duty|first breakthrough/i);
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

test("legacy tribulation routes are no longer exposed", async () => {
  const app = createTestApp();

  const cultivatorResponse = await app.request("https://runtime.test/cultivator/tribulation?cultivatorId=seed-cultivator");
  const agentResponse = await app.request("https://runtime.test/agent/tribulation");

  assert.equal(cultivatorResponse.status, 404);
  assert.equal(agentResponse.status, 404);
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

test("agent sect route returns neutral organization info after joining a neutral sect", async () => {
  const app = createTestApp();
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Neutral Path" })),
  });
  const registerPayload = await registerResponse.json() as RegistrationResponse;

  const actionsResponse = await app.request("https://runtime.test/agent/actions", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const actionsPayload = await actionsResponse.json() as { actions: Array<{ actionId: string }> };
  const joinNeutralAction = actionsPayload.actions.find((action) => action.actionId.startsWith("join-neutral-sect:"));

  assert.ok(joinNeutralAction);

  const actResponse = await app.request("https://runtime.test/agent/act", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ actionId: joinNeutralAction!.actionId }),
  });

  assert.equal(actResponse.status, 200);

  const organizationResponse = await app.request("https://runtime.test/agent/sect", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const organization = await organizationResponse.json() as { organizationType: string; id: string };

  assert.equal(organizationResponse.status, 200);
  assert.equal(organization.organizationType, "neutral");
  assert.match(organization.id, /cang-mu-gu|ting-chao-ge|wan-xiang-lou/);
});

test("seeded world helper stays available for lifecycle tests", () => {
  const world = createSeedWorld();
  assert.ok(Object.keys(world.cultivators).length > 0);
});
