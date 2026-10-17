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
import { rankOneMoralFork } from "./dungeon-expedition-service.js";
import { getSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

test("aggressive low qi collapses out of the dungeon with a loss and a readable beat", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  cultivator.maxQi = 100;
  cultivator.qi = 30;
  cultivator.maxSpiritualPower = 100;
  cultivator.spiritualPower = 70;
  const stonesBefore = cultivator.spiritStones;
  const tickBefore = world.tick;

  const started = performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:aggressive");
  assert.equal(started.accepted, true);

  const finished = advanceWorld(world, 3);
  assert.equal(world.tick, tickBefore + 3);
  assert.equal(cultivator.activeJobId, null);
  assert.equal(world.jobs[started.job!.id], undefined);
  assert.equal(cultivator.locationId, "qingzhou:main-city");
  assert.ok(cultivator.injuryTicksRemaining >= 6);
  assert.ok(cultivator.spiritStones < stonesBefore);

  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.ok(report?.outcome === "withdrew" || report?.outcome === "catastrophic");
  assert.ok((report?.stonesLost ?? 0) > 0);
  assert.match(report?.summary ?? "", /散落灵石|抬|吐出来/);
  assert.ok((report?.beats ?? []).some((beat) => /灵石|抬|吐出来/.test(beat.detail)));

  const later = advanceWorld(world, 2);
  assert.equal(world.tick, tickBefore + 5);
  assert.equal(later.completedJobs.some((job) => job.actionId === "enter-dungeon:rank-1:aggressive"), false);
  assert.equal(cultivator.activeJobId, null);
});

test("rank-1 forks resolve from posture instead of waiting on a prompt", () => {
  let conservative: ReturnType<typeof rankOneMoralFork> = null;
  let aggressive: ReturnType<typeof rankOneMoralFork> = null;
  for (let i = 0; i < 40 && (!conservative || !aggressive); i += 1) {
    conservative ??= rankOneMoralFork("conservative", `fork-seed-${i}`);
    aggressive ??= rankOneMoralFork("aggressive", `fork-seed-${i}`);
  }
  assert.ok(conservative);
  assert.ok(aggressive);
  assert.equal(conservative?.beat.kind, "person");
  assert.ok((conservative?.moralityDelta ?? 0) > 0);
  assert.ok((conservative?.stoneDelta ?? 0) < 0);
  assert.ok((aggressive?.moralityDelta ?? 0) < 0);
  assert.ok((aggressive?.stoneDelta ?? 0) > 0);
  assert.match(aggressive?.beat.detail ?? "", /袋子/);
});

test("a finished rank-1 run keeps person or find beats an agent can retell", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative");
  for (let guard = 0; cultivator.activeJobId && guard < 80; guard += 1) {
    advanceWorld(world, 1);
  }
  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.equal(report?.outcome, "completed");
  const kinds = new Set((report?.beats ?? []).map((beat) => beat.kind));
  assert.ok(kinds.has("person") || kinds.has("find") || kinds.has("insight"));
});

test("chat-up refuses an immediate repeat and still grants full affinity after the cooldown", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const secondSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-chat-cooldown",
    name: "Lin Shu",
  });
  const second = world.cultivators[secondSummary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";

  const firstChat = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(firstChat.accepted, true);
  const afterFirst = getSocialLink(world, first.id, second.id);
  assert.equal(afterFirst?.affinity, 10);
  assert.equal(listAvailableActions(world, first.id).some((action) => action.actionId === `chat-up:${second.id}`), false);

  assert.throws(
    () => performAction(world, first.id, `chat-up:${second.id}`),
    (error: unknown) => {
      assert.equal((error as { status?: number }).status, 409);
      assert.match(String(error), /再过/);
      return true;
    },
  );
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity, 10);

  advanceWorld(world, 4);
  const secondChat = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(secondChat.accepted, true);
  assert.ok((getSocialLink(world, first.id, second.id)?.affinity ?? 0) >= 20);
  const notes = getCultivatorState(world, first.id).travelogue.notes;
  assert.ok(notes.some((note) => note.kind === "person" && note.detail.includes(second.name)));
});

test("city cultivation writes a travelogue note and can mark a progress threshold", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.realmProgress = 10;
  performAction(world, CULTIVATOR_ID, "cultivate");
  advanceWorld(world, 8);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  assert.ok(state.travelogue.notes.length > 0);
  assert.ok(state.travelogue.mood.length > 0);
  assert.ok(state.travelogue.notes.some((note) => note.kind === "insight" || note.kind === "mood"));
  assert.ok(cultivator.realmProgress > 10);
});
