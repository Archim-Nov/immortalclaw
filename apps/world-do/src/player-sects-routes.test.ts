import assert from "node:assert/strict";
import test from "node:test";
import {
  type CultivationRegistrationRecord,
  createSeedWorld,
  listAvailableActions,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
  type WorldState,
} from "@immortal-claw/domain";
import type { AgentProfileRecord } from "@immortal-claw/persistence";
import { createTestApp } from "./test-helpers.js";

function createAgentProfile(selectedCultivatorId: string): AgentProfileRecord {
  return {
    agentId: `agent-${selectedCultivatorId}`,
    name: `Agent ${selectedCultivatorId}`,
    selectedCultivatorId,
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    lastSeenAt: "2026-03-27T00:00:00.000Z",
  };
}

function createRegistrationRecord(motiveId: string): CultivationRegistrationRecord {
  return {
    record_type: "registration_record" as const,
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
      label_locale: "zh-CN" as const,
      core_temperament_id: "qian_yuan" as const,
      core_temperament: "steady",
      secondary_temperament_id: "guan_lan" as const,
      secondary_temperament: "observant",
      behavior_aspect_id: "water-earth" as const,
      behavior_aspect: "water-earth / guarded",
      cultivation_motive_id: motiveId as "seek-truth",
      cultivation_motive: motiveId,
      five_element_scores: {
        metal: 4,
        wood: 5,
        water: 11,
        fire: 3,
        earth: 8,
      },
      spirit_root_kind_id: "dual-root" as const,
      spirit_root_result: "dual-root water-earth",
      confidence: {
        core: "high" as const,
        behavior: "high" as const,
        motive: "high" as const,
        overall: "high" as const,
      },
    },
    summary: "Route test registration record.",
  };
}

function prepareFounder(world: WorldState, cultivatorId = "yun-zhong-he") {
  const founder = world.cultivators[cultivatorId]!;
  founder.locationId = "qingzhou:main-city";
  founder.spiritStones = 12000;
  founder.stateReputation = {
    qingzhou: 160,
    yangzhou: 0,
    zhongzhou: 0,
    shuzhou: 0,
    youzhou: 0,
    liangzhou: 0,
    leizhou: 0,
    cangzhou: 0,
    wanzhou: 0,
  };
  return founder;
}

function createAuthedApp(
  initialWorld: WorldState,
  selectedCultivatorId: string,
  options: {
    failOnTransact?: boolean;
  } = {},
) {
  let currentWorld = structuredClone(initialWorld);
  const app = createTestApp({
    world: {
      async readWorld() {
        return structuredClone(currentWorld);
      },
      async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
        if (options.failOnTransact) {
          throw new Error("transactWorld should not run for this route");
        }
        const draft = structuredClone(currentWorld);
        const result = mutator(draft);
        currentWorld = draft;
        return structuredClone(result);
      },
      async listAvailableActions(cultivatorId: string) {
        return listAvailableActions(currentWorld, cultivatorId);
      },
      async getCultivationRegistration(cultivatorId: string) {
        return currentWorld.cultivators[cultivatorId]?.registrationRecord ?? null;
      },
    },
    auth: {
      async authenticateAgent() {
        return createAgentProfile(selectedCultivatorId);
      },
      async touchAgent() {
        return;
      },
    },
  });

  return {
    app,
    readWorld() {
      return structuredClone(currentWorld);
    },
  };
}

test("player-sect routes support founding, recruitment, application, review, and policy update", async () => {
  const founderWorld = createSeedWorld();
  prepareFounder(founderWorld);
  const founderRuntime = createAuthedApp(founderWorld, "yun-zhong-he");

  const foundResponse = await founderRuntime.app.request("https://runtime.test/agent/sects/found", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Azure Peak Sect",
      admissionPolicy: {
        minimumRealmLevel: 2,
        allowedMotiveBuckets: ["dao-truth"],
      },
    }),
  });

  assert.equal(foundResponse.status, 200);
  const foundPayload = await foundResponse.json() as {
    sectId: string;
    headquartersLocationId: string;
  };
  assert.ok(foundPayload.sectId);
  assert.equal(foundPayload.headquartersLocationId, `qingzhou:sect-outpost:${foundPayload.sectId}`);

  const sectResponse = await founderRuntime.app.request("https://runtime.test/agent/sect", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const sectPayload = await sectResponse.json() as {
    organizationType: string;
    stateId?: string;
    founderCultivatorId?: string;
    admissionPolicy?: { minimumRealmLevel: number; allowedMotiveBuckets: string[] };
  };

  assert.equal(sectResponse.status, 200);
  assert.equal(sectPayload.organizationType, "player");
  assert.equal(sectPayload.stateId, "qingzhou");
  assert.equal(sectPayload.founderCultivatorId, "yun-zhong-he");
  assert.deepEqual(sectPayload.admissionPolicy, {
    minimumRealmLevel: 2,
    allowedMotiveBuckets: ["dao-truth"],
  });

  const sharedWorld = founderRuntime.readWorld();
  const applicantSummary = syncCultivatorFromPersona(sharedWorld, {
    agentId: "agent-route-applicant",
    name: "Route Applicant",
  });
  const applicant = sharedWorld.cultivators[applicantSummary.selectedCultivatorId]!;
  applicant.locationId = "qingzhou:main-city";
  applicant.realmLevel = 3;
  saveCultivationRegistration(
    sharedWorld,
    applicant.id,
    createRegistrationRecord("seek-truth"),
    "agent-route-applicant",
  );

  const applicantRuntime = createAuthedApp(sharedWorld, applicant.id);
  const recruitmentResponse = await applicantRuntime.app.request("https://runtime.test/agent/player-sects/recruitment?limit=50", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const recruitmentPayload = await recruitmentResponse.json() as {
    sects: Array<{ sectId: string }>;
  };

  assert.equal(recruitmentResponse.status, 200);
  assert.equal(recruitmentPayload.sects[0]?.sectId, foundPayload.sectId);

  const applyResponse = await applicantRuntime.app.request("https://runtime.test/agent/player-sect-applications", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ sectId: foundPayload.sectId }),
  });
  const applyPayload = await applyResponse.json() as { applicationId: string };

  assert.equal(applyResponse.status, 200);
  assert.ok(applyPayload.applicationId);

  const founderReviewRuntime = createAuthedApp(applicantRuntime.readWorld(), "yun-zhong-he");
  const queueResponse = await founderReviewRuntime.app.request("https://runtime.test/agent/sect/applications?limit=50", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const queuePayload = await queueResponse.json() as {
    applications: Array<{ applicationId: string }>;
  };

  assert.equal(queueResponse.status, 200);
  assert.equal(queuePayload.applications.length, 1);

  const reviewResponse = await founderReviewRuntime.app.request("https://runtime.test/agent/sect/applications/review", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      applicationId: queuePayload.applications[0]!.applicationId,
      decision: "approve",
    }),
  });

  assert.equal(reviewResponse.status, 200);

  const applicantSectRuntime = createAuthedApp(founderReviewRuntime.readWorld(), applicant.id);
  const applicantSectResponse = await applicantSectRuntime.app.request("https://runtime.test/agent/sect", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const applicantSectPayload = await applicantSectResponse.json() as {
    organizationType: string;
    role?: string;
  };

  assert.equal(applicantSectResponse.status, 200);
  assert.equal(applicantSectPayload.organizationType, "player");
  assert.equal(applicantSectPayload.role, "\u5916\u95e8");

  const policyWorld = founderReviewRuntime.readWorld();
  policyWorld.tick += 600;
  const founderPolicyRuntime = createAuthedApp(policyWorld, "yun-zhong-he");
  const policyResponse = await founderPolicyRuntime.app.request("https://runtime.test/agent/sect/admission-policy", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      minimumRealmLevel: 4,
      allowedMotiveBuckets: ["dao-truth", "guard-world"],
    }),
  });

  assert.equal(policyResponse.status, 200);
});

test("agent actions expose one generic review todo and recruitment GET stays read-only", async () => {
  const world = createSeedWorld() as WorldState & {
    pendingSectApplications?: Record<string, unknown>;
    sectReapplyCooldowns?: Record<string, unknown>;
  };
  const founder = prepareFounder(world);
  founder.sectId = "qing-yue-zong";
  founder.sectTitle = "\u5b97\u4e3b";
  world.sects["qing-yue-zong"] = {
    id: "qing-yue-zong",
    name: "Azure Peak Sect",
    alignment: "\u6b63\u9053",
    stateId: "qingzhou",
    founderCultivatorId: founder.id,
    treasury: 8000,
    memberIds: [founder.id],
    spiritVeins: ["azure-peak-vein"],
    headquarters: "qingzhou:sect-outpost:qing-yue-zong",
    titleSlots: [
      { title: "\u5916\u95e8", threshold: 0, maxSlots: Number.POSITIVE_INFINITY },
      { title: "\u5185\u95e8", threshold: 200, maxSlots: 32 },
      { title: "\u7cbe\u82f1", threshold: 600, maxSlots: 16 },
      { title: "\u957f\u8001", threshold: 1500, maxSlots: 4 },
      { title: "\u5b97\u4e3b", threshold: Number.POSITIVE_INFINITY, maxSlots: 1 },
    ],
    titleUpdateInterval: 2880,
    lastTitleUpdateTick: 0,
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
    admissionPolicyUpdatedAtTick: 0,
  } as never;
  world.pendingSectApplications = {};
  world.sectReapplyCooldowns = {};

  for (let index = 0; index < 120; index += 1) {
    const summary = syncCultivatorFromPersona(world, {
      agentId: `agent-review-${index}`,
      name: `Review ${index}`,
    });
    const applicationId = `application-${index}`;
    saveCultivationRegistration(
      world,
      summary.selectedCultivatorId,
      createRegistrationRecord("seek-truth"),
      `agent-review-${index}`,
    );
    world.cultivators[summary.selectedCultivatorId]!.pendingSectApplicationId = applicationId;
    world.pendingSectApplications[applicationId] = {
      id: applicationId,
      sectId: "qing-yue-zong",
      cultivatorId: summary.selectedCultivatorId,
      appliedAtTick: world.tick,
      expiresAtTick: world.tick + 600,
    };
  }

  const founderRuntime = createAuthedApp(world, founder.id);
  const actionsResponse = await founderRuntime.app.request("https://runtime.test/agent/actions", {
    headers: {
      authorization: "Bearer test",
    },
  });
  const actionsPayload = await actionsResponse.json() as {
    actions: Array<{ actionId: string }>;
  };

  assert.equal(actionsResponse.status, 200);
  assert.equal(
    actionsPayload.actions.filter((action) => action.actionId === "review-player-sect-applications").length,
    1,
  );
  assert.equal(
    actionsPayload.actions.some((action) => action.actionId.startsWith("review-player-sect-applications:")),
    false,
  );

  const applicantSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-recruitment-read-only",
    name: "Recruitment Reader",
  });
  const applicant = world.cultivators[applicantSummary.selectedCultivatorId]!;
  applicant.locationId = "qingzhou:main-city";
  saveCultivationRegistration(
    world,
    applicant.id,
    createRegistrationRecord("seek-truth"),
    "agent-recruitment-read-only",
  );

  const readOnlyRuntime = createAuthedApp(world, applicant.id, { failOnTransact: true });
  const recruitmentResponse = await readOnlyRuntime.app.request("https://runtime.test/agent/player-sects/recruitment?limit=1", {
    headers: {
      authorization: "Bearer test",
    },
  });

  assert.equal(recruitmentResponse.status, 200);
});
