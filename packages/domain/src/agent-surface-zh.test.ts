import assert from "node:assert/strict";
import test from "node:test";

import { createCultivator } from "./engine.js";
import { GameplayRejection } from "./gameplay-error.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import type { ItemId } from "./model.js";
import { writeSocialLink } from "./social.js";

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
  assert.match(pill?.description ?? "", /灵气充盈/);
  assert.equal((pill?.description ?? "").includes("spirit-saturated"), false);
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

test("gift-item cards use the Chinese item name and keep the action id", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-gift-names", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "yangzhou:main-city";
  second.locationId = "yangzhou:main-city";
  for (const itemId of Object.keys(first.inventory) as ItemId[]) {
    first.inventory[itemId] = 0;
  }
  first.inventory["ward-talisman"] = 1;
  first.inventory["ruin-fragment"] = 1;
  first.inventory["healing-pill"] = 1;
  first.inventory["qi-pill"] = 1;

  const gifts = listAvailableActions(world, first.id).filter((action) => action.actionId === `send-message:${second.id}:gift-item`);
  const shown = Object.entries(first.inventory).filter(([, count]) => count > 0).slice(0, 2);
  assert.equal(gifts.length, shown.length);
  for (const [index, card] of gifts.entries()) {
    const [itemId] = shown[index]!;
    const name = ITEM_CATALOG[itemId as ItemId].name;
    assert.equal(card.actionId, `send-message:${second.id}:gift-item`);
    assert.match(card.label, new RegExp(name));
    assert.match(card.description, new RegExp(name));
    assert.equal(card.label.includes(itemId), false);
    assert.equal(card.description.includes(itemId), false);
  }
});

test("recentCombats keeps victory and defeat, and shows Chinese status names", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  world.combatLogs.unshift({
    id: "combat-soak-defeat",
    tick: world.tick,
    cultivatorId: CULTIVATOR_ID,
    locationId: cultivator.locationId,
    encounterId: "soak-defeat",
    enemyName: "潮蟹",
    outcome: "defeat",
    damageTaken: 8,
    spiritualPowerSpent: 2,
    loot: {},
    summary: "没打过潮蟹。",
    statusChanges: [{ statusId: "clear-mind", statusName: "Clear Mind", applied: false }],
  });
  world.combatLogs.unshift({
    id: "combat-soak-victory",
    tick: world.tick,
    cultivatorId: CULTIVATOR_ID,
    locationId: cultivator.locationId,
    encounterId: "soak-victory",
    enemyName: "露蛛",
    outcome: "victory",
    damageTaken: 3,
    spiritualPowerSpent: 4,
    loot: {},
    summary: "斗过露蛛。",
    statusChanges: [
      { statusId: "clear-mind", statusName: "Clear Mind", applied: true },
      { statusId: "qi-surge", statusName: "Qi Surge", applied: true },
    ],
    statusEffectsRemaining: [
      { statusId: "clear-mind", statusName: "Clear Mind" },
      { statusId: "qi-surge", statusName: "Qi Surge" },
    ],
    rounds: [{
      round: 1,
      playerInitiative: 1,
      enemyInitiative: 1,
      firstActor: "player",
      playerAttack: null,
      enemyAttack: null,
      playerHpAfter: 10,
      enemyHpAfter: 0,
      playerDied: false,
      enemyDied: true,
      appliedStatuses: [{
        statusId: "burning" as never,
        statusName: "焚灼",
        targetSide: "enemy",
        sourceSide: "player",
        magnitude: 1,
        isRefresh: false,
      }],
    }],
  });

  const shown = getCultivatorState(world, CULTIVATOR_ID).recentCombats;
  assert.equal(shown[0]?.outcome, "victory");
  assert.equal(shown[0]?.outcomeLabel, "胜");
  assert.equal(shown[0]?.statusChanges?.[0]?.statusName, "心神清明");
  assert.equal(shown[0]?.statusChanges?.[1]?.statusName, "气血上涌");
  assert.equal(shown[0]?.statusEffectsRemaining?.[0]?.statusName, "心神清明");
  assert.equal(shown[0]?.statusEffectsRemaining?.[1]?.statusName, "气血上涌");
  assert.equal(shown[0]?.rounds?.[0]?.appliedStatuses?.[0]?.statusName, "焚灼");
  assert.equal(shown[1]?.outcome, "defeat");
  assert.equal(shown[1]?.outcomeLabel, "负");
  assert.equal(shown[1]?.statusChanges?.[0]?.statusName, "心神清明");
  assert.equal(world.combatLogs[0]?.outcome, "victory");
  assert.equal(world.combatLogs[0]?.outcomeLabel, undefined);
  assert.equal(world.combatLogs[0]?.statusChanges?.[0]?.statusName, "Clear Mind");
  assert.equal(world.combatLogs[0]?.statusChanges?.[1]?.statusName, "Qi Surge");
});

test("travel-to a wilderness starts toward the place name", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "yangzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  const card = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "travel-to:yangzhou:wilderness");
  assert.match(card?.label ?? "", /听潮浦/);
  assert.equal((card?.label ?? "").includes("荒野"), false);
  const started = performAction(world, CULTIVATOR_ID, "travel-to:yangzhou:wilderness" as never);
  assert.match(started.summary, /动身前往听潮浦/);
  assert.equal(started.summary.includes("扬州荒野"), false);
  assert.equal(started.summary.includes("荒野"), false);
  assert.equal(started.job?.label, "前往听潮浦");
});

test("a gift receipt names the item in Chinese and shows the affinity delta", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-gift-receipt", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  const fellow = syncCultivatorFromPersona(world, { agentId: "agent-gift-fellow", name: "青禾" });
  const third = world.cultivators[fellow.selectedCultivatorId]!;
  first.locationId = "yangzhou:main-city";
  second.locationId = "yangzhou:main-city";
  third.locationId = "yangzhou:main-city";
  for (const itemId of Object.keys(first.inventory) as ItemId[]) {
    first.inventory[itemId] = 0;
  }
  first.inventory["qi-pill"] = 2;
  first.lastGiftTick = -1;

  const given = performAction(world, first.id, `send-message:${second.id}:gift-item`);
  assert.equal(given.summary, "云中鹤送了1个回气丹给青萝。好感+15。");
  assert.equal(given.summary.includes("gifted"), false);
  assert.equal(given.summary.includes("Affinity"), false);
  assert.equal(given.summary.includes("qi-pill"), false);

  first.sectId = "qing-yun-sect";
  third.sectId = "qing-yun-sect";
  first.lastGiftTick = -1;
  const fellowGift = performAction(world, first.id, `send-message:${third.id}:gift-item`);
  assert.equal(fellowGift.summary, "云中鹤送了1个回气丹给同门青禾。好感+21。");

  const greeted = performAction(world, first.id, `send-message:${second.id}:greet`);
  assert.equal(greeted.summary, "云中鹤向青萝问了好。好感+3。");
  assert.equal(greeted.summary.includes("sent"), false);
});

test("acting while busy, or challenging someone busy, is refused in Chinese", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  first.locationId = "qingzhou:main-city";
  first.injuryTicksRemaining = 0;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-busy-target", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  second.locationId = first.locationId;
  second.realm = first.realm;
  second.realmLevel = first.realmLevel;
  world.jobs["busy-job"] = {
    id: "busy-job",
    cultivatorId: second.id,
    actionId: "meditate",
    label: "打坐",
    remainingTicks: 4,
    totalTicks: 4,
  };
  second.activeJobId = "busy-job";

  assert.throws(
    () => performAction(world, first.id, `challenge-cultivator:${second.id}` as never),
    (error: unknown) => error instanceof Error
      && error.message === "青萝正忙着，改日再来。"
      && !error.message.includes("Target is busy"),
  );

  performAction(world, first.id, "meditate");
  assert.throws(
    () => performAction(world, first.id, "heal"),
    (error: unknown) => error instanceof GameplayRejection
      && error.message.includes("你正忙着")
      && error.message.includes("abort-dungeon-expedition")
      && !error.message.includes("Cultivator is busy"),
  );
});

test("residence breakthrough cards stay in Chinese", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "破境弟子" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.locationId = cultivator.residence.locationId;
  cultivator.injuryTicksRemaining = 0;
  cultivator.realmLevel = 1;
  cultivator.realm = "炼气";
  cultivator.realmProgress = 100;
  cultivator.inventory["cloud-heart-grass"] = 1;
  cultivator.inventory["moon-dew-flower"] = 1;
  cultivator.inventory["clear-zhi-leaf"] = 1;
  cultivator.inventory["condensed-qi-dew"] = 1;

  const minor = listAvailableActions(world, created.id).find((action) => action.actionId === "residence-breakthrough");
  assert.ok(minor);
  assert.equal(minor.label, "洞府破境");
  assert.match(minor.description, /炼气中期/);
  assert.equal(minor.label.includes("Residence breakthrough"), false);
  assert.equal(minor.description.includes("breakthrough"), false);

  cultivator.realmLevel = 3;
  cultivator.inventory["spirit-brook-bamboo"] = 1;
  cultivator.inventory["pure-heart-orchid"] = 1;
  cultivator.inventory["meridian-lotus-essence"] = 1;
  const major = listAvailableActions(world, created.id).find((action) => action.actionId === "residence-breakthrough");
  assert.ok(major);
  assert.equal(major.label, "洞府破境（大境界）");
  assert.match(major.description, /筑基前期/);
  assert.equal(major.label.includes("Residence breakthrough"), false);
  assert.equal(major.description.includes("Attempt"), false);
});

test("city duel cards stay Chinese with or without a grudge", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const created = createCultivator(world, { name: "青萝" });
  const second = world.cultivators[created.id]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.activeJobId = null;
  second.activeJobId = null;
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  first.realm = "炼气";
  second.realm = "炼气";

  const calm = listAvailableActions(world, first.id).find((action) => action.actionId === `challenge-cultivator:${second.id}`);
  assert.ok(calm);
  assert.equal(calm.label, "切磋：青萝");
  assert.match(calm.description, /约青萝在城里切磋一场/);
  assert.equal(calm.label.includes("Challenge"), false);
  assert.equal(calm.description.includes("Challenge"), false);

  writeSocialLink(world, first.id, {
    targetCultivatorId: second.id,
    affinity: 0,
    specialBond: null,
    firstMetTick: 0,
    lastInteractionTick: 0,
    grudge: 8,
  });
  const feud = listAvailableActions(world, first.id).find((action) => action.actionId === `challenge-cultivator:${second.id}`);
  assert.ok(feud);
  assert.equal(feud.label, "再战：青萝（剑拔弩张）");
  assert.match(feud.description, /嫌隙/);
  assert.match(feud.description, /再战一场/);
  assert.equal(feud.label.includes("Challenge"), false);
  assert.equal(feud.description.includes("Challenge"), false);
});

test("upgrade-residence describes the next tier without naming the action id", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = cultivator.residence.locationId;
  cultivator.injuryTicksRemaining = 0;
  const card = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "upgrade-residence");
  assert.ok(card);
  assert.match(card.label, /修府/);
  assert.match(card.description, /灵石/);
  assert.equal(card.description.includes("upgrade-residence"), false);
});

test("an old English quest description is shown in Chinese on the execute card", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.activeJobId = null;
  const board = world.questBoards["qingzhou:main-city"]!;
  const gathering = board.quests.find((quest) => quest.type === "gathering") ?? board.quests[0]!;
  performAction(world, CULTIVATOR_ID, `quest:accept:${gathering.type}:${gathering.boardIndex}` as never);
  const active = cultivator.activeQuests[0]!;
  active.type = "gathering";
  active.templateId = "tpl-gathering";
  active.description = "Collect requested materials outside town.";
  const card = listAvailableActions(world, CULTIVATOR_ID).find((action) => String(action.actionId).startsWith("quest:execute:"));
  assert.ok(card);
  assert.equal(card.description, "出城把要的材料采回来。");
  assert.equal(card.description.includes("Collect"), false);
  assert.equal(card.description.includes("outside town"), false);
});

test("wilderness survey and withdraw stay Chinese when the place name is missing", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "yangzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  const entered = performAction(world, CULTIVATOR_ID, "enter-wilderness:starter-wilderness-tier-1" as never);
  assert.equal(entered.accepted, true);
  const place = world.locations[cultivator.locationId]!;
  place.stateId = "missing-wild" as typeof place.stateId;
  const actions = listAvailableActions(world, CULTIVATOR_ID);
  const survey = actions.find((action) => action.actionId === "survey-wilderness");
  const withdraw = actions.find((action) => action.actionId === "withdraw-from-wilderness");
  assert.ok(survey);
  assert.ok(withdraw);
  assert.match(survey.description, /见闻/);
  assert.equal(/[A-Za-z]/.test(survey.description), false);
  assert.match(withdraw.description, /退出来/);
  assert.match(withdraw.description, /不另扣灵石/);
  assert.equal(withdraw.description.includes("Retreat"), false);
});

test("send-message cards name greet, share, and help in Chinese", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-message-kinds", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.injuryTicksRemaining = 0;
  second.injuryTicksRemaining = 0;
  first.activeJobId = null;
  second.activeJobId = null;

  const cards = listAvailableActions(world, first.id);
  const greet = cards.find((action) => action.actionId === `send-message:${second.id}:greet`);
  const share = cards.find((action) => action.actionId === `send-message:${second.id}:share-info`);
  const help = cards.find((action) => action.actionId === `send-message:${second.id}:request-help`);
  assert.ok(greet);
  assert.ok(share);
  assert.ok(help);
  assert.equal(greet.label, "发送消息（问候）：青萝");
  assert.match(greet.description, /问候/);
  assert.equal(share.label, "发送消息（分享见闻）：青萝");
  assert.match(share.description, /分享见闻/);
  assert.equal(help.label, "发送消息（求援）：青萝");
  assert.match(help.description, /求援/);
  for (const card of [greet, share, help]) {
    assert.equal(card.label.includes("greet"), false);
    assert.equal(card.label.includes("share-info"), false);
    assert.equal(card.label.includes("request-help"), false);
    assert.equal(card.description.includes("greet"), false);
    assert.equal(card.description.includes("share-info"), false);
    assert.equal(card.description.includes("request-help"), false);
  }
});

test("say and reply-line cards do not name the act body", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-say-copy", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.injuryTicksRemaining = 0;
  second.injuryTicksRemaining = 0;
  first.activeJobId = null;
  second.activeJobId = null;

  const say = listAvailableActions(world, first.id).find((action) => action.actionId === `say:${second.id}`);
  assert.ok(say);
  assert.match(say.description, /四十/);
  assert.equal(/\bact\b/i.test(say.description), false);
  assert.equal(/\bline\b/i.test(say.description), false);

  performAction(world, first.id, `say:${second.id}`, "门口风大，你带灯了吗？");
  const reply = listAvailableActions(world, second.id).find((action) => action.actionId === `reply-line:${first.id}`);
  assert.ok(reply);
  assert.match(reply.description, /门口风大/);
  assert.match(reply.description, /四十/);
  assert.equal(/\bact\b/i.test(reply.description), false);
  assert.equal(/\bline\b/i.test(reply.description), false);

  const spot = listAvailableActions(world, first.id).find((action) => action.actionId === "leave-spot-note");
  assert.ok(spot);
  assert.match(spot.description, /留/);
  assert.equal(/\bact\b/i.test(spot.description), false);
  assert.equal(/\bline\b/i.test(spot.description), false);

  performAction(world, first.id, `leave-note:${second.id}` as never, "人回来先到城门口找我。");
  const replyNote = listAvailableActions(world, second.id).find((action) => String(action.actionId).startsWith("reply-note:"));
  assert.ok(replyNote);
  assert.match(replyNote.description, /四十/);
  assert.equal(/\bact\b/i.test(replyNote.description), false);
  assert.equal(/\bline\b/i.test(replyNote.description), false);
});

test("favor, quest, and bounty cards show a Chinese name for an English given name", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  first.locationId = "qingzhou:main-city";
  first.injuryTicksRemaining = 0;
  first.activeJobId = null;
  const emma = world.cultivators[createCultivator(world, { name: "Emma" }).id]!;
  const stub = world.cultivators[createCultivator(world, { name: "Lin Yuelan" }).id]!;
  const qing = world.cultivators[createCultivator(world, { name: "青萝" }).id]!;
  const noah = world.cultivators[createCultivator(world, { name: "Noah" }).id]!;
  for (const person of [emma, stub, qing, noah]) {
    person.locationId = first.locationId;
    person.injuryTicksRemaining = 0;
    person.activeJobId = null;
  }

  const favors = listAvailableActions(world, first.id);
  const emmaGuard = favors.find((action) => action.actionId === `ask-favor:${emma.id}:guard-breakthrough`);
  const stubGuard = favors.find((action) => action.actionId === `ask-favor:${stub.id}:guard-breakthrough`);
  const qingGuard = favors.find((action) => action.actionId === `ask-favor:${qing.id}:guard-breakthrough`);
  const noahGuard = favors.find((action) => action.actionId === `ask-favor:${noah.id}:guard-breakthrough`);
  assert.ok(emmaGuard);
  assert.ok(stubGuard);
  assert.ok(qingGuard);
  assert.ok(noahGuard);
  assert.equal(emmaGuard.label, "请托：艾玛守关");
  assert.equal(emmaGuard.label.includes("Emma"), false);
  assert.equal(emmaGuard.description.includes("Emma"), false);
  assert.match(emmaGuard.description, /守在洞府外/);
  assert.equal(stubGuard.label, "请托：林月兰守关");
  assert.equal(stubGuard.label.includes("Lin"), false);
  assert.equal(qingGuard.label, "请托：青萝守关");
  assert.equal(/[A-Za-z]/.test(noahGuard.label), false);
  assert.match(noahGuard.label, /守关/);
  assert.equal(emma.name, "Emma");
  assert.equal(stub.name, "Lin Yuelan");

  const board = world.questBoards[first.locationId]!;
  const bounty = board.quests.find((quest) => quest.type === "bounty-low") ?? board.quests[0]!;
  bounty.nameCn = "Emma守关";
  bounty.description = "请Emma守这一关。";
  const quest = listAvailableActions(world, first.id).find((action) => action.actionId === `quest:accept:${bounty.type}:${bounty.boardIndex}`);
  assert.ok(quest);
  assert.equal(quest.label, "接下：艾玛守关");
  assert.equal(quest.label.includes("Emma"), false);
  assert.match(quest.description, /艾玛/);
  assert.equal(quest.description.includes("Emma"), false);
  assert.equal(bounty.nameCn, "Emma守关");

  first.inventory["beast-core"] = 1;
  world.commissions["comm-emma"] = {
    id: "comm-emma",
    posterId: emma.id,
    locationId: first.locationId,
    type: "gather",
    targetItemId: "beast-core",
    targetCount: 1,
    rewardSpiritStones: 40,
    acceptedById: null,
    createdAtTick: world.tick,
    completedAtTick: null,
  };
  const commission = listAvailableActions(world, first.id).find((action) => action.actionId === "accept-commission:comm-emma");
  assert.ok(commission);
  assert.equal(commission.label, "接受委托：艾玛的采集任务");
  assert.equal(commission.description.includes("Emma"), false);
  assert.equal(getCultivatorState(world, first.id).localCommissions.find((row) => row.id === "comm-emma")?.posterName, "艾玛");
});
