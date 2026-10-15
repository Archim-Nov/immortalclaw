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
import type { Cultivator, WorldState } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawnAgent(world: WorldState, agentId: string, name: string): Cultivator {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.lastGiftTick = -1;
  return cultivator;
}

function formPair(world: WorldState, leaderId: string, partnerId: string) {
  performAction(world, leaderId, `chat-up:${partnerId}`);
  performAction(world, leaderId, `party-invite:${partnerId}`);
  const inviteId = Object.keys(world.partyInvitations).find(
    (id) => world.partyInvitations[id]?.toCultivatorId === partnerId,
  );
  assert.ok(inviteId);
  performAction(world, partnerId, `accept-party:${inviteId}`);
  return inviteId;
}

test("a city party explains the gate before anyone enters", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const partner = spawnAgent(world, "agent-v7-city", "青萝");
  formPair(world, leader.id, partner.id);

  const party = getCultivatorState(world, leader.id).party;
  assert.equal(party?.dungeonShareReady, false);
  assert.equal(party?.full, false);
  assert.equal(party?.openSeats, 3);
  assert.deepEqual(party?.waitingInCity, [partner.name]);
  assert.deepEqual(party?.atGate, []);
  assert.match(party?.shareNote ?? "", /门口/);
  assert.match(party?.shareNote ?? "", /结伴/);
  assert.match(party?.shareNote ?? "", /不会分险/);

  const inviteText = (world.messages ?? []).map((message) => `${message.subject} ${message.content}`).join("\n");
  assert.match(inviteText, /门口/);
  assert.match(inviteText, /结伴/);
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("门口") && note.detail.includes("不另开工")));
  assert.ok((partner.travelNotes ?? []).some((note) => note.detail.includes("门口")));
});

test("a full party explains the cap and refuses a sixth", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const names = ["青萝", "沈砺", "芷儿", "阿絮"] as const;
  for (const [index, name] of names.entries()) {
    const companion = spawnAgent(world, `agent-v7-full-${index}`, name);
    formPair(world, leader.id, companion.id);
  }

  const party = getCultivatorState(world, leader.id).party;
  assert.equal(party?.members?.length, 4);
  assert.equal(party?.full, true);
  assert.equal(party?.openSeats, 0);
  assert.match(party?.shareNote ?? "", /满/);
  assert.match(party?.shareNote ?? "", /五人/);

  const sixth = spawnAgent(world, "agent-v7-sixth", "周小山");
  performAction(world, leader.id, `chat-up:${sixth.id}`);
  assert.equal(
    listAvailableActions(world, leader.id).some((action) => action.actionId === `party-invite:${sixth.id}`),
    false,
  );
  assert.throws(
    () => performAction(world, leader.id, `party-invite:${sixth.id}`),
    (error: unknown) => error instanceof GameplayRejection && /满/.test(error.message) && /五人/.test(error.message),
  );
});

test("a dungeon run writes a 见闻 and the tick still advances", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:dungeon-c";
  leader.qi = leader.maxQi;
  const started = performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  assert.equal(started.accepted, true);
  const tickBefore = world.tick;
  advanceWorld(world, 3);
  assert.equal(world.tick, tickBefore + 3);
  assert.ok(leader.activeJobId);

  let guard = 0;
  while (leader.activeJobId && guard < 36) {
    const told = (leader.travelNotes ?? []).some((note) => note.detail.includes("见闻"));
    if (told) break;
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.ok(world.tick > tickBefore);
  const notes = (leader.travelNotes ?? []).map((note) => note.detail).join("\n");
  assert.match(notes, /见闻/);
  assert.equal(notes.includes("节奏是进、拆、再进"), false);
});

test("a city duel names the opening stance and the qi spent", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const second = spawnAgent(world, "agent-v7-duel", "青萝");
  first.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const firstQi = first.qi;
  const secondQi = second.qi;

  const challenged = performAction(world, first.id, `challenge-cultivator:${second.id}`);
  assert.equal(challenged.accepted, true);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  let ticks = 0;
  while (first.activeJobId && ticks < 12) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  assert.equal(first.activeJobId, null);

  const stanceBeat = (notes: { detail: string }[] | undefined) =>
    (notes ?? []).some((note) =>
      /起手/.test(note.detail)
      && /刚猛|灵巧|算计|寻常/.test(note.detail)
      && /出手|破防|守住|守势/.test(note.detail)
      && note.detail.includes("灵气"),
    );
  assert.ok(stanceBeat(first.travelNotes));
  assert.ok(stanceBeat(second.travelNotes));
  assert.ok(firstQi - first.qi >= 2);
  assert.ok(secondQi - second.qi >= 2);
});

test("every agent stays discoverable while social actions stay capped", () => {
  const world = createSeedWorld();
  const players: Cultivator[] = [];
  for (let index = 0; index < 12; index += 1) {
    players.push(spawnAgent(world, `agent-v7-crowd-${index}`, `子${String(index).padStart(2, "0")}`));
  }

  for (const player of players) {
    const nearby = getCultivatorState(world, player.id).nearbyCultivators ?? [];
    const others = players.filter((candidate) => candidate.id !== player.id);
    for (const other of others) {
      assert.ok(nearby.some((entry) => entry.cultivatorId === other.id), `${player.name} should see ${other.name}`);
    }
    const note = getCultivatorState(world, player.id).nearbyNote ?? "";
    assert.match(note, /nearbyCultivators/);
    assert.match(note, /8/);

    const chatUps = listAvailableActions(world, player.id)
      .map((action) => action.actionId)
      .filter((actionId) => actionId.startsWith("chat-up:"));
    const agentChatUps = chatUps.filter((actionId) => others.some((other) => actionId === `chat-up:${other.id}`));
    assert.ok(agentChatUps.length <= 8);
    assert.ok(agentChatUps.length >= 1);
    assert.ok(others.some((other) => !agentChatUps.includes(`chat-up:${other.id}`)));
  }
});
