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
import type { Cultivator } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";
const PLAYER_NAMES = ["墨儿", "青萝", "沈砺", "芷儿"] as const;

function crowdedCity() {
  const world = createSeedWorld();
  const template = world.cultivators[CULTIVATOR_ID]!;
  const players: Cultivator[] = [];
  for (let index = 0; index < PLAYER_NAMES.length; index += 1) {
    const name = PLAYER_NAMES[index]!;
    const summary = syncCultivatorFromPersona(world, {
      agentId: `agent-crowd-v6-${index}`,
      name,
    });
    const player = world.cultivators[summary.selectedCultivatorId]!;
    player.locationId = "qingzhou:main-city";
    player.lastGiftTick = -1;
    player.qi = player.maxQi;
    players.push(player);
  }
  for (let index = 0; index < 12; index += 1) {
    const npc = structuredClone(template);
    npc.id = `npc-crowd-${index}`;
    npc.name = `啊${String(index).padStart(2, "0")}`;
    npc.createdByAgentId = null;
    npc.locationId = "qingzhou:main-city";
    npc.activeJobId = null;
    npc.pendingPvpChallengeId = null;
    world.cultivators[npc.id] = npc;
  }
  return { world, players };
}

test("agent cultivators stay visible to each other when NPCs fill the city", () => {
  const { world, players } = crowdedCity();
  const playerIds = new Set(players.map((player) => player.id));

  for (const player of players) {
    const nearby = getCultivatorState(world, player.id).nearbyCultivators ?? [];
    const others = players.filter((candidate) => candidate.id !== player.id);
    for (const other of others) {
      assert.ok(
        nearby.some((entry) => entry.cultivatorId === other.id && entry.name === other.name),
        `${player.name} should see ${other.name}`,
      );
    }
    const npcShown = nearby.filter((entry) => !playerIds.has(entry.cultivatorId));
    assert.ok(npcShown.length <= 8);
    assert.ok(npcShown.length >= 1);

    const actions = new Set(listAvailableActions(world, player.id).map((action) => action.actionId));
    for (const other of others) {
      assert.ok(actions.has(`chat-up:${other.id}`), `${player.name} missing chat-up for ${other.name}`);
      assert.ok(actions.has(`send-message:${other.id}:greet`));
      assert.ok(actions.has(`send-message:${other.id}:gift-item`));
      assert.ok(actions.has(`challenge-cultivator:${other.id}`));
    }
  }

  const [first, second] = players;
  assert.ok(first && second);
  performAction(world, first.id, `chat-up:${second.id}`);
  const afterChat = listAvailableActions(world, first.id).map((action) => action.actionId);
  assert.ok(afterChat.includes(`party-invite:${second.id}`));
  const bonded = getCultivatorState(world, first.id).nearbyCultivators ?? [];
  assert.ok(bonded.some((entry) => entry.cultivatorId === second.id && (entry.affinity ?? 0) > 0));
});

function spawnAgent(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  return cultivator;
}

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string, cap = 12) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < cap) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  return ticks;
}

test("five idle agents share one dungeon run and a sixth is refused", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const companions = PLAYER_NAMES.map((name, index) => spawnAgent(world, `agent-party5-${index}`, name));
  for (const companion of companions) {
    performAction(world, leader.id, `chat-up:${companion.id}`);
    performAction(world, leader.id, `party-invite:${companion.id}`);
    const inviteId = Object.keys(world.partyInvitations).find(
      (id) => world.partyInvitations[id]?.toCultivatorId === companion.id,
    );
    assert.ok(inviteId);
    performAction(world, companion.id, `accept-party:${inviteId}`);
  }
  const party = getCultivatorState(world, leader.id).party;
  assert.equal(party?.members?.length, 4);
  assert.ok(party?.members?.every((member) => member.idle));

  const sixth = spawnAgent(world, "agent-party5-sixth", "阿絮");
  performAction(world, leader.id, `chat-up:${sixth.id}`);
  assert.throws(
    () => performAction(world, leader.id, `party-invite:${sixth.id}`),
    /满/,
  );

  leader.locationId = "qingzhou:dungeon-c";
  for (const companion of companions) {
    companion.locationId = "qingzhou:dungeon-c";
  }
  const started = performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  assert.equal(started.accepted, true);
  const active = getCultivatorState(world, leader.id).dungeonExpedition.active;
  assert.equal(active?.companionNames?.length, 4);
  assert.match(active?.shareNote ?? "", /不另开工/);
  for (const companion of companions) {
    assert.equal(companion.activeJobId, null);
    assert.equal(getCultivatorState(world, companion.id).sharedDungeon?.leaderId, leader.id);
    assert.ok((companion.travelNotes ?? []).some((note) => note.detail.includes("门口")));
  }

  const tickBefore = world.tick;
  advanceWorld(world, 1);
  assert.equal(world.tick, tickBefore + 1);
  assert.ok(leader.activeJobId);
  for (const companion of companions) {
    assert.equal(companion.activeJobId, null);
  }

  const aborted = performAction(world, leader.id, "abort-dungeon-expedition");
  assert.equal(aborted.accepted, true);
  assert.equal(leader.activeJobId, null);
  assert.equal(leader.locationId, "qingzhou:main-city");
  for (const companion of companions) {
    assert.equal(companion.activeJobId, null);
    assert.equal(companion.locationId, "qingzhou:main-city");
    assert.ok((companion.travelNotes ?? []).some((note) => note.detail.includes("撤")));
  }
});

test("city duels and dungeon guardians write who struck and the qi spent", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const second = spawnAgent(world, "agent-fight-v6", "青萝");
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
  const ticks = runUntilIdle(world, first.id, 12);
  assert.ok(ticks < 12);
  assert.equal(first.activeJobId, null);

  const fightBeat = (notes: { detail: string }[] | undefined) =>
    (notes ?? []).some((note) => /出手|破防|守住/.test(note.detail) && note.detail.includes("灵气"));
  assert.ok(fightBeat(first.travelNotes));
  assert.ok(fightBeat(second.travelNotes));
  assert.ok(firstQi - first.qi >= 2);
  assert.ok(secondQi - second.qi >= 2);

  first.locationId = "qingzhou:dungeon-c";
  first.qi = first.maxQi;
  const guardianQi = first.qi;
  performAction(world, first.id, "challenge-guardian:rank-1");
  const guardianTicks = runUntilIdle(world, first.id, 12);
  assert.ok(guardianTicks < 12);
  assert.equal(first.activeJobId, null);
  assert.ok(fightBeat(first.travelNotes));
  assert.ok(guardianQi - first.qi >= 2);
});
