import assert from "node:assert/strict";
import test from "node:test";
import {
  createSeedWorld,
  type ActionExecutionResult,
  type ActionId,
  type CultivationRegistrationRecord,
  type TickSummary,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord, TickRunRecord } from "../../persistence/src/world-repository.js";
import {
  advanceAuthenticatedAgentWorld,
  performAuthenticatedAgentAction,
  saveAuthenticatedAgentRegistration,
} from "./agent-operations.js";

function createAgentProfile(): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-9",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
  };
}

function createRegistrationRecord(): CultivationRegistrationRecord {
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
      core_temperament: "Calm strategist",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "Patient observer",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "Water-Earth / Latent Guard",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator whose answers map cleanly onto stable taxonomy ids.",
  };
}

test("saveAuthenticatedAgentRegistration binds the record to the authenticated cultivator", async () => {
  const record = createRegistrationRecord();
  const calls: { cultivatorId?: string; savedByAgentId?: string | null } = {};

  const payload = await saveAuthenticatedAgentRegistration({
    repository: {
      async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
        const world = createSeedWorld();
        const cultivator = Object.keys(world.cultivators)[0];
        if (!cultivator) {
          throw new Error("Seed world should include at least one cultivator.");
        }
        world.cultivators["cultivator-9"] = {
          ...world.cultivators[cultivator],
          id: "cultivator-9",
          registrationRecord: null,
        };
        const result = mutator(world);
        const stored = world.cultivators["cultivator-9"]?.registrationRecord;
        calls.cultivatorId = stored?.cultivator_id;
        calls.savedByAgentId = stored?.agent_id ?? null;
        return result;
      },
    },
    agent: createAgentProfile(),
    record,
  });

  assert.equal(calls.cultivatorId, "cultivator-9");
  assert.equal(calls.savedByAgentId, "agent-1");
  assert.equal(payload.result.core_temperament_id, "qian_yuan");
});

test("performAuthenticatedAgentAction executes against the bound cultivator", async () => {
  const calls: { cultivatorId?: string; actionId?: ActionId } = {};
  const result: ActionExecutionResult = {
    tick: 4,
    cultivatorId: "cultivator-9",
    actionId: "cultivate",
    accepted: true,
    status: "in_progress",
    summary: "Cultivation started.",
  };

  const payload = await performAuthenticatedAgentAction({
    repository: {
      async performAction(cultivatorId, actionId) {
        calls.cultivatorId = cultivatorId;
        calls.actionId = actionId;
        return result;
      },
    },
    agent: createAgentProfile(),
    actionId: "cultivate",
  });

  assert.equal(calls.cultivatorId, "cultivator-9");
  assert.equal(calls.actionId, "cultivate");
  assert.deepEqual(payload, result);
});

test("advanceAuthenticatedAgentWorld uses a manual trigger", async () => {
  const calls: { steps?: number; trigger?: TickRunRecord["trigger"] } = {};
  const result: TickSummary = {
    tick: 8,
    advancedTicks: 4,
    settledJobs: [],
    triggeredEvents: [],
    activeCombats: [],
  };

  const payload = await advanceAuthenticatedAgentWorld({
    repository: {
      async advanceWorld(steps, trigger) {
        calls.steps = steps;
        calls.trigger = trigger;
        return result;
      },
    },
    steps: 4,
  });

  assert.equal(calls.steps, 4);
  assert.equal(calls.trigger, "manual");
  assert.deepEqual(payload, result);
});
