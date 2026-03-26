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
} from "./index.js";
import type { CultivationRegistrationRecord } from "./index.js";
import { createCultivator, starterStateFromRoll } from "./engine.js";
import { buildFullTopology } from "./topology.js";

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
  }
}

function hashString(input: string) {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
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

test("runtime barrel loads without tribulation exports", async () => {
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

test("accepting and resolving a base quest updates rewards", () => {
  const world = createSeedWorld();

  performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
  runUntilIdle(world, "yun-zhong-he");

  const board = world.questBoards["qingzhou:sub-town-east"];
  const candidate = board.quests[0]!;
  const beforeStones = world.cultivators["yun-zhong-he"].spiritStones;
  const beforeReputation = world.cultivators["yun-zhong-he"].reputation;

  performAction(world, "yun-zhong-he", `accept-quest:${candidate.id}`);
  const active = world.cultivators["yun-zhong-he"].activeQuests[0]!;
  active.successRate = 100;

  performAction(world, "yun-zhong-he", `execute-quest:${active.id}`);
  runUntilIdle(world, "yun-zhong-he");

  const after = world.cultivators["yun-zhong-he"];
  assert.equal(after.activeQuests.length, 0);
  assert.ok(after.spiritStones > beforeStones);
  assert.ok(after.reputation >= beforeReputation);
});

test("neutral sect join, duty, and leave obey availability and reward rules", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
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
  assert.equal(getCultivatorState(world, "yun-zhong-he").neutralSect?.id, "cang-mu-gu");
  assert.equal(
    (getSectInfo(world, "yun-zhong-he") as { alignment?: string } | null)?.alignment,
    "中立",
  );

  const beforeStones = cultivator.spiritStones;
  const beforeReputation = cultivator.reputation;
  performAction(world, "yun-zhong-he", "take-neutral-duty");
  runUntilIdle(world, "yun-zhong-he");

  assert.equal(cultivator.spiritStones, beforeStones + 120);
  assert.equal(cultivator.reputation, beforeReputation + 4);
  assert.equal(cultivator.neutralContribution, 40);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "clear-mind" && effect.remainingTicks >= 2));

  const neutralInfo = getSectInfo(world, "yun-zhong-he");
  assert.equal(neutralInfo?.organizationType, "neutral");
  assert.equal(neutralInfo?.id, "cang-mu-gu");

  performAction(world, "yun-zhong-he", "leave-neutral-sect");
  assert.equal(cultivator.neutralSectId, null);
  assert.equal(cultivator.neutralContribution, 0);
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
  assert.ok(outpostActions.has("take-sect-errand"));

  const sectInfo = getSectInfo(world, "yun-zhong-he") as { alignment?: string } | null;
  assert.equal(sectInfo?.alignment, "正道");
});

test("sect titles recalculate on cadence", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const cultivator = world.cultivators["yun-zhong-he"];
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

test("residence actions are visible at residence and hidden away", () => {
  const world = createSeedWorld();

  const atResidenceActionIds = new Set(
    listAvailableActions(world, "yun-zhong-he").map((action) => action.actionId),
  );
  assert.ok(atResidenceActionIds.has("residence-meditate"));
  assert.ok(atResidenceActionIds.has("residence-heal"));
  assert.ok(atResidenceActionIds.has("residence-recover-qi"));
  assert.ok(atResidenceActionIds.has("residence-produce:recipe-healing-pill"));
  assert.ok(atResidenceActionIds.has("residence-produce:recipe-qi-pill"));
  assert.ok(atResidenceActionIds.has("residence-produce:recipe-ward-talisman"));
  assert.ok(atResidenceActionIds.has("residence-socialize"));

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
    /Residence actions require being at your residence/,
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
    /injured and can only do safe actions/i,
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

test("residence-produce rejects unknown recipe id", () => {
  const world = createSeedWorld();
  assert.throws(
    () => performAction(world, "yun-zhong-he", "residence-produce:recipe-unknown"),
    /Unknown residence recipe/,
  );
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

test("studying a manual adds technique and strategy recommends safe progression", () => {
  const world = createSeedWorld();
  const before = getCultivatorState(world, "yun-zhong-he");
  const beforeManualCount = before.inventory["sword-manual"];
  const beforeTechniqueCount = before.cultivation.techniques.length;

  const act = performAction(world, "yun-zhong-he", "study-sword-manual");
  assert.equal(act.accepted, true);

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(beforeManualCount, 1);
  assert.equal(state.inventory["sword-manual"], 0);
  assert.ok(state.cultivation.techniques.length >= beforeTechniqueCount);
  assert.ok(state.statusEffects.some((effect) => effect.id === "insight"));

  const strategy = getStrategySnapshot(world, "yun-zhong-he");
  assert.equal(strategy.cultivatorId, "yun-zhong-he");
  assert.ok(strategy.recommendedSequence.length > 0);
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
  assert.ok(strategy.decisionPolicy.summary.includes("Safety"));
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
  assert.ok(state.onboarding.hint.includes("quest"));
  assert.match(state.onboarding.nextAction ?? "", /^accept-quest:/);
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

test("legacy player sect info is still returned through getSectInfo", () => {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.sectId = "qing-yun-sect";
  // @ts-expect-error legacy title literal is intentionally preserved in this fixture
  cultivator.sectTitle = "澶栭棬";
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
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "观澜型",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "水土 / 潜守",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "求真知",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "水土双灵根",
    overall_confidence: "high",
  });
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
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "Patient observer",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "Water-Earth / Latent Guard",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "Seek truth",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "Water-Earth dual root",
    overall_confidence: "high",
  });
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
  assert.ok(registeredState.registrationEffects?.dominantElements.some((element) => element.id === "wood"));
  assert.ok(registeredState.registrationEffects?.modifiers.some((modifier) => modifier.source === "cultivation-motive"));
  assert.ok(registeredState.cultivator.realmProgress > baselineState.cultivator.realmProgress);
});

test("seek-longevity registration does not add meditate recovery after tribulation cleanup", () => {
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

test("shou_jie registration does not add heal recovery after tribulation cleanup", () => {
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

test("registration bonuses improve task rewards without exposing tribulation state", () => {
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
      reputation: cultivator.reputation,
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
    assert.equal(cultivator.reputation, before.reputation);
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
