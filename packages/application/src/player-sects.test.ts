import assert from "node:assert/strict";
import test from "node:test";
import {
  type CultivationRegistrationRecord,
  createSeedWorld,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { buildAuthenticatedAgentActions } from "./agent-actions.js";
import * as application from "./index.js";

function createAgentProfile(selectedCultivatorId: string): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
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
    summary: "Application test registration record.",
  };
}

test("buildAuthenticatedAgentActions adds only one generic player-sect review todo even with 100+ pending applications", async () => {
  const world = createSeedWorld() as WorldState & {
    pendingSectApplications?: Record<string, unknown>;
    sectReapplyCooldowns?: Record<string, unknown>;
  };
  const founder = world.cultivators["yun-zhong-he"]!;
  founder.sectId = "qing-yue-zong";
  founder.sectTitle = "\u5b97\u4e3b";
  world.sects["qing-yue-zong"] = {
    id: "qing-yue-zong",
    name: "\u9752\u5cb3\u5b97",
    alignment: "\u6b63\u9053",
    stateId: "qingzhou",
    founderCultivatorId: founder.id,
    treasury: 8000,
    memberIds: [founder.id],
    spiritVeins: ["\u9752\u5cb3\u7075\u8109"],
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
      agentId: `agent-pending-${index}`,
      name: `Pending ${index}`,
    });
    const applicationId = `application-${index}`;
    saveCultivationRegistration(
      world,
      summary.selectedCultivatorId,
      createRegistrationRecord("seek-truth"),
      `agent-pending-${index}`,
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

  const payload = await buildAuthenticatedAgentActions({
    world: {
      async listAvailableActions() {
        return [
          {
            actionId: "cultivate",
            label: "Cultivate",
            description: "Baseline action.",
            durationTicks: 3,
            kind: "timed" as const,
          },
        ];
      },
      async readWorld() {
        return world;
      },
    } as never,
    agent: createAgentProfile(founder.id),
  });

  const actionIds = payload.actions.map((action) => action.actionId);
  assert.equal(actionIds.filter((actionId) => actionId === "review-player-sect-applications").length, 1);
  assert.equal(actionIds.some((actionId) => actionId.startsWith("review-player-sect-applications:")), false);
});

test("application package exports player-sect workflow helpers", () => {
  const api = application as typeof application & {
    foundAuthenticatedPlayerSect?: unknown;
    listAuthenticatedPlayerSectRecruitment?: unknown;
    applyAuthenticatedPlayerSectApplication?: unknown;
    listAuthenticatedSectApplications?: unknown;
    reviewAuthenticatedSectApplication?: unknown;
    updateAuthenticatedSectAdmissionPolicy?: unknown;
  };

  assert.equal(typeof api.foundAuthenticatedPlayerSect, "function");
  assert.equal(typeof api.listAuthenticatedPlayerSectRecruitment, "function");
  assert.equal(typeof api.applyAuthenticatedPlayerSectApplication, "function");
  assert.equal(typeof api.listAuthenticatedSectApplications, "function");
  assert.equal(typeof api.reviewAuthenticatedSectApplication, "function");
  assert.equal(typeof api.updateAuthenticatedSectAdmissionPolicy, "function");
});
