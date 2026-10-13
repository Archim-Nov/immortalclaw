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

function chatUpIds(world: WorldState, cultivatorId: string): string[] {
  return listAvailableActions(world, cultivatorId)
    .map((action) => action.actionId)
    .filter((actionId) => actionId.startsWith("chat-up:"));
}

test("a party invite tells you to greet or chat-up before 认识", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const partner = spawnAgent(world, "agent-v8-stranger", "青萝");

  assert.throws(
    () => performAction(world, leader.id, `party-invite:${partner.id}`),
    (error: unknown) => error instanceof GameplayRejection
      && /认识/.test(error.message)
      && /搭讪|问候/.test(error.message),
  );
});

test("a greet then an invite works in the same heartbeat", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const partner = spawnAgent(world, "agent-v8-greet", "沈砺");
  const tick = world.tick;

  const greeted = performAction(world, leader.id, `send-message:${partner.id}:greet`);
  assert.equal(greeted.accepted, true);
  const invited = performAction(world, leader.id, `party-invite:${partner.id}`);
  assert.equal(invited.accepted, true);
  assert.equal(world.tick, tick);
  assert.ok(listAvailableActions(world, partner.id).some((action) => action.actionId.startsWith("accept-party:")));
});

test("chat-up then invite still works in the same heartbeat", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const partner = spawnAgent(world, "agent-v8-chat", "芷儿");
  const tick = world.tick;

  performAction(world, leader.id, `chat-up:${partner.id}`);
  const invited = performAction(world, leader.id, `party-invite:${partner.id}`);
  assert.equal(invited.accepted, true);
  assert.equal(world.tick, tick);
});

test("later agents get chat-up when the social page turns", () => {
  const world = createSeedWorld();
  const players: Cultivator[] = [];
  for (let index = 0; index < 12; index += 1) {
    players.push(spawnAgent(world, `agent-v8-page-${index}`, `子${String(index).padStart(2, "0")}`));
  }
  const watcher = players[0]!;
  const others = players.filter((player) => player.id !== watcher.id);
  const nearby = getCultivatorState(world, watcher.id).nearbyCultivators ?? [];
  for (const other of others) {
    assert.ok(nearby.some((entry) => entry.cultivatorId === other.id));
  }
  const before = chatUpIds(world, watcher.id);
  const hidden = others.find((other) => !before.includes(`chat-up:${other.id}`));
  assert.ok(hidden);
  assert.ok(before.length <= 8);
  assert.equal(getCultivatorState(world, watcher.id).socialPage?.pageCount, 2);

  const turned = performAction(world, watcher.id, "cycle-social-page");
  assert.equal(turned.accepted, true);
  const after = chatUpIds(world, watcher.id);
  assert.ok(after.includes(`chat-up:${hidden.id}`));
  assert.ok(after.length <= 8);
  assert.equal(world.tick, 0);

  const later = createSeedWorld();
  const laterPlayers: Cultivator[] = [];
  for (let index = 0; index < 12; index += 1) {
    laterPlayers.push(spawnAgent(later, `agent-v8-tick-${index}`, `丑${String(index).padStart(2, "0")}`));
  }
  const laterWatcher = laterPlayers[0]!;
  const laterOthers = laterPlayers.filter((player) => player.id !== laterWatcher.id);
  const missing = laterOthers.find((other) => !chatUpIds(later, laterWatcher.id).includes(`chat-up:${other.id}`));
  assert.ok(missing);
  const tickBefore = later.tick;
  advanceWorld(later, 4);
  assert.equal(later.tick, tickBefore + 4);
  assert.ok(chatUpIds(later, laterWatcher.id).includes(`chat-up:${missing.id}`));
  assert.ok(laterWatcher.activeJobId === null);
});

test("party coordination is an in-game message, not a side channel", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const partner = spawnAgent(world, "agent-v8-party-msg", "青萝");
  const outsider = spawnAgent(world, "agent-v8-party-out", "沈砺");
  performAction(world, leader.id, `chat-up:${partner.id}`);
  performAction(world, leader.id, `party-invite:${partner.id}`);
  const inviteId = Object.keys(world.partyInvitations).find(
    (id) => world.partyInvitations[id]?.toCultivatorId === partner.id,
  );
  assert.ok(inviteId);
  performAction(world, partner.id, `accept-party:${inviteId}`);
  partner.locationId = "qingzhou:dungeon-c";

  const actions = listAvailableActions(world, leader.id).map((action) => action.actionId);
  assert.ok(actions.includes(`send-message:${partner.id}:rendezvous-at-gate`));
  assert.ok(actions.includes(`send-message:${partner.id}:ready-to-enter`));
  assert.ok(actions.includes(`send-message:${partner.id}:wait`));
  assert.equal(actions.includes(`send-message:${outsider.id}:rendezvous-at-gate`), false);

  const tick = world.tick;
  const sent = performAction(world, leader.id, `send-message:${partner.id}:rendezvous-at-gate`);
  assert.equal(sent.accepted, true);
  assert.equal(world.tick, tick);
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("门口")));
  assert.ok((partner.travelNotes ?? []).some((note) => note.detail.includes("门口")));
  const inbox = (world.messages ?? []).filter((message) => message.subject === "门口会合");
  assert.ok(inbox.some((message) => message.toCultivatorId === partner.id && message.content.includes("门口")));
  assert.ok(inbox.some((message) => message.toCultivatorId === leader.id && message.content.includes(partner.name)));

  performAction(world, leader.id, `send-message:${partner.id}:ready-to-enter`);
  performAction(world, leader.id, `send-message:${partner.id}:wait`);
  const subjects = new Set((world.messages ?? []).filter((message) => message.toCultivatorId === partner.id).map((message) => message.subject));
  assert.ok(subjects.has("可以下了"));
  assert.ok(subjects.has("先等一等"));
  assert.ok((partner.travelNotes ?? []).some((note) => note.detail.includes("先别下")));
  assert.equal(world.tick, tick);

  assert.throws(
    () => performAction(world, leader.id, `send-message:${outsider.id}:wait`),
    (error: unknown) => error instanceof GameplayRejection && /同队/.test(error.message),
  );
});

test("a city duel notes what the crit or the guard left behind", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const second = spawnAgent(world, "agent-v8-duel", "阿絮");
  first.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const before = first.qi;

  performAction(world, first.id, `challenge-cultivator:${second.id}`);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  let ticks = 0;
  while (first.activeJobId && ticks < 12) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  assert.equal(first.activeJobId, null);
  const beat = (first.travelNotes ?? []).some((note) =>
    /守势松了一拍|胸口一滞|余劲还在腕上|谁也没破开/.test(note.detail)
    && note.detail.includes("灵气"),
  );
  assert.ok(beat);
  assert.ok(before - first.qi >= 2);
});
