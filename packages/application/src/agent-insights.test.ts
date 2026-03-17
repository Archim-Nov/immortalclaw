import assert from "node:assert/strict";
import test from "node:test";
import {
  createSeedWorld,
  getDaoLogs,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
  getTribulationPreview,
  type CultivationRegistrationRecord,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import {
  buildAuthenticatedAgentEvents,
  readAuthenticatedAgentDaoLogs,
  readAuthenticatedAgentRegistration,
  readAuthenticatedAgentSectInfo,
  readAuthenticatedAgentStrategy,
  readAuthenticatedAgentTribulation,
} from "./agent-insights.js";

function createAgentProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
    ...overrides,
  };
}

function createWorldContext() {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  return {
    world,
    cultivatorId,
    agent: createAgentProfile({ selectedCultivatorId: cultivatorId }),
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

test("buildAuthenticatedAgentEvents assembles filtered events and combats in application", async () => {
  const { world, cultivatorId, agent } = createWorldContext();
  world.tick = 24;
  world.worldEvents.unshift(
    {
      id: "event-keep",
      tick: 22,
      cultivatorId,
      zoneId: "qingzhou",
      title: "Keep",
      content: "Recent event",
      severity: "medium",
      tags: ["quest"],
    },
    {
      id: "event-drop",
      tick: 12,
      cultivatorId,
      zoneId: "qingzhou",
      title: "Drop",
      content: "Old event",
      severity: "low",
      tags: ["old"],
    },
  );
  world.combatLogs.unshift(
    {
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
    },
    {
      id: "combat-drop",
      tick: 10,
      cultivatorId,
      zoneId: "qingzhou:wilderness",
      encounterId: "mine-beast",
      enemyName: "Old Wolf",
      outcome: "victory",
      damageTaken: 2,
      spiritualPowerSpent: 4,
      loot: {},
      summary: "Too old.",
    },
  );

  const payload = await buildAuthenticatedAgentEvents({
    repository: {
      async readWorld(): Promise<WorldState> {
        return world;
      },
    },
    agent,
    sinceTick: 20,
  });

  assert.equal(payload.agent.agentId, "agent-1");
  assert.equal(payload.tick, 24);
  assert.deepEqual(
    payload.events.map((event) => event.id),
    ["event-keep"],
  );
  assert.deepEqual(
    payload.combats.map((combat) => combat.id),
    ["combat-keep"],
  );
});

test("authenticated insight readers derive strategy, tribulation, sect, dao logs, and registration from the bound cultivator", async () => {
  const { world, cultivatorId, agent } = createWorldContext();
  const sectId = Object.keys(world.sects)[0];

  if (!sectId) {
    throw new Error("Seed world should include at least one sect.");
  }

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
  world.daoLogs.unshift({
    id: "dao-1",
    cultivatorId,
    tick: 9,
    title: "Stillness",
    content: "The dao heart steadies.",
    tags: ["reflection"],
  });

  const expectedStrategy = getStrategySnapshot(world, cultivatorId);
  const expectedTribulation = getTribulationPreview(world, cultivatorId);
  const expectedSect = getSectInfo(world, cultivatorId);
  const expectedDaoLogs = getDaoLogs(world, cultivatorId);
  const registrationRecord = createRegistrationRecord();

  const repository = {
    async readWorld(): Promise<WorldState> {
      return world;
    },
    async getCultivationRegistration(inputCultivatorId: string) {
      assert.equal(inputCultivatorId, cultivatorId);
      return registrationRecord;
    },
  };

  assert.deepEqual(await readAuthenticatedAgentStrategy({ repository, agent }), expectedStrategy);
  assert.deepEqual(await readAuthenticatedAgentTribulation({ repository, agent }), expectedTribulation);
  assert.deepEqual(await readAuthenticatedAgentSectInfo({ repository, agent }), expectedSect);
  assert.deepEqual(await readAuthenticatedAgentDaoLogs({ repository, agent }), expectedDaoLogs);
  assert.deepEqual(await readAuthenticatedAgentRegistration({ repository, agent }), registrationRecord);
});
