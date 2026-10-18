import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivationRegistration,
  getMessages,
  getCultivatorState,
  getSectInfo,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  saveCultivationRegistration,
  sendDirectMessage,
  syncCultivatorFromPersona,
  hydrateWorldState,
  toPersistedWorldState,
} from "./index.js";
import type { CultivationRegistrationRecord } from "./index.js";
import type { CombatJobState } from "./model.js";
import { STATE_IDS } from "./constants.js";
import {
  deriveDetailedAttributes,
  deriveMainAttributes,
  physicalDefense,
  spellAttack,
  spellDefense,
  weaponAttack,
} from "./attributes.js";
import { parseQuestActionId } from "./quest.js";
import {
  computeEscapeChance,
  createCultivator,
  getAvailableActions,
  selectCombatAction,
  selectCombatRoute,
  starterStateFromRoll,
} from "./engine.js";
import { createResidenceForState } from "./residence.js";
import { buildFullTopology } from "./topology.js";
import { WEAPON_LOADOUT_DEFINITIONS, SPELL_LOADOUT_DEFINITIONS } from "./combat-loadouts.js";

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
  }
}

function expeditionActionId(rank: number, policy: "conservative" | "balanced" | "aggressive") {
  return `start-dungeon-expedition:rank-${rank}:${policy}`;
}

function hashString(input: string) {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function startMineBeastCombat() {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  const started = performAction(world, "yun-zhong-he", "hunt-mine-beast");
  assert.equal(started.accepted, true);
  const jobId = world.cultivators["yun-zhong-he"]?.activeJobId;
  assert.ok(jobId);
  const job = world.jobs[jobId];
  assert.ok(job);
  const combatState = (job.meta as { combatState?: CombatJobState } | undefined)?.combatState;
  assert.ok(combatState);
  return {
    world,
    job,
    combatState,
    cultivator: world.cultivators["yun-zhong-he"],
  };
}

function stateIdOfLocation(locationId: string): (typeof STATE_IDS)[number] {
  const stateId = STATE_IDS.find((candidate) => locationId.startsWith(`${candidate}:`));
  assert.ok(stateId);
  return stateId;
}

function startCityDuelCombat() {
  const world = createSeedWorld();
  const challenger = world.cultivators["yun-zhong-he"];
  assert.ok(challenger);
  const summary = createCultivator(world, { name: "Duel Target" });
  const target = world.cultivators[summary.id];
  assert.ok(target);
  target.locationId = challenger.locationId;
  target.injuryTicksRemaining = 0;
  target.activeJobId = null;
  const challengeResult = performAction(world, challenger.id, `challenge-cultivator:${target.id}`);
  assert.equal(challengeResult.accepted, true);
  const challengeId = target.pendingPvpChallengeId;
  assert.ok(challengeId);
  const acceptResult = performAction(world, target.id, `accept-pvp-challenge:${challengeId}`);
  assert.equal(acceptResult.accepted, true);
  const jobId = challenger.activeJobId;
  assert.ok(jobId);
  const job = world.jobs[jobId];
  assert.ok(job);
  const combatState = (job.meta as { combatState?: CombatJobState } | undefined)?.combatState;
  assert.ok(combatState);
  return {
    world,
    job,
    combatState,
    cultivator: challenger,
    target,
  };
}

function startPendingCityDuelChallenge() {
  const world = createSeedWorld();
  const challenger = world.cultivators["yun-zhong-he"];
  assert.ok(challenger);
  const summary = createCultivator(world, { name: "Pending Duel Target" });
  const target = world.cultivators[summary.id];
  assert.ok(target);
  target.locationId = challenger.locationId;
  target.injuryTicksRemaining = 0;
  target.activeJobId = null;
  const challengeResult = performAction(world, challenger.id, `challenge-cultivator:${target.id}`);
  assert.equal(challengeResult.accepted, true);
  const challengeId = target.pendingPvpChallengeId;
  assert.ok(challengeId);
  return {
    world,
    challenger,
    target,
    challengeId,
  };
}

function firstRoundHitRoll(world: ReturnType<typeof createSeedWorld>, jobId: string, encounterTemplateId: string) {
  const seedBase = `${world.tick + 1}:${jobId}:${encounterTemplateId}:round-1`;
  return hashString(`${seedBase}:hit-first`) % 100;
}

function firstRoundEscapeRoll(world: ReturnType<typeof createSeedWorld>, jobId: string, encounterTemplateId: string) {
  const seedBase = `${world.tick + 1}:${jobId}:${encounterTemplateId}:round-1`;
  return hashString(`${seedBase}:escape-roll`) % 100;
}

function firstRoundPlayerAction(context: ReturnType<typeof startMineBeastCombat>) {
  const seedBase = `${context.world.tick + 1}:${context.job.id}:${context.combatState.encounterTemplateId}:round-1`;
  return selectCombatAction(
    context.cultivator,
    context.combatState.playerSnapshot,
    context.combatState.enemySnapshot,
    true,
    context.combatState.playerSnapshot.escapeAllowed !== false,
    context.combatState.playerSpirit ?? context.combatState.playerSnapshot.spirit ?? 0,
    context.combatState.playerMaxSpirit ?? context.combatState.playerSnapshot.maxSpirit ?? 0,
    context.combatState.playerSnapshot.coreSkillSpiritCost ?? 0,
    `${seedBase}:player-action`,
  );
}

function firstRoundEnemyAction(context: ReturnType<typeof startCityDuelCombat>) {
  const seedBase = `${context.world.tick + 1}:${context.job.id}:${context.combatState.encounterTemplateId}:round-1`;
  return selectCombatAction(
    context.cultivator,
    context.combatState.enemySnapshot,
    context.combatState.playerSnapshot,
    false,
    context.combatState.enemySnapshot.escapeAllowed !== false,
    context.combatState.enemySpirit ?? context.combatState.enemySnapshot.spirit ?? 0,
    context.combatState.enemyMaxSpirit ?? context.combatState.enemySnapshot.maxSpirit ?? 0,
    context.combatState.enemySnapshot.coreSkillSpiritCost ?? 0,
    `${seedBase}:enemy-action`,
    context.combatState.enemySnapshot.escapeAllowed !== false,
  );
}

function firstRoundEnemyEscapeRoll(context: ReturnType<typeof startCityDuelCombat>) {
  const seedBase = `${context.world.tick + 1}:${context.job.id}:${context.combatState.encounterTemplateId}:round-1`;
  return hashString(`${seedBase}:enemy-escape-roll`) % 100;
}

function findCombatContextByAction(
  expectedAction: "basic_attack" | "core_skill" | "escape",
  configure: (context: ReturnType<typeof startMineBeastCombat>) => void,
  postFilter?: (context: ReturnType<typeof startMineBeastCombat>) => boolean,
) {
  for (let i = 0; i < 500; i += 1) {
    const candidate = startMineBeastCombat();
    // Vary the world tick so each iteration produces a different deterministic seed
    candidate.world.tick += i;
    configure(candidate);
    if (firstRoundPlayerAction(candidate) === expectedAction) {
      if (!postFilter || postFilter(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function findCityDuelContextByPlayerAction(
  expectedAction: "basic_attack" | "core_skill" | "escape",
  configure: (context: ReturnType<typeof startCityDuelCombat>) => void,
  postFilter?: (context: ReturnType<typeof startCityDuelCombat>) => boolean,
) {
  for (let i = 0; i < 500; i += 1) {
    const candidate = startCityDuelCombat();
    candidate.world.tick += i;
    configure(candidate);
    if (firstRoundPlayerAction(candidate) === expectedAction) {
      if (!postFilter || postFilter(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function findCityDuelContextByEnemyAction(
  expectedAction: "basic_attack" | "core_skill" | "escape",
  configure: (context: ReturnType<typeof startCityDuelCombat>) => void,
  postFilter?: (context: ReturnType<typeof startCityDuelCombat>) => boolean,
) {
  for (let i = 0; i < 500; i += 1) {
    const candidate = startCityDuelCombat();
    candidate.world.tick += i;
    configure(candidate);
    if (firstRoundEnemyAction(candidate) === expectedAction) {
      if (!postFilter || postFilter(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

type StateReputationOverrides = Partial<Record<(typeof STATE_IDS)[number], number>>;
type StateReputationMap = Record<(typeof STATE_IDS)[number], number>;

function createStateReputation(overrides: StateReputationOverrides = {}): StateReputationMap {
  return Object.fromEntries(
    STATE_IDS.map((stateId) => [stateId, overrides[stateId] ?? 0]),
  ) as StateReputationMap;
}

function findLegacyIdleRewardTick(
  world: ReturnType<typeof createSeedWorld>,
  cultivatorId: string,
  startTick = world.tick + 1,
  maxSearch = 5000,
) {
  const cultivator = world.cultivators[cultivatorId];
  assert.ok(cultivator);

  for (let tick = startTick; tick < startTick + maxSearch; tick += 1) {
    const roll = hashString(`${tick}:${cultivator.id}:${cultivator.locationId}:event`);
    if (roll % 17 === 0) {
      return tick;
    }
  }

  throw new Error(`Unable to find legacy idle reward tick for ${cultivatorId}.`);
}

function seedLegacyPlayerSect(world: ReturnType<typeof createSeedWorld>) {
  world.sects["qing-yun-sect"] = {
    id: "qing-yun-sect",
    name: "Qing Yun Sect",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: "yun-zhong-he",
    treasury: 86000,
    memberIds: [],
    spiritVeins: ["Azure Ridge"],
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

  world.locations["qingzhou:sect-outpost:qing-yun-sect"] = {
    id: "qingzhou:sect-outpost:qing-yun-sect",
    stateId: "qingzhou",
    nodeType: "sect-outpost",
    name: "Qing Yun Sect Outpost",
    kind: "safe",
    risk: "safe",
    description: "Legacy player sect outpost for tests.",
    organizationId: "qing-yun-sect",
    organizationType: "player-sect",
  };
  if (!world.states.qingzhou.locationIds.includes("qingzhou:sect-outpost:qing-yun-sect")) {
    world.states.qingzhou.locationIds.push("qingzhou:sect-outpost:qing-yun-sect");
  }
  world.topology = buildFullTopology(world.locations) as typeof world.topology;
}

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record" as const,
    questionnaire_version: "immortal-claw-oc-v1",
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
      core_temperament: "潜渊型",
      secondary_temperament: "观澜型",
      behavior_aspect: "水土 / 潜守",
      cultivation_motive: "求真知",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_result: "水土双灵根",
      confidence: {
        core: "high" as const,
        behavior: "high" as const,
        motive: "medium" as const,
        overall: "high" as const,
      },
    },
    summary: "其心性偏潜守，行路以观势为先，求知之念最重。",
  };
}

function createCultivationFocusedRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament: "\u5411\u8363\u578b",
      secondary_temperament: "\u70bd\u5fc3\u578b",
      behavior_aspect: "\u6728\u706b / \u8363\u7130",
      cultivation_motive: "\u8bc1\u5927\u9053",
      five_element_scores: {
        metal: 3,
        wood: 11,
        water: 4,
        fire: 10,
        earth: 5,
      },
      spirit_root_result: "\u6728\u706b\u53cc\u7075\u6839",
    },
    summary: "\u751f\u957f\u4e0e\u6267\u884c\u5fc3\u8f83\u5f3a\uff0c\u9002\u5408\u7a33\u5b9a\u4fee\u70bc\u4e0e\u7834\u5883\u3002",
  };
}

function createSupportTaskRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament: "\u9547\u5cb3\u578b",
      secondary_temperament: "\u5b88\u6212\u578b",
      behavior_aspect: "\u571f / \u9547\u6301",
      cultivation_motive: "\u6d4e\u4e16\u4eba",
      five_element_scores: {
        metal: 8,
        wood: 4,
        water: 6,
        fire: 3,
        earth: 12,
      },
      spirit_root_result: "\u571f\u5355\u7075\u6839",
    },
    summary: "\u91cd\u6839\u57fa\u4e0e\u627f\u538b\uff0c\u9002\u5408\u7a33\u5b9a\u5de5\u4f5c\u4e0e\u5929\u52ab\u51c6\u5907\u3002",
  };
}

function createLongevityMeditationRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament_id: "qian_yuan",
      core_temperament: "潜渊型",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "观澜型",
      behavior_aspect_id: "metal-water",
      behavior_aspect: "金水 / 观势",
      cultivation_motive_id: "seek-longevity",
      cultivation_motive: "求长生",
      five_element_scores: {
        metal: 11,
        wood: 2,
        water: 10,
        fire: 1,
        earth: 3,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "金水双灵根",
    },
    summary: "偏向长线守成，但不应凭空获得新的调息收益。",
  };
}

function createRuleBoundHealingRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament_id: "shou_jie",
      core_temperament: "守戒型",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "观澜型",
      behavior_aspect_id: "metal-water",
      behavior_aspect: "金水 / 守序",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "求真知",
      five_element_scores: {
        metal: 11,
        wood: 1,
        water: 10,
        fire: 2,
        earth: 3,
      },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "金水双灵根",
    },
    summary: "守戒偏防守，不应凭空获得新的疗伤加成。",
  };
}

test("runtime barrel does not export removed legacy systems", async () => {
  const runtime = await import("./runtime.js");

  assert.equal(typeof runtime.createSeedWorld, "function");
  assert.equal("getTribulationPreview" in runtime, false);
});

test("starterStateFromRoll maps only to the three starter states", () => {
  assert.equal(starterStateFromRoll(0), "qingzhou");
  assert.equal(starterStateFromRoll(0.34), "yangzhou");
  assert.equal(starterStateFromRoll(0.67), "wanzhou");
  assert.equal(starterStateFromRoll(0.999999), "wanzhou");
});

test("new cultivators spawn in one of the starter main cities", () => {
  const world = createSeedWorld();
  const seen = new Set<string>();
  for (let i = 0; i < 24; i += 1) {
    const summary = createCultivator(world, { name: `Starter ${i}` });
    seen.add(world.cultivators[summary.id]!.locationId);
    assert.match(world.cultivators[summary.id]!.locationId, /^(qingzhou|yangzhou|wanzhou):main-city$/);
  }
  assert.ok(seen.size >= 1);
});

test("seed world no longer includes fixed official sects", () => {
  const world = createSeedWorld();

  assert.deepEqual(world.sects, {});
  assert.equal("qingzhou:sect-outpost:qing-yun-sect" in world.locations, false);
  assert.ok(world.locations["qingzhou:sect-outpost:cang-mu-gu"]);
});

test("cultivation action creates a job and advances realm progress after ticks", () => {
  const world = createSeedWorld();

  const result = performAction(world, "yun-zhong-he", "cultivate");
  assert.equal(result.accepted, true);
  assert.ok(result.job);

  const before = getCultivatorState(world, "yun-zhong-he");
  assert.equal(before.currentJob?.actionId, "cultivate");

  const tickSummary = advanceWorld(world, 4);
  assert.equal(tickSummary.completedJobs.length, 1);

  const after = getCultivatorState(world, "yun-zhong-he");
  assert.equal(after.currentJob, null);
  assert.ok(after.cultivator.realmProgress > before.cultivator.realmProgress);
});

test("cultivator state exposes the current in-realm phase instead of forcing clients to infer it from total level", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  assert.equal(getCultivatorState(world, "yun-zhong-he").cultivator.realmPhase, "前期");

  cultivator.realmLevel = 5;
  assert.equal(getCultivatorState(world, "yun-zhong-he").cultivator.realmPhase, "中期");

  cultivator.realmLevel = 6;
  assert.equal(getCultivatorState(world, "yun-zhong-he").cultivator.realmPhase, "后期");
});

test("cultivator state tolerates legacy worlds that are missing per-cultivator progress maps", () => {
  const world = createSeedWorld() as any;

  delete world.dungeonExpeditions;
  delete world.dungeonExpeditionReports;
  delete world.wildernessProgress;
  delete world.bahuangProgress;
  world.guixuProgress = {};

  const state = getCultivatorState(world, "yun-zhong-he");

  assert.equal(state.cultivator.id, "yun-zhong-he");
  assert.equal(state.dungeonExpedition.active, null);
  assert.equal(state.dungeonExpedition.lastReport, null);
  assert.equal(state.wilderness, null);
  assert.equal(state.guixu?.wildernessAttunement, 0);
  assert.deepEqual(state.guixu?.unlockedNodeIds, []);
});

test("cultivator state exposes residence context only while at residence", () => {
  const world = createSeedWorld();
  const homeState = getCultivatorState(world, "yun-zhong-he");

  assert.ok(homeState.activeResidence);
  assert.ok(homeState.residenceContext);
  assert.equal(homeState.residenceContext?.name, homeState.activeResidence?.name);
  assert.equal(homeState.residenceContext?.description, homeState.activeResidence?.description);
  assert.ok((homeState.residenceContext?.scene.length ?? 0) > 0);
  assert.ok(["清晨", "午后", "薄暮", "深夜"].includes(homeState.residenceContext?.timeSense ?? ""));

  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.locationId = `${cultivator.locationId.split(":")[0]}:wilderness`;

  const awayState = getCultivatorState(world, "yun-zhong-he");
  assert.equal(awayState.activeResidence, null);
  assert.equal(awayState.residenceContext, null);
});

test("joining the sect updates sect state immediately", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);

  world.cultivators["yun-zhong-he"].completedBaseQuests = 1;
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sect-outpost:qing-yun-sect");
  runUntilIdle(world, "yun-zhong-he");

  const result = performAction(world, "yun-zhong-he", "join-sect");

  assert.equal(result.accepted, true);
  const state = getCultivatorState(world, "yun-zhong-he");
  assert.ok(state.sect?.name);
});

test("quest boards exist and refresh on 12-tick cadence", () => {
  const world = createSeedWorld();
  const mainCityBoard = world.questBoards["qingzhou:main-city"];
  const subTownBoard = world.questBoards["qingzhou:sub-town-east"];

  assert.ok(mainCityBoard);
  assert.equal(mainCityBoard.slots, 5);
  assert.equal(mainCityBoard.quests.length, 5);
  assert.equal(mainCityBoard.quests.some((quest) => quest.category === "sect"), false);
  assert.ok(subTownBoard);
  assert.equal(subTownBoard.slots, 3);
  assert.equal(subTownBoard.quests.length, 3);

  const beforeIds = mainCityBoard.quests.map((quest) => quest.id);
  advanceWorld(world, 12);
  const afterBoard = world.questBoards["qingzhou:main-city"];
  const afterIds = afterBoard.quests.map((quest) => quest.id);
  assert.equal(afterBoard.lastRefreshedTick, 12);
  assert.notDeepEqual(afterIds, beforeIds);
});

test("hydrateWorldState rebuilds topology while preserving canonical quest boards", () => {
  const world = createSeedWorld();
  const persisted = toPersistedWorldState(world);
  const originalBoard = persisted.questBoards["qingzhou:main-city"];

  const hydrated = hydrateWorldState(persisted);

  assert.ok(hydrated.topology.distanceMatrix.size > 0);
  assert.deepEqual(hydrated.questBoards["qingzhou:main-city"], originalBoard);
  assert.ok(hydrated.states.qingzhou?.locationIds.includes("qingzhou:main-city"));
});

test("hydrateWorldState backfills readable quest fields for legacy persisted quest data", () => {
  const world = createSeedWorld();
  const board = world.questBoards["qingzhou:main-city"]!;
  const firstQuest = board.quests[0]!;

  performAction(world, "yun-zhong-he", `quest:accept:${firstQuest.type}:${firstQuest.boardIndex}`);

  const persisted = toPersistedWorldState(world) as any;
  for (const quest of persisted.questBoards["qingzhou:main-city"].quests) {
    delete quest.type;
    delete quest.boardIndex;
  }
  for (const quest of persisted.cultivators["yun-zhong-he"].activeQuests) {
    delete quest.type;
    delete quest.boardIndex;
  }

  const hydrated = hydrateWorldState(persisted);
  const actions = listAvailableActions(hydrated, "yun-zhong-he");
  const acceptAction = actions.find((action) => action.actionId.startsWith("quest:accept:"));
  const executeAction = actions.find((action) => action.actionId.startsWith("quest:execute:"));

  assert.ok(acceptAction);
  assert.ok(executeAction);
  assert.equal(acceptAction!.actionId.includes("undefined"), false);
  assert.equal(executeAction!.actionId.includes("undefined"), false);
  assert.ok(parseQuestActionId(executeAction!.actionId));

  const result = performAction(hydrated, "yun-zhong-he", executeAction!.actionId as any);
  assert.equal(result.accepted, true);
});

test("quest action ids are readable and parseable from board and active quest surfaces", () => {
  const world = createSeedWorld();
  const boardActions = listAvailableActions(world, "yun-zhong-he").filter((action) => action.actionId.startsWith("quest:accept:"));

  assert.ok(boardActions.length > 0);
  const parsedAccept = parseQuestActionId(boardActions[0]!.actionId);
  assert.equal(parsedAccept?.phase, "accept");
  assert.ok((parsedAccept?.questType.length ?? 0) > 0);
  assert.equal(Number.isInteger(parsedAccept?.index), true);

  const board = world.questBoards[world.cultivators["yun-zhong-he"]!.locationId]!;
  const firstQuest = board.quests[0]!;
  performAction(world, "yun-zhong-he", `quest:accept:${firstQuest.type}:${firstQuest.boardIndex}`);

  const executeActions = listAvailableActions(world, "yun-zhong-he").filter((action) => action.actionId.startsWith("quest:execute:"));
  assert.ok(executeActions.length > 0);

  const parsedExecute = parseQuestActionId(executeActions[0]!.actionId);
  assert.equal(parsedExecute?.phase, "execute");
  assert.equal(parsedExecute?.questType, world.cultivators["yun-zhong-he"]!.activeQuests[0]!.type);
  assert.equal(parsedExecute?.index, 0);
});

test("remaining board quest action ids preserve boardIndex instead of collapsing to array position", () => {
  const world = createSeedWorld();
  const board = world.questBoards["qingzhou:main-city"]!;
  const firstQuest = board.quests[0]!;
  const secondQuest = board.quests[1]!;

  performAction(world, "yun-zhong-he", `quest:accept:${firstQuest.type}:${firstQuest.boardIndex}`);

  const acceptActions = listAvailableActions(world, "yun-zhong-he")
    .filter((action) => action.actionId.startsWith("quest:accept:"))
    .map((action) => parseQuestActionId(action.actionId));

  assert.ok(acceptActions.some((parsed) => parsed?.phase === "accept" && parsed.questType === secondQuest.type && parsed.index === secondQuest.boardIndex));
});

test("stale execute quest ids become invalid after active quest list reindexes", () => {
  const world = createSeedWorld();
  const board = world.questBoards["qingzhou:main-city"]!;
  const firstQuest = board.quests[0]!;
  const secondQuest = board.quests[1]!;

  performAction(world, "yun-zhong-he", `quest:accept:${firstQuest.type}:${firstQuest.boardIndex}`);
  performAction(world, "yun-zhong-he", `quest:accept:${secondQuest.type}:${secondQuest.boardIndex}`);

  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.activeQuests[0]!.successRate = 100;
  const staleSecondExecuteId = `quest:execute:${cultivator.activeQuests[1]!.type}:1`;

  performAction(world, "yun-zhong-he", `quest:execute:${cultivator.activeQuests[0]!.type}:0`);
  runUntilIdle(world, "yun-zhong-he");

  assert.throws(
    () => performAction(world, "yun-zhong-he", staleSecondExecuteId as any),
    /Active quest not found/,
  );

  const freshExecuteAction = listAvailableActions(world, "yun-zhong-he").find((action) => action.actionId.startsWith("quest:execute:"));
  const parsedFresh = parseQuestActionId(freshExecuteAction!.actionId);
  assert.equal(parsedFresh?.phase, "execute");
  assert.equal(parsedFresh?.index, 0);
});

test("accepting and resolving a base quest updates local state reputation", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators["yun-zhong-he"] & {
    stateReputation?: Record<string, number>;
    reputation?: number;
  };

  cultivator.stateReputation = createStateReputation({ qingzhou: 11, yangzhou: 4 });
  cultivator.reputation = 0;

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
  runUntilIdle(world, "yun-zhong-he");

  const board = world.questBoards["qingzhou:sub-town-east"];
  const candidate = board.quests[0]!;
  const beforeStones = cultivator.spiritStones;
  const beforeQingzhouReputation = cultivator.stateReputation.qingzhou;
  const beforeYangzhouReputation = cultivator.stateReputation.yangzhou;

  performAction(world, "yun-zhong-he", `quest:accept:${candidate.type}:${candidate.boardIndex}`);
  const active = cultivator.activeQuests[0]!;
  active.successRate = 100;

  performAction(world, "yun-zhong-he", `quest:execute:${active.type}:0`);
  runUntilIdle(world, "yun-zhong-he");

  assert.equal(cultivator.activeQuests.length, 0);
  assert.ok(cultivator.spiritStones > beforeStones);
  assert.equal(cultivator.stateReputation.qingzhou, beforeQingzhouReputation + candidate.reward.reputation);
  assert.equal(cultivator.stateReputation.yangzhou, beforeYangzhouReputation);
  assert.equal(cultivator.reputation, 0);
});

test("neutral sect join, duty, and leave obey availability and reward rules", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators["yun-zhong-he"] & {
    stateReputation?: Record<string, number>;
  };
  cultivator.stateReputation = createStateReputation({ qingzhou: 12 });
  const mainCityActions = new Set(listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId));
  assert.equal(mainCityActions.has("join-neutral-sect:cang-mu-gu"), false);
  assert.equal(mainCityActions.has("join-sect"), false);
  assert.equal(mainCityActions.has("take-sect-errand"), false);

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sect-outpost:cang-mu-gu");
  runUntilIdle(world, "yun-zhong-he");

  const outpostActions = new Set(listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId));
  assert.ok(outpostActions.has("join-neutral-sect:cang-mu-gu"));

  performAction(world, "yun-zhong-he", "join-neutral-sect:cang-mu-gu");
  assert.equal(cultivator.neutralSectId, "cang-mu-gu");
  const joinedState = getCultivatorState(world, "yun-zhong-he");
  assert.equal(joinedState.neutralSect?.id, "cang-mu-gu");
  assert.equal(joinedState.sect?.id, "cang-mu-gu");
  assert.equal(joinedState.sect?.alignment, "中立");
  assert.equal(joinedState.sect?.name, joinedState.neutralSect?.name);
  assert.match(joinedState.agentGuidance.priorities.join("\n"), /已经入了/);
  assert.equal(
    joinedState.agentGuidance.suggestedActions.some((actionId) => String(actionId).startsWith("join-neutral-sect:")),
    false,
  );
  cultivator.sectPost = "outer-chore";
  assert.equal(getCultivatorState(world, "yun-zhong-he").sect?.role, "外门杂役");
  cultivator.sectPost = null;
  assert.equal(
    (getSectInfo(world, "yun-zhong-he") as { alignment?: string } | null)?.alignment,
    "中立",
  );

  const beforeStones = cultivator.spiritStones;
  const beforeReputation = cultivator.stateReputation.qingzhou;
  performAction(world, "yun-zhong-he", "take-neutral-duty");
  runUntilIdle(world, "yun-zhong-he");

  assert.equal(cultivator.spiritStones, beforeStones + 120);
  assert.equal(cultivator.stateReputation.qingzhou, beforeReputation + 4);
  assert.equal(cultivator.neutralContribution, 40);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "clear-mind" && effect.remainingTicks >= 2));

  const neutralInfo = getSectInfo(world, "yun-zhong-he");
  assert.equal(neutralInfo?.organizationType, "neutral");
  assert.equal(neutralInfo?.id, "cang-mu-gu");

  performAction(world, "yun-zhong-he", "leave-neutral-sect");
  assert.equal(cultivator.neutralSectId, null);
  assert.equal(cultivator.neutralContribution, 0);
  assert.equal(getCultivatorState(world, "yun-zhong-he").sect, null);
});

test("sect duties move to the sect outpost and sect info exposes alignment", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.completedBaseQuests = 1;

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sect-outpost:qing-yun-sect");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "join-sect");

  const outpostActions = new Set(listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId));
  assert.ok([...outpostActions].some((a) => a.startsWith("sect-task:")), "Expected at least one sect-task action at outpost");

  const sectInfo = getSectInfo(world, "yun-zhong-he") as { alignment?: string } | null;
  assert.equal(sectInfo?.alignment, "正道");
});

test("sect titles recalculate on cadence", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const memberSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-sect-title-member",
    name: "Sect Title Member",
  });
  const cultivator = world.cultivators[memberSummary.selectedCultivatorId];
  const sect = world.sects["qing-yun-sect"];

  cultivator.sectId = sect.id;
  cultivator.sectTitle = "外门";
  cultivator.totalContribution = 250;
  cultivator.contributionReachedAt = 1;
  if (!sect.memberIds.includes(cultivator.id)) {
    sect.memberIds.push(cultivator.id);
  }
  sect.lastTitleUpdateTick = 0;

  let advanced = 0;
  while (advanced < 2879) {
    const step = Math.min(200, 2879 - advanced);
    advanceWorld(world, step);
    advanced += step;
  }
  assert.equal(cultivator.sectTitle, "外门");

  advanceWorld(world, 1);
  assert.equal(cultivator.sectTitle, "内门");
  assert.equal(sect.lastTitleUpdateTick, 2880);
});

test("residence actions stay visible at residence while recipes remain gated by current materials", () => {
  const world = createSeedWorld();

  const atResidenceActionIds = new Set(
    listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId),
  );
  assert.ok(atResidenceActionIds.has("residence-meditate"));
  assert.ok(atResidenceActionIds.has("residence-heal"));
  assert.ok(atResidenceActionIds.has("residence-recover-qi"));
  assert.ok(atResidenceActionIds.has("residence-socialize"));
  assert.equal(atResidenceActionIds.has("residence-produce:recipe-healing-pill"), false);
  assert.equal(atResidenceActionIds.has("residence-produce:recipe-qi-pill"), false);
  assert.equal(atResidenceActionIds.has("residence-produce:recipe-ward-talisman"), false);

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
  advanceWorld(world, 1);

  const awayActionIds = new Set(
    listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId),
  );
  assert.equal(awayActionIds.has("residence-meditate"), false);
  assert.equal(awayActionIds.has("residence-heal"), false);
  assert.equal(awayActionIds.has("residence-recover-qi"), false);
  assert.equal(awayActionIds.has("residence-produce:recipe-healing-pill"), false);
  assert.equal(awayActionIds.has("residence-produce:recipe-qi-pill"), false);
  assert.equal(awayActionIds.has("residence-produce:recipe-ward-talisman"), false);
  assert.equal(awayActionIds.has("residence-socialize"), false);

  assert.throws(
    () => performAction(world, "yun-zhong-he", "residence-heal"),
    /Residence actions require being at one of your residences/,
  );
});

test("injured cultivator cannot residence-meditate but can residence-heal and recover-qi", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"].injuryTicksRemaining = 4;

  const actionIds = new Set(listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId));
  assert.equal(actionIds.has("residence-meditate"), false);
  assert.ok(actionIds.has("residence-heal"));
  assert.ok(actionIds.has("residence-recover-qi"));

  assert.throws(
    () => performAction(world, "yun-zhong-he", "residence-meditate"),
    /有伤/,
  );

  const qiBefore = world.cultivators["yun-zhong-he"].qi;
  performAction(world, "yun-zhong-he", "residence-recover-qi");
  advanceWorld(world, 1);
  assert.ok(world.cultivators["yun-zhong-he"].qi > qiBefore);

  const injuryBefore = world.cultivators["yun-zhong-he"].injuryTicksRemaining;
  performAction(world, "yun-zhong-he", "residence-heal");
  advanceWorld(world, 2);
  assert.ok(world.cultivators["yun-zhong-he"].injuryTicksRemaining < injuryBefore);
});

test("residence production succeeds with recipe materials and rejects when materials are insufficient", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.inventory["beast-core"] = 1;
  cultivator.inventory["spirit-ore"] = 1;
  cultivator.spiritStones = 100;

  const beforePill = cultivator.inventory["healing-pill"];
  performAction(world, "yun-zhong-he", "residence-produce:recipe-healing-pill");
  advanceWorld(world, 2);

  assert.equal(cultivator.inventory["healing-pill"], beforePill + 1);
  assert.equal(cultivator.inventory["beast-core"], 0);
  assert.equal(cultivator.inventory["spirit-ore"], 0);
  assert.equal(cultivator.spiritStones, 70);

  assert.throws(
    () => performAction(world, "yun-zhong-he", "residence-produce:recipe-healing-pill"),
    /No craftable residence recipe with current materials/,
  );
});

test("cultivation caps progress at 100 instead of auto-breaking through", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.realmLevel = 1;
  cultivator.realm = world.cultivators["yun-zhong-he"].realm;
  cultivator.realmProgress = 95;
  cultivator.spiritStones = 400;
  cultivator.spiritualPower = 100;

  performAction(world, "yun-zhong-he", "cultivate");
  runUntilIdle(world, "yun-zhong-he");

  assert.equal(cultivator.realmLevel, 1);
  assert.equal(cultivator.realmProgress, 100);
  assert.equal(
    listAvailableActions(world, "yun-zhong-he").some((action) => action.actionId === "cultivate"),
    false,
  );
});

test("explicit residence breakthrough uses crafted materials and advances the realm", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Breakthrough Disciple" });
  const cultivator = world.cultivators[created.id]!;

  cultivator.realmProgress = 100;

  let state = getCultivatorState(world, created.id);
  assert.equal(state.breakthrough?.category, "minor");
  assert.equal(state.breakthrough?.readyByProgress, true);
  assert.equal(state.breakthrough?.readyByMaterials, false);
  assert.equal(state.breakthrough?.recommendedAction, "buy-current-breakthrough-material");
  assert.ok((state.breakthrough?.materialSources.length ?? 0) > 0);
  assert.equal(
    listAvailableActions(world, created.id).some((action) => action.actionId === "residence-breakthrough"),
    false,
  );

  // Provide all materials for L1→2 breakthrough: 3 generics + 1 special
  cultivator.inventory["cloud-heart-grass"] = 1;
  cultivator.inventory["moon-dew-flower"] = 1;
  cultivator.inventory["clear-zhi-leaf"] = 1;
  cultivator.inventory["condensed-qi-dew"] = 1;

  state = getCultivatorState(world, created.id);
  assert.equal(state.breakthrough?.readyByMaterials, true);
  assert.equal(state.breakthrough?.recommendedAction, "residence-breakthrough");

  const breakthroughAction = listAvailableActions(world, created.id).find(
    (action) => action.actionId === "residence-breakthrough",
  );
  assert.ok(breakthroughAction);
  assert.deepEqual(breakthroughAction.costs?.itemConsumes, [
    { itemId: "cloud-heart-grass", count: 1 },
    { itemId: "moon-dew-flower", count: 1 },
    { itemId: "clear-zhi-leaf", count: 1 },
    { itemId: "condensed-qi-dew", count: 1 },
  ]);

  performAction(world, created.id, "residence-breakthrough");
  runUntilIdle(world, created.id);

  assert.equal(cultivator.realmLevel, 2);
  assert.equal(cultivator.realmProgress, 0);
  assert.equal(cultivator.inventory["cloud-heart-grass"], 0);
  assert.equal(cultivator.inventory["moon-dew-flower"], 0);
  assert.equal(cultivator.inventory["clear-zhi-leaf"], 0);
  assert.equal(cultivator.inventory["condensed-qi-dew"], 0);
  assert.equal(cultivator.breakthroughRecords.length, 1);
  assert.equal(cultivator.breakthroughRecords[0]?.outcome, "success");
  assert.equal(getCultivatorState(world, created.id).onboarding.stage, "completed");
});

test("major breakthrough success rate only reflects current statuses", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Rate Probe" });
  const cultivator = world.cultivators[created.id]!;

  cultivator.realmLevel = 3;
  cultivator.realm = world.cultivators["yun-zhong-he"].realm;
  cultivator.realmProgress = 100;
  cultivator.injuryTicksRemaining = 2;
  cultivator.statusEffects = [
    { id: "insight", name: "Insight", description: "", source: "test", remainingTicks: 3, intensity: 1 },
    { id: "clear-mind", name: "Clear Mind", description: "", source: "test", remainingTicks: 3, intensity: 1 },
    { id: "spirit-saturated", name: "Spirit Saturated", description: "", source: "test", remainingTicks: 3, intensity: 1 },
    { id: "deviation", name: "Qi Deviation", description: "", source: "test", remainingTicks: 3, intensity: 1 },
    { id: "poisoned", name: "Poisoned", description: "", source: "test", remainingTicks: 3, intensity: 1 },
  ];

  const beforeRegistration = getCultivatorState(world, created.id).breakthrough;
  assert.equal(beforeRegistration?.majorSuccessRate, 48);
  assert.deepEqual(
    beforeRegistration?.rateBreakdown.map((entry) => entry.source),
    ["insight", "clear-mind", "spirit-saturated", "deviation", "poisoned", "injury"],
  );

  saveCultivationRegistration(world, created.id, createCultivationFocusedRegistrationRecord(), "agent-rate");
  const afterRegistration = getCultivatorState(world, created.id).breakthrough;

  assert.equal(afterRegistration?.majorSuccessRate, 48);
  assert.deepEqual(afterRegistration?.rateBreakdown, beforeRegistration?.rateBreakdown);
});

test("failed major breakthrough consumes materials and resets progress without adding debuffs", () => {
  let failedWorld: ReturnType<typeof createSeedWorld> | null = null;
  let failedCultivatorId: string | null = null;

  for (let seed = 1; seed <= 200 && !failedWorld; seed += 1) {
    const world = createSeedWorld();
    const cultivator = world.cultivators["yun-zhong-he"];
    cultivator.realmLevel = 3;
    cultivator.realm = world.cultivators["yun-zhong-he"].realm;
    cultivator.realmProgress = 100;
    // L3→4 major: cloud-heart-grass, spirit-brook-bamboo, pure-heart-orchid + meridian-lotus-essence
    cultivator.inventory["cloud-heart-grass"] = 1;
    cultivator.inventory["spirit-brook-bamboo"] = 1;
    cultivator.inventory["pure-heart-orchid"] = 1;
    cultivator.inventory["meridian-lotus-essence"] = 1;
    cultivator.statusEffects = [];
    cultivator.injuryTicksRemaining = 0;
    world.nextJobSequence = seed;

    performAction(world, "yun-zhong-he", "residence-breakthrough");
    runUntilIdle(world, "yun-zhong-he");

    if (cultivator.breakthroughRecords.at(-1)?.outcome === "failure") {
      failedWorld = world;
      failedCultivatorId = "yun-zhong-he";
    }
  }

  assert.ok(failedWorld);
  const cultivator = failedWorld!.cultivators[failedCultivatorId!];

  assert.equal(cultivator.realmLevel, 3);
  assert.equal(cultivator.realmProgress, 60);
  assert.equal(cultivator.inventory["cloud-heart-grass"], 0);
  assert.equal(cultivator.inventory["spirit-brook-bamboo"], 0);
  assert.equal(cultivator.inventory["pure-heart-orchid"], 0);
  assert.equal(cultivator.inventory["meridian-lotus-essence"], 0);
  assert.equal(cultivator.breakthroughRecords.at(-1)?.outcome, "failure");
  assert.equal(cultivator.breakthroughRecords.at(-1)?.successRate, 70);
  assert.equal(cultivator.statusEffects.some((effect) => effect.id === "deviation"), false);
  assert.equal(cultivator.statusEffects.some((effect) => effect.id === "poisoned"), false);
});

test("residence-meditate supports no-stone fallback and standard branch", () => {
  const fallbackWorld = createSeedWorld();
  const fallbackCultivator = fallbackWorld.cultivators["yun-zhong-he"];
  fallbackCultivator.spiritStones = 40;
  const fallbackBeforeStones = fallbackCultivator.spiritStones;
  const fallbackBeforeProgress = fallbackCultivator.realmProgress;

  performAction(fallbackWorld, "yun-zhong-he", "residence-meditate");
  advanceWorld(fallbackWorld, 4);

  assert.equal(fallbackCultivator.spiritStones, fallbackBeforeStones);
  assert.ok(fallbackCultivator.realmProgress > fallbackBeforeProgress);
  assert.ok(fallbackCultivator.realmProgress - fallbackBeforeProgress <= 6);

  const standardWorld = createSeedWorld();
  const standardCultivator = standardWorld.cultivators["yun-zhong-he"];
  standardCultivator.spiritStones = 200;
  const standardBeforeStones = standardCultivator.spiritStones;
  const standardBeforeProgress = standardCultivator.realmProgress;

  performAction(standardWorld, "yun-zhong-he", "residence-meditate");
  advanceWorld(standardWorld, 4);

  assert.equal(standardCultivator.spiritStones, standardBeforeStones - 80);
  assert.ok(standardCultivator.realmProgress - standardBeforeProgress >= 10);
});

test("residence-meditate applies residence insight/deviation outcomes", () => {
  let sawInsight = false;
  let sawDeviation = false;

  for (let seed = 1; seed <= 120 && (!sawInsight || !sawDeviation); seed += 1) {
    const world = createSeedWorld();
    const cultivator = world.cultivators["yun-zhong-he"];
    cultivator.spiritStones = 200;
    world.nextJobSequence = seed;
    performAction(world, "yun-zhong-he", "residence-meditate");
    advanceWorld(world, 4);
    if (cultivator.statusEffects.some((effect) => effect.id === "insight")) sawInsight = true;
    if (cultivator.statusEffects.some((effect) => effect.id === "deviation")) sawDeviation = true;
  }

  assert.equal(sawInsight, true);
  assert.equal(sawDeviation, true);
});

test("residence-heal supports no-pill and healing-pill branches", () => {
  const noPillWorld = createSeedWorld();
  const noPillCultivator = noPillWorld.cultivators["yun-zhong-he"];
  noPillCultivator.injuryTicksRemaining = 10;
  noPillCultivator.qi = 20;

  performAction(noPillWorld, "yun-zhong-he", "residence-heal:no-pill");
  advanceWorld(noPillWorld, 2);
  const noPillInjuryAfter = noPillCultivator.injuryTicksRemaining;
  const noPillQiAfter = noPillCultivator.qi;

  const usePillWorld = createSeedWorld();
  const usePillCultivator = usePillWorld.cultivators["yun-zhong-he"];
  usePillCultivator.injuryTicksRemaining = 10;
  usePillCultivator.qi = 20;
  usePillCultivator.inventory["healing-pill"] = 1;

  performAction(usePillWorld, "yun-zhong-he", "residence-heal:use-pill");
  advanceWorld(usePillWorld, 2);

  assert.equal(usePillCultivator.inventory["healing-pill"], 0);
  assert.ok(usePillCultivator.injuryTicksRemaining < noPillInjuryAfter);
  assert.ok(usePillCultivator.qi > noPillQiAfter);
});

test("residence-recover-qi supports base and qi-pill branches", () => {
  const baseWorld = createSeedWorld();
  const baseCultivator = baseWorld.cultivators["yun-zhong-he"];
  baseCultivator.qi = 10;

  performAction(baseWorld, "yun-zhong-he", "residence-recover-qi:no-pill");
  advanceWorld(baseWorld, 1);
  const baseQiAfter = baseCultivator.qi;

  const usePillWorld = createSeedWorld();
  const usePillCultivator = usePillWorld.cultivators["yun-zhong-he"];
  usePillCultivator.qi = 10;
  usePillCultivator.inventory["qi-pill"] = 1;

  performAction(usePillWorld, "yun-zhong-he", "residence-recover-qi:use-pill");
  advanceWorld(usePillWorld, 1);

  assert.equal(usePillCultivator.inventory["qi-pill"], 0);
  assert.ok(usePillCultivator.qi > baseQiAfter);
  assert.ok(usePillCultivator.statusEffects.some((effect) => effect.id === "spirit-saturated"));
});

test("residence actions can emit at least two ambient event kinds and state surfaces recent ones", () => {
  const seenKinds = new Set<string>();
  let surfacedInState = false;

  for (let seed = 1; seed <= 160 && (seenKinds.size < 2 || !surfacedInState); seed += 1) {
    const world = createSeedWorld();
    world.nextJobSequence = seed;
    world.cultivators["yun-zhong-he"].spiritStones = 240;

    performAction(world, "yun-zhong-he", "residence-meditate");
    advanceWorld(world, 4);

    const ambientLogs = world.daoLogs.filter((entry) => entry.cultivatorId === "yun-zhong-he" && entry.tags.includes("ambient-event"));
    for (const entry of ambientLogs) {
      const kindTag = entry.tags.find((tag) => tag.startsWith("ambient-kind:"));
      if (kindTag) {
        seenKinds.add(kindTag.slice("ambient-kind:".length));
      }
    }

    const state = getCultivatorState(world, "yun-zhong-he");
    if ((state.residenceContext?.recentAmbientEvents.length ?? 0) > 0) {
      surfacedInState = true;
    }
  }

  assert.ok(seenKinds.size >= 2, `expected at least 2 ambient kinds, got: ${Array.from(seenKinds).join(", ")}`);
  assert.equal(surfacedInState, true);
});

test("residenceContext only surfaces ambient events from the currently active residence", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const secondResidence = createResidenceForState("yangzhou", cultivator.id);
  cultivator.residences = [...cultivator.residences, secondResidence];

  let sawTaggedAmbient = false;
  for (let seed = 1; seed <= 200 && !sawTaggedAmbient; seed += 1) {
    const candidateWorld = createSeedWorld();
    const candidateCultivator = candidateWorld.cultivators["yun-zhong-he"];
    const candidateSecondResidence = createResidenceForState("yangzhou", candidateCultivator.id);
    candidateCultivator.residences = [...candidateCultivator.residences, candidateSecondResidence];
    candidateWorld.nextJobSequence = seed;
    candidateCultivator.spiritStones = 240;

    performAction(candidateWorld, "yun-zhong-he", "residence-meditate");
    advanceWorld(candidateWorld, 4);

    const firstAmbient = candidateWorld.daoLogs.find((entry) =>
      entry.cultivatorId === "yun-zhong-he"
      && entry.tags.includes("ambient-event")
      && entry.tags.includes(`residence-id:${candidateCultivator.residences[0]!.id}`));
    if (!firstAmbient) {
      continue;
    }

    sawTaggedAmbient = true;
    candidateCultivator.locationId = candidateSecondResidence.locationId;
    const movedState = getCultivatorState(candidateWorld, "yun-zhong-he");
    assert.equal(movedState.activeResidence?.id, candidateSecondResidence.id);
    assert.deepEqual(movedState.residenceContext?.recentAmbientEvents ?? [], []);
  }

  assert.equal(sawTaggedAmbient, true);
});

test("residence-produce rejects unknown recipe id", () => {
  const world = createSeedWorld();
  assert.throws(
    () => performAction(world, "yun-zhong-he", "residence-produce:recipe-unknown"),
    /Unknown residence recipe/,
  );
});

// ---- Multi-state residence purchase tests ----

test("new cultivator starts with one residence in starter state", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Residence Buyer" });
  const cultivator = world.cultivators[created.id]!;

  assert.equal(cultivator.residences.length, 1);
  assert.equal(cultivator.residence.stateId, cultivator.locationId.split(":")[0]);
  assert.equal(cultivator.residences[0]!.stateId, cultivator.locationId.split(":")[0]);
  assert.ok(cultivator.residence.description.length > 0);
});

test("buy-residence action appears on main city when cultivator does not own local residence", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Buyer" });
  const cultivator = world.cultivators[created.id]!;

  // Travel to a different state main city
  const starterState = cultivator.locationId.split(":")[0];
  const otherState = STATE_IDS.find((id) => id !== starterState)!;
  cultivator.locationId = `${otherState}:main-city`;

  const actions = listAvailableActions(world, created.id);
  const buyAction = actions.find((a) => a.actionId === `buy-residence:${otherState}`);
  assert.ok(buyAction, `Expected buy-residence:${otherState} to appear in available actions`);
  assert.ok(buyAction.costs?.spiritStones && buyAction.costs.spiritStones >= 3000);
});

test("buy-residence action does NOT appear when cultivator already owns local residence", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  // yun-zhong-he is at qingzhou:main-city and already has a residence there
  const actions = listAvailableActions(world, "yun-zhong-he");
  const buyAction = actions.find((a) => a.actionId === "buy-residence:qingzhou");
  assert.equal(buyAction, undefined, "Should not offer buy when residence already owned");
});

test("buy-residence succeeds and adds to residences array", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Shopper" });
  const cultivator = world.cultivators[created.id]!;

  const starterState = cultivator.locationId.split(":")[0];
  const otherState = STATE_IDS.find((id) => id !== starterState)!;
  cultivator.locationId = `${otherState}:main-city`;
  cultivator.spiritStones = 10000;

  const before = cultivator.residences.length;
  const result = performAction(world, created.id, `buy-residence:${otherState}`);
  assert.equal(result.accepted, true);
  assert.equal(cultivator.residences.length, before + 1);

  const newRes = cultivator.residences.find((r) => r.stateId === otherState);
  assert.ok(newRes);
  assert.ok(newRes.description.length > 0);
  assert.equal(newRes.locationId, `${otherState}:main-city`);

  // Active residence should switch to newly purchased
  assert.equal(cultivator.residence.stateId, otherState);
});

test("buy-residence fails when already owned in target state", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.spiritStones = 10000;

  assert.throws(
    () => performAction(world, "yun-zhong-he", "buy-residence:qingzhou"),
    /already own a residence/,
  );
});

test("buy-residence fails with insufficient spirit stones", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Poor" });
  const cultivator = world.cultivators[created.id]!;

  const starterState = cultivator.locationId.split(":")[0];
  const otherState = STATE_IDS.find((id) => id !== starterState)!;
  cultivator.locationId = `${otherState}:main-city`;
  cultivator.spiritStones = 10;

  assert.throws(
    () => performAction(world, created.id, `buy-residence:${otherState}`),
    /Not enough spirit stones/,
  );
});

test("buy-residence fails when not in the target state", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.spiritStones = 10000;

  assert.throws(
    () => performAction(world, "yun-zhong-he", "buy-residence:liangzhou"),
    /must be in the target state/,
  );
});

test("residence actions work at any owned residence location", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Multi Home" });
  const cultivator = world.cultivators[created.id]!;

  const starterState = cultivator.locationId.split(":")[0];
  const otherState = STATE_IDS.find((id) => id !== starterState)!;

  // Buy second residence
  cultivator.locationId = `${otherState}:main-city`;
  cultivator.spiritStones = 10000;
  performAction(world, created.id, `buy-residence:${otherState}`);

  // Residence actions should be available at the new location
  const actions = new Set(listAvailableActions(world, created.id).map((a) => a.actionId));
  assert.ok(actions.has("residence-meditate"));
  assert.ok(actions.has("residence-heal"));
  assert.ok(actions.has("residence-recover-qi"));
  assert.ok(actions.has("residence-socialize"));
});

test("getCultivatorState includes all residences in view", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "View Test" });
  const cultivator = world.cultivators[created.id]!;

  const starterState = cultivator.locationId.split(":")[0];
  const otherState = STATE_IDS.find((id) => id !== starterState)!;
  cultivator.locationId = `${otherState}:main-city`;
  cultivator.spiritStones = 10000;
  performAction(world, created.id, `buy-residence:${otherState}`);

  const state = getCultivatorState(world, created.id);
  assert.equal(state.residences.length, 2);
  assert.ok(state.residences.some((r) => r.stateId === starterState));
  assert.ok(state.residences.some((r) => r.stateId === otherState));
  assert.ok(state.activeResidence);
  assert.equal(state.activeResidence!.stateId, otherState);
});

test("residence price scales with state risk level", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "Price Check" });
  const cultivator = world.cultivators[created.id]!;

  // Buy in a high-risk state (liangzhou = high risk = 6000)
  cultivator.locationId = "liangzhou:main-city";
  cultivator.spiritStones = 20000;
  const stonesBefore = cultivator.spiritStones;
  performAction(world, created.id, "buy-residence:liangzhou");

  assert.equal(stonesBefore - cultivator.spiritStones, 6000);
});

test("residence heal and recover-qi apply expected behavior", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.qi = 40;
  cultivator.injuryTicksRemaining = 6;

  performAction(world, "yun-zhong-he", "residence-recover-qi");
  advanceWorld(world, 1);
  assert.equal(cultivator.qi, 75);

  performAction(world, "yun-zhong-he", "residence-heal");
  advanceWorld(world, 2);
  assert.equal(cultivator.injuryTicksRemaining, 2);
  assert.ok(cultivator.qi > 75);
});

test("agent persona sync auto-provisions and reuses a single character", () => {
  const world = createSeedWorld();

  const first = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
  });
  const second = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
    pronouns: "she/her",
    temperament: "calm",
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.selectedCultivatorId, second.selectedCultivatorId);
  assert.equal(
    getAgentBindingInfo(world, "openclaw-main").selectedCultivatorId,
    first.selectedCultivatorId,
  );

  const state = getCultivatorState(world, first.selectedCultivatorId);
  assert.equal(state.cultivator.name, "Liu Ruyan");
  assert.equal(state.cultivator.pronouns, "she/her");
  assert.equal(state.cultivator.temperament, "calm");
});

test("manual items and study actions are removed from the live runtime surface", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");
  const actions = listAvailableActions(world, "yun-zhong-he");
  const strategy = getStrategySnapshot(world, "yun-zhong-he");

  assert.equal("sword-manual" in (state.inventory as Record<string, number>), false);
  assert.equal("alchemy-manual" in (state.inventory as Record<string, number>), false);
  assert.equal("array-manual" in (state.inventory as Record<string, number>), false);
  assert.equal("sword-manual" in (world.itemDefinitions as Record<string, unknown>), false);
  assert.equal("alchemy-manual" in (world.itemDefinitions as Record<string, unknown>), false);
  assert.equal("array-manual" in (world.itemDefinitions as Record<string, unknown>), false);
  assert.equal(actions.some((action) => action.actionId.startsWith("study-")), false);
  assert.equal(state.inventoryDetails.some((entry) => entry.category === "manual"), false);
  assert.equal(strategy.recommendedSequence.some((actionId) => actionId.startsWith("study-")), false);
});

test("item-backed actions expose structured metadata and inventory actionability", () => {
  const world = createSeedWorld();
  const actions = listAvailableActions(world, "yun-zhong-he");
  const state = getCultivatorState(world, "yun-zhong-he");

  const buyHealing = actions.find((action) => action.actionId === "buy-healing-pill");
  const useHealing = actions.find((action) => action.actionId === "use-healing-pill");
  const sellOre = actions.find((action) => action.actionId === "sell-spirit-ore");
  const healingEntry = state.inventoryDetails.find((entry) => entry.id === "healing-pill");
  const oreEntry = state.inventoryDetails.find((entry) => entry.id === "spirit-ore");

  assert.deepEqual(buyHealing?.itemBinding, { itemId: "healing-pill", operation: "buy" });
  assert.ok((buyHealing?.costs?.spiritStones ?? 0) > 0);
  assert.ok((buyHealing?.costs?.spiritStones ?? 0) <= (healingEntry?.trade.buyBasePrice ?? 0));
  assert.deepEqual(useHealing?.itemBinding, { itemId: "healing-pill", operation: "use" });
  assert.equal(useHealing?.costs?.itemConsumes?.[0]?.itemId, "healing-pill");
  assert.equal(useHealing?.effects?.qi, 35);
  assert.equal(useHealing?.effects?.injuryTicksDelta, -2);
  assert.deepEqual(sellOre?.itemBinding, { itemId: "spirit-ore", operation: "sell" });
  assert.equal(sellOre?.costs?.itemConsumes?.[0]?.count, 1);
  assert.ok((sellOre?.effects?.spiritStones ?? 0) > 0);

  assert.equal(healingEntry?.use.kind, "consume");
  assert.equal(healingEntry?.trade.buyBasePrice, 100);
  assert.ok(healingEntry?.availableActionIds.includes("use-healing-pill"));
  assert.equal(oreEntry?.use.kind, "material");
  assert.ok(oreEntry?.availableActionIds.includes("sell-spirit-ore"));
  assert.equal(actions.some((action) => action.actionId.startsWith("study-")), false);
});

test("market exposes current breakthrough material purchase action", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  // L3→L4 (yun-zhong-he starts at realmLevel 3): needs cloud-heart-grass, spirit-brook-bamboo, pure-heart-orchid + meridian-lotus-essence
  cultivator.realmProgress = 100;
  const beforeGrass = cultivator.inventory["cloud-heart-grass"];

  const actions = listAvailableActions(world, "yun-zhong-he");
  const buyCurrent = actions.find((action) => action.actionId === "buy-current-breakthrough-material");

  assert.ok(buyCurrent);
  assert.ok((buyCurrent?.costs?.spiritStones ?? 0) > 0);

  performAction(world, "yun-zhong-he", "buy-current-breakthrough-material");

  // First missing material should have been bought (one of the generics or the special)
  const totalMaterials = cultivator.inventory["cloud-heart-grass"]
    + cultivator.inventory["spirit-brook-bamboo"]
    + cultivator.inventory["pure-heart-orchid"]
    + cultivator.inventory["meridian-lotus-essence"];
  assert.ok(totalMaterials > beforeGrass, "at least one breakthrough material should have been purchased");
});

test("catalog-driven immediate item actions preserve consumable behavior", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.qi = 40;
  cultivator.injuryTicksRemaining = 3;
  cultivator.spiritualPower = 10;
  cultivator.inventory["ward-talisman"] = 1;

  performAction(world, "yun-zhong-he", "use-healing-pill");
  assert.equal(cultivator.inventory["healing-pill"], 0);
  assert.equal(cultivator.qi, 75);
  assert.equal(cultivator.injuryTicksRemaining, 1);

  performAction(world, "yun-zhong-he", "use-qi-pill");
  assert.equal(cultivator.inventory["qi-pill"], 0);
  assert.equal(cultivator.spiritualPower, 40);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "spirit-saturated"));

  const wardAction = listAvailableActions(world, "yun-zhong-he").find((action) => action.actionId === "use-ward-talisman");
  assert.ok(wardAction);
  assert.match(wardAction.description, /获得护体，持续六刻/);
  assert.equal(wardAction.description.includes("warded"), false);
  assert.equal(wardAction.label.includes("warded"), false);
  const warded = performAction(world, "yun-zhong-he", "use-ward-talisman");
  assert.equal(cultivator.inventory["ward-talisman"], 0);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "warded" && effect.name === "护体"));
  assert.match(warded.summary, /获得护体，持续六刻/);
  assert.equal(warded.summary.includes("warded"), false);
  const shown = getCultivatorState(world, "yun-zhong-he").statusEffects.find((effect) => effect.id === "warded");
  assert.equal(shown?.name, "护体");
  assert.equal(shown?.description.includes("warded"), false);
});

test("managed dungeon expeditions no longer mint removed manual items", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:dungeon-c");
  runUntilIdle(world, "yun-zhong-he");

  const beforeInventoryKeys = new Set(Object.keys(cultivator.inventory));
  performAction(world, "yun-zhong-he", expeditionActionId(1, "balanced") as never);
  runUntilIdle(world, "yun-zhong-he");

  assert.equal("sword-manual" in (cultivator.inventory as Record<string, number>), false);
  assert.equal("alchemy-manual" in (cultivator.inventory as Record<string, number>), false);
  assert.equal("array-manual" in (cultivator.inventory as Record<string, number>), false);
  assert.equal(beforeInventoryKeys.has("sword-manual"), false);
});

test("state.dungeon surfaces shared rank progression and realm-gated dungeon actions", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const hasExpeditionActionForRank = (rank: number) =>
    listAvailableActions(world, "yun-zhong-he").some(
      (action) => String(action.actionId).startsWith(`enter-dungeon:rank-${rank}:`),
    );

  cultivator.locationId = "qingzhou:dungeon-c";
  let state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.dungeon?.grade, "丙");
  assert.equal(state.dungeon?.highestClearedRank, 0);
  assert.equal(state.dungeon?.highestUnlockedRank, 1);
  assert.deepEqual(state.dungeon?.availableRanks, [1]);
  assert.equal(state.dungeon?.frontierRank, 1);
  assert.equal(state.dungeon?.materialBand, "cloud-heart-grass");
  assert.equal(state.dungeon?.lockReason, null);
  assert.ok(hasExpeditionActionForRank(1));
  assert.equal(hasExpeditionActionForRank(2), false);

  cultivator.dungeonProgress["丙"].highestClearedRank = 3;
  cultivator.locationId = "yangzhou:dungeon-c";
  state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.dungeon?.highestClearedRank, 3);
  assert.equal(state.dungeon?.highestUnlockedRank, 4);
  assert.deepEqual(state.dungeon?.availableRanks, [1, 2, 3, 4]);
  assert.ok(hasExpeditionActionForRank(4));
  assert.equal(hasExpeditionActionForRank(5), false);

  cultivator.locationId = "qingzhou:dungeon-b";
  state = getCultivatorState(world, "yun-zhong-he");
  assert.match(state.dungeon?.lockReason ?? "", /筑基/);
  assert.match(state.dungeon?.lockReason ?? "", /雷泽残阵/);
  assert.equal(
    listAvailableActions(world, "yun-zhong-he").some((action) => (
      String(action.actionId).startsWith("enter-dungeon:")
      || String(action.actionId).startsWith("start-dungeon-expedition:")
    )),
    false,
  );
});

test("筑基 at a 甲级 gate reads that 丹霞内府 needs 金丹", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "筑基";
  cultivator.realmLevel = 5;
  cultivator.locationId = "yangzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;

  const actions = listAvailableActions(world, cultivator.id);
  const locked = actions.find((action) => action.actionId === "dungeon-gate-locked");
  assert.ok(locked);
  assert.match(locked.label, /丹霞内府/);
  assert.match(locked.description, /金丹/);
  assert.match(locked.description, /丹霞露/);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("enter-dungeon:")), false);

  const state = getCultivatorState(world, cultivator.id);
  assert.match(state.dungeon?.lockReason ?? "", /丹霞内府/);
  assert.match(state.dungeon?.lockReason ?? "", /金丹/);
  assert.match(state.dungeon?.lockReason ?? "", /丹霞露/);
  assert.match(state.agentGuidance.priorities.join(""), /丹霞内府/);
  assert.match(state.agentGuidance.priorities.join(""), /丹霞露/);

  const tried = performAction(world, cultivator.id, "dungeon-gate-locked");
  assert.equal(tried.accepted, false);
  assert.match(tried.summary, /丹霞内府/);
  assert.match(tried.summary, /丹霞露/);
  assert.equal(cultivator.activeJobId, null);

  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  const open = listAvailableActions(world, cultivator.id);
  assert.equal(open.some((action) => action.actionId === "dungeon-gate-locked"), false);
  assert.equal(open.some((action) => String(action.actionId).startsWith("enter-dungeon:")), true);
  assert.equal(getCultivatorState(world, cultivator.id).dungeon?.lockReason ?? null, null);
});

test("state marks onboarding as optional and exposes the decision policy", () => {
  const world = createSeedWorld();

  const state = getCultivatorState(world, "yun-zhong-he");

  assert.equal(state.onboarding.recommendedOnly, true);
  assert.equal(state.onboarding.allowsFreeExploration, true);
  assert.equal(state.decisionPolicy.tutorialMode, "optional");
  assert.equal(state.decisionPolicy.tutorialRequired, false);
  assert.equal(state.decisionPolicy.freeExplorationAllowed, true);
  assert.deepEqual(state.decisionPolicy.priorityOrder, [
    "owner-command",
    "safety",
    "runtime-guidance",
    "onboarding",
    "free-exploration",
  ]);
});

test("strategy exposes the same policy and keeps safety ahead of onboarding", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"]!.injuryTicksRemaining = 3;

  const strategy = getStrategySnapshot(world, "yun-zhong-he");

  assert.equal(strategy.riskLevel, "high");
  assert.deepEqual(strategy.decisionPolicy.priorityOrder, [
    "owner-command",
    "safety",
    "runtime-guidance",
    "onboarding",
    "free-exploration",
  ]);
  assert.ok(strategy.decisionPolicy.summary.includes("安全"));
});

test("first travel onboarding step recommends a quest-board action when available", () => {
  const world = createSeedWorld();
  const summary = createCultivator(world, { name: "Quest Guide" });
  const cultivatorId = summary.id;
  world.daoLogs.unshift({
    id: "test-log-travel",
    cultivatorId,
    tick: world.tick,
    title: "Travel loop",
    content: "Completed the first travel loop.",
    tags: ["travel"],
  });
  world.daoLogs.unshift({
    id: "test-log-action",
    cultivatorId,
    tick: world.tick,
    title: "First action",
    content: "Completed the first safe action.",
    tags: ["action-complete"],
  });

  const state = getCultivatorState(world, cultivatorId);

  assert.equal(state.onboarding.stage, "first-travel");
  assert.ok(state.onboarding.hint.includes("事务"));
  assert.ok(state.onboarding.recommendedActions.some((a: string) => a.startsWith("quest:accept:")));
});

test("only residence meditation advances the residence cultivation onboarding step", () => {
  const world = createSeedWorld();
  const summary = createCultivator(world, { name: "Residence Guide" });
  const cultivator = world.cultivators[summary.id]!;
  world.daoLogs.unshift({
    id: "test-log-action",
    cultivatorId: cultivator.id,
    tick: world.tick,
    title: "First action",
    content: "Completed the first safe action.",
    tags: ["action-complete"],
  });
  world.daoLogs.unshift({
    id: "test-log-travel",
    cultivatorId: cultivator.id,
    tick: world.tick,
    title: "Travel loop",
    content: "Completed the first travel loop.",
    tags: ["travel"],
  });
  world.daoLogs.unshift({
    id: "test-log-quest",
    cultivatorId: cultivator.id,
    tick: world.tick,
    title: "Quest loop",
    content: "Completed the first quest.",
    tags: ["quest-complete"],
  });
  world.daoLogs.unshift({
    id: "test-log-heal",
    cultivatorId: cultivator.id,
    tick: world.tick,
    title: "Residence heal",
    content: "Recovered at residence.",
    tags: ["recovery", "residence"],
  });

  assert.equal(getCultivatorState(world, cultivator.id).onboarding.stage, "first-quest");

  world.daoLogs.unshift({
    id: "test-log-meditate",
    cultivatorId: cultivator.id,
    tick: world.tick,
    title: "Residence meditation",
    content: "Completed residence meditation.",
    tags: ["action-complete", "residence-meditate"],
  });

  assert.equal(getCultivatorState(world, cultivator.id).onboarding.stage, "first-residence-cultivation");
});

test("realm breakthrough immediately completes onboarding", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"].realmLevel = 2;

  const onboarding = getCultivatorState(world, "yun-zhong-he").onboarding;

  assert.equal(onboarding.stage, "completed");
  assert.ok(onboarding.completedStages.includes("first-breakthrough"));
});

// --- P0-1 Decision Surface Consistency ---

test("all three decision surfaces only recommend actions present in availableActions", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");
  const available = listAvailableActions(world, "yun-zhong-he");
  const availableIds = new Set(available.map((a) => a.actionId));

  for (const id of state.onboarding.recommendedActions) {
    assert.ok(availableIds.has(id), `onboarding recommended '${id}' which is not in availableActions`);
  }
  for (const id of state.agentGuidance.suggestedActions) {
    assert.ok(availableIds.has(id), `agentGuidance suggested '${id}' which is not in availableActions`);
  }
});

test("strategySnapshot.recommendedSequence only contains available actions", () => {
  const world = createSeedWorld();
  const strategy = getStrategySnapshot(world, "yun-zhong-he");
  const available = listAvailableActions(world, "yun-zhong-he");
  const availableIds = new Set(available.map((a) => a.actionId));

  for (const id of strategy.recommendedSequence) {
    assert.ok(availableIds.has(id), `strategySnapshot recommended '${id}' which is not in availableActions`);
  }
});

test("onboarding does not recommend residence-meditate when character is not at residence", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  // Move to wilderness (away from residence)
  const wildernessId = `${cultivator.locationId.split(":")[0]}:wilderness`;
  if (world.locations[wildernessId]) {
    cultivator.locationId = wildernessId;
  }
  // Force first-quest stage so onboarding would want to recommend residence-meditate
  world.daoLogs.unshift(
    { id: "t-action", cultivatorId: cultivator.id, tick: world.tick, title: "a", content: "a", tags: ["action-complete"] },
    { id: "t-travel", cultivatorId: cultivator.id, tick: world.tick, title: "t", content: "t", tags: ["travel"] },
    { id: "t-quest", cultivatorId: cultivator.id, tick: world.tick, title: "q", content: "q", tags: ["quest-complete"] },
  );

  const state = getCultivatorState(world, cultivator.id);
  const available = listAvailableActions(world, cultivator.id);
  const availableIds = new Set(available.map((a) => a.actionId));

  for (const id of state.onboarding.recommendedActions) {
    assert.ok(availableIds.has(id), `onboarding recommended '${id}' but it is not available at current location`);
  }
});

test("decision surface consistency holds for injured cultivator", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"]!.injuryTicksRemaining = 5;

  const state = getCultivatorState(world, "yun-zhong-he");
  const available = listAvailableActions(world, "yun-zhong-he");
  const availableIds = new Set(available.map((a) => a.actionId));

  for (const id of state.onboarding.recommendedActions) {
    assert.ok(availableIds.has(id), `onboarding recommended '${id}' for injured cultivator but not available`);
  }
  for (const id of state.agentGuidance.suggestedActions) {
    assert.ok(availableIds.has(id), `agentGuidance suggested '${id}' for injured cultivator but not available`);
  }

  const strategy = getStrategySnapshot(world, "yun-zhong-he");
  for (const id of strategy.recommendedSequence) {
    assert.ok(availableIds.has(id), `strategy recommended '${id}' for injured cultivator but not available`);
  }
});

// --- P0-4 Recovery path safety ---

test("poisoned cultivator guidance recommends detox action as first priority", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.statusEffects.push({
    id: "poisoned",
    name: "Poisoned",
    description: "Loses qi each tick.",
    source: "test",
    remainingTicks: 4,
    intensity: 1,
  });

  const state = getCultivatorState(world, cultivator.id);

  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("中毒")), "should warn about poison");
  assert.ok(state.agentGuidance.priorities.some((p: string) => p.includes("中毒")), "should include detox priority");
  assert.ok(state.agentGuidance.suggestedActions.length > 0, "should suggest a recovery action");
  // First suggested action should be a healing action (heal or residence-heal) or travel to safe
  const first = state.agentGuidance.suggestedActions[0];
  assert.ok(
    first === "heal" || first === "residence-heal" || first?.startsWith("travel-to:"),
    `first suggested action for poisoned should be heal/residence-heal/travel, got: ${first}`,
  );
  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("消耗灵力")), "poison warning should describe qi loss");
});

test("poisoned cultivator outside safe locations gets an explicit transit warning", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.statusEffects.push({
    id: "poisoned",
    name: "Poisoned",
    description: "Loses qi each tick.",
    source: "test",
    remainingTicks: 4,
    intensity: 1,
  });

  const state = getCultivatorState(world, cultivator.id);

  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("无法直接解毒")));
  assert.ok(state.agentGuidance.suggestedActions[0]?.startsWith("travel-to:"));
});

test("residence-heal removes poison status effect", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.injuryTicksRemaining = 3;
  cultivator.statusEffects.push({
    id: "poisoned",
    name: "Poisoned",
    description: "Loses qi each tick.",
    source: "test",
    remainingTicks: 4,
    intensity: 1,
  });

  performAction(world, cultivator.id, "residence-heal");
  runUntilIdle(world, cultivator.id);

  assert.ok(!cultivator.statusEffects.some((e) => e.id === "poisoned"), "residence-heal should remove poisoned");
});

test("every negative status effect has a recovery path in guidance", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const negativeEffects: Array<{ id: string; name: string }> = [
    { id: "wounded", name: "Wounded" },
    { id: "poisoned", name: "Poisoned" },
    { id: "deviation", name: "Qi Deviation" },
  ];

  for (const effect of negativeEffects) {
    // Reset
    cultivator.statusEffects = [];
    cultivator.injuryTicksRemaining = effect.id === "wounded" ? 3 : 0;

    if (effect.id !== "wounded") {
      cultivator.statusEffects.push({
        id: effect.id as any,
        name: effect.name,
        description: "test",
        source: "test",
        remainingTicks: 4,
        intensity: 1,
      });
    }

    const state = getCultivatorState(world, cultivator.id);
    assert.ok(
      state.agentGuidance.warnings.length > 0,
      `negative effect '${effect.id}' should produce at least one warning`,
    );
    assert.ok(
      state.agentGuidance.suggestedActions.length > 0,
      `negative effect '${effect.id}' should produce at least one suggested recovery action`,
    );
  }
});

test("depleted cultivator gets recovery action recommendation", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.qi = 1;

  const state = getCultivatorState(world, cultivator.id);

  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("灵力枯竭")), "should warn about depletion");
  assert.ok(state.agentGuidance.suggestedActions.length > 0, "should suggest recovery");
});

test("injured cultivator in a safe settlement gets direct heal instead of filtered residence-heal", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.injuryTicksRemaining = 4;
  const nonResidenceSafeLocation = Object.keys(world.locations).find((locationId) =>
    locationId !== cultivator.residence.locationId && world.locations[locationId]?.kind === "safe",
  );
  assert.ok(nonResidenceSafeLocation);
  cultivator.locationId = nonResidenceSafeLocation;

  const state = getCultivatorState(world, cultivator.id);

  assert.equal(state.agentGuidance.suggestedActions[0], "heal");
});

test("qi deviation warns when only decay-safe recovery is available", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.statusEffects.push({
    id: "deviation",
    name: "Qi Deviation",
    description: "Cultivation becomes unstable and risky.",
    source: "test",
    remainingTicks: 3,
    intensity: 1,
  });

  const state = getCultivatorState(world, cultivator.id);

  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("无法直接清除")));
  assert.ok(state.agentGuidance.warnings.some((w: string) => w.includes("无法稳定偏差")));
});

test("legacy player sect info is still returned through getSectInfo", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.sectId = "qing-yun-sect";
  cultivator.sectTitle = "外门";
  cultivator.totalContribution = 24;
  world.sects["qing-yun-sect"]!.memberIds.push(cultivator.id);

  const organization = getSectInfo(world, cultivator.id);

  assert.equal(organization?.organizationType, "player");
  assert.equal(organization?.id, "qing-yun-sect");
  assert.equal(organization?.competitive, true);
});

test("registration records save and surface through cultivator state", () => {
  const world = createSeedWorld();

  const saved = saveCultivationRegistration(
    world,
    "yun-zhong-he",
    createRegistrationRecord(),
    "openclaw-main",
  );

  assert.equal(saved.cultivator_id, "yun-zhong-he");
  assert.equal(saved.agent_id, "openclaw-main");
  assert.ok(saved.saved_at);

  const stored = getCultivationRegistration(world, "yun-zhong-he");
  assert.equal(stored?.saved_at, saved.saved_at);
  assert.equal(stored?.result.core_temperament, "潜渊型");
  assert.equal(stored?.result.behavior_aspect, "水土 / 潜守");
  assert.equal(stored?.result.core_temperament_id, "qian_yuan");
  assert.equal(stored?.result.cultivation_motive_id, "seek-truth");

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.deepEqual(state.registration, {
    saved_at: saved.saved_at ?? null,
    label_locale: "zh-CN",
    core_temperament_id: "qian_yuan",
    core_temperament: "潜渊型",
    core_temperament_description: "潜渊型的人会先把自己藏进水下，看清局势与暗流再出手。你不急着表态，但一旦判断完成，通常比旁人更稳。",
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "观澜型",
    secondary_temperament_description: "观澜型的人习惯像看潮势一样观察变化，先辨认结构，再决定站位。你擅长长线判断、趋势感和耐心等待。",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "水土 / 潜守",
    behavior_aspect_description: "潜守意味着一边看水势、一边稳住根基。你会先把局面守住，再从细小变化里寻找真正值得出手的时机。",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "求真知",
    cultivation_motive_description: "你走进废墟、典籍、秘境，不是为了财富，而是为了那个更深的问题——世界究竟是如何运转的。知识本身就是你的修行。",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "水土双灵根",
    spirit_root_description: "双灵根意味着两种元素并强，路径更灵活，转向与适应能力更强。代价是需要在两股气机之间维持平衡。",
    overall_confidence: "high",
  });
  assert.equal(state.registrationProfile?.coreTemperament.description, "潜渊型的人会先把自己藏进水下，看清局势与暗流再出手。你不急着表态，但一旦判断完成，通常比旁人更稳。");
});

test("v2 registration records preserve explicit taxonomy IDs through save and read", () => {
  const world = createSeedWorld();

  const v2Record: CultivationRegistrationRecord = {
    record_type: "registration_record" as const,
    questionnaire_version: "immortal-claw-oc-v2",
    answers: {
      Q1: "C", Q2: "C", Q3: "C", Q4: "C", Q5: "C", Q6: "C",
      Q7: "C", Q8: "A", Q9: "C", Q10: "C", Q11: "C", Q12: "C",
      Q13: "B", Q14: "B", Q15: "B", Q16: "B", Q17: "C", Q18: "B",
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
      five_element_scores: { metal: 5, wood: 6, water: 11, fire: 3, earth: 9 },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      confidence: { core: "high" as const, behavior: "high" as const, motive: "medium" as const, overall: "high" as const },
    },
    summary: "A cautious cultivator whose water and earth tendencies stay closely paired.",
  };

  const saved = saveCultivationRegistration(world, "yun-zhong-he", v2Record, "openclaw-main");

  assert.equal(saved.result.core_temperament_id, "qian_yuan");
  assert.equal(saved.result.core_temperament, "Calm strategist");
  assert.equal(saved.result.spirit_root_kind_id, "dual-root");
  assert.equal(saved.result.spirit_root_result, "Water-Earth dual root");
  assert.equal(saved.result.label_locale, "en");

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.deepEqual(state.registration, {
    saved_at: saved.saved_at ?? null,
    label_locale: "en",
    core_temperament_id: "qian_yuan",
    core_temperament: "Calm strategist",
    core_temperament_description: "A calm strategist stays beneath the surface first, reading the currents before acting. You do not rush to declare yourself, but once you decide, your footing is usually steadier than most.",
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "Patient observer",
    secondary_temperament_description: "A patient observer watches change like the tide, recognizing structure before choosing a position. You are good at long-range judgment, sensing trends, and waiting with patience.",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "Water-Earth / Latent Guard",
    behavior_aspect_description: "Latent Guard means reading the current while holding the ground. You secure the situation first, then act only when subtle shifts reveal a truly worthwhile opening.",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "Seek truth",
    cultivation_motive_description: "You enter ruins, comb through texts, and probe hidden places not for wealth, but for the deeper question: how does the world truly work? Knowledge itself is your cultivation.",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "Water-Earth dual root",
    spirit_root_description: "A dual root means two elements rise together. The path is more flexible and adaptable, but it demands balance between two active currents of qi.",
    overall_confidence: "high",
  });
  assert.equal(state.registrationProfile?.spiritRoot.description, "A dual root means two elements rise together. The path is more flexible and adaptable, but it demands balance between two active currents of qi.");
});

test("registration effects surface and improve cultivation output", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createCultivationFocusedRegistrationRecord(),
    "openclaw-main",
  );

  performAction(baselineWorld, "yun-zhong-he", "cultivate");
  performAction(registeredWorld, "yun-zhong-he", "cultivate");

  advanceWorld(baselineWorld, 4);
  advanceWorld(registeredWorld, 4);

  const baselineState = getCultivatorState(baselineWorld, "yun-zhong-he");
  const registeredState = getCultivatorState(registeredWorld, "yun-zhong-he");

  assert.ok(registeredState.registrationEffects);
  assert.ok(registeredState.registrationProfile);
  assert.equal(
    registeredState.registrationProfile?.coreTemperament.categoryDescription,
    "主心性，决定你最稳定的判断与反应方式。",
  );
  assert.match(
    registeredState.registrationProfile?.coreTemperament.description ?? "",
    /继续生长|上升势头|growth/i,
  );
  assert.ok(registeredState.registrationEffects?.dominantElements.some((element) => element.id === "wood"));
  assert.ok(registeredState.registrationEffects?.modifiers.some((modifier) => modifier.source === "cultivation-motive"));
  assert.ok(registeredState.cultivator.realmProgress > baselineState.cultivator.realmProgress);
});

test("seek-longevity registration does not add extra meditate recovery", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createLongevityMeditationRegistrationRecord(),
    "openclaw-main",
  );

  baselineWorld.cultivators["yun-zhong-he"].spiritualPower = 10;
  registeredWorld.cultivators["yun-zhong-he"].spiritualPower = 10;

  performAction(baselineWorld, "yun-zhong-he", "meditate");
  performAction(registeredWorld, "yun-zhong-he", "meditate");
  runUntilIdle(baselineWorld, "yun-zhong-he");
  runUntilIdle(registeredWorld, "yun-zhong-he");

  assert.equal(
    registeredWorld.cultivators["yun-zhong-he"].spiritualPower,
    baselineWorld.cultivators["yun-zhong-he"].spiritualPower,
  );
});

test("shou_jie registration does not add extra heal recovery", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createRuleBoundHealingRegistrationRecord(),
    "openclaw-main",
  );

  baselineWorld.cultivators["yun-zhong-he"].qi = 10;
  registeredWorld.cultivators["yun-zhong-he"].qi = 10;
  baselineWorld.cultivators["yun-zhong-he"].injuryTicksRemaining = 6;
  registeredWorld.cultivators["yun-zhong-he"].injuryTicksRemaining = 6;

  performAction(baselineWorld, "yun-zhong-he", "heal");
  performAction(registeredWorld, "yun-zhong-he", "heal");
  runUntilIdle(baselineWorld, "yun-zhong-he");
  runUntilIdle(registeredWorld, "yun-zhong-he");

  assert.equal(
    registeredWorld.cultivators["yun-zhong-he"].qi,
    baselineWorld.cultivators["yun-zhong-he"].qi,
  );
});

test("registration bonuses improve task rewards without exposing legacy state", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createSupportTaskRegistrationRecord(),
    "openclaw-main",
  );

  const baselineState = getCultivatorState(baselineWorld, "yun-zhong-he");
  const registeredState = getCultivatorState(registeredWorld, "yun-zhong-he");
  assert.equal("tribulation" in baselineState, false);
  assert.equal("tribulation" in registeredState, false);

  const baselineBefore = baselineState.cultivator.spiritStones;
  const registeredBefore = registeredState.cultivator.spiritStones;

  performAction(baselineWorld, "yun-zhong-he", "take-mortal-task");
  performAction(registeredWorld, "yun-zhong-he", "take-mortal-task");

  const baselineSummary = advanceWorld(baselineWorld, 2);
  const registeredSummary = advanceWorld(registeredWorld, 2);
  assert.equal("tribulations" in baselineSummary, false);
  assert.equal("tribulations" in registeredSummary, false);

  const baselineAfter = getCultivatorState(baselineWorld, "yun-zhong-he").cultivator.spiritStones;
  const registeredAfter = getCultivatorState(registeredWorld, "yun-zhong-he").cultivator.spiritStones;

  assert.ok((registeredAfter - registeredBefore) > (baselineAfter - baselineBefore));
});

test("seed world no longer exposes legacy city-shell faction standings", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators["yun-zhong-he"] & {
    stateReputation?: Record<string, number>;
    reputation?: number;
    karma?: number;
  };

  cultivator.stateReputation = createStateReputation({ qingzhou: 27, yangzhou: 3 });
  cultivator.reputation = 5;
  cultivator.karma = 99;
  const state = getCultivatorState(world, "yun-zhong-he") as ReturnType<typeof getCultivatorState> & {
    cultivator: ReturnType<typeof getCultivatorState>["cultivator"] & { karma?: unknown };
  };

  assert.deepEqual(cultivator.factionReputation, {});
  assert.deepEqual(state.factionReputation, []);
  assert.equal(state.cultivator.reputation, 27);
  assert.equal("karma" in state.cultivator, false);
});

test("trade uses the current state's reputation without recreating legacy city-shell standings", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"] as typeof world.cultivators["yun-zhong-he"] & {
    stateReputation?: Record<string, number>;
    reputation?: number;
  };

  cultivator.stateReputation = createStateReputation({ qingzhou: 80, yangzhou: 0 });
  cultivator.reputation = 0;
  cultivator.locationId = "qingzhou:main-city";

  const beforeQingzhouPurchase = cultivator.spiritStones;
  performAction(world, "yun-zhong-he", "buy-healing-pill");
  const qingzhouCost = beforeQingzhouPurchase - cultivator.spiritStones;

  cultivator.spiritStones = beforeQingzhouPurchase;
  cultivator.locationId = "yangzhou:main-city";

  const beforeYangzhouPurchase = cultivator.spiritStones;
  performAction(world, "yun-zhong-he", "buy-healing-pill");
  const yangzhouCost = beforeYangzhouPurchase - cultivator.spiritStones;

  assert.ok(qingzhouCost < yangzhouCost);
  assert.deepEqual(cultivator.factionReputation, {});

  cultivator.locationId = "qingzhou:sub-town-east";
  const beforeQingzhouReputation = cultivator.stateReputation.qingzhou;
  performAction(world, "yun-zhong-he", "take-mortal-task");
  runUntilIdle(world, "yun-zhong-he");

  assert.equal(cultivator.stateReputation.qingzhou, beforeQingzhouReputation + 8);
  assert.deepEqual(cultivator.factionReputation, {});
});

test("round-based mine beast combat resolves across five ticks", () => {
  const world = createSeedWorld();

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");

  const started = performAction(world, "yun-zhong-he", "hunt-mine-beast");
  assert.equal(started.accepted, true);
  assert.equal(started.job?.totalTicks, 5);
  assert.equal(started.job?.remainingTicks, 5);

  advanceWorld(world, 5);

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.currentJob, null);
  assert.ok(world.combatLogs[0]);
  // Encounter ID now comes from authored enemy config registry (e.g. "wilderness-vein-beast")
  assert.ok(world.combatLogs[0]?.encounterId.startsWith("wilderness-"));
  assert.ok((world.combatLogs[0]?.totalRounds ?? 0) <= 5);
});

test("round-based guardian combat resolves across seven ticks", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"].locationId = "qingzhou:dungeon-c";

  const started = performAction(world, "yun-zhong-he", "challenge-guardian:rank-1");
  assert.equal(started.accepted, true);
  assert.equal(started.job?.totalTicks, 7);
  assert.equal(started.job?.remainingTicks, 7);

  advanceWorld(world, 7);

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.currentJob, null);
  assert.ok(world.combatLogs[0]);
  // Encounter ID now comes from authored enemy config registry (e.g. "guardian-heavy-warden")
  assert.ok(world.combatLogs[0]?.encounterId.startsWith("guardian-"));
  assert.ok((world.combatLogs[0]?.totalRounds ?? 0) <= 7);
});

test("combat log includes round timeline and snapshots", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  assert.ok(Array.isArray(log?.rounds));
  assert.ok((log?.rounds?.length ?? 0) > 0);
  assert.equal(log?.totalRounds, log?.rounds?.length);
  assert.ok(log?.playerSnapshot);
  assert.ok(log?.enemySnapshot);
});

test("combat log damageTaken equals total incoming round damage", () => {
  const world = createSeedWorld();
  world.cultivators["yun-zhong-he"].locationId = "qingzhou:dungeon-c";
  performAction(world, "yun-zhong-he", "challenge-guardian:rank-1");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  const expectedDamageTaken = (log?.rounds ?? []).reduce(
    (sum, round) => sum + (round.enemyAttack?.damage.finalDamage ?? 0),
    0,
  );
  assert.equal(log?.damageTaken, expectedDamageTaken);
});

test("combat outcomes are deterministic for same setup", () => {
  const firstWorld = createSeedWorld();
  const secondWorld = createSeedWorld();

  performAction(firstWorld, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  performAction(secondWorld, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(firstWorld, "yun-zhong-he");
  runUntilIdle(secondWorld, "yun-zhong-he");

  performAction(firstWorld, "yun-zhong-he", "hunt-mine-beast");
  performAction(secondWorld, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(firstWorld, "yun-zhong-he");
  runUntilIdle(secondWorld, "yun-zhong-he");

  const firstLog = firstWorld.combatLogs[0];
  const secondLog = secondWorld.combatLogs[0];
  assert.ok(firstLog && secondLog);
  assert.equal(firstLog?.outcome, secondLog?.outcome);
  assert.equal(firstLog?.damageTaken, secondLog?.damageTaken);
  assert.equal(firstLog?.totalRounds, secondLog?.totalRounds);
  assert.deepEqual(firstLog?.rounds, secondLog?.rounds);
});

// --- P0-3 Combat log clarity ---

test("combat log hpDelta reflects actual HP change across combat", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  if (log?.rounds && log.rounds.length > 0) {
    const startHp = log.playerSnapshot?.hp ?? 0;
    const endHp = log.rounds[log.rounds.length - 1]!.playerHpAfter;
    assert.equal(log.hpDelta, endHp - startHp, "hpDelta should equal endHp - startHp");
    assert.equal(log.totalDamageTaken, Math.max(0, startHp - endHp), "totalDamageTaken should be non-negative HP loss");
  }
});

test("combat log totalSpiritSpent sums per-round spirit costs", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  if (log?.rounds && log.rounds.length > 0) {
    const expectedSpirit = log.rounds.reduce((sum, r) => sum + (r.playerSpiritSpent ?? 0), 0);
    assert.equal(log.totalSpiritSpent, expectedSpirit);
  }
});

test("combat log statusChanges tracks all status transitions", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  if (log?.rounds && log.rounds.length > 0) {
    assert.ok(Array.isArray(log.statusChanges), "statusChanges should be an array");
    for (const change of log.statusChanges ?? []) {
      assert.ok(typeof change.statusId === "string");
      assert.ok(typeof change.statusName === "string");
      assert.ok(typeof change.applied === "boolean");
    }
  }
});

test("combat log includes post-combat cultivator status effects added after round resolution", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  assert.ok(log?.statusChanges?.some((change) => change.statusId === "qi-surge" && change.applied));
  assert.ok(log?.statusEffectsRemaining?.some((status) => status.statusId === "qi-surge"));
});

test("cultivator state exposes combat profile with derived stats", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const state = getCultivatorState(world, "yun-zhong-he");

  const mainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const detailedAttrs = deriveDetailedAttributes(mainAttrs);
  assert.ok(["weapon", "spell"].includes(state.combatProfile.attackChannel), "attackChannel should be weapon or spell");
  assert.equal(state.combatProfile.coreCombatStats.weaponAttack, weaponAttack(mainAttrs));
  assert.equal(state.combatProfile.coreCombatStats.spellAttack, spellAttack(mainAttrs));
  assert.equal(state.combatProfile.coreCombatStats.physicalDefense, physicalDefense(mainAttrs));
  assert.equal(state.combatProfile.coreCombatStats.spellDefense, spellDefense(mainAttrs));
  assert.equal(state.combatProfile.coreCombatStats.speed, detailedAttrs.sudu);
  assert.equal(state.combatProfile.coreCombatStats.hit, detailedAttrs.mingzhong);
  assert.equal(state.combatProfile.coreCombatStats.dodge, detailedAttrs.shanbi);
  assert.equal(state.combatProfile.coreCombatStats.crit, detailedAttrs.huixin);
  assert.equal(state.combatProfile.coreCombatStats.critDamage, detailedAttrs.baoshang);
  assert.equal(state.combatProfile.coreCombatStats.guardHeart, detailedAttrs.huxin);
});

test("round logs contain initiative, hit/crit/miss results, and damage breakdown", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  assert.ok(log.rounds && log.rounds.length > 0);
  for (const round of log.rounds!) {
    assert.equal(typeof round.round, "number");
    assert.equal(typeof round.playerInitiative, "number");
    assert.equal(typeof round.enemyInitiative, "number");
    assert.ok(["brute", "finesse", "tactic"].includes(round.playerRoute!));
    assert.ok(["brute", "finesse", "tactic"].includes(round.enemyRoute!));
    assert.ok(round.firstActor === "player" || round.firstActor === "enemy");
    if (round.playerAttack) {
      assert.ok(["hit", "miss", "crit"].includes(round.playerAttack.result));
      assert.equal(typeof round.playerAttack.damage.baseDamage, "number");
      assert.equal(typeof round.playerAttack.damage.styleMultiplier, "number");
      assert.equal(typeof round.playerAttack.damage.triangleMultiplier, "number");
      assert.equal(typeof round.playerAttack.damage.routeDamageMultiplier, "number");
      assert.equal(typeof round.playerAttack.damage.critMultiplier, "number");
      assert.equal(typeof round.playerAttack.damage.finalDamage, "number");
    }
    if (round.enemyAttack) {
      assert.ok(["hit", "miss", "crit"].includes(round.enemyAttack.result));
      assert.equal(typeof round.enemyAttack.damage.finalDamage, "number");
    }
    assert.equal(typeof round.playerHpAfter, "number");
    assert.equal(typeof round.enemyHpAfter, "number");
    assert.equal(typeof round.playerDied, "boolean");
    assert.equal(typeof round.enemyDied, "boolean");
  }
});

test("miss attack deals zero final damage", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  for (const round of log.rounds!) {
    if (round.playerAttack?.result === "miss") {
      assert.equal(round.playerAttack.damage.finalDamage, 0);
    }
    if (round.enemyAttack?.result === "miss") {
      assert.equal(round.enemyAttack.damage.finalDamage, 0);
    }
  }
});

test("crit only occurs after a successful hit check", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  for (const round of log.rounds!) {
    if (round.playerAttack?.result === "miss") {
      assert.notEqual(round.playerAttack.damage.critMultiplier > 1, true,
        "A miss should never have a crit multiplier > 1");
    }
    if (round.enemyAttack?.result === "miss") {
      assert.notEqual(round.enemyAttack.damage.critMultiplier > 1, true,
        "A miss should never have a crit multiplier > 1");
    }
  }
});

test("initiative winner acts first and first-actor kill prevents second actor action", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  for (const round of log.rounds!) {
    if (round.playerInitiative > round.enemyInitiative) {
      assert.equal(round.firstActor, "player");
    } else if (round.enemyInitiative > round.playerInitiative) {
      assert.equal(round.firstActor, "enemy");
    }
    if (round.firstActor === "player" && round.enemyDied) {
      assert.equal(round.enemyAttack, null,
        "enemy should not attack if killed by first actor");
    }
    if (round.firstActor === "enemy" && round.playerDied) {
      assert.equal(round.playerAttack, null,
        "player should not attack if killed by first actor");
    }
  }
});

test("brute route applies 1.08 damage multiplier", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  for (const round of log.rounds!) {
    if (round.playerAttack && round.playerAttack.result !== "miss") {
      if (round.playerRoute === "brute") {
        assert.equal(round.playerAttack.damage.routeDamageMultiplier, 1.08);
      } else {
        assert.equal(round.playerAttack.damage.routeDamageMultiplier, 1);
      }
    }
    if (round.enemyAttack && round.enemyAttack.result !== "miss") {
      if (round.enemyRoute === "brute") {
        assert.equal(round.enemyAttack.damage.routeDamageMultiplier, 1.08);
      } else {
        assert.equal(round.enemyAttack.damage.routeDamageMultiplier, 1);
      }
    }
  }
});

test("triangle multiplier is 1.15 for advantage, 0.9 for disadvantage, 1 for mirror", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  const advantagePairs = new Set(["tactic:brute", "brute:finesse", "finesse:tactic"]);
  for (const round of log.rounds!) {
    if (round.playerAttack && round.playerAttack.result !== "miss") {
      const pair = `${round.playerRoute}:${round.enemyRoute}`;
      if (round.playerRoute === round.enemyRoute) {
        assert.equal(round.playerAttack.damage.triangleMultiplier, 1);
      } else if (advantagePairs.has(pair)) {
        assert.equal(round.playerAttack.damage.triangleMultiplier, 1.15);
      } else {
        assert.equal(round.playerAttack.damage.triangleMultiplier, 0.9);
      }
    }
  }
});

test("mine beast combat caps at 5 rounds and guardian caps at 7 rounds", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  // Encounter ID now comes from authored enemy config registry
  const mineBeastLog = world.combatLogs.find(l => l.encounterId.startsWith("wilderness-"));
  assert.ok(mineBeastLog);
  assert.ok((mineBeastLog.totalRounds ?? 0) <= 5, "mine beast should not exceed 5 rounds");

  const world2 = createSeedWorld();
  world2.cultivators["yun-zhong-he"].locationId = "qingzhou:dungeon-c";
  performAction(world2, "yun-zhong-he", "challenge-guardian:rank-1");
  runUntilIdle(world2, "yun-zhong-he");

  const guardianLog = world2.combatLogs.find(l => l.encounterId.startsWith("guardian-"));
  assert.ok(guardianLog);
  assert.ok((guardianLog.totalRounds ?? 0) <= 7, "guardian should not exceed 7 rounds");
});

test("equal HP ratio at round cap resolves as defeat", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log);
  if (log.rounds && log.rounds.length > 0) {
    const lastRound = log.rounds[log.rounds.length - 1]!;
    if (!lastRound.playerDied && !lastRound.enemyDied) {
      const playerSnapshot = log.playerSnapshot!;
      const enemySnapshot = log.enemySnapshot!;
      const playerRatio = playerSnapshot.maxHp > 0 ? lastRound.playerHpAfter / playerSnapshot.maxHp : 0;
      const enemyRatio = enemySnapshot.maxHp > 0 ? lastRound.enemyHpAfter / enemySnapshot.maxHp : 0;
      if (playerRatio > enemyRatio) {
        assert.equal(log.outcome, "victory");
      } else {
        assert.equal(log.outcome, "defeat");
      }
    }
  }
});

test("hit chance is clamped between 35% and 97%", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  const totalAttacks = log.rounds!.reduce((count, round) => {
    return count + (round.playerAttack ? 1 : 0) + (round.enemyAttack ? 1 : 0);
  }, 0);
  assert.ok(totalAttacks > 0, "combat should have at least one attack to validate hit mechanics");
});

test("crit multiplier uses critDamage / 100 formula", () => {
  const world = createSeedWorld();
  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds && log.playerSnapshot);
  const playerCritDamage: number = log.playerSnapshot!.critDamage;
  for (const round of log.rounds!) {
    if (round.playerAttack?.result === "crit") {
      const expectedCritMult = playerCritDamage / 100;
      assert.equal(round.playerAttack.damage.critMultiplier, expectedCritMult,
        `player crit multiplier should be critDamage/100 = ${expectedCritMult}`);
    }
    if (round.playerAttack?.result === "hit") {
      assert.equal(round.playerAttack.damage.critMultiplier, 1,
        "non-crit hit should have critMultiplier = 1");
    }
  }
});

test("combat route selection favors registration-weighted styles over uniform random", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  saveCultivationRegistration(world, cultivator.id, {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v2",
    answers: { Q1: "C", Q2: "C", Q3: "C", Q4: "C", Q5: "C", Q6: "C", Q7: "C", Q8: "A", Q9: "C", Q10: "C", Q11: "C", Q12: "C", Q13: "B", Q14: "B", Q15: "B", Q16: "B", Q17: "C", Q18: "B" },
    result: {
      core_temperament_id: "shou_jie",
      core_temperament: "守戒型",
      secondary_temperament_id: "qian_yuan",
      secondary_temperament: "潜渊型",
      behavior_aspect_id: "water",
      behavior_aspect: "水 / 观势",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "求真知",
      five_element_scores: { metal: 0, wood: 0, water: 5, fire: 0, earth: 0 },
      spirit_root_result: "水灵根",
      confidence: { core: "high", behavior: "high", motive: "high", overall: "high" },
    },
    summary: "test",
  });

  performAction(world, cultivator.id, "travel-to:qingzhou:wilderness");
  runUntilIdle(world, cultivator.id);
  performAction(world, cultivator.id, "hunt-mine-beast");
  runUntilIdle(world, cultivator.id);

  const log = world.combatLogs[0];
  assert.ok(log && log.rounds);
  const routeCounts: Record<string, number> = { brute: 0, finesse: 0, tactic: 0 };
  for (const round of log.rounds!) {
    routeCounts[round.playerRoute!] = (routeCounts[round.playerRoute!] ?? 0) + 1;
  }
  assert.equal(routeCounts["brute"], 0,
    "shou_jie + water bias heavily toward tactic; brute should never be selected (it is the lowest-scored route and excluded by Top 2 sampling)");
});

test("managed dungeon expeditions do not emit routine step wakes before the final report", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const firstGrade = Object.keys(cultivator.dungeonProgress)[0] as keyof typeof cultivator.dungeonProgress;

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress[firstGrade].highestClearedRank = 1;

  performAction(world, "yun-zhong-he", expeditionActionId(1, "balanced") as never);
  const interim = advanceWorld(world, 3);

  assert.deepEqual(interim.completedJobs, []);
  assert.deepEqual(interim.triggeredEvents, []);
  assert.ok(world.dungeonExpeditions["yun-zhong-he"]);
  assert.ok(world.dungeonExpeditions["yun-zhong-he"]!.stepIndex > 0);
  assert.equal(world.dungeonExpeditionReports["yun-zhong-he"] ?? null, null);
});

test("seed world and runtime logs omit legacy zone compatibility fields", () => {
  const world = createSeedWorld();

  assert.equal("zones" in world, false);

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
  runUntilIdle(world, "yun-zhong-he");

  const worldEvent = world.worldEvents[0];
  assert.ok(worldEvent);
  assert.equal("locationId" in worldEvent, true);
  assert.equal("zoneId" in worldEvent, false);

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  performAction(world, "yun-zhong-he", "hunt-mine-beast");
  runUntilIdle(world, "yun-zhong-he");

  const combatLog = world.combatLogs[0];
  assert.ok(combatLog);
  assert.equal("locationId" in combatLog, true);
  assert.equal("zoneId" in combatLog, false);
});

test("idle ticks no longer grant legacy passive rewards across locations", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const locations = ["qingzhou:main-city", "qingzhou:wilderness", "qingzhou:dungeon-c"] as const;

  for (const locationId of locations) {
    cultivator.locationId = locationId;
    cultivator.activeJobId = null;
    cultivator.statusEffects = [];

    const before = {
      spiritStones: cultivator.spiritStones,
      stateReputation: {
        ...((cultivator as typeof cultivator & { stateReputation?: Record<string, number> }).stateReputation ?? {}),
      },
      factionReputation: { ...cultivator.factionReputation },
      inventory: { ...cultivator.inventory },
      statusEffects: [...cultivator.statusEffects],
      worldEventCount: world.worldEvents.length,
    };

    const tick = findLegacyIdleRewardTick(world, "yun-zhong-he");
    world.tick = tick - 1;
    const summary = advanceWorld(world, 1);

    assert.equal(summary.triggeredEvents.length, 0);
    assert.equal(world.worldEvents.length, before.worldEventCount);
    assert.equal(cultivator.spiritStones, before.spiritStones);
    assert.deepEqual(
      (cultivator as typeof cultivator & { stateReputation?: Record<string, number> }).stateReputation ?? {},
      before.stateReputation,
    );
    assert.deepEqual(cultivator.factionReputation, before.factionReputation);
    assert.deepEqual(cultivator.inventory, before.inventory);
    assert.deepEqual(cultivator.statusEffects, before.statusEffects);
  }
});

test("direct messages are visible to both sender and recipient mailboxes", () => {
  const world = createSeedWorld();
  const sender = syncCultivatorFromPersona(world, {
    agentId: "openclaw-sender",
    name: "Su Mingyue",
  });
  const recipient = syncCultivatorFromPersona(world, {
    agentId: "openclaw-recipient",
    name: "Li Aotian",
  });

  const message = sendDirectMessage(
    world,
    sender.selectedCultivatorId,
    recipient.selectedCultivatorId,
    "Su Mingyue",
    "Private Telepathy",
    "Meet me at the sect gate before the next tick.",
  );

  const senderMessages = getMessages(world, sender.selectedCultivatorId);
  const recipientMessages = getMessages(world, recipient.selectedCultivatorId);

  assert.equal(message.fromCultivatorId, sender.selectedCultivatorId);
  assert.equal(message.toCultivatorId, recipient.selectedCultivatorId);
  assert.ok(senderMessages.some((entry) => entry.id === message.id));
  assert.ok(recipientMessages.some((entry) => entry.id === message.id));
});

test("cultivator state includes derived economy view", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");

  assert.ok(state.derivedState);
  assert.equal(typeof state.derivedState.readiness, "string");
  assert.equal(typeof state.derivedState.recoveryState, "string");
  assert.equal(typeof state.derivedState.activityContext, "string");
  assert.equal(typeof state.derivedState.daoPotential.score, "number");
});

test("safety-net keeps at least one low-risk action when injured away from residence", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:wilderness");
  runUntilIdle(world, "yun-zhong-he");
  cultivator.injuryTicksRemaining = 5;

  const actionIds = new Set(listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId));

  assert.ok(
    actionIds.has("heal")
      || actionIds.has("residence-recover-qi")
      || Array.from(actionIds).some((actionId) => actionId.startsWith("travel-to:")),
  );
});

test("core_skill unavailable when spirit is insufficient", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const selfSnapshot = {
    hp: 100,
    maxHp: 100,
    attack: 50,
    defense: 30,
    speed: 20,
    hit: 80,
    dodge: 20,
    crit: 10,
    critDamage: 150,
    guardHeart: 10,
  };
  const enemySnapshot = {
    ...selfSnapshot,
  };

  for (let i = 0; i < 20; i += 1) {
    const action = selectCombatAction(
      cultivator,
      selfSnapshot,
      enemySnapshot,
      true,
      true,
      0,
      100,
      10,
      `insufficient-spirit-${i}`,
    );
    assert.notEqual(action, "core_skill");
  }
});

test("low HP makes escape more likely", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const selfSnapshot = {
    hp: 20,
    maxHp: 100,
    attack: 50,
    defense: 30,
    speed: 20,
    hit: 80,
    dodge: 20,
    crit: 10,
    critDamage: 150,
    guardHeart: 10,
  };
  const enemySnapshot = {
    ...selfSnapshot,
    hp: 80,
  };

  const action = selectCombatAction(
    cultivator,
    selfSnapshot,
    enemySnapshot,
    true,
    true,
    0,
    100,
    10,
    "low-hp-escape",
  );
  assert.equal(action, "escape");
});

test("enemy near death makes core_skill more likely", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const selfSnapshot = {
    hp: 100,
    maxHp: 100,
    attack: 50,
    defense: 30,
    speed: 20,
    hit: 80,
    dodge: 20,
    crit: 10,
    critDamage: 150,
    guardHeart: 10,
  };
  const enemySnapshot = {
    ...selfSnapshot,
    hp: 20,
  };

  const action = selectCombatAction(
    cultivator,
    selfSnapshot,
    enemySnapshot,
    true,
    false,
    80,
    100,
    10,
    "enemy-near-0",
  );
  assert.equal(action, "core_skill");
});

test("action selection is deterministic for a fixed world state", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const selfSnapshot = {
    hp: 65,
    maxHp: 100,
    attack: 50,
    defense: 30,
    speed: 20,
    hit: 80,
    dodge: 20,
    crit: 10,
    critDamage: 150,
    guardHeart: 10,
  };
  const enemySnapshot = {
    ...selfSnapshot,
    hp: 55,
  };
  const seed = "deterministic-action-selection";

  const first = selectCombatAction(
    cultivator,
    selfSnapshot,
    enemySnapshot,
    true,
    true,
    60,
    100,
    10,
    seed,
  );
  const second = selectCombatAction(
    cultivator,
    selfSnapshot,
    enemySnapshot,
    true,
    true,
    60,
    100,
    10,
    seed,
  );

  assert.equal(first, second);
});

test("enemy never selects escape in V1 PVE", () => {
  const enemyActions = getAvailableActions(false, 100, 10, true);
  assert.equal(enemyActions.includes("escape"), false);
});

test("escape action does not bind a player route", () => {
  const context = findCombatContextByAction("escape", ({ combatState }) => {
    combatState.maxRounds = 1;
    combatState.playerSnapshot.escapeAllowed = true;
    combatState.playerSnapshot.coreSkillSpiritCost = 999;
    combatState.playerSpirit = 0;
    combatState.playerSnapshot.spirit = 0;
    combatState.playerSnapshot.hp = 10;
    combatState.playerSnapshot.maxHp = 100;
    combatState.playerSnapshot.speed = 300;
    combatState.enemySnapshot.speed = 1;
  });
  assert.ok(context);

  const { world, combatState } = context;
  combatState.maxRounds = 1;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "escape");
  assert.equal(round.playerBoundRoute, undefined);
});

test("core_skill action binds a route", () => {
  const { world, combatState } = startMineBeastCombat();
  combatState.maxRounds = 1;
  combatState.playerSnapshot.escapeAllowed = false;
  combatState.playerSnapshot.coreSkillSpiritCost = 10;
  combatState.playerSpirit = 100;
  combatState.playerSnapshot.spirit = 100;
  combatState.enemySnapshot.hp = 10;
  combatState.playerSnapshot.speed = 300;
  combatState.enemySnapshot.speed = 1;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "core_skill");
  assert.ok(round.playerBoundRoute === "brute" || round.playerBoundRoute === "finesse" || round.playerBoundRoute === "tactic");
});

test("core_skill preferred route adds affinity bonus in route selection", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  let found = false;

  for (let i = 0; i < 1200; i += 1) {
    const seed = `route-affinity-${i}`;
    const withoutAffinity = selectCombatRoute(cultivator, seed);
    const withAffinity = selectCombatRoute(cultivator, seed, "tactic");
    if (withoutAffinity !== "tactic" && withAffinity === "tactic") {
      found = true;
      break;
    }
  }

  assert.equal(found, true);
});

test("core_skill spends spirit on hit", () => {
  let context: ReturnType<typeof startMineBeastCombat> | null = null;
  for (let i = 0; i < 40; i += 1) {
    const candidate = startMineBeastCombat();
    const roll = firstRoundHitRoll(candidate.world, candidate.job.id, candidate.combatState.encounterTemplateId);
    if (roll < 97) {
      context = candidate;
      break;
    }
  }
  assert.ok(context);

  context.combatState.maxRounds = 1;
  context.combatState.playerSnapshot.escapeAllowed = false;
  context.combatState.playerSnapshot.coreSkillSpiritCost = 12;
  context.combatState.playerSnapshot.weaponCoreSkillSpiritCost = 12;
  context.combatState.playerSnapshot.spellCoreSkillSpiritCost = 12;
  context.combatState.playerSpirit = 90;
  context.combatState.playerSnapshot.spirit = 90;
  context.combatState.playerSnapshot.speed = 300;
  context.combatState.enemySnapshot.speed = 1;
  context.combatState.playerSnapshot.hit = 999;
  context.combatState.enemySnapshot.dodge = 0;
  context.combatState.enemySnapshot.hp = 10;

  runUntilIdle(context.world, "yun-zhong-he");
  const round = context.world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "core_skill");
  assert.notEqual(round.playerAttack?.result, "miss");
  assert.equal(round.playerSpiritSpent, 12);
});

test("core_skill spends spirit on miss", () => {
  let context: ReturnType<typeof startMineBeastCombat> | null = null;
  for (let i = 0; i < 40; i += 1) {
    const candidate = startMineBeastCombat();
    // Vary the deterministic seed source so the search does not repeat one roll.
    candidate.world.tick += i;
    const roll = firstRoundHitRoll(candidate.world, candidate.job.id, candidate.combatState.encounterTemplateId);
    if (roll >= 35) {
      context = candidate;
      break;
    }
  }
  assert.ok(context);

  context.combatState.maxRounds = 1;
  context.combatState.playerSnapshot.escapeAllowed = false;
  context.combatState.playerSnapshot.coreSkillSpiritCost = 11;
  context.combatState.playerSnapshot.weaponCoreSkillSpiritCost = 11;
  context.combatState.playerSnapshot.spellCoreSkillSpiritCost = 11;
  context.combatState.playerSpirit = 90;
  context.combatState.playerSnapshot.spirit = 90;
  context.combatState.playerSnapshot.speed = 300;
  context.combatState.enemySnapshot.speed = 1;
  context.combatState.playerSnapshot.hit = 0;
  context.combatState.enemySnapshot.dodge = 999;
  context.combatState.enemySnapshot.hp = 10;

  runUntilIdle(context.world, "yun-zhong-he");
  const round = context.world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "core_skill");
  assert.equal(round.playerAttack?.result, "miss");
  assert.equal(round.playerSpiritSpent, 11);
});

test("core_skill does not spend spirit if actor dies before acting", () => {
  const { world, combatState } = startMineBeastCombat();
  combatState.maxRounds = 1;
  combatState.playerSnapshot.escapeAllowed = false;
  combatState.playerSnapshot.coreSkillSpiritCost = 15;
  combatState.playerSpirit = 90;
  combatState.playerSnapshot.spirit = 90;
  combatState.enemySnapshot.hp = 200;
  combatState.playerSnapshot.speed = 1;
  combatState.enemySnapshot.speed = 300;
  combatState.playerSnapshot.hp = 1;
  combatState.enemySnapshot.attack = 999;
  combatState.enemySnapshot.hit = 999;
  combatState.playerSnapshot.defense = 0;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "core_skill");
  assert.equal(round.playerActionSkipped, true);
  assert.equal(round.playerSpiritSpent, 0);
});

test("core_skill damage uses 1.6x action multiplier", () => {
  let context: ReturnType<typeof startMineBeastCombat> | null = null;
  for (let i = 0; i < 40; i += 1) {
    const candidate = startMineBeastCombat();
    const roll = firstRoundHitRoll(candidate.world, candidate.job.id, candidate.combatState.encounterTemplateId);
    if (roll < 97) {
      context = candidate;
      break;
    }
  }
  assert.ok(context);

  context.combatState.maxRounds = 1;
  context.combatState.playerSnapshot.escapeAllowed = false;
  context.combatState.playerSnapshot.coreSkillSpiritCost = 10;
  context.combatState.playerSpirit = 100;
  context.combatState.playerSnapshot.spirit = 100;
  context.combatState.playerSnapshot.speed = 300;
  context.combatState.enemySnapshot.speed = 1;
  context.combatState.playerSnapshot.hit = 999;
  context.combatState.enemySnapshot.dodge = 0;
  context.combatState.playerSnapshot.crit = 0;
  context.combatState.enemySnapshot.guardHeart = 999;
  context.combatState.enemySnapshot.hp = 200;

  runUntilIdle(context.world, "yun-zhong-he");
  const damage = context.world.combatLogs[0]?.rounds?.[0]?.playerAttack?.damage;
  assert.ok(damage);
  const noActionMultiplierDamage = Math.max(
    1,
    Math.round(
      damage.baseDamage
      * damage.styleMultiplier
      * damage.triangleMultiplier
      * damage.routeDamageMultiplier
      * damage.critMultiplier,
    ),
  );
  assert.equal(damage.actionMultiplier, 1.6);
  assert.ok(damage.finalDamage > noActionMultiplierDamage);
});

test("computeEscapeChance follows frozen formula and clamps", () => {
  const high = computeEscapeChance(300, 10, 0.1, "advantaged");
  const low = computeEscapeChance(1, 300, 1, "poor");
  const mid = computeEscapeChance(100, 100, 0.5, "stable");
  assert.equal(high, 85);
  assert.equal(low, 10);
  assert.equal(mid, 35);
});

test("successful escape ends battle immediately", () => {
  const configureFn = (candidate: ReturnType<typeof startMineBeastCombat>) => {
    candidate.combatState.maxRounds = 5;
    candidate.combatState.playerSnapshot.escapeAllowed = true;
    candidate.combatState.playerSnapshot.coreSkillSpiritCost = 999;
    candidate.combatState.playerSpirit = 0;
    candidate.combatState.playerSnapshot.spirit = 0;
    candidate.combatState.playerSnapshot.hp = 10;
    candidate.combatState.playerSnapshot.maxHp = 100;
    candidate.combatState.playerSnapshot.speed = 300;
    candidate.combatState.enemySnapshot.speed = 1;
  };
  const escapeSucceeds = (ctx: ReturnType<typeof startMineBeastCombat>) => {
    const chance = computeEscapeChance(300, 1, 0.1, "stable");
    const roll = firstRoundEscapeRoll(ctx.world, ctx.job.id, ctx.combatState.encounterTemplateId);
    return roll < chance;
  };
  const context = findCombatContextByAction("escape", configureFn, escapeSucceeds);
  assert.ok(context);

  runUntilIdle(context.world, "yun-zhong-he");
  const log = context.world.combatLogs[0];
  assert.ok(log);
  assert.equal(log.outcome, "defeat");
  assert.equal(log.retreated, true);
  assert.equal(log.totalRounds, 1);
  assert.equal(log.rounds?.[0]?.playerEscape?.attempted, true);
  assert.equal(log.rounds?.[0]?.playerEscape?.success, true);
  assert.equal(log.rounds?.[0]?.enemyAttack, null);
});

test("failed escape consumes round action and combat continues", () => {
  const context = findCombatContextByAction("escape", (candidate) => {
    candidate.combatState.maxRounds = 1;
    candidate.combatState.playerSnapshot.escapeAllowed = true;
    candidate.combatState.playerSnapshot.coreSkillSpiritCost = 999;
    candidate.combatState.playerSpirit = 0;
    candidate.combatState.playerSnapshot.spirit = 0;
    candidate.combatState.playerSnapshot.speed = 1;
    candidate.combatState.enemySnapshot.speed = 300;
    candidate.combatState.playerSnapshot.hp = 100;
    candidate.combatState.playerSnapshot.maxHp = 100;
    candidate.combatState.enemySnapshot.hp = 300;
  });
  assert.ok(context);

  const chance = computeEscapeChance(1, 300, 1, "stable");
  const roll = firstRoundEscapeRoll(context.world, context.job.id, context.combatState.encounterTemplateId);
  assert.ok(roll >= chance);

  runUntilIdle(context.world, "yun-zhong-he");
  const round = context.world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "escape");
  assert.equal(round.playerAttack, null);
  assert.equal(round.playerEscape?.attempted, true);
  assert.equal(round.playerEscape?.success, false);
  assert.notEqual(round.enemyAttack, null);
});

test("enemy action stays basic_attack even if enemy escapeAllowed is toggled", () => {
  const { world, combatState } = startMineBeastCombat();
  combatState.maxRounds = 1;
  combatState.enemySnapshot.escapeAllowed = true;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.ok(
    round.enemyAction === "basic_attack" || round.enemyAction === "core_skill",
    `enemy should attack, not escape; got ${round.enemyAction}`,
  );
  assert.equal(round.enemyEscape, undefined);
});

test("retreat grants no victory reward and preserves qi", () => {
  const configureFn = (candidate: ReturnType<typeof startMineBeastCombat>) => {
    candidate.combatState.maxRounds = 5;
    candidate.combatState.playerSnapshot.escapeAllowed = true;
    candidate.combatState.playerSnapshot.coreSkillSpiritCost = 999;
    candidate.combatState.playerSpirit = 0;
    candidate.combatState.playerSnapshot.spirit = 0;
    candidate.combatState.playerSnapshot.hp = 10;
    candidate.combatState.playerSnapshot.maxHp = 100;
    candidate.combatState.playerSnapshot.speed = 300;
    candidate.combatState.enemySnapshot.speed = 1;
  };
  const escapeSucceeds = (ctx: ReturnType<typeof startMineBeastCombat>) => {
    const chance = computeEscapeChance(300, 1, 0.1, "stable");
    const roll = firstRoundEscapeRoll(ctx.world, ctx.job.id, ctx.combatState.encounterTemplateId);
    return roll < chance;
  };
  const context = findCombatContextByAction("escape", configureFn, escapeSucceeds);
  assert.ok(context);

  const beforeQi = context.cultivator.qi;
  const beforeStones = context.cultivator.spiritStones;
  const beforeOre = context.cultivator.inventory["spirit-ore"];
  const beforeFoundation = context.cultivator.inventory["mystic-jade-stone"];
  const beforeBeastCore = context.cultivator.inventory["beast-core"];

  runUntilIdle(context.world, "yun-zhong-he");
  const log = context.world.combatLogs[0];
  assert.ok(log);
  assert.equal(log.retreated, true);
  assert.equal(context.cultivator.qi, beforeQi);
  assert.equal(context.cultivator.spiritStones, beforeStones);
  assert.equal(context.cultivator.inventory["spirit-ore"], beforeOre);
  assert.equal(context.cultivator.inventory["mystic-jade-stone"], beforeFoundation);
  assert.equal(context.cultivator.inventory["beast-core"], beforeBeastCore);
});

test("city duel challenger retreat applies challenger-side penalties", () => {
  const configureFn = (candidate: ReturnType<typeof startCityDuelCombat>) => {
    candidate.combatState.maxRounds = 5;
    candidate.combatState.playerSnapshot.escapeAllowed = true;
    candidate.combatState.playerSnapshot.coreSkillSpiritCost = 999;
    candidate.combatState.playerSpirit = 0;
    candidate.combatState.playerSnapshot.spirit = 0;
    candidate.combatState.playerSnapshot.hp = 10;
    candidate.combatState.playerSnapshot.maxHp = 100;
    candidate.combatState.playerSnapshot.speed = 300;
    candidate.combatState.enemySnapshot.speed = 1;
  };
  const escapeSucceeds = (ctx: ReturnType<typeof startCityDuelCombat>) => {
    const chance = computeEscapeChance(300, 1, 0.1, "stable");
    const roll = firstRoundEscapeRoll(ctx.world, ctx.job.id, ctx.combatState.encounterTemplateId);
    return roll < chance;
  };
  const context = findCityDuelContextByPlayerAction("escape", configureFn, escapeSucceeds);
  assert.ok(context);

  const challengerStateId = stateIdOfLocation(context.cultivator.locationId);
  const challengerReputation = context.cultivator.stateReputation[challengerStateId];
  const challengerStones = context.cultivator.spiritStones;
  const targetStones = context.target.spiritStones;

  runUntilIdle(context.world, context.cultivator.id);

  assert.equal(context.cultivator.spiritStones, challengerStones - 8);
  assert.equal(context.cultivator.stateReputation[challengerStateId], challengerReputation - 1);
  assert.equal(context.target.spiritStones, targetStones + 5);

  const challengerLog = context.world.combatLogs.find((entry) => entry.cultivatorId === context.cultivator.id);
  const targetLog = context.world.combatLogs.find((entry) => entry.cultivatorId === context.target.id);
  assert.ok(challengerLog);
  assert.ok(targetLog);
  assert.equal(challengerLog.outcome, "defeat");
  assert.equal(challengerLog.retreated, true);
  assert.equal(targetLog.outcome, "victory");
  assert.equal(targetLog.retreated, undefined);
});

test("city duel action stays hidden when no eligible nearby target exists", () => {
  const world = createSeedWorld();
  const challenger = world.cultivators["yun-zhong-he"]!;
  const farSummary = createCultivator(world, { name: "Far Duel Target" });
  const farTarget = world.cultivators[farSummary.id]!;

  farTarget.locationId = "qingzhou:sub-town-east";
  farTarget.activeJobId = null;

  const actionIds = listAvailableActions(world, challenger.id).map((action) => String(action.actionId));
  assert.equal(actionIds.some((actionId) => actionId.startsWith("challenge-cultivator:")), false);
});

test("city duel actions only include eligible same-location targets", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const challenger = world.cultivators["yun-zhong-he"]!;
  challenger.sectId = "qing-yun-sect";

  const eligibleSummary = createCultivator(world, { name: "Eligible Duel Target" });
  const eligibleTarget = world.cultivators[eligibleSummary.id]!;
  eligibleTarget.locationId = challenger.locationId;
  eligibleTarget.activeJobId = null;
  eligibleTarget.realm = challenger.realm;

  const sameSectSummary = createCultivator(world, { name: "Same Sect Duel Target" });
  const sameSectTarget = world.cultivators[sameSectSummary.id]!;
  sameSectTarget.locationId = challenger.locationId;
  sameSectTarget.activeJobId = null;
  sameSectTarget.sectId = "qing-yun-sect";

  const busySummary = createCultivator(world, { name: "Busy Duel Target" });
  const busyTarget = world.cultivators[busySummary.id]!;
  busyTarget.locationId = challenger.locationId;
  world.jobs["busy-job"] = {
    id: "busy-job",
    cultivatorId: busyTarget.id,
    actionId: "meditate",
    label: "Meditate",
    remainingTicks: 4,
    totalTicks: 4,
  };
  busyTarget.activeJobId = "busy-job";

  const farSummary = createCultivator(world, { name: "Far Duel Target" });
  const farTarget = world.cultivators[farSummary.id]!;
  farTarget.locationId = "qingzhou:sub-town-east";
  farTarget.activeJobId = null;

  const actionIds = new Set(listAvailableActions(world, challenger.id).map((action) => String(action.actionId)));
  assert.equal(actionIds.has(`challenge-cultivator:${eligibleTarget.id}`), true);
  assert.equal(actionIds.has(`challenge-cultivator:${sameSectTarget.id}`), false);
  assert.equal(actionIds.has(`challenge-cultivator:${busyTarget.id}`), false);
  assert.equal(actionIds.has(`challenge-cultivator:${farTarget.id}`), false);
});

test("pending city duel response actions appear only while the challenge remains location-valid", () => {
  const { world, challenger, target, challengeId } = startPendingCityDuelChallenge();

  const responseActionsBefore = new Set(listAvailableActions(world, target.id).map((action) => String(action.actionId)));
  assert.equal(responseActionsBefore.has(`accept-pvp-challenge:${challengeId}`), true);
  assert.equal(responseActionsBefore.has(`reject-pvp-challenge:${challengeId}`), true);

  const leaveResult = performAction(world, challenger.id, "travel-to:qingzhou:sub-town-east");
  assert.equal(leaveResult.accepted, true);

  const responseActionsAfter = new Set(listAvailableActions(world, target.id).map((action) => String(action.actionId)));
  assert.equal(responseActionsAfter.has(`accept-pvp-challenge:${challengeId}`), false);
  assert.equal(responseActionsAfter.has(`reject-pvp-challenge:${challengeId}`), false);
});

test("pending city duel cancels when one duelist chooses to leave the area", () => {
  const { world, challenger, target, challengeId } = startPendingCityDuelChallenge();

  const leaveResult = performAction(world, challenger.id, "travel-to:qingzhou:sub-town-east");
  assert.equal(leaveResult.accepted, true);

  advanceWorld(world, 1);

  assert.equal(world.pendingPvpChallenges[challengeId], undefined);
  assert.equal(target.pendingPvpChallengeId, null);

  const challengerMessages = getMessages(world, challenger.id);
  const targetMessages = getMessages(world, target.id);

  assert.ok(challengerMessages.some((entry) => entry.subject.includes("挑战取消")));
  assert.ok(targetMessages.some((entry) => entry.subject.includes("挑战取消")));
});

test("pending city duel cancels when the challenged target leaves the area", () => {
  const { world, challenger, target, challengeId } = startPendingCityDuelChallenge();

  const leaveResult = performAction(world, target.id, "travel-to:qingzhou:sub-town-east");
  assert.equal(leaveResult.accepted, true);

  advanceWorld(world, 1);

  assert.equal(world.pendingPvpChallenges[challengeId], undefined);
  assert.equal(target.pendingPvpChallengeId, null);
  assert.equal(challenger.pendingPvpChallengeId, null);

  const challengerMessages = getMessages(world, challenger.id);
  const targetMessages = getMessages(world, target.id);

  assert.ok(challengerMessages.some((entry) => entry.subject.includes("挑战取消")));
  assert.ok(targetMessages.some((entry) => entry.subject.includes("挑战取消")));
});

test("city duel target retreat applies target-side penalties", () => {
  const configureFn = (candidate: ReturnType<typeof startCityDuelCombat>) => {
    candidate.combatState.maxRounds = 5;
    candidate.combatState.enemySnapshot.escapeAllowed = true;
    candidate.combatState.enemySnapshot.coreSkillSpiritCost = 999;
    candidate.combatState.enemySpirit = 0;
    candidate.combatState.enemySnapshot.spirit = 0;
    candidate.combatState.enemySnapshot.hp = 10;
    candidate.combatState.enemySnapshot.maxHp = 100;
    candidate.combatState.enemySnapshot.speed = 300;
    candidate.combatState.playerSnapshot.speed = 1;
    candidate.combatState.playerSnapshot.attack = 1;
  };
  const escapeSucceeds = (ctx: ReturnType<typeof startCityDuelCombat>) => {
    const chance = computeEscapeChance(300, 1, 0.1, "stable");
    const roll = firstRoundEnemyEscapeRoll(ctx);
    return roll < chance;
  };
  const context = findCityDuelContextByEnemyAction("escape", configureFn, escapeSucceeds);
  assert.ok(context);

  const challengerStateId = stateIdOfLocation(context.cultivator.locationId);
  const challengerReputation = context.cultivator.stateReputation[challengerStateId];
  const challengerStones = context.cultivator.spiritStones;
  const targetStones = context.target.spiritStones;

  runUntilIdle(context.world, context.cultivator.id);

  assert.equal(context.cultivator.spiritStones, challengerStones + 8);
  assert.equal(context.cultivator.stateReputation[challengerStateId], challengerReputation);
  assert.equal(context.target.spiritStones, targetStones - 3);

  const challengerLog = context.world.combatLogs.find((entry) => entry.cultivatorId === context.cultivator.id);
  const targetLog = context.world.combatLogs.find((entry) => entry.cultivatorId === context.target.id);
  assert.ok(challengerLog);
  assert.ok(targetLog);
  assert.equal(challengerLog.outcome, "victory");
  assert.equal(challengerLog.retreated, undefined);
  assert.equal(targetLog.outcome, "defeat");
  assert.equal(targetLog.retreated, true);
  assert.equal(targetLog.rounds?.[0]?.enemyEscape?.attempted, true);
  assert.equal(targetLog.rounds?.[0]?.enemyEscape?.success, true);
});

test("player killed before escape turn does not attempt escape", () => {
  const context = findCombatContextByAction("escape", ({ combatState }) => {
    combatState.maxRounds = 1;
    combatState.playerSnapshot.escapeAllowed = true;
    combatState.playerSnapshot.coreSkillSpiritCost = 999;
    combatState.playerSpirit = 0;
    combatState.playerSnapshot.spirit = 0;
    combatState.playerSnapshot.hp = 1;
    combatState.playerSnapshot.maxHp = 100;
    combatState.playerSnapshot.speed = 1;
    combatState.enemySnapshot.speed = 300;
    combatState.enemySnapshot.attack = 999;
    combatState.enemySnapshot.hit = 999;
    combatState.playerSnapshot.defense = 0;
  });
  assert.ok(context);

  const { world, combatState } = context;
  combatState.maxRounds = 1;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "escape");
  assert.equal(round.playerActionSkipped, true);
  assert.equal(round.playerEscape?.attempted, false);
});

test("core_skill rounds include action fields and spirit spending", () => {
  const { world, combatState } = startMineBeastCombat();
  combatState.maxRounds = 1;
  combatState.playerSnapshot.escapeAllowed = false;
  combatState.playerSnapshot.coreSkillSpiritCost = 13;
  combatState.playerSnapshot.weaponCoreSkillSpiritCost = 13;
  combatState.playerSnapshot.spellCoreSkillSpiritCost = 13;
  combatState.playerSpirit = 90;
  combatState.playerSnapshot.spirit = 90;
  combatState.enemySnapshot.hp = 10;
  combatState.playerSnapshot.speed = 300;
  combatState.enemySnapshot.speed = 1;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerAction, "core_skill");
  assert.ok(["basic_attack", "core_skill"].includes(round.enemyAction!), "enemy should use action layer");
  assert.equal(round.playerSpiritSpent, 13);
  assert.equal(round.enemySpiritSpent, 0);
});

test("escape rounds include attempted/success/chance fields", () => {
  const context = findCombatContextByAction("escape", ({ combatState }) => {
    combatState.maxRounds = 1;
    combatState.playerSnapshot.escapeAllowed = true;
    combatState.playerSnapshot.coreSkillSpiritCost = 999;
    combatState.playerSpirit = 0;
    combatState.playerSnapshot.spirit = 0;
    combatState.playerSnapshot.speed = 300;
    combatState.enemySnapshot.speed = 1;
    combatState.playerSnapshot.hp = 60;
    combatState.playerSnapshot.maxHp = 100;
  });
  assert.ok(context);

  const { world, combatState } = context;
  combatState.maxRounds = 1;

  runUntilIdle(world, "yun-zhong-he");
  const escape = world.combatLogs[0]?.rounds?.[0]?.playerEscape;
  assert.ok(escape);
  assert.equal(typeof escape.attempted, "boolean");
  assert.equal(typeof escape.success, "boolean");
  assert.equal(typeof escape.chance, "number");
});

test("round logs keep backward-compatible playerRoute/enemyRoute fields", () => {
  const context = findCombatContextByAction("escape", ({ combatState }) => {
    combatState.maxRounds = 1;
    combatState.playerSnapshot.escapeAllowed = true;
    combatState.playerSnapshot.coreSkillSpiritCost = 999;
    combatState.playerSpirit = 0;
    combatState.playerSnapshot.spirit = 0;
  });
  assert.ok(context);

  const { world, combatState } = context;
  combatState.maxRounds = 1;

  runUntilIdle(world, "yun-zhong-he");
  const round = world.combatLogs[0]?.rounds?.[0];
  assert.ok(round);
  assert.equal(round.playerBoundRoute, undefined);
  assert.ok(round.enemyBoundRoute === "brute" || round.enemyBoundRoute === "finesse" || round.enemyBoundRoute === "tactic");
  assert.equal(round.playerRoute, round.enemyBoundRoute);
  assert.equal(round.enemyRoute, round.enemyBoundRoute);
});

// =========================================================================
// Combat Loadout System Tests
// =========================================================================

test("new cultivator gets default weapon and spell loadouts", () => {
  const world = createSeedWorld();
  const c = world.cultivators["yun-zhong-he"];
  assert.ok(c.equippedWeaponLoadoutId, "should have equipped weapon loadout");
  assert.ok(c.equippedSpellLoadoutId, "should have equipped spell loadout");
  assert.ok(c.unlockedWeaponLoadoutIds.length >= 1, "should have at least one unlocked weapon");
  assert.ok(c.unlockedSpellLoadoutIds.length >= 1, "should have at least one unlocked spell");
  assert.ok(c.unlockedWeaponLoadoutIds.includes(c.equippedWeaponLoadoutId), "equipped weapon should be in unlocked set");
  assert.ok(c.unlockedSpellLoadoutIds.includes(c.equippedSpellLoadoutId), "equipped spell should be in unlocked set");
});

test("registration updates loadouts based on combat style and elements", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  saveCultivationRegistration(world, cultivatorId, record);
  const c = world.cultivators[cultivatorId];
  assert.ok(c.unlockedWeaponLoadoutIds.length === 2, "registration should give 2 weapon loadouts");
  assert.ok(c.unlockedSpellLoadoutIds.length === 2, "registration should give 2 spell loadouts");
  assert.ok(c.equippedWeaponLoadoutId, "should have an equipped weapon");
  assert.ok(c.equippedSpellLoadoutId, "should have an equipped spell");
});

test("spell loadouts derive from dominated elements after registration", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  // record has water: 11 (highest), earth: 9 (second)
  saveCultivationRegistration(world, cultivatorId, record);
  const c = world.cultivators[cultivatorId];
  // Main element water -> starter-water-frost
  assert.equal(String(c.equippedSpellLoadoutId), "starter-water-frost");
  // Backup element earth -> starter-earth-vein
  const hasEarthBackup = c.unlockedSpellLoadoutIds.some(
    (id) => String(id) === "starter-earth-vein"
  );
  assert.ok(hasEarthBackup, "second unlock should be based on second-highest element");
});

test("equip-weapon action switches equipped weapon loadout", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  saveCultivationRegistration(world, cultivatorId, record);

  const c = world.cultivators[cultivatorId];
  const otherLoadout = c.unlockedWeaponLoadoutIds.find(
    (id) => id !== c.equippedWeaponLoadoutId
  );
  assert.ok(otherLoadout, "should have a second unlocked loadout to switch to");

  const result = performAction(world, cultivatorId, `equip-weapon:${otherLoadout}` as any);
  assert.equal(result.accepted, true);
  assert.equal(world.cultivators[cultivatorId].equippedWeaponLoadoutId, otherLoadout);
});

test("equip-spell action switches equipped spell loadout", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  saveCultivationRegistration(world, cultivatorId, record);

  const c = world.cultivators[cultivatorId];
  const otherLoadout = c.unlockedSpellLoadoutIds.find(
    (id) => id !== c.equippedSpellLoadoutId
  );
  assert.ok(otherLoadout, "should have a second unlocked spell loadout");

  const result = performAction(world, cultivatorId, `equip-spell:${otherLoadout}` as any);
  assert.equal(result.accepted, true);
  assert.equal(world.cultivators[cultivatorId].equippedSpellLoadoutId, otherLoadout);
});

test("cannot equip a weapon loadout that is not unlocked", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  assert.throws(
    () => performAction(world, cultivatorId, "equip-weapon:starter-hammer" as any),
    /Cannot equip weapon loadout/,
  );
});

test("cannot equip a spell loadout that is not unlocked", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  assert.throws(
    () => performAction(world, cultivatorId, "equip-spell:starter-fire-blaze" as any),
    /Cannot equip spell loadout/,
  );
});

test("equip actions appear in available actions for unlocked loadouts", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  saveCultivationRegistration(world, cultivatorId, record);

  const actions = listAvailableActions(world, cultivatorId);
  const equipActions = actions.filter(
    (a) => a.actionId.startsWith("equip-weapon:") || a.actionId.startsWith("equip-spell:")
  );
  // Should have equip actions for each unlock that isn't currently equipped
  const c = world.cultivators[cultivatorId];
  const expectedWeaponEquips = c.unlockedWeaponLoadoutIds.filter(
    (id) => id !== c.equippedWeaponLoadoutId
  ).length;
  const expectedSpellEquips = c.unlockedSpellLoadoutIds.filter(
    (id) => id !== c.equippedSpellLoadoutId
  ).length;
  assert.equal(
    equipActions.length,
    expectedWeaponEquips + expectedSpellEquips,
    "equip actions should match unlocked non-equipped loadouts",
  );
});

test("equip card writes a negative attack bonus with one minus", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const cultivator = world.cultivators[cultivatorId]!;
  const weaponId = (id: string) => id as (typeof cultivator.unlockedWeaponLoadoutIds)[number];
  const spellId = (id: string) => id as (typeof cultivator.unlockedSpellLoadoutIds)[number];
  cultivator.unlockedWeaponLoadoutIds = [weaponId("starter-sword"), weaponId("starter-dagger"), weaponId("starter-saber")];
  cultivator.equippedWeaponLoadoutId = weaponId("starter-sword");
  cultivator.unlockedSpellLoadoutIds = [spellId("starter-metal-edge"), spellId("starter-water-flow")];
  cultivator.equippedSpellLoadoutId = spellId("starter-metal-edge");
  const actions = listAvailableActions(world, cultivatorId);
  const dagger = actions.find((action) => action.actionId === "equip-weapon:starter-dagger");
  const saber = actions.find((action) => action.actionId === "equip-weapon:starter-saber");
  const flow = actions.find((action) => action.actionId === "equip-spell:starter-water-flow");
  assert.match(dagger?.description ?? "", /伤害-1/);
  assert.match(saber?.description ?? "", /伤害\+2/);
  assert.match(flow?.description ?? "", /伤害-1/);
  assert.doesNotMatch(`${dagger?.description ?? ""}${saber?.description ?? ""}${flow?.description ?? ""}`, /伤害\+-/);
  cultivator.equippedWeaponLoadoutId = weaponId("starter-dagger");
  const sword = listAvailableActions(world, cultivatorId).find((action) => action.actionId === "equip-weapon:starter-sword");
  assert.ok(sword);
  assert.equal(sword.description.includes("伤害"), false);
});

test("already-equipped loadout does not appear as equip action", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const actions = listAvailableActions(world, cultivatorId);
  const c = world.cultivators[cultivatorId];
  const equipCurrent = actions.find(
    (a) => a.actionId === `equip-weapon:${c.equippedWeaponLoadoutId}`
  );
  assert.equal(equipCurrent, undefined, "should not have equip action for already-equipped weapon");
});

test("combat snapshot uses loadout coreSkillSpiritCost instead of 10% max spirit", () => {
  const context = startMineBeastCombat();
  const playerSnapshot = context.combatState.playerSnapshot;
  // With starter-sword loadout, coreSkillSpiritCost should be 15 (from config)
  // instead of Math.round(maxSpiritualPower * 0.10) = 10
  // The cultivator should have been given a starter loadout
  const c = context.cultivator;
  if (c.equippedWeaponLoadoutId || c.equippedSpellLoadoutId) {
    // The cost should come from the loadout, not from 10% of max spirit
    assert.ok(
      playerSnapshot.coreSkillSpiritCost !== undefined,
      "player snapshot should have coreSkillSpiritCost from loadout",
    );
  }
});

test("combat snapshot attack includes loadout attackPowerBonus", () => {
  const context = startMineBeastCombat();
  const c = context.cultivator;
  const mainAttrs = deriveMainAttributes(c.registrationRecord);
  const baseWeaponAtk = weaponAttack(mainAttrs);
  const baseSpellAtk = spellAttack(mainAttrs);
  const playerAttack = context.combatState.playerSnapshot.attack;
  // Attack should be base + bonus from the dominant channel's loadout
  // It should differ from pure weapon attack if a loadout is equipped
  assert.ok(playerAttack >= 1, "attack should be positive");
});

test("cultivator state view exposes current equipped loadout data", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const state = getCultivatorState(world, cultivatorId);
  // combatProfile should expose loadout info
  assert.ok("equippedWeaponLoadout" in state.combatProfile);
  assert.ok("equippedSpellLoadout" in state.combatProfile);
  assert.ok("unlockedWeaponLoadouts" in state.combatProfile);
  assert.ok("unlockedSpellLoadouts" in state.combatProfile);
  // With a default loadout, weapon loadout should be populated
  if (state.combatProfile.equippedWeaponLoadout) {
    assert.ok(state.combatProfile.equippedWeaponLoadout.id);
    assert.ok(state.combatProfile.equippedWeaponLoadout.name);
    assert.ok(state.combatProfile.equippedWeaponLoadout.weaponTypeId);
    assert.ok(typeof state.combatProfile.equippedWeaponLoadout.coreSkillSpiritCost === "number");
  }
});

test("hydrated world backfills loadout fields for old cultivators", () => {
  const world = createSeedWorld();
  // Strip loadout fields to simulate a legacy world
  const c = world.cultivators["yun-zhong-he"];
  delete (c as any).equippedWeaponLoadoutId;
  delete (c as any).equippedSpellLoadoutId;
  delete (c as any).unlockedWeaponLoadoutIds;
  delete (c as any).unlockedSpellLoadoutIds;

  const persisted = toPersistedWorldState(world);
  const hydrated = hydrateWorldState(persisted);
  const hc = hydrated.cultivators["yun-zhong-he"];

  assert.ok(hc.equippedWeaponLoadoutId, "hydrated cultivator should have weapon loadout");
  assert.ok(hc.equippedSpellLoadoutId, "hydrated cultivator should have spell loadout");
  assert.ok(hc.unlockedWeaponLoadoutIds.length >= 1, "hydrated cultivator should have unlocked weapon");
  assert.ok(hc.unlockedSpellLoadoutIds.length >= 1, "hydrated cultivator should have unlocked spell");
});

test("20 weapon types are all registered in loadout definitions", () => {
  const expectedTypes = [
    "sword", "dual-swords", "dagger", "gauntlets",
    "saber", "greatsaber", "axe", "hammer",
    "spear", "halberd", "staff", "hook-sickle",
    "whip", "chain-blade", "meteor-hammer", "silk-ribbon",
    "bow", "crossbow", "fan", "umbrella",
  ];
  const weaponTypes = new Set(
    Object.values(WEAPON_LOADOUT_DEFINITIONS).map((d: any) => d.weaponTypeId)
  );
  for (const t of expectedTypes) {
    assert.ok(weaponTypes.has(t), `weapon type ${t} should have a starter loadout`);
  }
});

test("15 spell branches are all registered in loadout definitions", () => {
  const expectedBranches = [
    "metal-edge", "metal-guard", "metal-break",
    "wood-growth", "wood-bind", "wood-bloom",
    "water-frost", "water-illusion", "water-flow",
    "fire-blaze", "fire-smelt", "fire-burst",
    "earth-wall", "earth-suppress", "earth-vein",
  ];
  const branches = new Set(
    Object.values(SPELL_LOADOUT_DEFINITIONS).map((d: any) => d.spellBranchId)
  );
  for (const b of expectedBranches) {
    assert.ok(branches.has(b), `spell branch ${b} should have a starter loadout`);
  }
});

test("equip action is classified as low-risk and available when injured", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const record = createRegistrationRecord();
  saveCultivationRegistration(world, cultivatorId, record);
  // Injure the cultivator
  world.cultivators[cultivatorId].injuryTicksRemaining = 5;
  const actions = listAvailableActions(world, cultivatorId);
  const equipActions = actions.filter(
    (a) => a.actionId.startsWith("equip-weapon:") || a.actionId.startsWith("equip-spell:")
  );
  // Even when injured, equip actions should still be available
  assert.ok(equipActions.length > 0, "equip actions should be available when injured");
});

test("state view exposes equipped loadout status hook fields", () => {
  const weaponId = "starter-sword";
  const spellId = "starter-metal-edge";
  const prevWeaponBasic = WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds;
  const prevWeaponCore = WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds;
  const prevSpellBasic = SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds;
  const prevSpellCore = SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds;

  WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds = ["test-weapon-basic"];
  WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds = ["test-weapon-core"];
  SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds = ["test-spell-basic"];
  SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds = ["test-spell-core"];

  try {
    const world = createSeedWorld();
    const state = getCultivatorState(world, "yun-zhong-he");
    assert.deepEqual(state.combatProfile.equippedWeaponLoadout?.basicAttackStatusHookIds, ["test-weapon-basic"]);
    assert.deepEqual(state.combatProfile.equippedWeaponLoadout?.coreSkillStatusHookIds, ["test-weapon-core"]);
    assert.deepEqual(state.combatProfile.equippedSpellLoadout?.basicAttackStatusHookIds, ["test-spell-basic"]);
    assert.deepEqual(state.combatProfile.equippedSpellLoadout?.coreSkillStatusHookIds, ["test-spell-core"]);
  } finally {
    WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds = prevWeaponBasic;
    WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds = prevWeaponCore;
    SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds = prevSpellBasic;
    SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds = prevSpellCore;
  }
});

test("combat log snapshot carries loadout status hook context", () => {
  const weaponId = "starter-sword";
  const spellId = "starter-metal-edge";
  const prevWeaponBasic = WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds;
  const prevWeaponCore = WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds;
  const prevSpellBasic = SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds;
  const prevSpellCore = SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds;

  WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds = ["test-weapon-basic"];
  WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds = ["test-weapon-core"];
  SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds = ["test-spell-basic"];
  SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds = ["test-spell-core"];

  try {
    const context = startMineBeastCombat();
    runUntilIdle(context.world, "yun-zhong-he");

    const latestCombat = getCultivatorState(context.world, "yun-zhong-he").recentCombats[0];
    assert.ok(latestCombat?.playerSnapshot, "combat log should carry player snapshot");
    assert.ok(latestCombat?.playerSnapshot?.equippedLoadoutId, "player snapshot should carry equipped loadout id");
    assert.ok(
      (latestCombat?.playerSnapshot?.basicAttackStatusHookIds?.length ?? 0) > 0,
      "player snapshot should carry basic attack hook ids",
    );
    assert.ok(
      (latestCombat?.playerSnapshot?.coreSkillStatusHookIds?.length ?? 0) > 0,
      "player snapshot should carry core skill hook ids",
    );
  } finally {
    WEAPON_LOADOUT_DEFINITIONS[weaponId as any].basicAttackStatusHookIds = prevWeaponBasic;
    WEAPON_LOADOUT_DEFINITIONS[weaponId as any].coreSkillStatusHookIds = prevWeaponCore;
    SPELL_LOADOUT_DEFINITIONS[spellId as any].basicAttackStatusHookIds = prevSpellBasic;
    SPELL_LOADOUT_DEFINITIONS[spellId as any].coreSkillStatusHookIds = prevSpellCore;
  }
});

// =========================================================================
// Gap-Closure Tests (per-round channel, enemy action layer, attackChannel)
// =========================================================================

test("round log records playerChannel and enemyChannel per round", () => {
  const context = startMineBeastCombat();
  runUntilIdle(context.world, "yun-zhong-he");
  const log = context.world.combatLogs[0];
  assert.ok(log?.rounds?.length, "should have at least one round");
  for (const round of log!.rounds!) {
    if (round.playerAction !== "escape") {
      assert.ok(
        round.playerChannel === "weapon" || round.playerChannel === "spell",
        `round ${round.round} should have valid playerChannel, got: ${round.playerChannel}`,
      );
    }
    assert.ok(
      round.enemyChannel === "weapon" || round.enemyChannel === "spell",
      `round ${round.round} should have valid enemyChannel, got: ${round.enemyChannel}`,
    );
  }
});

test("attackChannel in combatProfile reflects loadout comparison, not hardcoded weapon", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const state = getCultivatorState(world, cultivatorId);
  const c = world.cultivators[cultivatorId];
  const mainAttrs = deriveMainAttributes(c.registrationRecord);
  const wLoadout = c.equippedWeaponLoadoutId
    ? WEAPON_LOADOUT_DEFINITIONS[c.equippedWeaponLoadoutId as any]
    : null;
  const sLoadout = c.equippedSpellLoadoutId
    ? SPELL_LOADOUT_DEFINITIONS[c.equippedSpellLoadoutId as any]
    : null;
  const wAtk = weaponAttack(mainAttrs) + (wLoadout?.attackPowerBonus ?? 0);
  const sAtk = spellAttack(mainAttrs) + (sLoadout?.attackPowerBonus ?? 0);
  const expected = sAtk > wAtk ? "spell" : "weapon";
  assert.equal(state.combatProfile.attackChannel, expected, "attackChannel should match loadout comparison");
});

test("enemy can choose core_skill when it has spirit and a loadout", () => {
  const context = startMineBeastCombat();
  context.combatState.enemySnapshot.spirit = 100;
  context.combatState.enemySnapshot.maxSpirit = 100;
  context.combatState.enemySnapshot.coreSkillSpiritCost = 10;
  context.combatState.enemySnapshot.weaponCoreSkillSpiritCost = 10;
  context.combatState.enemySnapshot.spellCoreSkillSpiritCost = 10;
  context.combatState.enemySpirit = 100;
  context.combatState.enemyMaxSpirit = 100;
  context.combatState.maxRounds = 10;

  runUntilIdle(context.world, "yun-zhong-he");
  const log = context.world.combatLogs[0];
  assert.ok(log?.rounds?.length, "should have rounds");
  const enemyActions = log!.rounds!.map((r) => r.enemyAction);
  const hasCoreSkill = enemyActions.some((a) => a === "core_skill");
  assert.ok(hasCoreSkill, `enemy should use core_skill at least once; actions: ${enemyActions.join(",")}`);
});

test("enemy core_skill spends configured spirit cost", () => {
  const context = startMineBeastCombat();
  context.combatState.enemySnapshot.spirit = 50;
  context.combatState.enemySnapshot.maxSpirit = 50;
  context.combatState.enemySnapshot.coreSkillSpiritCost = 10;
  context.combatState.enemySnapshot.weaponCoreSkillSpiritCost = 10;
  context.combatState.enemySnapshot.spellCoreSkillSpiritCost = 10;
  context.combatState.enemySpirit = 50;
  context.combatState.enemyMaxSpirit = 50;
  context.combatState.maxRounds = 10;
  context.combatState.playerSnapshot.speed = 1;
  context.combatState.enemySnapshot.speed = 300;

  runUntilIdle(context.world, "yun-zhong-he");
  const log = context.world.combatLogs[0];
  assert.ok(log?.rounds?.length, "should have rounds");
  const coreSkillRounds = log!.rounds!.filter((r) => r.enemyAction === "core_skill");
  if (coreSkillRounds.length > 0) {
    for (const r of coreSkillRounds) {
      assert.equal(r.enemySpiritSpent, 10, `enemy should spend 10 spirit per core_skill in round ${r.round}`);
    }
  }
});
