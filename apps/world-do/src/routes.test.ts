import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, getCultivatorState, getSectInfo, syncCultivatorFromPersona } from "@immortal-claw/domain";
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
