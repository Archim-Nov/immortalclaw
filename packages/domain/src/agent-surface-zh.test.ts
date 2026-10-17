import assert from "node:assert/strict";
import test from "node:test";

import { createCultivator } from "./engine.js";
import { GameplayRejection } from "./gameplay-error.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  getDaoLogs,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
} from "./index.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import type { ActionJob, CultivationRegistrationRecord, ItemId, Sect, WorldState } from "./model.js";
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

test("gift-item cards use the Chinese item name and a unique action id", () => {
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

  const gifts = listAvailableActions(world, first.id).filter((action) => action.actionId.startsWith(`send-message:${second.id}:gift-item:`));
  const shown = Object.entries(first.inventory).filter(([, count]) => count > 0).slice(0, 2);
  assert.equal(gifts.length, shown.length);
  assert.equal(new Set(gifts.map((card) => card.actionId)).size, gifts.length);
  for (const [index, card] of gifts.entries()) {
    const [itemId] = shown[index]!;
    const name = ITEM_CATALOG[itemId as ItemId].name;
    assert.equal(card.actionId, `send-message:${second.id}:gift-item:${itemId}`);
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

test("a gift action id or a body itemId selects that item, and the inbox gets one notice", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-gift-pick", name: "青萝" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "yangzhou:main-city";
  second.locationId = "yangzhou:main-city";
  for (const itemId of Object.keys(first.inventory) as ItemId[]) {
    first.inventory[itemId] = 0;
  }
  first.inventory["healing-pill"] = 1;
  first.inventory["ward-talisman"] = 1;
  first.lastGiftTick = -1;

  const given = performAction(world, first.id, `send-message:${second.id}:gift-item:ward-talisman`);
  assert.equal(given.summary, "云中鹤送了1个镇煞符给青萝。好感+15。");
  assert.equal(first.inventory["ward-talisman"], 0);
  assert.equal(first.inventory["healing-pill"], 1);
  assert.equal(second.pendingGifts?.[0]?.itemId, "ward-talisman");
  const notices = (world.messages ?? []).filter((message) => message.toCultivatorId === second.id && message.subject.includes("赠礼"));
  assert.equal(notices.length, 1);

  first.lastGiftTick = -1;
  const fromBody = performAction(world, first.id, `send-message:${second.id}:gift-item`, undefined, "healing-pill");
  assert.equal(fromBody.summary, "云中鹤送了1个疗伤丹给青萝。好感+15。");
  assert.equal(fromBody.actionId, `send-message:${second.id}:gift-item`);
  assert.equal(first.inventory["healing-pill"], 0);
  const later = (world.messages ?? []).filter((message) => message.toCultivatorId === second.id && message.subject.includes("赠礼"));
  assert.equal(later.length, 2);
});

test("accepting a party returns a Chinese summary", () => {
  const world = createSeedWorld();
  const leaderSummary = syncCultivatorFromPersona(world, { agentId: "agent-party-leader", name: "顾长川" });
  const joinerSummary = syncCultivatorFromPersona(world, { agentId: "agent-party-joiner", name: "墨儿" });
  const leader = world.cultivators[leaderSummary.selectedCultivatorId]!;
  const joiner = world.cultivators[joinerSummary.selectedCultivatorId]!;
  leader.locationId = "qingzhou:main-city";
  joiner.locationId = "qingzhou:main-city";
  performAction(world, leader.id, `chat-up:${joiner.id}`);
  const invited = performAction(world, leader.id, `party-invite:${joiner.id}`);
  assert.equal(invited.summary, "顾长川向墨儿发出了组队邀请。");
  const invId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === joiner.id);
  assert.ok(invId);
  const accepted = performAction(world, joiner.id, `accept-party:${invId}`);
  assert.equal(accepted.summary, "墨儿加入了顾长川的队伍。");
  assert.equal(accepted.summary.includes("joined"), false);
  const disbanded = performAction(world, leader.id, "disband-party");
  assert.equal(disbanded.summary, "顾长川解散了队伍。");
  const rejectedWorld = createSeedWorld();
  const host = syncCultivatorFromPersona(rejectedWorld, { agentId: "agent-party-host", name: "顾长川" });
  const guest = syncCultivatorFromPersona(rejectedWorld, { agentId: "agent-party-guest", name: "墨儿" });
  const hostCultivator = rejectedWorld.cultivators[host.selectedCultivatorId]!;
  const guestCultivator = rejectedWorld.cultivators[guest.selectedCultivatorId]!;
  hostCultivator.locationId = "qingzhou:main-city";
  guestCultivator.locationId = "qingzhou:main-city";
  performAction(rejectedWorld, hostCultivator.id, `chat-up:${guestCultivator.id}`);
  performAction(rejectedWorld, hostCultivator.id, `party-invite:${guestCultivator.id}`);
  const rejectId = Object.keys(rejectedWorld.partyInvitations)[0]!;
  const rejected = performAction(rejectedWorld, guestCultivator.id, `reject-party:${rejectId}`);
  assert.equal(rejected.summary, "墨儿拒绝了顾长川的组队邀请。");
});

test("starter techniques keep their stored ids and show Chinese names", () => {
  const world = createSeedWorld();
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-technique-zh", name: "墨儿" });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  assert.deepEqual(cultivator.techniques, ["Loose Breathing", "Light Body"]);
  const state = getCultivatorState(world, cultivator.id);
  assert.equal(state.cultivation.mainTechnique, "松息吐纳");
  assert.deepEqual(state.cultivation.techniques, ["松息吐纳", "轻身术"]);
  const named = getCultivatorState(world, CULTIVATOR_ID).cultivation;
  assert.equal(named.mainTechnique, "紫霄吐纳诀");
  assert.deepEqual(named.techniques, ["紫霄吐纳诀", "清风步"]);
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

test("major breakthrough world event and dao log stay in Chinese", () => {
  let sawSuccess = false;
  let sawFailure = false;
  for (let seed = 1; seed <= 40 && (!sawSuccess || !sawFailure); seed += 1) {
    const world = createSeedWorld();
    const created = createCultivator(world, { name: "墨儿" });
    const cultivator = world.cultivators[created.id]!;
    cultivator.locationId = cultivator.residence.locationId;
    cultivator.realm = "炼气";
    cultivator.realmLevel = 3;
    cultivator.realmProgress = 100;
    cultivator.inventory["cloud-heart-grass"] = 1;
    cultivator.inventory["spirit-brook-bamboo"] = 1;
    cultivator.inventory["pure-heart-orchid"] = 1;
    cultivator.inventory["meridian-lotus-essence"] = 1;
    world.nextJobSequence = seed;
    performAction(world, created.id, "residence-breakthrough");
    idle(world, created.id);

    const event = world.worldEvents.find((entry) =>
      entry.cultivatorId === created.id && entry.tags.includes("breakthrough") && (entry.tags.includes("success") || entry.tags.includes("failure")),
    );
    assert.ok(event);
    const outcome = cultivator.breakthroughRecords.at(-1)?.outcome;
    const expected = outcome === "success"
      ? "墨儿破境到了第4层。境界松动之后，整个人都轻了一点。"
      : "墨儿这一次破境没有成，进度退回到还能再试的地方。";
    assert.equal(event.title, outcome === "success" ? "破境" : "破境未成");
    assert.equal(event.content, expected);
    assert.equal(event.title.includes("Breakthrough"), false);
    assert.equal(event.content.includes("breakthrough"), false);
    assert.equal(event.content.includes("level"), false);

    const state = getCultivatorState(world, created.id);
    const shown = state.recentEvents.find((entry) => entry.tags.includes("breakthrough"));
    if (shown) {
      assert.equal(shown.title, event.title);
      assert.equal(shown.content, expected);
    }
    assert.equal(state.recentEvents.some((entry) => entry.title === "Breakthrough Success" || entry.title === "Breakthrough Failed"), false);

    const dao = getDaoLogs(world, created.id).find((entry) => entry.title === event.title && entry.tags.includes("breakthrough"));
    assert.ok(dao);
    assert.equal(dao.content, expected);
    assert.ok((cultivator.lifeLog ?? []).some((row) => row.text === expected));
    if (outcome === "success") sawSuccess = true;
    else sawFailure = true;
  }
  assert.ok(sawSuccess);
  assert.ok(sawFailure);
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

test("creation, registration, sect errand, and dual wilderness text stays Chinese", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "青萝" });
  const born = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("character"));
  assert.equal(born?.title, "初入尘世");
  assert.equal(born?.content, "青萝踏入了这一界。");

  const saved = saveCultivationRegistration(world, created.id, rawRegistrationRecord());
  assert.equal(saved.result.core_temperament, "qian_yuan");
  assert.equal(saved.result.behavior_aspect, "water-earth");
  assert.equal(saved.result.cultivation_motive, "seek-truth");
  const registered = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("registration"));
  assert.equal(registered?.title, "问心定档");
  assert.equal(registered?.content, "青萝问心已定。心性落在潜渊型，行路以潜守为先，所求偏求真知。");
  assert.equal(/qian_yuan|water-earth|seek-truth|completed registration/.test(registered?.content ?? ""), false);

  const cultivator = world.cultivators[created.id]!;
  const sect = seedQingyun(world);
  cultivator.sectId = sect.id;
  cultivator.sectTitle = "外门";
  cultivator.locationId = sect.headquarters;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;

  let bounty: WorldState["worldEvents"][number] | undefined;
  for (let attempt = 0; attempt < 12 && !bounty; attempt += 1) {
    const started = performAction(world, created.id, "take-sect-errand");
    assert.match(started.summary, /开始宗门差事/);
    const finished = advanceWorld(world, 2);
    const done = finished.completedJobs.find((job) => job.cultivatorId === created.id && job.actionId === "take-sect-errand");
    assert.equal(done?.summary, "青萝把宗门差事做完了。");
    bounty = world.worldEvents.find((event) => event.cultivatorId === created.id && event.tags.includes("bounty") && event.tags.includes("sect") && !event.tags.includes("patrol"));
  }
  assert.ok(bounty);
  assert.equal(bounty.title, "宗门赏赐");
  assert.equal(bounty.content, "宗门额外赏赐了一张镇煞符，酬谢你把这趟差事做干净了。");
  const duty = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("sect-quest-complete"));
  assert.equal(duty?.title, "宗门差事");
  assert.equal(duty?.content, "青萝把宗门差事做完了。");
  const finishedDao = getDaoLogs(world, created.id).filter((entry) => entry.tags.includes("action-complete") && entry.tags.includes("take-sect-errand"));
  assert.ok(finishedDao.length > 0);
  assert.ok(finishedDao.every((entry) => entry.title === "行动完成" && entry.content === "青萝把宗门差事做完了。"));
  assert.equal(getDaoLogs(world, created.id).some((entry) => entry.title === "Action Complete"), false);

  const named = finishDual(world, created.id, { dualTaskId: "dwt-01", dualRole: "partner" });
  assert.equal(named, "青萝完成了双人荒野任务：联手猎妖。");
  const unnamed = finishDual(world, created.id, {});
  assert.equal(unnamed, "青萝完成了双人荒野任务。");
});

test("入门、离宗、换装和地宫岔路的道心用中文", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "青萝" });
  saveCultivationRegistration(world, created.id, rawRegistrationRecord());
  const cultivator = world.cultivators[created.id]!;
  cultivator.completedBaseQuests = 1;
  cultivator.locationId = "qingzhou:sect-outpost:cang-mu-gu";
  cultivator.activeJobId = null;
  cultivator.injuryTicksRemaining = 0;

  const joinedNeutral = performAction(world, created.id, "join-neutral-sect:cang-mu-gu");
  assert.equal(joinedNeutral.summary, "青萝入了苍木谷。");
  const joinLog = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("join-neutral-sect"));
  assert.equal(joinLog?.title, "入门");
  assert.equal(joinLog?.content, "青萝入了苍木谷。");
  const notice = world.messages.find((message) => message.cultivatorId === created.id && message.content.includes("苍木谷"));
  assert.equal(notice?.subject, "入门");
  assert.equal(notice?.content, "青萝入了苍木谷。");

  const left = performAction(world, created.id, "leave-neutral-sect");
  assert.equal(left.summary, "青萝离开了苍木谷。");
  const leaveLog = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("leave-neutral-sect"));
  assert.equal(leaveLog?.title, "离宗");
  assert.equal(leaveLog?.content, "青萝离开了苍木谷。");

  const sect = seedQingyun(world);
  cultivator.locationId = sect.headquarters;
  const joined = performAction(world, created.id, "join-sect");
  assert.equal(joined.summary, "青萝入了青云宗。");
  const sectLog = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("sect-join-log"));
  assert.equal(sectLog?.title, "入门");
  assert.equal(sectLog?.content, "青萝入了青云宗。");
  const joinedMorality = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("morality") && entry.tags.includes("join-sect"));
  assert.equal(joinedMorality?.title, "心性偏移");
  assert.equal(joinedMorality?.content, "青萝因入门，心性往正道偏了8分。");
  assert.equal(/Morality Shift|gained|lost|morality/.test(`${joinedMorality?.title} ${joinedMorality?.content}`), false);

  const weaponId = cultivator.unlockedWeaponLoadoutIds.find((id) => id !== cultivator.equippedWeaponLoadoutId);
  const spellId = cultivator.unlockedSpellLoadoutIds.find((id) => id !== cultivator.equippedSpellLoadoutId);
  assert.ok(weaponId);
  assert.ok(spellId);
  const weapon = performAction(world, created.id, `equip-weapon:${weaponId}` as never);
  const weaponLog = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("equip-weapon"));
  assert.equal(weaponLog?.title, "装配切换");
  assert.equal(weaponLog?.content, weapon.summary);
  assert.match(weapon.summary, /^青萝换上了.+。$/);
  assert.equal(weapon.summary.includes("equipped"), false);
  const spell = performAction(world, created.id, `equip-spell:${spellId}` as never);
  const spellLog = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("equip-spell"));
  assert.equal(spellLog?.title, "装配切换");
  assert.equal(spellLog?.content, spell.summary);
  assert.match(spell.summary, /^青萝换上了.+。$/);
  assert.equal(spell.summary.includes("equipped"), false);

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  performAction(world, created.id, "enter-dungeon:rank-1:conservative" as never);
  let shifted = false;
  while (cultivator.activeJobId && !shifted) {
    advanceWorld(world, 1);
    if (!listAvailableActions(world, created.id).some((action) => action.actionId === "dungeon-wake-decision:aid-wounded")) continue;
    performAction(world, created.id, "dungeon-wake-decision:aid-wounded" as never);
    const wake = getDaoLogs(world, created.id).find((entry) => entry.tags.includes("morality") && entry.tags.includes("dungeon-wake"));
    assert.equal(wake?.title, "心性偏移");
    assert.equal(wake?.content, "青萝因地宫里的岔路，心性往正道偏了2分。");
    assert.equal(/Morality Shift|gained|lost|dungeon-wake|morality/.test(`${wake?.title} ${wake?.content}`), false);
    shifted = true;
  }
  assert.equal(shifted, true);
  assert.equal(getDaoLogs(world, created.id).some((entry) => entry.title === "Joined Neutral Sect" || entry.title === "Left Neutral Sect" || entry.title === "Joined Sect" || entry.title === "Action Complete" || entry.title === "Morality Shift"), false);
});

function rawRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v2",
    answers: {
      Q1: "C", Q2: "C", Q3: "C", Q4: "C", Q5: "C", Q6: "C",
      Q7: "C", Q8: "A", Q9: "C", Q10: "C", Q11: "C", Q12: "C",
      Q13: "B", Q14: "B", Q15: "B", Q16: "B", Q17: "C", Q18: "B",
    },
    result: {
      label_locale: "en",
      core_temperament_id: "qian_yuan",
      core_temperament: "qian_yuan",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "guan_lan",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "water-earth",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "seek-truth",
      five_element_scores: { metal: 5, wood: 6, water: 11, fire: 3, earth: 9 },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      confidence: { core: "high", behavior: "high", motive: "medium", overall: "high" },
    },
    summary: "问心已定。",
  };
}

function seedQingyun(world: WorldState): Sect {
  const sect: Sect = {
    id: "qing-yun-sect",
    name: "青云宗",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: CULTIVATOR_ID,
    treasury: 1000,
    memberIds: [],
    spiritVeins: [],
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
  world.sects[sect.id] = sect;
  world.locations[sect.headquarters] = {
    id: sect.headquarters as WorldState["locations"][string]["id"],
    stateId: "qingzhou",
    nodeType: "sect-outpost",
    name: "青云宗山门",
    kind: "safe",
    risk: "safe",
    description: "宗门山门。",
    organizationId: sect.id,
    organizationType: "player-sect",
  };
  return sect;
}

function finishDual(world: WorldState, cultivatorId: string, meta: NonNullable<ActionJob["meta"]>): string {
  const cultivator = world.cultivators[cultivatorId]!;
  assert.equal(cultivator.activeJobId, null);
  const job: ActionJob = {
    id: `job-dual-${world.nextJobSequence++}`,
    cultivatorId,
    actionId: "dual-survey-wilderness",
    label: "同行历练",
    remainingTicks: 1,
    totalTicks: 1,
    meta,
  };
  world.jobs[job.id] = job;
  cultivator.activeJobId = job.id;
  const finished = advanceWorld(world, 1);
  const done = finished.completedJobs.find((entry) => entry.cultivatorId === cultivatorId && entry.actionId === "dual-survey-wilderness");
  assert.ok(done);
  return done.summary;
}
