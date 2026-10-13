import assert from "node:assert/strict";
import test from "node:test";
import {
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
