import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.js";
import { createApp } from "./app.js";
import { createInMemoryWorldRepository } from "../../../packages/persistence/src/index.js";
import { LOCAL_VITE_PREVIEW_ORIGIN } from "./env.js";

function createRepository() {
  return createInMemoryWorldRepository();
}

test("health route returns ok", async () => {
  const app = createApp({ repository: createRepository() });

  const response = await app.request("https://runtime.test/health");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true });
});

test("public onboarding docs are exposed as markdown", async () => {
  const app = createApp({ repository: createRepository() });

  const skillResponse = await app.request("https://runtime.test/skill.md");
  const registerResponse = await app.request("https://runtime.test/register.md");
  const heartbeatResponse = await app.request("https://runtime.test/heartbeat.md");

  assert.equal(skillResponse.status, 200);
  assert.match(String(skillResponse.headers.get("content-type")), /text\/markdown/);
  assert.match(
    await skillResponse.text(),
    /Immortal Claw: A Persistent Cultivation World for AI Agents/i,
  );

  assert.equal(registerResponse.status, 200);
  assert.match(await registerResponse.text(), /POST \/agent\/register/);

  assert.equal(heartbeatResponse.status, 200);
  assert.match(await heartbeatResponse.text(), /Immortal Claw Heartbeat Guide/i);
});

test("worker fetch allows the local vite origin", async () => {
  const response = await worker.fetch(
    new Request("https://runtime.test/health", {
      headers: {
        origin: "http://localhost:5173",
      },
    }),
    {
      FRONTEND_ORIGIN: "https://immortal-claw.pages.dev",
      REPOSITORY: createRepository(),
    } as never,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
});

test("worker fetch allows the local vite preview origin", async () => {
  const response = await worker.fetch(
    new Request("https://runtime.test/health", {
      headers: {
        origin: LOCAL_VITE_PREVIEW_ORIGIN,
      },
    }),
    {
      FRONTEND_ORIGIN: "https://immortal-claw.pages.dev",
      REPOSITORY: createRepository(),
    } as never,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), LOCAL_VITE_PREVIEW_ORIGIN);
});

test("state route returns cultivator state", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  const app = createApp({ repository });

  const response = await app.request(`https://runtime.test/cultivator/state?cultivatorId=${cultivatorId}`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.cultivator.id, cultivatorId);
});

test("agent registration issues an api key and authenticated state uses the bound cultivator", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentId: "openclaw-main",
      name: "Su Mingyue",
      llmProvider: "openai",
      llmModelName: "gpt-5",
    }),
  });
  const registerPayload = await registerResponse.json();

  assert.equal(registerResponse.status, 200);
  assert.equal(registerPayload.agentId, "openclaw-main");
  assert.equal(typeof registerPayload.apiKey, "string");
  assert.equal(typeof registerPayload.selectedCultivatorId, "string");

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.apiKey}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.agentId, "openclaw-main");
  assert.equal(statePayload.cultivator.id, registerPayload.selectedCultivatorId);
});

test("registered agents can fetch actions and execute a real first move", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentId: "openclaw-player",
      name: "Player One",
      startingPath: "sword",
    }),
  });
  const registerPayload = await registerResponse.json();
  const authHeaders = {
    authorization: `Bearer ${registerPayload.apiKey}`,
  };

  const actionsResponse = await app.request("https://runtime.test/agent/actions", {
    headers: authHeaders,
  });
  const actionsPayload = await actionsResponse.json();
  const cultivateAction = actionsPayload.actions.find((action: { actionId: string }) => action.actionId === "cultivate");

  assert.equal(actionsResponse.status, 200);
  assert.ok(Array.isArray(actionsPayload.actions));
  assert.ok(cultivateAction);

  const actResponse = await app.request("https://runtime.test/agent/act", {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      actionId: cultivateAction.actionId,
    }),
  });
  const actPayload = await actResponse.json();

  assert.equal(actResponse.status, 200);
  assert.equal(actPayload.actionId, "cultivate");
  assert.equal(actPayload.accepted, true);

  const busyStateResponse = await app.request("https://runtime.test/agent/state", {
    headers: authHeaders,
  });
  const busyStatePayload = await busyStateResponse.json();

  assert.equal(busyStateResponse.status, 200);
  assert.equal(busyStatePayload.cultivator.status, "busy");
  assert.equal(busyStatePayload.currentJob?.actionId, "cultivate");

  const tickResponse = await app.request("https://runtime.test/agent/tick", {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      steps: 4,
    }),
  });

  assert.equal(tickResponse.status, 200);

  const completedStateResponse = await app.request("https://runtime.test/agent/state", {
    headers: authHeaders,
  });
  const completedStatePayload = await completedStateResponse.json();

  assert.equal(completedStateResponse.status, 200);
  assert.equal(completedStatePayload.cultivator.status, "idle");
  assert.equal(completedStatePayload.currentJob, null);
  assert.ok(completedStatePayload.tick >= 4);
});

test("agent routes reject missing authorization", async () => {
  const app = createApp({ repository: createRepository() });

  const response = await app.request("https://runtime.test/agent/state");
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.match(payload.error, /Bearer/);
});

test("actions route returns available actions", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  const app = createApp({ repository });

  const response = await app.request(`https://runtime.test/cultivator/actions?cultivatorId=${cultivatorId}`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.cultivatorId, cultivatorId);
  assert.ok(Array.isArray(payload.actions));
  assert.ok(payload.actions.length > 0);
});

test("act route performs an action", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  const app = createApp({ repository });

  const response = await app.request("https://runtime.test/cultivator/act", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ cultivatorId, actionId: "cultivate" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.cultivatorId, cultivatorId);
  assert.equal(payload.actionId, "cultivate");
  assert.equal(payload.accepted, true);
});

test("scheduled tick advances the world through the worker entrypoint", async () => {
  const repository = createRepository();
  const before = await repository.readWorld();

  await worker.scheduled(
    {
      cron: "* * * * *",
      scheduledTime: Date.now(),
      type: "scheduled",
    } as never,
    {
      REPOSITORY: repository,
    } as never,
    {
      waitUntil() {
        return undefined;
      },
    } as never,
  );

  const after = await repository.readWorld();
  assert.ok(after.tick > before.tick);
});
