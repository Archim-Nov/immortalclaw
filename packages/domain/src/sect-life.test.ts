import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import { getSocialLink, writeSocialLink } from "./social.js";
import { buildFullTopology } from "./topology.js";

const QI_ITEMS = ["condensed-qi-dew", "azure-stone-marrow", "meridian-lotus-essence"] as const;
const CORE_ITEMS = ["flowing-aurora-core", "dragon-radiance-crystal", "core-nourish-dew"] as const;

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  let guard = 0;
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
    guard += 1;
    if (guard > 20) throw new Error(`job did not finish for ${cultivatorId}`);
  }
}

function actionIds(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  return new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
}

function joinCangMu(world: ReturnType<typeof createSeedWorld>) {
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:sect-outpost:cang-mu-gu";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  performAction(world, cultivator.id, "join-neutral-sect:cang-mu-gu");
  return cultivator;
}

test("a disciple can take and resign an outer post", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const before = actionIds(world, cultivator.id);

  assert.equal(before.has("take-post:outer-chore"), true);
  assert.equal(before.has("take-post:master-seat"), false);

  const taken = performAction(world, cultivator.id, "take-post:outer-chore");
  assert.equal(taken.accepted, true);
  assert.equal(cultivator.sectPost, "outer-chore");
  const life = getCultivatorState(world, cultivator.id).sectLife;
  assert.equal(life?.post?.name, "外门杂役");
  assert.match(life?.post?.duty ?? "", /扫院/);
  assert.match(life?.daily ?? "", /杂役|药田/);

  performAction(world, cultivator.id, "resign-post");
  assert.equal(cultivator.sectPost ?? null, null);
  assert.equal(getCultivatorState(world, cultivator.id).sectLife?.post ?? null, null);
});

test("outer duties raise the sect from 初立山门 to 小宗", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const before = getCultivatorState(world, cultivator.id).sectLife;
  assert.equal(before?.tierName, "初立山门");
  assert.match(before?.nextRequirement ?? "", /小宗/);

  performAction(world, cultivator.id, "take-post:outer-chore");
  for (let i = 0; i < 4; i += 1) {
    performAction(world, cultivator.id, "post-duty");
    runUntilIdle(world, cultivator.id);
  }

  const after = getCultivatorState(world, cultivator.id).sectLife;
  assert.ok((after?.merit ?? 0) >= 24);
  assert.equal(after?.tierName, "小宗");
  assert.match(after?.nextRequirement ?? "", /中宗/);
  assert.ok((cultivator.totalContribution ?? 0) > 0);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /本职|声望/);
});

test("owned veins produce the breakthrough materials of their band", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const herb = world.spiritVeins?.["qingzhou:herb-field"];
  assert.ok(herb);
  assert.equal(herb.ownerId, "cang-mu-gu");
  assert.equal(herb.band, "qi");
  herb.lastYieldTick = world.tick - 8;
  advanceWorld(world, 1);
  assert.ok(herb.pouch.reduce((sum, row) => sum + row.count, 0) > 0);

  cultivator.locationId = herb.locationId;
  const described = getCultivatorState(world, cultivator.id).sectLife?.veins.find((vein) => vein.id === herb.id);
  assert.match(described?.materials ?? "", /凝气清露/);
  performAction(world, cultivator.id, `gather-vein:${herb.id}`);
  runUntilIdle(world, cultivator.id);
  assert.ok(QI_ITEMS.some((itemId) => (cultivator.inventory[itemId] ?? 0) > 0));

  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  const mine = world.spiritVeins?.["zhongzhou:mine"];
  assert.ok(mine);
  assert.equal(mine.band, "core");
  mine.ownerKind = "neutral";
  mine.ownerId = "cang-mu-gu";
  mine.lastYieldTick = world.tick - 8;
  advanceWorld(world, 1);
  cultivator.locationId = mine.locationId;
  const coreLine = getCultivatorState(world, cultivator.id).sectLife?.veins.find((vein) => vein.id === mine.id);
  assert.match(coreLine?.materials ?? "", /丹霞露/);
  performAction(world, cultivator.id, `gather-vein:${mine.id}`);
  runUntilIdle(world, cultivator.id);
  assert.ok(CORE_ITEMS.some((itemId) => (cultivator.inventory[itemId] ?? 0) > 0));
});

test("a raid moves the vein, and a failed raid costs the attacker", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  cultivator.totalContribution = 200;
  const rivalSummary = syncCultivatorFromPersona(world, { agentId: "agent-vein-rival", name: "石不语" });
  const rival = world.cultivators[rivalSummary.selectedCultivatorId]!;
  rival.neutralSectId = "ting-chao-ge";
  world.neutralSects["ting-chao-ge"]!.memberIds.push(rival.id);

  const mine = world.spiritVeins?.["qingzhou:mine"];
  assert.ok(mine);
  assert.equal(mine.band, "foundation");
  mine.ownerKind = "neutral";
  mine.ownerId = "ting-chao-ge";
  world.neutralSects["cang-mu-gu"]!.sectMerit = 30;

  performAction(world, cultivator.id, "take-post:elder");
  assert.equal(actionIds(world, cultivator.id).has(`declare-raid:${mine.id}`), true);
  performAction(world, cultivator.id, `declare-raid:${mine.id}`);
  runUntilIdle(world, cultivator.id);

  assert.equal(mine.ownerKind, "neutral");
  assert.equal(mine.ownerId, "cang-mu-gu");
  assert.match((rival.lifeLog ?? []).map((event) => event.text).join(""), /山门失守/);

  const failed = createSeedWorld();
  const attacker = joinCangMu(failed);
  attacker.realm = "筑基";
  attacker.realmLevel = 4;
  attacker.totalContribution = 80;
  const lost = failed.spiritVeins?.["qingzhou:mine"];
  assert.ok(lost);
  lost.ownerKind = "neutral";
  lost.ownerId = "ting-chao-ge";
  failed.neutralSects["cang-mu-gu"]!.sectMerit = 24;
  failed.neutralSects["ting-chao-ge"]!.sectMerit = 80;
  performAction(failed, attacker.id, "take-post:steward");
  const beforeContribution = attacker.totalContribution;
  performAction(failed, attacker.id, `declare-raid:${lost.id}`);
  runUntilIdle(failed, attacker.id);

  assert.equal(lost.ownerId, "ting-chao-ge");
  assert.ok(attacker.injuryTicksRemaining > 0);
  assert.ok(attacker.totalContribution < beforeContribution);
  assert.match((attacker.lifeLog ?? []).map((event) => event.text).join(""), /没能拿下/);
});

test("a duel leaves 嫌隙, and the next meeting is tense", () => {
  const world = createSeedWorld();
  const first = world.cultivators["yun-zhong-he"]!;
  first.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  first.injuryTicksRemaining = 0;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-feud", name: "楚晚" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  second.locationId = first.locationId;
  second.qi = second.maxQi;
  second.injuryTicksRemaining = 0;
  second.activeJobId = null;

  const challengedAt = world.tick;
  performAction(world, first.id, `challenge-cultivator:${second.id}`);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  assert.equal(first.pendingPvpChallengeId, challengeId);
  assert.equal(world.pendingPvpChallenges[challengeId]?.expiresAtTick, challengedAt + 6);
  const waiting = listAvailableActions(world, first.id).find((action) => action.actionId === `await-pvp-challenge:${challengeId}`);
  assert.match(waiting?.description ?? "", /6 刻/);
  assert.match(waiting?.label ?? "", /还剩6刻/);
  const accept = listAvailableActions(world, second.id).find((action) => action.actionId === `accept-pvp-challenge:${challengeId}`);
  assert.match(accept?.label ?? "", /还剩6刻/);
  const held = performAction(world, first.id, `await-pvp-challenge:${challengeId}`);
  assert.equal(held.accepted, false);
  assert.match(held.summary, /没有取消/);
  assert.equal(world.pendingPvpChallenges[challengeId]?.id, challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  runUntilIdle(world, first.id);

  assert.ok((getSocialLink(world, first.id, second.id)?.grudge ?? 0) >= 8);
  const life = getCultivatorState(world, first.id);
  assert.match(life.digest?.summary ?? "", /剑拔弩张|嫌隙/);
  assert.match(life.nearbyCultivators?.find((person) => person.cultivatorId === second.id)?.placeLine ?? "", /剑拔弩张/);

  const actions = listAvailableActions(world, first.id);
  const chat = actions.find((action) => action.actionId === `chat-up:${second.id}`);
  assert.match(chat?.description ?? "", /剑拔弩张/);
  assert.equal(actions.some((action) => action.actionId === `refuse-gift:${second.id}`), true);

  const spoken = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(spoken.accepted, true);
  const said = (first.travelNotes ?? []).map((note) => note.detail).join("");
  assert.match(said, /那一架|再战|不收|说硬/);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /剑拔弩张/);
  assert.equal(actionIds(world, first.id).has(`refuse-gift:${second.id}`), true);

  const beforeAffinity = getSocialLink(world, first.id, second.id)?.affinity ?? 0;
  const beforePills = first.inventory["healing-pill"] ?? 0;
  first.inventory["healing-pill"] = beforePills + 1;
  first.lastGiftTick = -1;
  const cooled = performAction(world, first.id, `send-message:${second.id}:gift-item`);
  assert.equal(cooled.accepted, true);
  assert.match(cooled.summary, /嫌隙/);
  assert.match(cooled.summary, /剑拔弩张/);
  assert.match(cooled.summary, /好感没有涨/);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity, beforeAffinity);
  assert.equal(first.inventory["healing-pill"], beforePills);
  assert.equal((second.pendingGifts ?? []).some((gift) => gift.fromCultivatorId === first.id), true);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /剑拔弩张/);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /好感没有涨/);
  assert.equal(actionIds(world, first.id).has(`refuse-gift:${second.id}`), true);

  const fresh = getSocialLink(world, first.id, second.id);
  if (fresh) {
    writeSocialLink(world, first.id, { ...fresh, grudge: 18 });
    const back = getSocialLink(world, second.id, first.id);
    if (back) writeSocialLink(world, second.id, { ...back, grudge: 18 });
  }
  first.inventory["healing-pill"] = (first.inventory["healing-pill"] ?? 0) + 1;
  const pillsBeforeFeud = first.inventory["healing-pill"] ?? 0;
  first.lastGiftTick = -1;
  const feudGift = performAction(world, first.id, `send-message:${second.id}:gift-item`);
  assert.match(feudGift.summary, /宿怨/);
  assert.match(feudGift.summary, /礼没收下/);
  assert.match(feudGift.summary, /好感没有涨/);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity, beforeAffinity);
  assert.equal(first.inventory["healing-pill"], pillsBeforeFeud);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /礼没收下/);
});

test("a player-sect outpost does not offer a neutral join", () => {
  const world = createSeedWorld();
  const sectId = "天南散修盟";
  const headquarters = "yangzhou:sect-outpost:天南散修盟";
  world.sects[sectId] = {
    id: sectId,
    name: "天南散修盟",
    alignment: "正道",
    stateId: "yangzhou",
    founderCultivatorId: "yun-zhong-he",
    treasury: 8000,
    memberIds: [],
    spiritVeins: [],
    headquarters,
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
  world.locations[headquarters] = {
    id: headquarters,
    stateId: "yangzhou",
    nodeType: "sect-outpost",
    name: "天南散修盟据点",
    kind: "safe",
    risk: "low",
    description: "玩家自建的天南散修盟据点。",
    organizationId: sectId,
    organizationType: "player-sect",
  };
  if (!world.states.yangzhou.locationIds.includes(headquarters)) {
    world.states.yangzhou.locationIds.push(headquarters);
  }
  world.topology = buildFullTopology(world.locations) as typeof world.topology;

  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "yangzhou:main-city";
  cultivator.activeJobId = null;
  const fromCity = listAvailableActions(world, cultivator.id);
  const playerTravel = fromCity.find((action) => action.actionId === `travel-to:${headquarters}`);
  const neutralTravel = fromCity.find((action) => action.actionId === "travel-to:yangzhou:sect-outpost:ting-chao-ge");
  assert.match(playerTravel?.label ?? "", /玩家宗门/);
  assert.match(playerTravel?.description ?? "", /玩家自建/);
  assert.match(playerTravel?.description ?? "", /报名/);
  assert.equal((playerTravel?.description ?? "").includes("join-neutral-sect"), false);
  assert.equal((playerTravel?.description ?? "").includes("/agent/"), false);
  assert.match(neutralTravel?.description ?? "", /中立山门/);
  assert.match(neutralTravel?.description ?? "", /入门/);
  assert.equal((neutralTravel?.description ?? "").includes("join-neutral-sect"), false);
  assert.equal((neutralTravel?.description ?? "").includes("/agent/"), false);

  cultivator.locationId = headquarters;
  const stuck = listAvailableActions(world, cultivator.id);
  assert.equal(stuck.some((action) => action.actionId.startsWith("join-neutral-sect:")), false);
  assert.equal(stuck.some((action) => action.actionId === "join-sect"), false);
  const card = stuck.find((action) => action.actionId === "open-player-sect-recruitment");
  assert.match(card?.description ?? "", /玩家自建/);
  assert.match(card?.description ?? "", /基础事务/);
  assert.match(card?.description ?? "", /报名/);
  assert.equal((card?.description ?? "").includes("join-neutral-sect"), false);
  assert.equal((card?.description ?? "").includes("/agent/"), false);
  assert.equal((card?.description ?? "").includes("open-player-sect-recruitment"), false);
  const posted = performAction(world, cultivator.id, "open-player-sect-recruitment");
  assert.equal(posted.accepted, false);
  assert.match(posted.summary, /天南散修盟/);
  assert.match(posted.summary, /不会入门/);
  assert.match(posted.summary, /报名/);
  assert.equal(posted.summary.includes("join-neutral-sect"), false);
  assert.equal(posted.summary.includes("/agent/"), false);
  assert.equal(cultivator.sectId, null);
  assert.equal(cultivator.neutralSectId, null);

  cultivator.completedBaseQuests = 1;
  const ready = listAvailableActions(world, cultivator.id);
  const join = ready.find((action) => action.actionId === "join-sect");
  assert.match(join?.description ?? "", /玩家自建/);
  assert.match(join?.description ?? "", /直接入门/);
  assert.equal((join?.description ?? "").includes("join-neutral-sect"), false);
  assert.equal((join?.description ?? "").includes("join-sect"), false);
  assert.equal(ready.some((action) => action.actionId.startsWith("join-neutral-sect:")), false);
});
