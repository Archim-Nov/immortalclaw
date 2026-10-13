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

const CULTIVATOR_ID = "yun-zhong-he";

function peerWorld(name = "Lin Zhao", agentId = "agent-social-v5") {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.spiritStones = 400;
  second.spiritStones = 400;
  return { world, first, second };
}

function formParty(world: ReturnType<typeof createSeedWorld>, leaderId: string, partnerId: string) {
  performAction(world, leaderId, `chat-up:${partnerId}`);
  performAction(world, leaderId, `party-invite:${partnerId}`);
  const inviteId = Object.keys(world.partyInvitations)[0];
  assert.ok(inviteId);
  performAction(world, partnerId, `accept-party:${inviteId}`);
}

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string, cap = 8) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < cap) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  return ticks;
}

test("nearby cultivators name who shares the city and offer chat-up", () => {
  const { world, first, second } = peerWorld();
  const elsewhere = syncCultivatorFromPersona(world, {
    agentId: "agent-social-v5-away",
    name: "Qiao Mu",
  });
  const away = world.cultivators[elsewhere.selectedCultivatorId]!;
  away.locationId = "yangzhou:main-city";

  const firstNearby = getCultivatorState(world, first.id).nearbyCultivators ?? [];
  const secondNearby = getCultivatorState(world, second.id).nearbyCultivators ?? [];
  assert.ok(firstNearby.some((entry) => entry.cultivatorId === second.id && entry.name === second.name && entry.idle));
  assert.ok(secondNearby.some((entry) => entry.cultivatorId === first.id && entry.placeLine.includes(first.name)));
  assert.equal(firstNearby.some((entry) => entry.cultivatorId === away.id), false);
  assert.equal(secondNearby.some((entry) => entry.cultivatorId === away.id), false);

  const actions = listAvailableActions(world, first.id).map((action) => action.actionId);
  assert.ok(actions.includes(`chat-up:${second.id}`));
  assert.ok(actions.includes(`send-message:${second.id}:greet`));
});

test("a returned gift and an accepted gift stay on the social link by Chinese name", () => {
  const { world, first, second } = peerWorld("He Jing", "agent-gift-v5");
  for (const itemId of Object.keys(first.inventory)) {
    first.inventory[itemId as keyof typeof first.inventory] = 0;
  }
  first.inventory["spirit-ore"] = 2;
  const oreBefore = first.inventory["spirit-ore"];

  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const pending = getCultivatorState(world, second.id).pendingGifts;
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.fromCultivatorId, first.id);
  assert.equal(pending[0]?.itemName, "灵矿原石");
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("灵矿原石")));

  performAction(world, second.id, `reject-gift:${pending[0]!.messageId}`);
  assert.equal(first.inventory["spirit-ore"], oreBefore);
  assert.equal(getSocialLink(world, second.id, first.id)?.lastGiftResult, "returned");
  assert.equal(getCultivatorState(world, first.id).socialLinks.find((link) => link.targetCultivatorId === second.id)?.lastGift?.result, "returned");
  assert.match(
    getCultivatorState(world, second.id).socialLinks.find((link) => link.targetCultivatorId === first.id)?.bondLine ?? "",
    /退过礼/,
  );
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("退") && note.detail.includes("灵矿原石")));

  advanceWorld(world, 1);
  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const acceptedGift = second.pendingGifts[second.pendingGifts.length - 1];
  assert.ok(acceptedGift);
  performAction(world, second.id, `accept-gift:${acceptedGift!.messageId}`);
  assert.equal(getSocialLink(world, first.id, second.id)?.lastGiftResult, "accepted");
  assert.equal(getSocialLink(world, first.id, second.id)?.lastGiftItemName, "灵矿原石");
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("灵矿原石") && note.title.includes("收下")));
});

test("a city duel records the result and the purse on both social links", () => {
  const { world, first, second } = peerWorld("Gu Cheng", "agent-duel-v5");
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const challenged = performAction(world, first.id, `challenge-cultivator:${second.id}`);
  assert.equal(challenged.accepted, true);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  runUntilIdle(world, first.id, 8);

  const left = getCultivatorState(world, first.id).socialLinks.find((link) => link.targetCultivatorId === second.id);
  const right = getCultivatorState(world, second.id).socialLinks.find((link) => link.targetCultivatorId === first.id);
  assert.ok(left?.lastDuel);
  assert.ok(right?.lastDuel);
  assert.equal(left?.rival, true);
  assert.match(left?.bondLine ?? "", /宿敌/);
  assert.match(left?.bondLine ?? "", /城中切磋/);
  const pair = `${left!.lastDuel!.result}:${right!.lastDuel!.result}`;
  assert.ok(["win:loss", "loss:win", "draw:draw", "retreat:win", "win:retreat"].includes(pair));
  if (pair === "draw:draw") {
    assert.equal(left!.lastDuel!.stoneDelta, 0);
    assert.equal(right!.lastDuel!.stoneDelta, 0);
  } else {
    const winner = left!.lastDuel!.result === "win" ? left!.lastDuel! : right!.lastDuel!;
    assert.ok(winner.stoneDelta > 0);
  }
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("对手") && note.detail.includes("灵石")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("灵石")));
});

test("party state tells a client the dungeon share before the partner is bound", () => {
  const { world, first, second } = peerWorld("Su Wan", "agent-share-v5");
  formParty(world, first.id, second.id);
  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:main-city";
  first.dungeonProgress["丙"].highestClearedRank = 1;

  const apart = getCultivatorState(world, first.id).party;
  assert.equal(apart?.dungeonShareReady, false);
  assert.match(apart?.shareNote ?? "", /不会分险/);

  second.locationId = "qingzhou:dungeon-c";
  const ready = getCultivatorState(world, first.id).party;
  assert.equal(ready?.partnerId, second.id);
  assert.equal(ready?.dungeonShareReady, true);
  assert.match(ready?.shareNote ?? "", /分到灵石/);
  const enter = listAvailableActions(world, first.id).find((action) => action.actionId === "enter-dungeon:rank-1:balanced");
  assert.match(enter?.description ?? "", /不另开工/);

  const started = performAction(world, first.id, "enter-dungeon:rank-1:balanced");
  assert.equal(started.accepted, true);
  assert.equal(second.activeJobId, null);
  const shared = getCultivatorState(world, second.id).sharedDungeon;
  assert.equal(shared?.leaderId, first.id);
  assert.equal(shared?.leaderName, first.name);
  assert.equal(shared?.stayPut, true);
  assert.match(shared?.shareNote ?? "", /离开/);
  const active = getCultivatorState(world, first.id).dungeonExpedition.active;
  assert.equal(active?.companionId, second.id);
  assert.match(active?.shareNote ?? "", /不另开工/);

  const tick = world.tick;
  advanceWorld(world, 1);
  assert.equal(world.tick, tick + 1);
  assert.equal(second.activeJobId, null);
});
