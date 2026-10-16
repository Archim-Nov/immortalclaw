import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, getCultivatorState, getSectInfo, syncCultivatorFromPersona } from "@immortal-claw/domain";
import { createTestApp, createQuestionnaireRegistrationBody } from "./test-helpers.js";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RegistrationResponse {
  agentId: string;
  credential: string;
  selectedCultivatorId: string;
  agent: {
    name: string;
    selectedCultivatorId: string;
  };
  cultivator: {
    name: string;
  };
  onboarding: {
    stage: string;
    recommendedActions?: string[];
  };
  decisionPolicy: {
    tutorialMode: string;
  };
  presentation?: {
    version: number;
  };
}

interface AgentStateResponse {
  agent: {
    agentId: string;
  };
  digest?: {
    summary?: string;
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

function seedPlayerSect(world: ReturnType<typeof createSeedWorld>) {
  world.sects["qing-yun-sect"] = {
    id: "qing-yun-sect",
    name: "青云宗",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: "yun-zhong-he",
    treasury: 86000,
    memberIds: [],
    spiritVeins: ["青岚支脉"],
    headquarters: "qingzhou:sect-outpost:qing-yun-sect",
    titleSlots: [
      { title: "外门", threshold: 0, maxSlots: Number.POSITIVE_INFINITY },
      { title: "内门", threshold: 200, maxSlots: 32 },
      { title: "精英", threshold: 600, maxSlots: 16 },
      { title: "长老", threshold: 1500, maxSlots: 4 },
      { title: "宗主", threshold: Number.POSITIVE_INFINITY, maxSlots: 1 },
    ],
    titleUpdateInterval: 2880,
    lastTitleUpdateTick: 0,
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
    admissionPolicyUpdatedAtTick: 0,
  };
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

  const skillText = await skillResponse.text();
  const registerText = await registerResponse.text();
  const heartbeatText = await heartbeatResponse.text();

  assert.equal(skillResponse.status, 200);
  assert.match(String(skillResponse.headers.get("content-type")), /text\/markdown/);
  assert.match(skillText, /first breakthrough|neutral sect|first human-facing reply/i);
  assert.match(skillText, /\/agent\/templates/);

  assert.equal(registerResponse.status, 200);
  assert.match(registerText, /Qingzhou|Yangzhou|Wanzhou|use the exact provided name|first human-facing reply/i);
  assert.match(registerText, /dossier/);
  assert.match(registerText, /report your life/i);

  assert.equal(heartbeatResponse.status, 200);
  assert.match(heartbeatText, /neutral-duty|first breakthrough/i);
  assert.match(heartbeatText, /\/agent\/templates/);
});

test("agent template catalog and documents are public", async () => {
  const app = createTestApp();
  const catalogResponse = await app.request("https://runtime.test/agent/templates");
  const catalog = await catalogResponse.json() as {
    version: number;
    templates: Array<{ id: string; runtimePath: string; placeholders: Array<{ name: string }> }>;
  };

  assert.equal(catalogResponse.status, 200);
  assert.match(String(catalogResponse.headers.get("content-type")), /application\/json/);
  assert.equal(catalog.version, 2);
  assert.deepEqual(
    catalog.templates.map((template) => template.id),
    ["dossier", "cave-sight", "act-result", "bond-note"],
  );

  const documentResponse = await app.request("https://runtime.test/agent/templates/cave-sight");
  const document = await documentResponse.text();
  assert.equal(documentResponse.status, 200);
  assert.match(String(documentResponse.headers.get("content-type")), /text\/html/);
  assert.match(document, /\{\{settled\}\}/);
  assert.match(document, /洞中见闻/);
  assert.match(document, /glass-panel/);
  assert.doesNotMatch(document, /<script/i);
  assert.doesNotMatch(document, /\{\{choice1\}\}/);

  const withdrawn = await app.request("https://runtime.test/agent/templates/dungeon-wake");
  assert.equal(withdrawn.status, 404);

  const missing = await app.request("https://runtime.test/agent/templates/free-form");
  assert.equal(missing.status, 404);
  const missingPayload = await missing.json() as { error: string };
  assert.match(missingPayload.error, /Unknown template/);
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
  assert.equal(registerPayload.agent.name, "Su Mingyue");
  assert.equal(registerPayload.cultivator.name, "Su Mingyue");
  assert.equal(registerPayload.agent.selectedCultivatorId, registerPayload.selectedCultivatorId);
  assert.equal(registerPayload.onboarding.stage, "registered");
  assert.equal(registerPayload.decisionPolicy.tutorialMode, "optional");
  assert.equal(registerPayload.presentation?.version, 2);

  const stateResponse = await app.request("https://runtime.test/agent/state", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const statePayload = await stateResponse.json() as AgentStateResponse;

  assert.equal(stateResponse.status, 200);
  assert.equal(statePayload.agent.agentId, registerPayload.agentId);
  assert.match(statePayload.digest?.summary ?? "", /六个时辰/);

  const digestResponse = await app.request("https://runtime.test/agent/digest", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const digestPayload = await digestResponse.json() as { summary?: string };
  assert.equal(digestResponse.status, 200);
  assert.equal(digestPayload.summary, statePayload.digest?.summary);
});

test("Chinese-bearing JSON routes declare utf-8 explicitly", async () => {
  const app = createTestApp();
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "苏明月" })),
  });
  const registerPayload = await registerResponse.json() as RegistrationResponse;

  const secondRegisterResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "李傲天" })),
  });
  const secondRegisterPayload = await secondRegisterResponse.json() as RegistrationResponse;

  const sendResponse = await app.request("https://runtime.test/agent/messages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      toAgentId: secondRegisterPayload.agentId,
      subject: "问道来信",
      content: "青州主城灵气渐盛，今夜子时来苍木谷相见。",
    }),
  });

  assert.equal(sendResponse.status, 200);

  const checks = [
    await app.request("https://runtime.test/cultivator/messages?cultivatorId=yun-zhong-he"),
    await app.request("https://runtime.test/cultivator/dao-heart?cultivatorId=yun-zhong-he"),
    await app.request("https://runtime.test/agent/messages", {
      headers: {
        authorization: `Bearer ${secondRegisterPayload.credential}`,
      },
    }),
    await app.request("https://runtime.test/agent/state", {
      headers: {
        authorization: `Bearer ${registerPayload.credential}`,
      },
    }),
    await app.request("https://runtime.test/world/agents"),
  ];

  for (const response of checks) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  }
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

test("removed legacy routes return 404", async () => {
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
  const entry = payload.agents[0] as {
    cultivator: {
      location: string;
      locationId: string;
      stateId: string;
      currentAction: string | null;
      currentActionLabel: string | null;
    };
  };
  assert.match(entry.cultivator.locationId, /:main-city$/);
  assert.ok(entry.cultivator.stateId);
  assert.ok(entry.cultivator.location);
  assert.equal(entry.cultivator.currentAction, null);
  assert.equal(entry.cultivator.currentActionLabel, null);
  assert.equal(JSON.stringify(payload).includes("webhookSecret"), false);
});

test("world agent detail returns 404 when agent binding points to a missing cultivator", async () => {
  const app = createTestApp({
    auth: {
      async getAgentProfile() {
        return {
          agentId: "stale-agent",
          name: "Stale Agent",
          selectedCultivatorId: "missing-cultivator",
          webhookUrl: null,
          webhookSecret: null,
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          lastSeenAt: "2026-03-17T00:00:00.000Z",
        };
      },
    },
  });

  const response = await app.request("https://runtime.test/world/agent/stale-agent");
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 404);
  assert.equal(payload.error, "Agent not found or has no cultivator.");
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
  const travelToNeutralOutpost = actionsPayload.actions.find((action) =>
    action.actionId.startsWith("travel-to:")
    && /sect-outpost:(cang-mu-gu|ting-chao-ge|wan-xiang-lou)$/.test(action.actionId),
  );

  assert.ok(travelToNeutralOutpost);

  const travelResponse = await app.request("https://runtime.test/agent/act", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ actionId: travelToNeutralOutpost!.actionId }),
  });
  assert.equal(travelResponse.status, 200);

  const tickResponse = await app.request("https://runtime.test/agent/tick", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ steps: 1 }),
  });
  assert.equal(tickResponse.status, 200);

  const outpostActionsResponse = await app.request("https://runtime.test/agent/actions", {
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
    },
  });
  const outpostActionsPayload = await outpostActionsResponse.json() as { actions: Array<{ actionId: string }> };
  const joinNeutralAction = outpostActionsPayload.actions.find((action) =>
    action.actionId.startsWith("join-neutral-sect:"),
  );
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
  const organization = await organizationResponse.json() as {
    organizationType: string;
    id: string;
    alignment?: string;
  };

  assert.equal(organizationResponse.status, 200);
  assert.equal(organization.organizationType, "neutral");
  assert.match(organization.id, /cang-mu-gu|ting-chao-ge|wan-xiang-lou/);
  assert.equal(organization.alignment, "中立");
});

test("cultivator state route exposes sect level and active faction war summary", async () => {
  const world = createSeedWorld();
  seedPlayerSect(world);
  const sect = world.sects["qing-yun-sect"]!;
  const first = world.cultivators["yun-zhong-he"]!;
  const secondSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-routes-sect-peer",
    name: "Shen Qing",
  });
  const second = world.cultivators[secondSummary.selectedCultivatorId]!;

  sect.memberIds = [first.id, second.id];
  first.sectId = sect.id;
  second.sectId = sect.id;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.totalContribution = 3200;
  second.totalContribution = 1800;

  const app = createTestApp({
    world: {
      async getCultivatorState(cultivatorId: string) {
        return getCultivatorState(world, cultivatorId);
      },
    },
  });

  const response = await app.request("https://runtime.test/cultivator/state?cultivatorId=yun-zhong-he");
  const payload = await response.json() as {
    sect: {
      id: string;
      alignment?: string;
      level?: number;
      bonuses?: Array<{ type: string }>;
      activeWarId?: string | null;
      warObjectives?: Array<{ objectiveId: string }>;
    } | null;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.sect?.id, "qing-yun-sect");
  assert.equal(payload.sect?.alignment, "正道");
  assert.equal(payload.sect?.level, 3);
  assert.ok(payload.sect?.bonuses?.some((bonus) => bonus.type === "resource"));
  assert.equal(payload.sect?.activeWarId, "war-qingzhou-frontier");
  assert.ok((payload.sect?.warObjectives?.length ?? 0) > 0);
});

test("cultivator sect route exposes sect level bonuses and war objectives", async () => {
  const world = createSeedWorld();
  seedPlayerSect(world);
  const sect = world.sects["qing-yun-sect"]!;
  const first = world.cultivators["yun-zhong-he"]!;
  const secondSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-routes-sect-info-peer",
    name: "Shen Qing",
  });
  const second = world.cultivators[secondSummary.selectedCultivatorId]!;

  sect.memberIds = [first.id, second.id];
  first.sectId = sect.id;
  second.sectId = sect.id;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.totalContribution = 3200;
  second.totalContribution = 1800;

  const app = createTestApp({
    world: {
      async readWorld() {
        return world;
      },
    },
  });

  const response = await app.request("https://runtime.test/cultivator/sect?cultivatorId=yun-zhong-he");
  const payload = await response.json() as ReturnType<typeof getSectInfo> & {
    alignment?: string;
    level?: number;
    bonuses?: Array<{ type: string }>;
    activeWarId?: string | null;
    warObjectives?: Array<{ objectiveId: string }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload?.organizationType, "player");
  assert.equal(payload?.alignment, "正道");
  assert.equal(payload?.level, 3);
  assert.ok(payload?.bonuses?.some((bonus) => bonus.type === "resource"));
  assert.equal(payload?.activeWarId, "war-qingzhou-frontier");
  assert.ok((payload?.warObjectives?.length ?? 0) > 0);
});

test("seeded world helper stays available for lifecycle tests", () => {
  const world = createSeedWorld();
  assert.ok(Object.keys(world.cultivators).length > 0);
});

test("POST /agent/webhook binds a webhook for an authenticated agent", async () => {
  const app = createTestApp();
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const registerPayload = await registerResponse.json() as RegistrationResponse;

  const webhookResponse = await app.request("https://runtime.test/agent/webhook", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ webhookUrl: "https://example.com/hooks/immortal-realm" }),
  });
  const webhookPayload = await webhookResponse.json() as { ok: boolean; webhookUrl: string; webhookSecret: string };

  assert.equal(webhookResponse.status, 200);
  assert.equal(webhookPayload.ok, true);
  assert.equal(webhookPayload.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.ok(webhookPayload.webhookSecret.startsWith("whsec_"));
});

test("POST /agent/webhook rejects unauthenticated requests", async () => {
  const app = createTestApp();
  const response = await app.request("https://runtime.test/agent/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ webhookUrl: "https://example.com/hooks/immortal-realm" }),
  });

  assert.equal(response.status, 401);
});

test("POST /agent/webhook rejects empty webhookUrl", async () => {
  const app = createTestApp();
  const registerResponse = await app.request("https://runtime.test/agent/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(createQuestionnaireRegistrationBody({ name: "Su Mingyue" })),
  });
  const registerPayload = await registerResponse.json() as RegistrationResponse;

  const webhookResponse = await app.request("https://runtime.test/agent/webhook", {
    method: "POST",
    headers: {
      authorization: `Bearer ${registerPayload.credential}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ webhookUrl: "" }),
  });

  assert.ok(webhookResponse.status >= 400);
});
