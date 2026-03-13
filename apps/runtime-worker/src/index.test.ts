import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRegistrationRecord } from "../../../packages/domain/src/runtime.js";
import worker from "./index.js";
import { createApp } from "./app.js";
import { createInMemoryWorldRepository } from "../../../packages/persistence/src/index.js";
import { LOCAL_VITE_PREVIEW_ORIGIN } from "./env.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createRepository() {
  return createInMemoryWorldRepository();
}

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "A",
      Q2: "B",
      Q3: "C",
      Q4: "D",
      Q5: "A",
      Q6: "B",
      Q7: "C",
      Q8: "D",
      Q9: "A",
      Q10: "B",
      Q11: "C",
      Q12: "D",
      Q13: "A",
      Q14: "B",
      Q15: "C",
      Q16: "D",
      Q17: "A",
      Q18: "B",
    },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      behavior_aspect: "Water / Observation",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 8,
      },
      spirit_root_result: "Water single root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator with clear water dominance.",
  };
}

function createRegistrationRecordV2(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v2",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
      Q4: "C",
      Q5: "C",
      Q6: "C",
      Q7: "C",
      Q8: "A",
      Q9: "C",
      Q10: "C",
      Q11: "C",
      Q12: "C",
      Q13: "B",
      Q14: "B",
      Q15: "B",
      Q16: "B",
      Q17: "C",
      Q18: "B",
    },
    result: {
      label_locale: "en",
      core_temperament_id: "qian_yuan",
      core_temperament: "",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator whose answers map cleanly onto the stable taxonomy ids.",
  };
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

test("agent registration response uses the credential contract", async () => {
  const app = createApp({
    repository: {
      async registerAgent() {
        return {
          agentId: "6c3ee3f8-d64f-425d-9617-f633660fb22c",
          name: "Su Mingyue",
          selectedCultivatorId: "cultivator-9",
          createdAt: "2026-03-12T00:00:00.000Z",
          updatedAt: "2026-03-12T00:00:00.000Z",
          lastSeenAt: "2026-03-12T00:00:00.000Z",
          credential: "immortal_sk_contract",
          createdCultivator: true,
        };
      },
    } as never,
  });

  const response = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Su Mingyue",
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(payload.agentId, UUID_SHAPE);
  assert.equal(typeof payload.credential, "string");
  assert.equal(Object.hasOwn(payload, "credential"), true);
  assert.equal(Object.hasOwn(payload, "apiKey"), false);
  assert.equal(payload.registration, null);
  assert.equal(payload.registrationEffects, null);
});

test("agent registration can save a canonical registration record in the same call", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Su Mingyue",
      record: createRegistrationRecord(),
    }),
  });
  const registerPayload = await registerResponse.json();

  assert.equal(registerResponse.status, 200);
  assert.equal(registerPayload.registration?.core_temperament, "Calm strategist");
  assert.ok(registerPayload.registrationEffects);
  assert.ok(registerPayload.registrationEffects?.dominantElements.some((element: { id: string }) => element.id === "water"));
  assert.match(registerPayload.message, /cultivation record saved/i);

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.registration?.core_temperament, "Calm strategist");
  assert.ok(statePayload.registrationEffects);
});

test("agent registration accepts v2 taxonomy ids and surfaces localized labels", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Lin Xianlan",
      record: createRegistrationRecordV2(),
    }),
  });
  const registerPayload = await registerResponse.json();

  assert.equal(registerResponse.status, 200);
  assert.equal(registerPayload.registration?.label_locale, "en");
  assert.equal(registerPayload.registration?.core_temperament_id, "qian_yuan");
  assert.equal(registerPayload.registration?.core_temperament, "Calm strategist");
  assert.equal(registerPayload.registration?.behavior_aspect_id, "water-earth");
  assert.equal(registerPayload.registration?.behavior_aspect, "Water-Earth / Latent Guard");
  assert.equal(registerPayload.registration?.cultivation_motive_id, "seek-truth");
  assert.equal(registerPayload.registration?.spirit_root_kind_id, "dual-root");
  assert.equal(registerPayload.registration?.spirit_root_result, "Water-Earth dual root");

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.registration?.label_locale, "en");
  assert.equal(statePayload.registration?.core_temperament_id, "qian_yuan");
  assert.equal(statePayload.registration?.spirit_root_kind_id, "dual-root");
});

test("agent registration ignores caller-supplied identity and authenticated state uses the bound cultivator", async () => {
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
    }),
  });
  const registerPayload = await registerResponse.json();

  assert.equal(registerResponse.status, 200);
  assert.match(registerPayload.agentId, UUID_SHAPE);
  assert.notEqual(registerPayload.agentId, "openclaw-main");
  assert.equal(typeof registerPayload.credential, "string");
  assert.equal(typeof registerPayload.selectedCultivatorId, "string");

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.agentId, registerPayload.agentId);
  assert.equal(statePayload.cultivator.id, registerPayload.selectedCultivatorId);
});

test("public world agent directory returns registered agents with current cultivator state", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agentId: "openclaw-main",
      name: "Su Mingyue",
    }),
  });

  const response = await app.request("https://runtime.test/world/agents");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(payload.agents));
  assert.equal(payload.agents.length, 1);
  assert.match(String(payload.agents[0]?.agentId), UUID_SHAPE);
  assert.equal(payload.agents[0]?.name, "Su Mingyue");
  assert.equal(payload.agents[0]?.cultivator.name, "Su Mingyue");
  assert.equal(typeof payload.agents[0]?.cultivator.location, "string");
});

test("credential reset revokes the previous credential and keeps the bound cultivator", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Su Mingyue",
    }),
  });
  const registerPayload = await registerResponse.json();

  const resetResponse = await app.request("https://runtime.test/agent/credential/reset", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const resetPayload = await resetResponse.json();

  assert.equal(resetResponse.status, 200);
  assert.equal(resetPayload.agentId, registerPayload.agentId);
  assert.equal(typeof resetPayload.credential, "string");
  assert.notEqual(resetPayload.credential, registerPayload.credential);

  const staleStateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const staleStatePayload = await staleStateResponse.json();
  assert.equal(staleStateResponse.status, 401);
  assert.equal(staleStatePayload.error, "Invalid or expired credential.");

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${resetPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.agentId, registerPayload.agentId);
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
    authorization: `Bearer ${registerPayload.credential}`,
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
  assert.equal(payload.error, "Invalid or expired credential.");
});

test("agent routes reject malformed authorization with the same generic error", async () => {
  const app = createApp({ repository: createRepository() });

  const response = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: "Token definitely-not-valid",
    },
  });
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.error, "Invalid or expired credential.");
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
