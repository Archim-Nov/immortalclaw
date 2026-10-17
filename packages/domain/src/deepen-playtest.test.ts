import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { realmStageForLevel } from "./realms.js";
import type { ActionId, TimedActionId } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

test("enter-dungeon rank-1 conservative finishes, clears busy, and leaves a readable report", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  const tickBefore = world.tick;

  const started = performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as ActionId);
  assert.equal(started.accepted, true);
  assert.equal(started.job?.totalTicks, 30);
  assert.equal(cultivator.activeJobId, started.job?.id ?? null);

  let sawComplete = false;
  for (let guard = 0; cultivator.activeJobId && guard < 80; guard += 1) {
    const step = advanceWorld(world, 1);
    if (step.completedJobs.some((job) => job.actionId === "enter-dungeon:rank-1:conservative")) sawComplete = true;
  }
  assert.ok(world.tick > tickBefore);
  assert.equal(cultivator.activeJobId, null);
  assert.equal(world.jobs[started.job!.id], undefined);
  assert.equal(cultivator.locationId, "qingzhou:main-city");
  assert.equal(sawComplete, true);

  const state = getCultivatorState(world, CULTIVATOR_ID);
  const report = state.dungeonExpedition.lastReport;
  assert.ok(report);
  assert.equal(report?.outcome, "completed");
  assert.ok((report?.beats?.length ?? 0) > 0);
  assert.ok((report?.qiSpent ?? 0) > 0);
  assert.ok((report?.realmProgressGain ?? 0) > 0);
  assert.match(report?.summary ?? "", /地宫/);
  assert.ok(state.travelogue.notes.length > 0);
  assert.ok(state.travelogue.mood.length > 0);
  assert.equal(state.cultivator.status, "idle");
});

test("a job the engine cannot resolve does not freeze the world tick", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const tickBefore = world.tick;
  world.jobs["job-bad"] = {
    id: "job-bad",
    cultivatorId: CULTIVATOR_ID,
    actionId: "not-a-real-action" as TimedActionId,
    label: "bad",
    remainingTicks: 1,
    totalTicks: 1,
  };
  cultivator.activeJobId = "job-bad";

  const summary = advanceWorld(world, 2);
  assert.equal(world.tick, tickBefore + 2);
  assert.equal(cultivator.activeJobId, null);
  assert.equal(world.jobs["job-bad"], undefined);
  assert.ok(summary.completedJobs.some((job) => String(job.actionId) === "not-a-real-action"));
  assert.match(summary.completedJobs[0]?.summary ?? "", /提前结束|Unsupported/);
});

test("a missing job does not leave the cultivator busy", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.activeJobId = "job-that-is-gone";

  const actions = listAvailableActions(world, CULTIVATOR_ID);
  assert.equal(cultivator.activeJobId, null);
  assert.ok(actions.length > 1);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).cultivator.status === "busy", false);
});

test("commissions the cultivator cannot fulfill are not offered, and calling one explains why", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.inventory["beast-core"] = 0;
  world.commissions["comm-bounty"] = {
    id: "comm-bounty",
    posterId: "someone-else",
    locationId: cultivator.locationId,
    type: "gather",
    targetItemId: "beast-core",
    targetCount: 1,
    rewardSpiritStones: 40,
    acceptedById: null,
    createdAtTick: world.tick,
    completedAtTick: null,
  };

  const actions = listAvailableActions(world, CULTIVATOR_ID);
  assert.equal(actions.some((action) => action.actionId === "accept-commission:comm-bounty"), false);

  assert.throws(
    () => performAction(world, CULTIVATOR_ID, "accept-commission:comm-bounty" as ActionId),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { status?: number }).status, 409);
      assert.match(error.message, /beast-core/);
      return true;
    },
  );
});

test("the same residence recipe cannot be queued twice", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.inventory["spirit-ore"] = 4;
  cultivator.spiritStones = 500;

  const first = performAction(world, CULTIVATOR_ID, "queue-production:recipe-qi-pill" as ActionId);
  assert.equal(first.accepted, true);

  assert.throws(
    () => performAction(world, CULTIVATOR_ID, "queue-production:recipe-qi-pill" as ActionId),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as { status?: number }).status, 409);
      assert.match(error.message, /已经在排队/);
      return true;
    },
  );
});

test("mid qi condensation gains progress in the city, and repeating the errand pays less", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = "炼气";
  cultivator.realmLevel = 2;
  cultivator.realmProgress = 0;
  cultivator.locationId = "qingzhou:main-city";

  performAction(world, CULTIVATOR_ID, "take-mortal-task");
  advanceWorld(world, 2);
  const firstGain = cultivator.realmProgress;
  assert.ok(firstGain > 0);

  const before = cultivator.realmProgress;
  performAction(world, CULTIVATOR_ID, "take-mortal-task");
  advanceWorld(world, 2);
  performAction(world, CULTIVATOR_ID, "take-mortal-task");
  advanceWorld(world, 2);
  performAction(world, CULTIVATOR_ID, "take-mortal-task");
  advanceWorld(world, 2);
  const laterGain = cultivator.realmProgress - before;
  assert.ok(laterGain > 0);
  assert.ok(laterGain < firstGain * 3);
  assert.match(getCultivatorState(world, CULTIVATOR_ID).travelogue.notes.map((note) => note.detail).join("\n"), /收益开始变淡|跑腿/);
});

test("realm ladder keeps levels 1-9 and opens 元婴 through 大乘 above them", () => {
  assert.equal(realmStageForLevel(2), "炼气");
  assert.equal(realmStageForLevel(9), "金丹");
  assert.equal(realmStageForLevel(10), "元婴");
  assert.equal(realmStageForLevel(13), "化神");
  assert.equal(realmStageForLevel(16), "炼虚");
  assert.equal(realmStageForLevel(19), "合体");
  assert.equal(realmStageForLevel(22), "大乘");
  assert.equal(realmStageForLevel(24), "大乘");

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realmLevel = 9;
  cultivator.realm = "金丹";
  cultivator.realmProgress = 100;
  const nascent = getCultivatorState(world, CULTIVATOR_ID).breakthrough;
  assert.equal(nascent?.targetLevel, 10);
  assert.equal(nascent?.targetRealm, "元婴");
  assert.equal(nascent?.marketBuyable, false);

  cultivator.realmLevel = 15;
  cultivator.realm = "化神";
  const voidStep = getCultivatorState(world, CULTIVATOR_ID).breakthrough;
  assert.equal(voidStep?.targetLevel, 16);
  assert.equal(voidStep?.targetRealm, "炼虚");
  assert.equal(voidStep?.method, "void-altar");
  assert.equal(voidStep?.methodName, "炼虚台");

  cultivator.realmLevel = 24;
  cultivator.realm = "大乘";
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).breakthrough, null);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).cultivator.realm, "大乘");
});
