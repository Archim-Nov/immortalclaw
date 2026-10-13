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
import { getSocialLink } from "./social.js";
import type { Sect, WorldState } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function peerWorld() {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, {
    agentId: "agent-social-v3",
    name: "Lin Zhao",
  });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.spiritStones = 400;
  second.spiritStones = 400;
  return { world, first, second };
}

function runUntilIdle(world: WorldState, cultivatorId: string, cap = 40) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < cap) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  return ticks;
}

function seedPlayerSect(world: WorldState) {
  const sect: Sect = {
    id: "qing-yun-sect",
    name: "青云宗",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: CULTIVATOR_ID,
    treasury: 1000,
    memberIds: [CULTIVATOR_ID],
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

test("a healthy aggressive rank-4 run collapses without freezing the tick", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 4;
  cultivator.maxQi = 100;
  cultivator.qi = 92;
  cultivator.maxSpiritualPower = 100;
  cultivator.spiritualPower = 68;
  const tickBefore = world.tick;

  const started = performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-4:aggressive");
  assert.equal(started.accepted, true);
  const ticks = runUntilIdle(world, CULTIVATOR_ID, 45);

  assert.equal(cultivator.activeJobId, null);
  assert.ok(ticks < 45);
  assert.equal(cultivator.locationId, "qingzhou:main-city");
  assert.ok(cultivator.injuryTicksRemaining >= 6);
  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.ok(report?.outcome === "withdrew" || report?.outcome === "catastrophic");
  assert.ok((report?.stonesLost ?? 0) > 0);
  assert.ok((report?.stepsResolved ?? 0) >= 3);
  assert.ok((report?.stepsResolved ?? 10) < 10);
  assert.match(report?.summary ?? "", /散落灵石|吐出来|抬/);

  const laterTick = world.tick;
  advanceWorld(world, 2);
  assert.equal(world.tick, laterTick + 2);
  assert.ok(world.tick > tickBefore);
  assert.equal(cultivator.activeJobId, null);
});

test("the step-3 moral wake can be chosen before the posture timeout", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  const moralityBefore = cultivator.moralityScore;

  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:aggressive");
  let guard = 0;
  while (!getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint && cultivator.activeJobId && guard < 30) {
    advanceWorld(world, 1);
    guard += 1;
  }

  const hint = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint;
  assert.ok(hint);
  assert.ok(hint?.options.some((option) => option.optionId === "aid-wounded"));
  assert.ok(hint?.options.some((option) => option.optionId === "take-pouch"));
  assert.equal(hint?.defaultOptionId, "take-pouch");

  const actions = listAvailableActions(world, CULTIVATOR_ID).map((action) => action.actionId);
  assert.ok(actions.includes("abort-dungeon-expedition"));
  assert.ok(actions.includes("dungeon-wake-decision:aid-wounded"));

  const stonesBefore = cultivator.spiritStones;
  const chosen = performAction(world, CULTIVATOR_ID, "dungeon-wake-decision:aid-wounded");
  assert.equal(chosen.accepted, true);
  assert.equal(cultivator.spiritStones, stonesBefore - 6);
  assert.ok(cultivator.moralityScore > moralityBefore);
  assert.equal(world.dungeonExpeditions[CULTIVATOR_ID]?.pendingWakeNode ?? null, null);
  assert.ok(cultivator.activeJobId);
  assert.ok((cultivator.travelNotes ?? []).some((note) => note.detail.includes("水囊")));

  const tick = world.tick;
  advanceWorld(world, 1);
  assert.equal(world.tick, tick + 1);
});

test("help, a gift, and a commission leave favors both agents can report", () => {
  const { world, first, second } = peerWorld();
  first.inventory["spirit-ore"] = 1;
  second.inventory["spirit-ore"] = 1;

  const asked = performAction(world, first.id, `send-message:${second.id}:request-help`);
  assert.equal(asked.accepted, true);
  assert.ok(listAvailableActions(world, second.id).some((action) => action.actionId === `answer-help:${first.id}`));

  const stonesBefore = second.spiritStones;
  const answered = performAction(world, second.id, `answer-help:${first.id}`);
  assert.equal(answered.accepted, true);
  assert.equal(second.spiritStones, stonesBefore - 8);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance, 1);
  assert.equal(getSocialLink(world, first.id, second.id)?.favorBalance, -1);
  const helperView = getCultivatorState(world, second.id).socialLinks.find((link) => link.targetCultivatorId === first.id);
  assert.match(helperView?.bondLine ?? "", /人情/);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("求助") || note.title.includes("求助")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("人情")));

  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const gift = second.pendingGifts[second.pendingGifts.length - 1];
  assert.ok(gift);
  performAction(world, second.id, `accept-gift:${gift!.messageId}`);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance ?? 0, 0);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("人情")));

  const posted = performAction(world, first.id, "post-commission:gather:spirit-ore");
  assert.equal(posted.accepted, true);
  const commissionId = Object.keys(world.commissions)[0];
  assert.ok(commissionId);
  performAction(world, second.id, `accept-commission:${commissionId}`);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance, 1);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("委托")));
  assert.ok((second.travelNotes ?? []).some((note) => note.title.includes("委托")));
});

test("a city duel marks a rival both cultivators can report", () => {
  const { world, first, second } = peerWorld();
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const challenged = performAction(world, first.id, `challenge-cultivator:${second.id}`);
  assert.equal(challenged.accepted, true);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  runUntilIdle(world, first.id, 8);

  assert.equal(getSocialLink(world, first.id, second.id)?.rival, true);
  assert.equal(getSocialLink(world, second.id, first.id)?.rival, true);
  const view = getCultivatorState(world, first.id).socialLinks.find((link) => link.targetCultivatorId === second.id);
  assert.equal(view?.rival, true);
  assert.match(view?.bondLine ?? "", /宿敌/);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("对手")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("对手")));
});

test("a board note and a dungeon party invite are visible to the other cultivator", () => {
  const { world, first, second } = peerWorld();
  performAction(world, first.id, `chat-up:${second.id}`);
  assert.ok(listAvailableActions(world, first.id).some((action) => action.actionId === "post-board-note"));
  performAction(world, first.id, "post-board-note");
  const board = getCultivatorState(world, second.id).localBoard ?? [];
  assert.ok(board.some((note) => note.authorName === first.name && note.text.length > 0));

  performAction(world, first.id, `party-invite:${second.id}`);
  const inviteId = Object.keys(world.partyInvitations)[0];
  assert.ok(inviteId);
  performAction(world, second.id, `accept-party:${inviteId}`);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes(second.name)));

  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:dungeon-c";
  first.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, first.id, "enter-dungeon:rank-1:balanced");
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("门口")));
  assert.equal(second.activeJobId, null);
  assert.ok((world.messages ?? []).some((message) => message.toCultivatorId === second.id && message.subject.includes("地宫")));
});

test("sect errands write a diary chain and notice a sect-mate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const sect = seedPlayerSect(world);
  cultivator.sectId = sect.id;
  cultivator.sectTitle = "外门";
  cultivator.locationId = sect.headquarters;
  const summary = syncCultivatorFromPersona(world, {
    agentId: "agent-sect-peer",
    name: "He Jing",
  });
  const peer = world.cultivators[summary.selectedCultivatorId]!;
  peer.locationId = sect.headquarters;
  peer.sectId = sect.id;
  peer.sectTitle = "外门";
  sect.memberIds.push(peer.id);
  const progressBefore = cultivator.realmProgress;

  for (let step = 0; step < 6; step += 1) {
    performAction(world, cultivator.id, "take-sect-errand");
    advanceWorld(world, 2);
    assert.equal(cultivator.activeJobId, null);
  }

  const notes = cultivator.travelNotes ?? [];
  assert.ok(notes.some((note) => note.title.includes("报了名") && note.detail.includes(peer.name)));
  assert.ok(notes.some((note) => note.title.includes("执事")));
  assert.ok(notes.some((note) => note.title.includes("长老")));
  assert.equal(cultivator.sectDiaryStep ?? 0, 0);
  assert.ok(cultivator.realmProgress >= progressBefore + 4);
});
