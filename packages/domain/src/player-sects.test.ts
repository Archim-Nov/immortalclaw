import assert from "node:assert/strict";
import test from "node:test";
import * as runtime from "./index.js";
import { STATE_IDS } from "./constants.js";
import {
  advanceWorld,
  createSeedWorld,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
  type CultivationRegistrationRecord,
} from "./index.js";

type PlayerSectTestWorld = ReturnType<typeof createSeedWorld> & {
  pendingSectApplications: Record<string, {
    id: string;
    sectId: string;
    cultivatorId: string;
    appliedAtTick: number;
    expiresAtTick: number;
  }>;
  sectReapplyCooldowns: Record<string, {
    id: string;
    sectId: string;
    cultivatorId: string;
    expiresAtTick: number;
  }>;
};

type FoundPlayerSectFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    name: string;
    stateId: string;
    alignment: "正道" | "魔道";
    admissionPolicy: {
      minimumRealmLevel: number;
      allowedMotiveBuckets: string[];
    };
  },
) => {
  tick: number;
  cultivatorId: string;
  sectId: string;
  headquartersLocationId: string;
  summary: string;
};

type ListRecruitablePlayerSectsFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input?: { limit?: number; cursor?: string },
) => {
  sects: Array<{
    sectId: string;
    name: string;
    stateId: string;
  }>;
  nextCursor: string | null;
};

type ApplyToPlayerSectFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: { sectId: string },
) => {
  tick: number;
  cultivatorId: string;
  applicationId: string;
  sectId: string;
  summary: string;
};

type ListSectApplicationsFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input?: { limit?: number; cursor?: string },
) => {
  applications: Array<{
    applicationId: string;
    cultivatorId: string;
    sectId: string;
  }>;
  nextCursor: string | null;
};

type ReviewSectApplicationFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    applicationId: string;
    decision: "approve" | "reject";
  },
) => {
  tick: number;
  cultivatorId: string;
  sectId: string;
  applicationId: string;
  decision: "approve" | "reject";
  summary: string;
};

type UpdateSectAdmissionPolicyFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    minimumRealmLevel: number;
    allowedMotiveBuckets: string[];
  },
) => {
  tick: number;
  cultivatorId: string;
  sectId: string;
  summary: string;
};

function createStateReputation(overrides: Partial<Record<(typeof STATE_IDS)[number], number>> = {}) {
  return Object.fromEntries(
    STATE_IDS.map((stateId) => [stateId, overrides[stateId] ?? 0]),
  ) as Record<(typeof STATE_IDS)[number], number>;
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
      core_temperament: "沉稳",
      secondary_temperament_id: "guan_lan" as const,
      secondary_temperament: "观察",
      behavior_aspect_id: "water-earth" as const,
      behavior_aspect: "水土 / 潜守",
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
      spirit_root_result: "水土双灵根",
      confidence: {
        core: "high" as const,
        behavior: "high" as const,
        motive: "high" as const,
        overall: "high" as const,
      },
    },
    summary: "Test registration record.",
  };
}

function playerSectRuntime() {
  const api = runtime as typeof runtime & {
    foundPlayerSect?: FoundPlayerSectFn;
    listRecruitablePlayerSects?: ListRecruitablePlayerSectsFn;
    applyToPlayerSect?: ApplyToPlayerSectFn;
    listSectApplications?: ListSectApplicationsFn;
    reviewSectApplication?: ReviewSectApplicationFn;
    updateSectAdmissionPolicy?: UpdateSectAdmissionPolicyFn;
  };

  assert.equal(typeof api.foundPlayerSect, "function");
  assert.equal(typeof api.listRecruitablePlayerSects, "function");
  assert.equal(typeof api.applyToPlayerSect, "function");
  assert.equal(typeof api.listSectApplications, "function");
  assert.equal(typeof api.reviewSectApplication, "function");
  assert.equal(typeof api.updateSectAdmissionPolicy, "function");

  return {
    foundPlayerSect: api.foundPlayerSect as FoundPlayerSectFn,
    listRecruitablePlayerSects: api.listRecruitablePlayerSects as ListRecruitablePlayerSectsFn,
    applyToPlayerSect: api.applyToPlayerSect as ApplyToPlayerSectFn,
    listSectApplications: api.listSectApplications as ListSectApplicationsFn,
    reviewSectApplication: api.reviewSectApplication as ReviewSectApplicationFn,
    updateSectAdmissionPolicy: api.updateSectAdmissionPolicy as UpdateSectAdmissionPolicyFn,
  };
}

function prepareFounder(
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId = "yun-zhong-he",
) {
  const founder = world.cultivators[cultivatorId]!;
  founder.locationId = "qingzhou:main-city";
  founder.spiritStones = 12000;
  founder.stateReputation = createStateReputation({ qingzhou: 160 });
  return founder;
}

function foundTestSect(world: ReturnType<typeof createSeedWorld>, founderId = "yun-zhong-he") {
  const api = playerSectRuntime();
  prepareFounder(world, founderId);
  return api.foundPlayerSect(world, founderId, {
    name: "青岳宗",
    stateId: "qingzhou",
    alignment: "正道",
    admissionPolicy: {
      minimumRealmLevel: 2,
      allowedMotiveBuckets: ["dao-truth"],
    },
  });
}

test("foundPlayerSect rejects insufficient stones, reputation, wrong location, existing organization, and duplicate name", () => {
  const { foundPlayerSect } = playerSectRuntime();
  const cases = [
    {
      name: "insufficient stones",
      prepare(world: ReturnType<typeof createSeedWorld>) {
        const founder = prepareFounder(world);
        founder.spiritStones = 7999;
      },
      error: /8000/i,
    },
    {
      name: "insufficient state reputation",
      prepare(world: ReturnType<typeof createSeedWorld>) {
        const founder = prepareFounder(world);
        founder.stateReputation = createStateReputation({ qingzhou: 119 });
      },
      error: /120/i,
    },
    {
      name: "wrong location",
      prepare(world: ReturnType<typeof createSeedWorld>) {
        const founder = prepareFounder(world);
        founder.locationId = "qingzhou:sub-town-east";
      },
      error: /main city/i,
    },
    {
      name: "existing neutral sect membership",
      prepare(world: ReturnType<typeof createSeedWorld>) {
        const founder = prepareFounder(world);
        founder.neutralSectId = "cang-mu-gu";
      },
      error: /organization/i,
    },
    {
      name: "duplicate normalized name",
      prepare(world: ReturnType<typeof createSeedWorld>) {
        prepareFounder(world);
        const result = foundPlayerSect(world, "yun-zhong-he", {
          name: "青岳宗",
          stateId: "qingzhou",
          alignment: "正道",
          admissionPolicy: {
            minimumRealmLevel: 1,
            allowedMotiveBuckets: ["dao-truth"],
          },
        });
        assert.ok(result.sectId);

        const second = syncCultivatorFromPersona(world, {
          agentId: "agent-duplicate-founder",
          name: "Duplicate Founder",
        });
        prepareFounder(world, second.selectedCultivatorId);
      },
      founderId: "duplicate-founder",
      error: /unique|duplicate/i,
    },
  ] as const;

  for (const scenario of cases) {
    const world = createSeedWorld();
    scenario.prepare(world);
    const founderId = "founderId" in scenario && scenario.founderId
      ? Object.values(world.cultivators).find((cultivator) => cultivator.name === "Duplicate Founder")!.id
      : "yun-zhong-he";

    assert.throws(
      () =>
        foundPlayerSect(world, founderId, {
          name: "青岳宗",
          stateId: "qingzhou",
          alignment: "正道",
          admissionPolicy: {
            minimumRealmLevel: 1,
            allowedMotiveBuckets: ["dao-truth"],
          },
        }),
      scenario.error,
      scenario.name,
    );
  }
});

test("foundPlayerSect creates a state-bound sect, transfers treasury, and marks founder as 宗主", () => {
  const world = createSeedWorld() as PlayerSectTestWorld;
  const founder = prepareFounder(world);
  const { foundPlayerSect } = playerSectRuntime();

  const result = foundPlayerSect(world, founder.id, {
    name: "青岳宗",
    stateId: "qingzhou",
    alignment: "正道",
    admissionPolicy: {
      minimumRealmLevel: 2,
      allowedMotiveBuckets: ["dao-truth", "guard-world"],
    },
  });

  const sect = world.sects[result.sectId]! as typeof world.sects[string] & {
    stateId?: string;
    founderCultivatorId?: string;
    admissionPolicy?: { minimumRealmLevel: number; allowedMotiveBuckets: string[] };
    admissionPolicyUpdatedAtTick?: number;
  };
  const sectInfo = runtime.getSectInfo(world, founder.id) as {
    stateId?: string;
    founderCultivatorId?: string;
    admissionPolicy?: { minimumRealmLevel: number; allowedMotiveBuckets: string[] };
    admissionPolicyUpdatedAtTick?: number;
    role?: string;
  } | null;

  assert.equal(founder.spiritStones, 4000);
  assert.equal(founder.sectId, result.sectId);
  assert.equal(founder.sectTitle, "宗主");
  assert.equal(sect.stateId, "qingzhou");
  assert.equal(sect.founderCultivatorId, founder.id);
  assert.equal(sect.treasury, 8000);
  assert.equal(sect.headquarters, result.headquartersLocationId);
  assert.equal(world.locations[result.headquartersLocationId]?.organizationType, "player-sect");
  assert.equal(world.locations[result.headquartersLocationId]?.stateId, "qingzhou");
  assert.equal(sectInfo?.stateId, "qingzhou");
  assert.equal(sectInfo?.founderCultivatorId, founder.id);
  assert.equal(sectInfo?.role, "宗主");
  assert.deepEqual(sectInfo?.admissionPolicy, {
    minimumRealmLevel: 2,
    allowedMotiveBuckets: ["dao-truth", "guard-world"],
  });
  assert.equal(sectInfo?.admissionPolicyUpdatedAtTick, world.tick);
});

test("player-sect application enforces location, registration, and single pending rules while recruitment lists paginate", () => {
  const world = createSeedWorld() as PlayerSectTestWorld;
  const founded = foundTestSect(world);
  const { listRecruitablePlayerSects, applyToPlayerSect } = playerSectRuntime();
  const applicantSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-applicant",
    name: "Applicant",
  });
  const applicant = world.cultivators[applicantSummary.selectedCultivatorId]!;
  applicant.locationId = "qingzhou:sub-town-east";
  applicant.realmLevel = 3;

  const firstPage = listRecruitablePlayerSects(world, applicant.id, { limit: 1 });
  assert.equal(firstPage.sects.length, 1);
  assert.equal(firstPage.sects[0]?.stateId, "qingzhou");
  assert.equal(firstPage.nextCursor, null);

  assert.throws(
    () => applyToPlayerSect(world, applicant.id, { sectId: founded.sectId }),
    /main city|outpost/i,
  );

  applicant.locationId = "qingzhou:main-city";
  assert.throws(
    () => applyToPlayerSect(world, applicant.id, { sectId: founded.sectId }),
    /registration/i,
  );

  saveCultivationRegistration(world, applicant.id, createRegistrationRecord("seek-truth"), "agent-applicant");
  const application = applyToPlayerSect(world, applicant.id, { sectId: founded.sectId });

  assert.equal(applicant.pendingSectApplicationId, application.applicationId);
  assert.ok(world.pendingSectApplications[application.applicationId]);
  assert.throws(
    () => applyToPlayerSect(world, applicant.id, { sectId: founded.sectId }),
    /pending/i,
  );
});

test("listSectApplications hides expired applications without mutating the world and review approval assigns 外门", () => {
  const world = createSeedWorld() as PlayerSectTestWorld;
  const founded = foundTestSect(world);
  const { applyToPlayerSect, listSectApplications, reviewSectApplication } = playerSectRuntime();
  const applicantSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-approved-applicant",
    name: "Approved Applicant",
  });
  const applicant = world.cultivators[applicantSummary.selectedCultivatorId]!;
  applicant.locationId = "qingzhou:main-city";
  applicant.realmLevel = 3;
  saveCultivationRegistration(world, applicant.id, createRegistrationRecord("seek-truth"), "agent-approved-applicant");

  const application = applyToPlayerSect(world, applicant.id, { sectId: founded.sectId });
  world.tick = world.pendingSectApplications[application.applicationId]!.expiresAtTick;

  const expiredQueue = listSectApplications(world, "yun-zhong-he");
  assert.equal(expiredQueue.applications.length, 0);
  assert.ok(world.pendingSectApplications[application.applicationId], "read-only listing must not delete expired records");

  delete world.pendingSectApplications[application.applicationId];
  applicant.pendingSectApplicationId = null;
  world.tick += 1;

  const freshApplication = applyToPlayerSect(world, applicant.id, { sectId: founded.sectId });
  const queue = listSectApplications(world, "yun-zhong-he");
  assert.equal(queue.applications.length, 1);
  assert.equal(queue.applications[0]?.applicationId, freshApplication.applicationId);

  const approved = reviewSectApplication(world, "yun-zhong-he", {
    applicationId: freshApplication.applicationId,
    decision: "approve",
  });

  assert.equal(approved.decision, "approve");
  assert.equal(applicant.sectId, founded.sectId);
  assert.equal(applicant.sectTitle, "外门");
  assert.equal(applicant.pendingSectApplicationId, null);
  assert.equal(world.pendingSectApplications[freshApplication.applicationId], undefined);
});

test("reviewSectApplication reject path creates a 600-tick same-sect cooldown and updateSectAdmissionPolicy enforces 宗主-only cooldown", () => {
  const world = createSeedWorld() as PlayerSectTestWorld;
  const founded = foundTestSect(world);
  const { applyToPlayerSect, reviewSectApplication, updateSectAdmissionPolicy } = playerSectRuntime();
  const applicantSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-rejected-applicant",
    name: "Rejected Applicant",
  });
  const applicant = world.cultivators[applicantSummary.selectedCultivatorId]!;
  applicant.locationId = "qingzhou:main-city";
  applicant.realmLevel = 3;
  saveCultivationRegistration(world, applicant.id, createRegistrationRecord("seek-truth"), "agent-rejected-applicant");

  const pending = applyToPlayerSect(world, applicant.id, { sectId: founded.sectId });
  const rejected = reviewSectApplication(world, "yun-zhong-he", {
    applicationId: pending.applicationId,
    decision: "reject",
  });

  assert.equal(rejected.decision, "reject");
  assert.equal(applicant.pendingSectApplicationId, null);
  assert.ok(
    Object.values(world.sectReapplyCooldowns).some((cooldown) =>
      cooldown.cultivatorId === applicant.id && cooldown.sectId === founded.sectId,
    ),
  );
  assert.throws(
    () => applyToPlayerSect(world, applicant.id, { sectId: founded.sectId }),
    /cooldown|600/i,
  );

  const outsiderSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-outsider",
    name: "Outsider",
  });
  prepareFounder(world, outsiderSummary.selectedCultivatorId);
  world.cultivators[outsiderSummary.selectedCultivatorId]!.sectId = founded.sectId;
  world.cultivators[outsiderSummary.selectedCultivatorId]!.sectTitle = "长老";

  assert.throws(
    () =>
      updateSectAdmissionPolicy(world, outsiderSummary.selectedCultivatorId, {
        minimumRealmLevel: 4,
        allowedMotiveBuckets: ["dao-truth"],
      }),
    /宗主|founder|only/i,
  );

  world.tick += 600;
  const firstUpdate = updateSectAdmissionPolicy(world, "yun-zhong-he", {
    minimumRealmLevel: 4,
    allowedMotiveBuckets: ["dao-truth", "guard-world"],
  });
  assert.ok(firstUpdate.summary);
  assert.throws(
    () =>
      updateSectAdmissionPolicy(world, "yun-zhong-he", {
        minimumRealmLevel: 5,
        allowedMotiveBuckets: ["dao-truth"],
      }),
    /600/i,
  );
});

test("sect title recalculation preserves founder 宗主 even after cadence updates", () => {
  const world = createSeedWorld() as PlayerSectTestWorld;
  const founded = foundTestSect(world);
  const founder = world.cultivators["yun-zhong-he"]!;
  const challengerSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-title-peer",
    name: "Title Peer",
  });
  const challenger = world.cultivators[challengerSummary.selectedCultivatorId]!;
  challenger.sectId = founded.sectId;
  challenger.sectTitle = "长老";
  challenger.totalContribution = 3000;
  challenger.contributionReachedAt = 1;
  world.sects[founded.sectId]!.memberIds.push(challenger.id);

  founder.totalContribution = 0;
  founder.contributionReachedAt = 0;
  world.sects[founded.sectId]!.lastTitleUpdateTick = world.tick - world.sects[founded.sectId]!.titleUpdateInterval;

  advanceWorld(world, 1);

  assert.equal(founder.sectTitle, "宗主");
  assert.equal(world.cultivators[challenger.id]!.sectTitle, "长老");
});
