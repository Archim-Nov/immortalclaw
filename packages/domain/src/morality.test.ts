import assert from "node:assert/strict";
import test from "node:test";
import * as runtime from "./index.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
  type CultivationRegistrationRecord,
} from "./index.js";

type FoundPlayerSectFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    name: string;
    admissionPolicy: {
      minimumRealmLevel: number;
      allowedMotiveBuckets: string[];
    };
  },
) => {
  sectId: string;
  headquartersLocationId: string;
};

type ApplyToPlayerSectFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: { sectId: string },
) => {
  applicationId: string;
};

type ReviewSectApplicationFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    applicationId: string;
    decision: "approve" | "reject";
  },
) => {
  decision: "approve" | "reject";
};

type GetPendingMoralityChoiceFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
) => {
  tick: number;
  cultivatorId: string;
  choice: {
    choiceId: string;
    title: string;
    prompt: string;
    options: Array<{
      id: string;
      label: string;
      summary: string;
    }>;
  } | null;
};

type ResolveMoralityChoiceFn = (
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  input: {
    choiceId: string;
    optionId: string;
  },
) => {
  tick: number;
  cultivatorId: string;
  choiceId: string;
  optionId: string;
  moralityScore: number;
  moralityAlignment: "\u6b63\u9053" | "\u9b54\u9053";
  summary: string;
};

function moralityRuntime() {
  const api = runtime as typeof runtime & {
    foundPlayerSect?: FoundPlayerSectFn;
    applyToPlayerSect?: ApplyToPlayerSectFn;
    reviewSectApplication?: ReviewSectApplicationFn;
    getPendingMoralityChoice?: GetPendingMoralityChoiceFn;
    resolveMoralityChoice?: ResolveMoralityChoiceFn;
  };

  assert.equal(typeof api.foundPlayerSect, "function");
  assert.equal(typeof api.applyToPlayerSect, "function");
  assert.equal(typeof api.reviewSectApplication, "function");
  assert.equal(typeof api.getPendingMoralityChoice, "function");
  assert.equal(typeof api.resolveMoralityChoice, "function");

  return {
    foundPlayerSect: api.foundPlayerSect as FoundPlayerSectFn,
    applyToPlayerSect: api.applyToPlayerSect as ApplyToPlayerSectFn,
    reviewSectApplication: api.reviewSectApplication as ReviewSectApplicationFn,
    getPendingMoralityChoice: api.getPendingMoralityChoice as GetPendingMoralityChoiceFn,
    resolveMoralityChoice: api.resolveMoralityChoice as ResolveMoralityChoiceFn,
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
    summary: "Morality test registration record.",
  };
}

function prepareFounder(world: ReturnType<typeof createSeedWorld>, cultivatorId = "yun-zhong-he") {
  const founder = world.cultivators[cultivatorId] as typeof world.cultivators[string] & {
    moralityScore?: number;
  };
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
  founder.moralityScore = 0;
  return founder;
}

test("player-sect founding and application enforce morality alignment", () => {
  const { foundPlayerSect, applyToPlayerSect } = moralityRuntime();
  const world = createSeedWorld();
  const founder = prepareFounder(world);

  founder.moralityScore = -4;
  const demonicFounded = foundPlayerSect(world, founder.id, {
    name: "Azure Peak Sect",
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
  });
  assert.equal(world.sects[demonicFounded.sectId]?.alignment, "\u9b54\u9053");

  const righteousWorld = createSeedWorld();
  const righteousFounder = prepareFounder(righteousWorld);
  righteousFounder.moralityScore = 6;
  const founded = foundPlayerSect(righteousWorld, righteousFounder.id, {
    name: "Misty River Sect",
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
  });
  assert.ok(founded.sectId);
  assert.equal(righteousWorld.sects[founded.sectId]?.alignment, "\u6b63\u9053");

  const applicantSummary = syncCultivatorFromPersona(righteousWorld, {
    agentId: "agent-moral-applicant",
    name: "Moral Applicant",
  });
  const applicant = righteousWorld.cultivators[applicantSummary.selectedCultivatorId] as typeof righteousWorld.cultivators[string] & {
    moralityScore?: number;
  };
  applicant.locationId = "qingzhou:main-city";
  applicant.realmLevel = 3;
  applicant.moralityScore = -3;
  saveCultivationRegistration(righteousWorld, applicant.id, createRegistrationRecord("seek-truth"), "agent-moral-applicant");

  assert.throws(
    () => applyToPlayerSect(righteousWorld, applicant.id, { sectId: founded.sectId }),
    /morality|alignment|\u6b63\u9053|\u9b54\u9053/i,
  );
});

test("approved aligned sect joins and sect errands update morality, and state exposes score plus alignment", () => {
  const { foundPlayerSect, applyToPlayerSect, reviewSectApplication } = moralityRuntime();
  const world = createSeedWorld();
  const founder = prepareFounder(world);
  founder.moralityScore = 5;

  const founded = foundPlayerSect(world, founder.id, {
    name: "Misty River Sect",
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
  });

  const applicantSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-aligned-applicant",
    name: "Aligned Applicant",
  });
  const applicant = world.cultivators[applicantSummary.selectedCultivatorId] as typeof world.cultivators[string] & {
    moralityScore?: number;
  };
  applicant.locationId = "qingzhou:main-city";
  applicant.realmLevel = 3;
  applicant.moralityScore = 0;
  saveCultivationRegistration(world, applicant.id, createRegistrationRecord("seek-truth"), "agent-aligned-applicant");

  const pending = applyToPlayerSect(world, applicant.id, { sectId: founded.sectId });
  const reviewed = reviewSectApplication(world, founder.id, {
    applicationId: pending.applicationId,
    decision: "approve",
  });

  assert.equal(reviewed.decision, "approve");
  assert.equal(applicant.moralityScore, 8);

  applicant.locationId = founded.headquartersLocationId;
  const action = runtime.performAction(world, applicant.id, "take-sect-errand");
  assert.equal(action.accepted, true);
  advanceWorld(world, 2);
  assert.equal(applicant.moralityScore, 10);

  const state = getCultivatorState(world, applicant.id);
  const cultivatorView = state.cultivator as typeof state.cultivator & {
    moralityScore?: number;
    moralityAlignment?: string;
  };

  assert.equal(cultivatorView.moralityScore, 10);
  assert.equal(cultivatorView.moralityAlignment, "\u6b63\u9053");
});

test("morality choice events create one pending decision and resolving an option applies the selected morality delta", () => {
  const { getPendingMoralityChoice, resolveMoralityChoice } = moralityRuntime();
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators[string] & {
    moralityScore?: number;
    pendingMoralityChoiceId?: string | null;
  };
  cultivator.locationId = "qingzhou:main-city";
  cultivator.moralityScore = 0;
  const beforeSpiritStones = cultivator.spiritStones;

  world.eventPools.globalCommon = [
    {
      id: "travel-morality-crossroads",
      layer: "global-common",
      source: "exploration",
      semanticType: "human",
      resultType: "story",
      name: "Crossroads Beggar",
      nameCn: "Crossroads Beggar",
      description: "A hungry mortal blocks the road and forces a choice.",
      baseWeight: 1,
      stateId: null,
      nodeType: null,
      minRealm: null,
      effects: {},
      moralityChoice: {
        title: "Crossroads Beggar",
        prompt: "Choose whether to protect the traveler or exploit the panic.",
        expiresInTicks: 6,
        options: [
          {
            id: "aid",
            label: "Aid the traveler",
            summary: "Give up short-term profit to keep the road safe.",
            moralityDelta: 3,
            effectBundle: {
              reputationChange: 1,
            },
          },
          {
            id: "loot",
            label: "Exploit the confusion",
            summary: "Take the easy stones while nobody can resist.",
            moralityDelta: -3,
            effectBundle: {
              spiritStones: 45,
            },
          },
        ],
      },
    } as never,
  ];
  world.eventPools = {
    ...world.eventPools,
    stateSpecific: {
      ...world.eventPools.stateSpecific,
      qingzhou: [],
    },
    nodeSpecific: {
      ...world.eventPools.nodeSpecific,
      "qingzhou:sub-town-east": [],
    },
  };

  const start = runtime.performAction(world, cultivator.id, "travel-to:qingzhou:sub-town-east");
  assert.equal(start.accepted, true);
  advanceWorld(world, 1);

  assert.ok(cultivator.pendingMoralityChoiceId, "travel event should create a pending morality choice");
  assert.equal(cultivator.spiritStones, beforeSpiritStones, "choice rewards should not apply before selection");

  const pending = getPendingMoralityChoice(world, cultivator.id);
  assert.equal(pending.choice?.choiceId, cultivator.pendingMoralityChoiceId);
  assert.equal(pending.choice?.options.length, 2);

  const resolved = resolveMoralityChoice(world, cultivator.id, {
    choiceId: pending.choice!.choiceId,
    optionId: "aid",
  });

  assert.equal(resolved.optionId, "aid");
  assert.equal(resolved.moralityScore, 3);
  assert.equal(resolved.moralityAlignment, "\u6b63\u9053");
  assert.equal(cultivator.pendingMoralityChoiceId, null);
});
