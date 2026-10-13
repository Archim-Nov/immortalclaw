import assert from "node:assert/strict";
import test from "node:test";
import { GameplayRejection } from "./gameplay-error.js";
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
const SECT_ROSTER = ["周小山", "楚晚", "石不语", "阿宁", "陆沉舟"];

function peerWorld(name = "Lin Zhao") {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, {
    agentId: `agent-social-v4-${name}`,
    name,
  });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.spiritStones = 400;
  second.spiritStones = 400;
  return { world, first, second };
}

function formParty(world: WorldState, leaderId: string, partnerId: string) {
  performAction(world, leaderId, `chat-up:${partnerId}`);
  performAction(world, leaderId, `party-invite:${partnerId}`);
  const inviteId = Object.keys(world.partyInvitations)[0];
  assert.ok(inviteId);
  performAction(world, partnerId, `accept-party:${inviteId}`);
}

function runUntilIdle(world: WorldState, cultivatorId: string, cap = 45) {
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

test("a party partner shares a completed dungeon run without taking a job", () => {
  const { world, first, second } = peerWorld();
  formParty(world, first.id, second.id);
  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:dungeon-c";
  first.dungeonProgress["丙"].highestClearedRank = 1;
  const companionStonesBefore = second.spiritStones;

  const started = performAction(world, first.id, "enter-dungeon:rank-1:balanced");
  assert.equal(started.accepted, true);
  assert.equal(second.activeJobId, null);
  assert.equal(getCultivatorState(world, second.id).sharedDungeon?.leaderName, first.name);
  assert.equal(getCultivatorState(world, first.id).dungeonExpedition.active?.companionName, second.name);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("门口") && note.detail.includes("分到灵石")));

  const ticks = runUntilIdle(world, first.id, 45);
  assert.ok(ticks < 45);
  assert.equal(first.activeJobId, null);
  assert.equal(second.activeJobId, null);
  assert.equal(first.locationId, "qingzhou:main-city");
  assert.equal(second.locationId, "qingzhou:main-city");
  assert.equal(getCultivatorState(world, second.id).sharedDungeon, null);

  const report = getCultivatorState(world, first.id).dungeonExpedition.lastReport;
  assert.equal(report?.outcome, "completed");
  const share = Math.floor((report?.spiritStoneGain ?? 0) * 0.2);
  assert.equal(second.spiritStones, companionStonesBefore + share);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("一起出了") && note.detail.includes("分给")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("一起出了") && note.detail.includes(String(share))));

  const laterTick = world.tick;
  advanceWorld(world, 2);
  assert.equal(world.tick, laterTick + 2);
});

test("a shared aggressive rank-4 collapse injures the idle partner and still advances", () => {
  const { world, first, second } = peerWorld("Gu Cheng");
  formParty(world, first.id, second.id);
  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:dungeon-c";
  first.dungeonProgress["丙"].highestClearedRank = 4;
  first.maxQi = 100;
  first.qi = 92;
  first.maxSpiritualPower = 100;
  first.spiritualPower = 68;
  second.maxQi = 100;
  second.qi = 92;
  const companionStonesBefore = second.spiritStones;

  performAction(world, first.id, "enter-dungeon:rank-4:aggressive");
  assert.equal(second.activeJobId, null);
  const ticks = runUntilIdle(world, first.id, 45);

  assert.ok(ticks < 45);
  assert.equal(first.activeJobId, null);
  assert.equal(second.activeJobId, null);
  assert.equal(first.locationId, "qingzhou:main-city");
  assert.equal(second.locationId, "qingzhou:main-city");
  assert.ok(second.injuryTicksRemaining >= 2);
  assert.ok(second.spiritStones < companionStonesBefore);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("拖")));

  const report = getCultivatorState(world, first.id).dungeonExpedition.lastReport;
  assert.ok(report?.outcome === "withdrew" || report?.outcome === "catastrophic");
  assert.ok((report?.stonesLost ?? 0) > 0);

  const laterTick = world.tick;
  advanceWorld(world, 2);
  assert.equal(world.tick, laterTick + 2);
  assert.equal(first.activeJobId, null);
  assert.equal(second.activeJobId, null);
});

test("aborting a shared run walks the partner out with the same purse", () => {
  const { world, first, second } = peerWorld("Su Wan");
  formParty(world, first.id, second.id);
  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:dungeon-c";
  first.dungeonProgress["丙"].highestClearedRank = 1;
  const companionStonesBefore = second.spiritStones;

  performAction(world, first.id, "enter-dungeon:rank-1:balanced");
  const aborted = performAction(world, first.id, "abort-dungeon-expedition");
  assert.equal(aborted.accepted, true);
  assert.equal(first.activeJobId, null);
  assert.equal(second.activeJobId, null);
  assert.equal(first.locationId, "qingzhou:main-city");
  assert.equal(second.locationId, "qingzhou:main-city");
  assert.equal(second.spiritStones, companionStonesBefore);
  assert.equal(second.injuryTicksRemaining, 0);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("撤")));
  assert.equal(getCultivatorState(world, first.id).dungeonExpedition.lastReport?.outcome, "aborted");
});

test("a favor board note can be read, then called in for stones", () => {
  const { world, first, second } = peerWorld("He Jing");
  performAction(world, first.id, `send-message:${second.id}:request-help`);
  performAction(world, second.id, `answer-help:${first.id}`);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance, 1);

  const actions = listAvailableActions(world, second.id).map((action) => action.actionId);
  assert.ok(actions.includes("post-board-note:favor"));
  assert.ok(actions.includes(`call-favor:${first.id}`));
  assert.equal(actions.includes("post-board-note:rival"), false);

  performAction(world, second.id, "post-board-note:favor");
  const board = getCultivatorState(world, first.id).localBoard ?? [];
  assert.ok(board.some((note) => note.kind === "favor" && note.text.includes(first.name)));

  const debtorBefore = first.spiritStones;
  const creditorBefore = second.spiritStones;
  const called = performAction(world, second.id, `call-favor:${first.id}`);
  assert.equal(called.accepted, true);
  assert.equal(first.spiritStones, debtorBefore - 12);
  assert.equal(second.spiritStones, creditorBefore + 12);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance ?? 0, 0);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("人情")));
  assert.ok((second.travelNotes ?? []).some((note) => note.title.includes("兑了")));
});

test("a rival board note and a public press stay on cooldown", () => {
  const { world, first, second } = peerWorld("Qiao Mu");
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const challenged = performAction(world, first.id, `challenge-cultivator:${second.id}`);
  assert.equal(challenged.accepted, true);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  runUntilIdle(world, first.id, 8);
  assert.equal(getSocialLink(world, first.id, second.id)?.rival, true);

  assert.ok(listAvailableActions(world, first.id).some((action) => action.actionId === "post-board-note:rival"));
  performAction(world, first.id, "post-board-note:rival");
  const board = getCultivatorState(world, second.id).localBoard ?? [];
  assert.ok(board.some((note) => note.kind === "rival" && note.text.includes(second.name)));

  const pressed = performAction(world, first.id, `press-rival:${second.id}`);
  assert.equal(pressed.accepted, true);
  assert.equal(getSocialLink(world, first.id, second.id)?.rival, true);
  assert.ok((first.travelNotes ?? []).some((note) => note.title.includes("当众")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("宿敌") || note.detail.includes("过节") || note.detail.includes("对手")));

  assert.throws(
    () => performAction(world, first.id, `press-rival:${second.id}`),
    (error: unknown) => error instanceof GameplayRejection && error.message.includes("刻"),
  );
});

test("six sect errands name a peer and leave a callable favor", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const sect = seedPlayerSect(world);
  cultivator.sectId = sect.id;
  cultivator.sectTitle = "外门";
  cultivator.locationId = sect.headquarters;
  const summary = syncCultivatorFromPersona(world, {
    agentId: "agent-sect-v4",
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
  assert.ok(notes.some((note) => note.title.includes("夜谈")));
  assert.ok(notes.some((note) => note.title.includes("长老")));
  assert.ok(notes.some((note) => note.title.includes("同门之约") && note.detail.includes(peer.name)));
  assert.equal(cultivator.sectDiaryStep ?? 0, 0);
  assert.ok(cultivator.realmProgress >= progressBefore + 4);
  assert.equal(getSocialLink(world, cultivator.id, peer.id)?.favorBalance, 1);
  assert.ok((peer.travelNotes ?? []).some((note) => note.detail.includes(cultivator.name) && (note.mood ?? "").includes("同门")));

  performAction(world, cultivator.id, "post-board-note:sect");
  const board = getCultivatorState(world, peer.id).localBoard ?? [];
  assert.ok(board.some((note) => note.kind === "sect" && note.text.includes(peer.name)));
});

test("a solo sect errand still names a roster mate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const sect = seedPlayerSect(world);
  cultivator.sectId = sect.id;
  cultivator.sectTitle = "外门";
  cultivator.locationId = sect.headquarters;

  performAction(world, cultivator.id, "take-sect-errand");
  advanceWorld(world, 2);

  const note = (cultivator.travelNotes ?? []).find((entry) => entry.title.includes("报了名"));
  assert.ok(note);
  assert.ok(SECT_ROSTER.some((name) => note!.detail.includes(name)));
  assert.equal(getSocialLink(world, cultivator.id, "missing") ?? null, null);
});
