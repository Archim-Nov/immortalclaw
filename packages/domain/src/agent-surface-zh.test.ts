import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { ItemId } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function idle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string, limit = 20) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < limit) {
    advanceWorld(world, 1);
    ticks += 1;
  }
}

test("the first dungeon pause writes dungeonWake, and a missing stamp is restored on read", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);

  let decided = false;
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const actions = listAvailableActions(world, CULTIVATOR_ID);
    const choice = actions.find((action) => action.actionId === "dungeon-wake-decision:aid-wounded");
    if (!choice) continue;
    const job = world.jobs[cultivator.activeJobId];
    assert.ok(job?.meta?.dungeonWake);
    assert.equal(job.meta.dungeonWake.defaultOptionId, "aid-wounded");
    assert.ok(job.meta.dungeonWake.options.length >= 3);
    assert.match(job.meta.dungeonWake.context, /水囊|袋子/);
    delete job.meta.dungeonWake;
    const restored = getCultivatorState(world, CULTIVATOR_ID).currentJob?.meta?.dungeonWake;
    assert.equal(restored?.defaultOptionId, "aid-wounded");
    assert.ok((restored?.options.length ?? 0) >= 3);
    const summary = performAction(world, CULTIVATOR_ID, "dungeon-wake-decision:aid-wounded" as never).summary;
    assert.match(summary, /在地宫里/);
    assert.equal(summary.includes("选择了"), false);
    decided = true;
    break;
  }
  assert.equal(decided, true);
});

test("town, residence, mine, and quest cards use Chinese labels and start summaries", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  const town = listAvailableActions(world, CULTIVATOR_ID);
  const meditate = town.find((action) => action.actionId === "meditate");
  assert.equal(meditate?.label, "打坐");
  assert.equal(/[A-Za-z]/.test(meditate?.label ?? "Meditate"), false);
  const quest = town.find((action) => String(action.actionId).startsWith("quest:accept:"));
  assert.match(quest?.label ?? "", /^接下：/);
  assert.equal((quest?.label ?? "").includes("Execute"), false);

  const startedMeditate = performAction(world, CULTIVATOR_ID, "meditate");
  assert.match(startedMeditate.summary, /开始打坐/);
  assert.equal(startedMeditate.job?.label, "打坐");
  idle(world, CULTIVATOR_ID);

  cultivator.locationId = cultivator.residence.locationId;
  const home = listAvailableActions(world, CULTIVATOR_ID);
  assert.equal(home.find((action) => action.actionId === "residence-heal")?.label, "洞府疗伤");
  const healed = performAction(world, CULTIVATOR_ID, "residence-heal");
  assert.match(healed.summary, /开始洞府疗伤/);
  assert.equal(healed.job?.label, "洞府疗伤");
  assert.equal(healed.summary.includes("started"), false);
  idle(world, CULTIVATOR_ID);

  cultivator.locationId = "qingzhou:wilderness";
  const wild = listAvailableActions(world, CULTIVATOR_ID);
  assert.equal(wild.find((action) => action.actionId === "mine-spirit-stones")?.label, "采集灵石");
  const mined = performAction(world, CULTIVATOR_ID, "mine-spirit-stones");
  assert.match(mined.summary, /开始采集灵石/);
  assert.equal(mined.job?.label, "采集灵石");
  idle(world, CULTIVATOR_ID);

  cultivator.inventory["qi-pill"] = 1;
  cultivator.locationId = "qingzhou:main-city";
  const pill = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "use-qi-pill");
  assert.match(pill?.label ?? "", /回气丹/);
  assert.equal((pill?.label ?? "").includes("qi-pill"), false);
  const used = performAction(world, CULTIVATOR_ID, "use-qi-pill");
  assert.match(used.summary, /服用了回气丹/);
});

test("repeated gifts collapse to one batch, and a single accept still settles one gift", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-qingluo", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  second.pendingGifts = [1, 2, 3].map((index) => ({
    messageId: `gift-${index}`,
    fromCultivatorId: first.id,
    itemId: "ruin-fragment" as ItemId,
    count: 1,
    tick: world.tick,
  }));
  const stacked = listAvailableActions(world, second.id).filter((action) => String(action.actionId).includes("gift"));
  assert.equal(stacked.length, 2);
  assert.ok(stacked.some((action) => action.actionId === `accept-gift-batch:${first.id}:ruin-fragment`));
  assert.match(stacked[0]?.label ?? "", /残碑碎片/);
  assert.equal(stacked.some((action) => String(action.actionId).startsWith("accept-gift:gift-")), false);

  const before = second.inventory["ruin-fragment"] ?? 0;
  const one = performAction(world, second.id, "accept-gift:gift-1" as never);
  assert.match(one.summary, /收下了.*1份残碑碎片/);
  assert.equal(second.pendingGifts.length, 2);
  assert.equal(second.inventory["ruin-fragment"], before + 1);

  const batch = performAction(world, second.id, `accept-gift-batch:${first.id}:ruin-fragment` as never);
  assert.match(batch.summary, /2份残碑碎片/);
  assert.equal(second.pendingGifts.length, 0);
  assert.equal(second.inventory["ruin-fragment"], before + 3);
});

test("a rejected gift stack adds one grudge, not one per copy", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-return", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  const beforeStones = first.inventory["ruin-fragment"];
  second.pendingGifts = [1, 2].map((index) => ({
    messageId: `back-${index}`,
    fromCultivatorId: first.id,
    itemId: "ruin-fragment" as ItemId,
    count: 1,
    tick: world.tick,
  }));
  const rejected = performAction(world, second.id, `reject-gift-batch:${first.id}:ruin-fragment` as never);
  assert.match(rejected.summary, /退了回去/);
  assert.equal(second.pendingGifts.length, 0);
  assert.equal(first.inventory["ruin-fragment"], beforeStones + 2);
  const grudge = world.socialLinks?.[second.id]?.[first.id]?.grudge ?? 0;
  assert.equal(grudge, 8);
});

test("old English event tags, status names, wilderness entry, and onboarding read in Chinese", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  world.worldEvents.unshift({
    id: "event-old-shell",
    tick: world.tick,
    cultivatorId: CULTIVATOR_ID,
    locationId: cultivator.locationId,
    title: "[exploration] Dungeon Expedition",
    content: "旧记录。",
    severity: "low",
    tags: ["event-pool"],
  });
  cultivator.statusEffects = [{
    id: "clear-mind",
    name: "Clear Mind",
    description: "Better recovery and cultivation.",
    source: "test",
    remainingTicks: 3,
    intensity: 1,
  }];
  const state = getCultivatorState(world, CULTIVATOR_ID);
  assert.match(state.recentEvents[0]?.title ?? "", /^\[探索\]/);
  assert.equal(state.recentEvents[0]?.title.includes("[exploration]"), false);
  assert.match(state.recentEvents[0]?.title ?? "", /地宫远征/);
  assert.equal(state.statusEffects.find((effect) => effect.id === "clear-mind")?.name, "心神清明");
  assert.equal(state.cultivator.locationId, cultivator.locationId);
  assert.match(state.onboarding.hint, /[\u4e00-\u9fff]/);
  assert.equal(state.decisionPolicy.summary.includes("Owner"), false);
  const strategy = getStrategySnapshot(world, CULTIVATOR_ID);
  assert.match(strategy.longTermGoal, /[\u4e00-\u9fff]/);
  assert.equal(strategy.longTermGoal.includes("Build toward"), false);

  cultivator.locationId = "yangzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  const entered = performAction(world, CULTIVATOR_ID, "enter-wilderness:starter-wilderness-tier-1" as never);
  assert.match(entered.summary, /走进了听潮浦/);
  assert.equal(entered.summary.includes("entered"), false);
  assert.equal(entered.summary.includes("荒原·灵材散落带"), false);
});

test("resolve-morality-event-choice tells the caller to use the dedicated route", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.pendingMoralityChoiceId = "morality-choice-test";
  world.pendingMoralityChoices["morality-choice-test"] = {
    id: "morality-choice-test",
    cultivatorId: CULTIVATOR_ID,
    createdAtTick: world.tick,
    expiresAtTick: world.tick + 6,
    title: "路口的人",
    prompt: "要不要搭把手。",
    options: [
      { id: "aid", label: "搭把手", summary: "停下来。", moralityDelta: 1, effectBundle: {} },
      { id: "walk", label: "走过去", summary: "不停。", moralityDelta: -1, effectBundle: {} },
    ],
  };
  const result = performAction(world, CULTIVATOR_ID, "resolve-morality-event-choice");
  assert.equal(result.accepted, false);
  assert.match(result.summary, /POST \/agent\/events\/choose/);
  assert.match(result.summary, /morality-choice-test/);
  assert.match(result.summary, /搭把手（aid）/);
  assert.equal(result.summary.includes("dedicated route"), false);
});
