import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRegistrationRecord } from "../../../packages/domain/src/runtime.js";
import { createSeedWorld } from "../../../packages/domain/src/runtime.js";
import worker from "./index.js";
import { createApp } from "./app.js";
import { createInMemoryWorldRepository } from "../../../packages/persistence/src/index.js";
import { LOCAL_VITE_PREVIEW_ORIGIN } from "./env.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createRepository() {
  return createInMemoryWorldRepository();
}

function assertBalancedMainAttributes(mainAttributes: Record<string, number>) {
  assert.equal(Object.keys(mainAttributes).length, 8);
  assert.equal(Object.values(mainAttributes).reduce((sum, value) => sum + value, 0), 400);
  assert.ok(Object.values(mainAttributes).every((value) => value >= 30 && value <= 70));
}

function assertDetailedAttributesFollowFormula(
  mainAttributes: Record<string, number>,
  detailedAttributes: Record<string, number>,
) {
  assert.equal(Object.keys(detailedAttributes).length, 15);
  assert.equal(
    detailedAttributes.qixue_shangxian,
    200 + 8 * mainAttributes.tipu + 2 * mainAttributes.gengu + 2 * mainAttributes.daoxin,
  );
  assert.equal(
    detailedAttributes.lingli_shangxian,
    120 + 8 * mainAttributes.lingyuan + 2 * mainAttributes.gengu + 2 * mainAttributes.shenshi,
  );
  assert.equal(
    detailedAttributes.lingli_huifu,
    Math.round((2 + 0.10 * mainAttributes.gengu + 0.08 * mainAttributes.lingyuan + 0.05 * mainAttributes.daoxin) * 100) / 100,
  );
  assert.equal(
    detailedAttributes.kongzhi_qiangdu,
    Math.round((0.55 * mainAttributes.shenshi + 0.25 * mainAttributes.wuxing + 0.20 * mainAttributes.lingyuan) * 100) / 100,
  );
  assert.equal(
    detailedAttributes.huxin,
    Math.round((0.06 * mainAttributes.daoxin + 0.04 * mainAttributes.tipu + 0.02 * mainAttributes.gengu) * 100) / 100,
  );
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

function createQuestionnaireAnswers() {
  return {
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
  } as const;
}

function createQuestionnaireRegistrationBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    answers: createQuestionnaireAnswers(),
    ...overrides,
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

test("public registration questionnaire endpoint returns the canonical 18 questions", async () => {
  const app = createApp({ repository: createRepository() });

  const response = await app.request("https://runtime.test/agent/register/questions");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.version, "immortal-claw-oc-v2");
  assert.equal(payload.questions.length, 18);
  assert.equal(payload.questions[0]?.id, "Q1");
  assert.equal(payload.questions[17]?.id, "Q18");
  assert.equal(payload.questions[0]?.options.length, 4);
  assert.equal(payload.questions[0]?.options[0]?.id, "A");
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
  const app = createApp({ repository: createRepository() });

  const response = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(payload.agentId, UUID_SHAPE);
  assert.equal(typeof payload.credential, "string");
  assert.equal(Object.hasOwn(payload, "credential"), true);
  assert.equal(Object.hasOwn(payload, "apiKey"), false);
  assert.ok(payload.registration);
  assert.ok(payload.registrationEffects);
  assert.ok(payload.registrationProfile);
});

test("agent registration requires questionnaire completion", async () => {
  const app = createApp({ repository: createRepository() });

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

  assert.equal(response.status, 400);
  assert.match(String(payload.error), /questionnaire/i);
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
  assertBalancedMainAttributes(statePayload.mainAttributes);
  assert.ok(statePayload.mainAttributes.daoxin > 50);
  assert.ok(statePayload.mainAttributes.shenshi > 50);
  assert.ok(statePayload.mainAttributes.bingpo < 50);
  assertDetailedAttributesFollowFormula(statePayload.mainAttributes, statePayload.detailedAttributes);
  assert.deepEqual(statePayload.fiveElementScores, { metal: 5, wood: 6, water: 11, fire: 3, earth: 8 });
});

test("agent registration can derive and save a canonical registration record from questionnaire answers", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Questionnaire Agent" })),
  });
  const registerPayload = await registerResponse.json();

  assert.equal(registerResponse.status, 200);
  assert.equal(registerPayload.registration?.core_temperament_id, "qian_yuan");
  assert.equal(registerPayload.registration?.spirit_root_result, "\u6c34\u571f\u53cc\u7075\u6839");
  assert.ok(registerPayload.registrationEffects);
  assert.equal(registerPayload.registrationProfile?.summary?.length > 0, true);
  assert.equal(registerPayload.registrationProfile?.coreTemperament?.id, "qian_yuan");
  assert.equal(registerPayload.registrationProfile?.behaviorAspect?.id, "water-earth");
  assert.deepEqual(registerPayload.registrationProfile?.fiveElementScores, {
    metal: 5,
    wood: 6,
    water: 11,
    fire: 3,
    earth: 9,
  });
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
    body: JSON.stringify(
      createQuestionnaireRegistrationBody({
        agentId: "openclaw-main",
        name: "Su Mingyue",
      }),
    ),
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
    body: JSON.stringify(
      createQuestionnaireRegistrationBody({
        agentId: "openclaw-main",
        name: "Su Mingyue",
      }),
    ),
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
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
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

test("authenticated persona sync updates the bound agent profile and cultivator identity", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Original Name" })),
  });
  const registerPayload = await registerResponse.json();

  const syncResponse = await app.request("https://runtime.test/agent/sync-persona", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Updated Persona",
      origin: "Cloudstep Ferry",
      temperament: "Sharper than before.",
    }),
  });
  const syncPayload = await syncResponse.json();

  assert.equal(syncResponse.status, 200);
  assert.equal(syncPayload.agentId, registerPayload.agentId);

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json();

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.name, "Updated Persona");
  assert.equal(statePayload.cultivator.name, "Updated Persona");
  assert.equal(statePayload.cultivator.origin, "Cloudstep Ferry");
  assert.equal(statePayload.cultivator.temperament, "Sharper than before.");
});

test("registered agents can fetch actions and execute a real first move", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(
      createQuestionnaireRegistrationBody({
        agentId: "openclaw-player",
        name: "Player One",
      }),
    ),
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

test("registered agents can send a private message to another agent", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const senderResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const senderPayload = await senderResponse.json();

  const recipientResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Li Aotian" })),
  });
  const recipientPayload = await recipientResponse.json();

  const sendResponse = await app.request("https://runtime.test/agent/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${senderPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      toAgentId: recipientPayload.agentId,
      content: "Meet me at the sect gate before the next tick.",
    }),
  });
  const sendPayload = await sendResponse.json();

  assert.equal(sendResponse.status, 200);
  assert.equal(sendPayload.ok, true);
  assert.equal(sendPayload.message.from, "Su Mingyue");
  assert.equal(sendPayload.message.toCultivatorId, recipientPayload.selectedCultivatorId);

  const senderMessagesResponse = await app.request("https://runtime.test/agent/messages", {
    headers: {
      authorization: `Bearer ${senderPayload.credential}`,
    },
  });
  const senderMessagesPayload = await senderMessagesResponse.json();

  const recipientMessagesResponse = await app.request("https://runtime.test/agent/messages", {
    headers: {
      authorization: `Bearer ${recipientPayload.credential}`,
    },
  });
  const recipientMessagesPayload = await recipientMessagesResponse.json();

  assert.equal(senderMessagesResponse.status, 200);
  assert.equal(recipientMessagesResponse.status, 200);
  assert.ok(senderMessagesPayload.some((message: { id: string }) => message.id === sendPayload.message.id));
  assert.ok(recipientMessagesPayload.some((message: { id: string }) => message.id === sendPayload.message.id));
});

test("agent message route rejects missing recipient identifiers", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const registerPayload = await registerResponse.json();

  const sendResponse = await app.request("https://runtime.test/agent/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      content: "This should fail.",
    }),
  });
  const sendPayload = await sendResponse.json();

  assert.equal(sendResponse.status, 400);
  assert.match(sendPayload.error, /toAgentId or toCultivatorId/i);
});

test("agent message route rejects targets without a selected cultivator", async () => {
  const seededWorld = createSeedWorld();
  seededWorld.cultivators = {
    "cultivator-self": seededWorld.cultivators[Object.keys(seededWorld.cultivators)[0]!]!,
  };
  seededWorld.cultivators["cultivator-self"] = {
    ...seededWorld.cultivators["cultivator-self"],
    id: "cultivator-self",
  };

  const app = createApp({
    repository: {
      async authenticateAgent() {
        return {
          agentId: "agent-self",
          name: "Su Mingyue",
          selectedCultivatorId: "cultivator-self",
          createdAt: "2026-03-13T00:00:00.000Z",
          updatedAt: "2026-03-13T00:00:00.000Z",
          lastSeenAt: "2026-03-13T00:00:00.000Z",
        };
      },
      async touchAgent() {},
      async listAgentProfiles() {
        return [
          {
            agentId: "missing-target",
            name: "Broken Target",
            selectedCultivatorId: "",
            createdAt: "2026-03-13T00:00:00.000Z",
            updatedAt: "2026-03-13T00:00:00.000Z",
            lastSeenAt: "2026-03-13T00:00:00.000Z",
          },
        ];
      },
      async readWorld() {
        return seededWorld;
      },
    } as never,
  });

  const response = await app.request("https://runtime.test/agent/messages", {
    method: "POST",
    headers: {
      authorization: "Bearer immortal_sk_test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      toAgentId: "missing-target",
      content: "test",
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.match(payload.error, /Agent has no selected cultivator: missing-target/);
});

test("agent message route rejects stale targets whose selected cultivator is missing from world state", async () => {
  const seededWorld = createSeedWorld();
  seededWorld.cultivators = {
    "cultivator-self": seededWorld.cultivators[Object.keys(seededWorld.cultivators)[0]!]!,
  };
  seededWorld.cultivators["cultivator-self"] = {
    ...seededWorld.cultivators["cultivator-self"],
    id: "cultivator-self",
  };

  const app = createApp({
    repository: {
      async authenticateAgent() {
        return {
          agentId: "agent-self",
          name: "Su Mingyue",
          selectedCultivatorId: "cultivator-self",
          createdAt: "2026-03-13T00:00:00.000Z",
          updatedAt: "2026-03-13T00:00:00.000Z",
          lastSeenAt: "2026-03-13T00:00:00.000Z",
        };
      },
      async touchAgent() {},
      async listAgentProfiles() {
        return [
          {
            agentId: "stale-target",
            name: "Stale Target",
            selectedCultivatorId: "cultivator-missing",
            createdAt: "2026-03-13T00:00:00.000Z",
            updatedAt: "2026-03-13T00:00:00.000Z",
            lastSeenAt: "2026-03-13T00:00:00.000Z",
          },
        ];
      },
      async readWorld() {
        return seededWorld;
      },
    } as never,
  });

  const response = await app.request("https://runtime.test/agent/messages", {
    method: "POST",
    headers: {
      authorization: "Bearer immortal_sk_test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      toAgentId: "stale-target",
      content: "test",
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.match(payload.error, /Agent target is stale or missing from the world: stale-target/);
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

test("authenticated agent insight routes return world views for the bound cultivator", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  const sectId = Object.keys(world.sects)[0];

  if (!cultivatorId || !sectId) {
    throw new Error("Seed world should include at least one cultivator and one sect.");
  }

  world.tick = 24;
  world.cultivators[cultivatorId] = {
    ...world.cultivators[cultivatorId],
    sectId,
    sectTitle: "外门",
    totalContribution: 18,
  };
  world.sects[sectId] = {
    ...world.sects[sectId],
    memberIds: [...world.sects[sectId].memberIds, cultivatorId],
  };
  world.worldEvents.unshift({
    id: "event-keep",
    tick: 22,
    cultivatorId,
    zoneId: "qingzhou",
    title: "Keep",
    content: "Recent event",
    severity: "medium",
    tags: ["quest"],
  });
  world.worldEvents.unshift({
    id: "event-drop",
    tick: 12,
    cultivatorId,
    zoneId: "qingzhou",
    title: "Drop",
    content: "Old event",
    severity: "low",
    tags: ["old"],
  });
  world.combatLogs.unshift({
    id: "combat-keep",
    tick: 23,
    cultivatorId,
    zoneId: "qingzhou:wilderness",
    encounterId: "mine-beast",
    enemyName: "Stone Fang",
    outcome: "victory",
    damageTaken: 8,
    spiritualPowerSpent: 12,
    loot: {},
    summary: "Won cleanly.",
  });
  world.daoLogs.unshift({
    id: "dao-1",
    cultivatorId,
    tick: 9,
    title: "Stillness",
    content: "The dao heart steadies.",
    tags: ["reflection"],
  });

  const registrationRecord = createRegistrationRecordV2();
  const app = createApp({
    repository: {
      async authenticateAgent() {
        return {
          agentId: "agent-self",
          name: "Su Mingyue",
          selectedCultivatorId: cultivatorId,
          createdAt: "2026-03-13T00:00:00.000Z",
          updatedAt: "2026-03-13T00:00:00.000Z",
          lastSeenAt: "2026-03-13T00:00:00.000Z",
        };
      },
      async touchAgent() {},
      async readWorld() {
        return world;
      },
      async getCultivationRegistration(inputCultivatorId) {
        assert.equal(inputCultivatorId, cultivatorId);
        return registrationRecord;
      },
    } as never,
  });

  const headers = { authorization: "Bearer immortal_sk_test" };

  const eventsResponse = await app.request("https://runtime.test/agent/events?sinceTick=20", { headers });
  const eventsPayload = await eventsResponse.json();
  assert.equal(eventsResponse.status, 200);
  assert.equal(eventsPayload.tick, 24);
  assert.deepEqual(eventsPayload.events.map((event: { id: string }) => event.id), ["event-keep"]);
  assert.deepEqual(eventsPayload.combats.map((entry: { id: string }) => entry.id), ["combat-keep"]);

  const strategyResponse = await app.request("https://runtime.test/agent/strategy", { headers });
  const strategyPayload = await strategyResponse.json();
  assert.equal(strategyResponse.status, 200);
  assert.equal(strategyPayload.cultivatorId, cultivatorId);

  const tribulationResponse = await app.request("https://runtime.test/agent/tribulation", { headers });
  const tribulationPayload = await tribulationResponse.json();
  assert.equal(tribulationResponse.status, 200);
  assert.equal(typeof tribulationPayload.nextTribulationTick, "number");

  const sectResponse = await app.request("https://runtime.test/agent/sect", { headers });
  const sectPayload = await sectResponse.json();
  assert.equal(sectResponse.status, 200);
  assert.equal(sectPayload.id, sectId);

  const daoHeartResponse = await app.request("https://runtime.test/agent/dao-heart", { headers });
  const daoHeartPayload = await daoHeartResponse.json();
  assert.equal(daoHeartResponse.status, 200);
  assert.equal(daoHeartPayload[0]?.id, "dao-1");

  const registrationResponse = await app.request("https://runtime.test/agent/registration", { headers });
  const registrationPayload = await registrationResponse.json();
  assert.equal(registrationResponse.status, 200);
  assert.equal(registrationPayload.result.core_temperament_id, "qian_yuan");
});

test("authenticated registration save route binds the record to the authenticated agent", async () => {
  const record = createRegistrationRecordV2();
  const app = createApp({
    repository: {
      async authenticateAgent() {
        return {
          agentId: "agent-self",
          name: "Su Mingyue",
          selectedCultivatorId: "cultivator-self",
          createdAt: "2026-03-13T00:00:00.000Z",
          updatedAt: "2026-03-13T00:00:00.000Z",
          lastSeenAt: "2026-03-13T00:00:00.000Z",
        };
      },
      async touchAgent() {},
      async transactWorld<TResult>(mutator) {
        const world = createSeedWorld();
        const baseCultivatorId = Object.keys(world.cultivators)[0];
        if (!baseCultivatorId) {
          throw new Error("Seed world should include at least one cultivator.");
        }
        world.cultivators["cultivator-self"] = {
          ...world.cultivators[baseCultivatorId],
          id: "cultivator-self",
          registrationRecord: null,
        };
        const result = mutator(world);
        const stored = world.cultivators["cultivator-self"]?.registrationRecord;
        assert.equal(stored?.cultivator_id, "cultivator-self");
        assert.equal(stored?.agent_id, "agent-self");
        assert.deepEqual(stored?.answers, record.answers);
        return result as TResult;
      },
    } as never,
  });

  const response = await app.request("https://runtime.test/agent/registration", {
    method: "POST",
    headers: {
      authorization: "Bearer immortal_sk_test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ record }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.result.core_temperament_id, "qian_yuan");
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

test("legacy cultivator insight routes return strategy and tribulation snapshots", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  const app = createApp({ repository });

  const tribulationResponse = await app.request(
    `https://runtime.test/cultivator/tribulation?cultivatorId=${cultivatorId}`,
  );
  const tribulationPayload = await tribulationResponse.json();

  assert.equal(tribulationResponse.status, 200);
  assert.equal(tribulationPayload.cultivatorId, undefined);
  assert.equal(typeof tribulationPayload.nextTribulationTick, "number");
  assert.equal(typeof tribulationPayload.tribulationType, "string");
  assert.equal(typeof tribulationPayload.difficulty, "number");
  assert.equal(typeof tribulationPayload.isWarned, "boolean");
  assert.equal(typeof tribulationPayload.preparationTime, "number");
  assert.equal(typeof tribulationPayload.supportScore, "number");

  const strategyResponse = await app.request(
    `https://runtime.test/cultivator/strategy?cultivatorId=${cultivatorId}`,
  );
  const strategyPayload = await strategyResponse.json();

  assert.equal(strategyResponse.status, 200);
  assert.equal(strategyPayload.cultivatorId, cultivatorId);
  assert.equal(typeof strategyPayload.tick, "number");
  assert.equal(typeof strategyPayload.riskLevel, "string");
  assert.equal(typeof strategyPayload.shortTermGoal, "string");
  assert.equal(typeof strategyPayload.longTermGoal, "string");
  assert.equal(typeof strategyPayload.reason, "string");
  assert.ok(Array.isArray(strategyPayload.recommendedSequence));
  assert.ok(strategyPayload.recommendedSequence.length > 0);
});

test("GET /world/agent/:agentId returns full cultivator state for registered agent", async () => {
  const app = createApp({ repository: createRepository() });

  // Register an agent with registration record
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Stat Page Test", record: createRegistrationRecord() }),
  });
  assert.equal(registerResponse.status, 200);
  const registered = await registerResponse.json();

  // Fetch the public agent state
  const response = await app.request(`https://runtime.test/world/agent/${registered.agentId}`);
  assert.equal(response.status, 200);
  const payload = await response.json();

  // Agent view fields
  assert.equal(payload.agent.agentId, registered.agentId);
  assert.equal(payload.agent.name, "Stat Page Test");

  // CultivatorStateView fields
  assert.ok(typeof payload.tick === "number");
  assert.ok(payload.cultivator);
  assert.ok(payload.cultivation);
  assert.ok(payload.factionReputation);

  assertBalancedMainAttributes(payload.mainAttributes);
  assert.ok(payload.mainAttributes.daoxin > 50);
  assert.ok(payload.mainAttributes.bingpo < 50);
  assertDetailedAttributesFollowFormula(payload.mainAttributes, payload.detailedAttributes);

  // Five-element scores from registration
  assert.deepEqual(payload.fiveElementScores, { metal: 5, wood: 6, water: 11, fire: 3, earth: 8 });
});

test("GET /world/agent/:agentId returns default five-element scores when agent has no registration", async () => {
  const repository = createRepository();
  const app = createApp({ repository });

  // Simulate a legacy agent that exists before questionnaire enforcement.
  const registered = await repository.registerAgent({ name: "No Registration Agent" });

  const response = await app.request(`https://runtime.test/world/agent/${registered.agentId}`);
  assert.equal(response.status, 200);
  const payload = await response.json();

  // Five-element scores should default to 50 each
  assert.deepEqual(payload.fiveElementScores, { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 });
  assert.deepEqual(payload.mainAttributes, {
    gengu: 50,
    tipu: 50,
    lingyuan: 50,
    shenshi: 50,
    wuxing: 50,
    daoxin: 50,
    shenfa: 50,
    bingpo: 50,
  });
  assertDetailedAttributesFollowFormula(payload.mainAttributes, payload.detailedAttributes);

  // Registration field should be null
  assert.equal(payload.registration, null);
});

test("GET /world/agent/:agentId returns 404 for unknown agent", async () => {
  const app = createApp({ repository: createRepository() });
  const response = await app.request("https://runtime.test/world/agent/nonexistent-id");
  assert.equal(response.status, 404);
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
