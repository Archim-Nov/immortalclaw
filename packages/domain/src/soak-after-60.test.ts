import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { actionFailureBody } from "./gameplay-error.js";
import { createExplorationSceneRows } from "./events/content/scene-choices.js";
import { jiaDungeonSideEvents } from "./events/content/jia-scene-choices.js";
import { createDungeonExpeditionReport } from "./dungeon-expedition-service.js";
import type { DungeonExpeditionProgress } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function bagCount(inventory: Partial<Record<string, number>>, itemId: string): number {
  return inventory[itemId] ?? 0;
}

test("a jia withdraw report names the items that actually entered the bag", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  cultivator.dungeonProgress["甲"].highestClearedRank = 1;
  const before = { ...cultivator.inventory };
  const flowerBefore = bagCount(before, "golden-spirit-flower");
  const dewBefore = bagCount(before, "core-nourish-dew");

  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);
  for (let step = 0; step < 40 && cultivator.activeJobId; step += 1) {
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (progress && progress.stepIndex >= 1) {
      cultivator.qi = Math.max(Math.floor(cultivator.maxQi * 0.45), 2);
      cultivator.spiritualPower = cultivator.maxSpiritualPower;
      cultivator.injuryTicksRemaining = 0;
    }
    advanceWorld(world, 1);
  }

  assert.equal(cultivator.activeJobId, null);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const report = state.dungeonExpedition.lastReport;
  assert.ok(report);
  assert.ok(report.outcome === "withdrew" || report.outcome === "completed");

  const reported = new Map<string, number>();
  if (report.primaryMaterial.count > 0) {
    reported.set(report.primaryMaterial.itemId, report.primaryMaterial.count);
  }
  for (const [itemId, count] of Object.entries(report.secondaryDrops)) {
    if (!count || count <= 0) continue;
    reported.set(itemId, (reported.get(itemId) ?? 0) + count);
  }

  const gained = new Map<string, number>();
  const itemIds = new Set<string>([
    ...Object.keys(before),
    ...Object.keys(cultivator.inventory),
    ...reported.keys(),
  ]);
  for (const itemId of itemIds) {
    const delta = bagCount(cultivator.inventory, itemId) - bagCount(before, itemId);
    if (delta > 0) gained.set(itemId, delta);
  }
  assert.deepEqual(Object.fromEntries(reported), Object.fromEntries(gained));

  const flowerDelta = bagCount(cultivator.inventory, "golden-spirit-flower") - flowerBefore;
  const dewDelta = bagCount(cultivator.inventory, "core-nourish-dew") - dewBefore;
  assert.equal(report.primaryMaterial.itemId, "golden-spirit-flower");
  assert.equal(report.primaryMaterial.count, flowerDelta);
  const dewCard = report.secondaryDropCards?.find((card) => card.itemId === "core-nourish-dew");
  assert.equal(dewCard?.count ?? 0, dewDelta);
  assert.ok(dewDelta >= 1, "a jia withdraw should put the closing 丹霞露 in the bag");
  if (flowerDelta === 0) {
    assert.equal(report.summary.includes("金灵花"), false);
  } else {
    assert.match(report.summary, new RegExp(`${flowerDelta}份金灵花`));
  }
  assert.match(report.summary, new RegExp(`${dewDelta}份丹霞露`));
  const detail = state.inventoryDetails.find((entry) => entry.id === "golden-spirit-flower");
  assert.equal(detail?.count ?? 0, flowerDelta);
});

test("a zero primary count does not claim the band item was carried out", () => {
  const progress = {
    cultivatorId: CULTIVATOR_ID,
    jobId: "job-empty-flower",
    locationId: "qingzhou:dungeon-a",
    grade: "甲",
    targetRank: 1,
    policy: "balanced",
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    startedAtTick: 0,
    stepIndex: 5,
    maxSteps: 10,
    nextResolutionTick: 15,
    searchSteps: 5,
    guardianSteps: 0,
    primaryMaterialCount: 0,
    secondaryDrops: { "core-nourish-dew": 5, "ruin-fragment": 13 },
    spiritStoneGain: 46,
    realmProgressGain: 0,
    unlockedNextRank: false,
    lastResolvedAction: "search",
    flavorEventTitles: [],
    wakeNodesEncountered: 0,
    maxWakeNodes: 3,
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
  } satisfies DungeonExpeditionProgress;
  const report = createDungeonExpeditionReport({
    progress,
    outcome: "withdrew",
    endedAtTick: 16,
    returnLocationId: "qingzhou:main-city",
    returnPlaceName: "青岚城",
    primaryMaterial: "golden-spirit-flower",
    realmProgressCapped: true,
  });
  assert.equal(report.primaryMaterial.count, 0);
  assert.equal(report.summary.includes("金灵花"), false);
  assert.match(report.summary, /5份丹霞露/);
  assert.match(report.summary, /13份残碑碎片/);
});

test("jia side scenes stay inside the danxia pool", () => {
  const scenes = jiaDungeonSideEvents();
  assert.ok(scenes.length >= 6);
  const mortal = /染匠|当票|药担|书吏|渡口|掌柜|猎户|你好叶子/;
  const interior = /丹霞|火毒|阵纹|丹炉|灵火/;
  for (const scene of scenes) {
    const prompt = scene.sceneChoice?.prompt ?? "";
    assert.ok((scene.sceneChoice?.options.length ?? 0) >= 3);
    assert.doesNotMatch(`${scene.nameCn} ${scene.description} ${prompt}`, mortal);
    assert.match(`${scene.nameCn} ${scene.description} ${prompt}`, interior);
  }

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:balanced" as never);

  let description = "";
  for (let step = 0; step < 16 && !description; step += 1) {
    advanceWorld(world, 1);
    const side = listAvailableActions(world, CULTIVATOR_ID)
      .filter((action) => String(action.actionId).startsWith("choose-event:"));
    if (side[0]) description = side[0].description;
  }
  assert.ok(description, "expected a jia side choice during the run");
  assert.match(description, /地宫里岔开一件闲事/);
  assert.match(description, interior);
  assert.doesNotMatch(description, mortal);
  assert.ok(scenes.some((scene) => scene.sceneChoice && description.includes(scene.sceneChoice.prompt)));
});

test("the spilled herb prompt says 药叶子", () => {
  const herb = createExplorationSceneRows().find((row) => row.id === "g-sc-07");
  assert.ok(herb?.sceneChoice);
  assert.match(herb.sceneChoice.prompt, /药叶子和担子都看得见/);
  assert.equal(herb.sceneChoice.prompt.includes("你好叶子"), false);
});

test("unread notes from the same person get distinct Chinese labels", () => {
  const world = createSeedWorld();
  const hero = world.cultivators[CULTIVATOR_ID]!;
  hero.locationId = "qingzhou:main-city";
  hero.qi = hero.maxQi;
  hero.activeJobId = null;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-qingluo", name: "青萝" });
  const sender = world.cultivators[summary.selectedCultivatorId]!;
  sender.locationId = "qingzhou:main-city";
  sender.qi = sender.maxQi;
  sender.activeJobId = null;

  performAction(world, sender.id, `leave-note:${hero.id}`, "城门口等我。");
  const single = listAvailableActions(world, hero.id).filter((action) => action.actionId.startsWith("read-note:"));
  assert.equal(single.length, 1);
  assert.equal(single[0]?.label, "看字条：青萝");

  advanceWorld(world, 3);
  performAction(world, sender.id, `leave-note:${hero.id}`, "丹炉边的灰先别碰。");
  const actions = listAvailableActions(world, hero.id);
  const reads = actions.filter((action) => action.actionId.startsWith("read-note:"));
  const replies = actions.filter((action) => action.actionId.startsWith("reply-note:"));
  assert.equal(reads.length, 2);
  assert.equal(replies.length, 2);
  assert.notEqual(reads[0]?.label, reads[1]?.label);
  assert.notEqual(replies[0]?.label, replies[1]?.label);
  const readLabels = reads.map((action) => action.label).join("\n");
  const replyLabels = replies.map((action) => action.label).join("\n");
  assert.match(readLabels, /看字条：青萝/);
  assert.match(replyLabels, /回字条：青萝/);
  assert.match(readLabels, /城门口/);
  assert.match(readLabels, /丹炉边/);
  assert.match(replyLabels, /城门口/);
  assert.match(replyLabels, /丹炉边/);
  assert.equal(/[A-Za-z]/.test(`${readLabels}\n${replyLabels}`), false);
});

test("a rejected act keeps a readable Chinese summary", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const home = cultivator.residences[0];
  assert.ok(home);
  cultivator.locationId = home.locationId;
  cultivator.spiritStones = 0;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  assert.throws(
    () => performAction(world, cultivator.id, "place-fixture:putuan" as never),
    (error: unknown) => {
      const body = actionFailureBody(error);
      assert.equal(body.summary, body.error);
      assert.match(body.summary, /灵石不够/);
      assert.match(body.summary, /蒲团/);
      assert.match(body.summary, /[\u4e00-\u9fff]/);
      return true;
    },
  );
});
