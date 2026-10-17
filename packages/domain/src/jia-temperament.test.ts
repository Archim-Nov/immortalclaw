import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { jiaDungeonSideEvents } from "./events/content/jia-scene-choices.js";
import {
  jiaClosingDrop,
  jiaTemperamentForRank,
  jiaTemperamentItemId,
} from "./jia-temperament.js";
import type { Cultivator, DungeonExpeditionReport, ItemId } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function bagCount(inventory: Partial<Record<string, number>>, itemId: string): number {
  return inventory[itemId] ?? 0;
}

function setRealm(cultivator: Cultivator, level: number): void {
  cultivator.realmLevel = level;
  cultivator.realm = level >= 13 ? "化神" : level >= 10 ? "元婴" : level >= 7 ? "金丹" : level >= 4 ? "筑基" : "炼气";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
}

function reportedCounts(report: DungeonExpeditionReport): Map<string, number> {
  const reported = new Map<string, number>();
  if (report.primaryMaterial.count > 0) {
    reported.set(report.primaryMaterial.itemId, report.primaryMaterial.count);
  }
  for (const [itemId, count] of Object.entries(report.secondaryDrops)) {
    if (!count || count <= 0) continue;
    reported.set(itemId, (reported.get(itemId) ?? 0) + count);
  }
  return reported;
}

function gainedCounts(
  before: Partial<Record<string, number>>,
  after: Partial<Record<string, number>>,
): Map<string, number> {
  const gained = new Map<string, number>();
  const itemIds = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  for (const itemId of itemIds) {
    const delta = bagCount(after, itemId) - bagCount(before, itemId);
    if (delta > 0) gained.set(itemId, delta);
  }
  return gained;
}

function assertReportMatchesBag(
  before: Partial<Record<string, number>>,
  cultivator: Cultivator,
  report: DungeonExpeditionReport,
): void {
  assert.deepEqual(
    Object.fromEntries(reportedCounts(report)),
    Object.fromEntries(gainedCounts(before, cultivator.inventory)),
  );
}

function enterJia(rank: number, level: number, posture: "conservative" | "balanced" | "aggressive" = "conservative") {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  setRealm(cultivator, level);
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 9 },
  };
  const before = { ...cultivator.inventory };
  performAction(world, CULTIVATOR_ID, `enter-dungeon:rank-${rank}:${posture}` as never);
  return { world, cultivator, before };
}

function withdrawRun(rank: number, level = 7) {
  const run = enterJia(rank, level, "conservative");
  for (let step = 0; step < 50 && run.cultivator.activeJobId; step += 1) {
    const progress = run.world.dungeonExpeditions[CULTIVATOR_ID];
    if (progress && progress.stepIndex >= 1) {
      run.cultivator.qi = Math.max(Math.floor(run.cultivator.maxQi * 0.3), 2);
      run.cultivator.spiritualPower = run.cultivator.maxSpiritualPower;
      run.cultivator.injuryTicksRemaining = 0;
    }
    advanceWorld(run.world, 1);
  }
  assert.equal(run.cultivator.activeJobId, null);
  const report = getCultivatorState(run.world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.equal(report.outcome, "withdrew");
  return { ...run, report };
}

function clearRun(rank: number, level: number) {
  const run = enterJia(rank, level, "balanced");
  const progress = run.world.dungeonExpeditions[CULTIVATOR_ID];
  assert.ok(progress);
  progress.stepIndex = 9;
  progress.nextResolutionTick = run.world.tick;
  const job = run.world.jobs[run.cultivator.activeJobId!]!;
  job.remainingTicks = 8;
  run.cultivator.qi = run.cultivator.maxQi;
  run.cultivator.spiritualPower = run.cultivator.maxSpiritualPower;
  run.cultivator.injuryTicksRemaining = 0;
  advanceWorld(run.world, 1);
  assert.equal(run.cultivator.activeJobId, null);
  const report = getCultivatorState(run.world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.equal(report.outcome, "completed");
  return { ...run, report };
}

test("甲级气质按层数分池，走完比撤出多，高层再多", () => {
  assert.equal(jiaTemperamentForRank(1), "danxia");
  assert.equal(jiaTemperamentForRank(2), "fire-poison");
  assert.equal(jiaTemperamentForRank(3), "array");
  assert.equal(jiaTemperamentForRank(4), "danxia");
  assert.equal(jiaTemperamentItemId(5), "fire-poison-bead");
  assert.equal(jiaTemperamentItemId(6), "array-shard");
  assert.equal(jiaTemperamentItemId(7), "danxia-cinder");

  const withdrew = jiaClosingDrop({ rank: 1, outcome: "withdrew" });
  const cleared = jiaClosingDrop({ rank: 1, outcome: "completed" });
  const mid = jiaClosingDrop({ rank: 4, outcome: "completed" });
  const high = jiaClosingDrop({ rank: 7, outcome: "completed" });
  assert.equal(withdrew.itemId, "danxia-cinder");
  assert.equal(withdrew.count, 1);
  assert.equal(cleared.count, 2);
  assert.ok(cleared.count > withdrew.count);
  assert.equal(mid.count, 3);
  assert.equal(high.count, 4);
  assert.equal(mid.place, "婴火莲池");
  assert.equal(high.place, "神纹天隙");

  const extra = jiaClosingDrop({ rank: 1, outcome: "withdrew", haul: "extra" });
  const spare = jiaClosingDrop({ rank: 1, outcome: "withdrew", haul: "spare" });
  const swapped = jiaClosingDrop({ rank: 1, outcome: "withdrew", haul: "swap" });
  assert.equal(extra.count, 2);
  assert.equal(spare.count, 0);
  assert.equal(swapped.itemId, "fire-poison-bead");
  assert.equal(swapped.count, 1);
});

test("甲级一层、二层、三层撤出的旁支各不相同，并且和袋子一致", () => {
  const expected = ["danxia-cinder", "fire-poison-bead", "array-shard"] as const;
  for (const [index, itemId] of expected.entries()) {
    const rank = index + 1;
    const run = withdrawRun(rank);
    const drop = jiaClosingDrop({ rank, outcome: "withdrew" });
    assert.equal(drop.itemId, itemId);
    const delta = bagCount(run.cultivator.inventory, itemId) - bagCount(run.before, itemId);
    assert.equal(delta, drop.count);
    assert.equal(run.report.secondaryDrops[itemId], drop.count);
    const card = run.report.secondaryDropCards?.find((entry) => entry.itemId === itemId);
    assert.equal(card?.itemName, drop.name);
    assert.equal(card?.count, drop.count);
    assert.match(run.report.summary, new RegExp(`${drop.count}份${drop.name}`));
    assert.match(run.report.summary, /中途撤出/);
    assert.match(run.report.summary, /丹霞内府/);
    for (const other of expected) {
      if (other === itemId) continue;
      assert.equal(bagCount(run.cultivator.inventory, other) - bagCount(run.before, other), 0);
    }
    assertReportMatchesBag(run.before, run.cultivator, run.report);
    const notes = (run.cultivator.travelNotes ?? []).map((note) => note.detail).join("");
    assert.match(notes, new RegExp(`${drop.count}份${drop.name}`));
    if (rank === 1) {
      const flowerDelta = bagCount(run.cultivator.inventory, "golden-spirit-flower") - bagCount(run.before, "golden-spirit-flower");
      const dewDelta = bagCount(run.cultivator.inventory, "core-nourish-dew") - bagCount(run.before, "core-nourish-dew");
      assert.equal(run.report.primaryMaterial.itemId, "golden-spirit-flower");
      assert.equal(run.report.primaryMaterial.count, flowerDelta);
      assert.ok(dewDelta >= 1);
      assert.equal(run.report.secondaryDrops["core-nourish-dew"], dewDelta);
      assert.match(run.report.summary, new RegExp(`${dewDelta}份丹霞露`));
      if (flowerDelta === 0) assert.equal(run.report.summary.includes("金灵花"), false);
    }
  }
});

test("走完比中途撤出带得更多，高层的句子和份数也不同", () => {
  const lowWithdraw = withdrawRun(1);
  const lowClear = clearRun(1, 7);
  const midClear = clearRun(4, 9);
  const highClear = clearRun(7, 12);
  const lowItem = "danxia-cinder" as ItemId;
  const withdrawCount = bagCount(lowWithdraw.cultivator.inventory, lowItem) - bagCount(lowWithdraw.before, lowItem);
  const clearCount = bagCount(lowClear.cultivator.inventory, lowItem) - bagCount(lowClear.before, lowItem);
  const midCount = bagCount(midClear.cultivator.inventory, lowItem) - bagCount(midClear.before, lowItem);
  const highCount = bagCount(highClear.cultivator.inventory, lowItem) - bagCount(highClear.before, lowItem);
  assert.equal(withdrawCount, 1);
  assert.equal(clearCount, 2);
  assert.equal(midCount, 3);
  assert.equal(highCount, 4);
  assert.match(lowClear.report.summary, /这一层走完了/);
  assert.match(lowClear.report.summary, /旁支更满/);
  assert.match(lowClear.report.summary, /2份丹霞余砂/);
  assert.match(midClear.report.summary, /婴火莲池/);
  assert.match(midClear.report.summary, /3份丹霞余砂/);
  assert.match(highClear.report.summary, /神纹天隙/);
  assert.match(highClear.report.summary, /4份丹霞余砂/);
  assert.match(lowWithdraw.report.summary, /旁支少一截/);
  for (const run of [lowClear, midClear, highClear]) {
    assertReportMatchesBag(run.before, run.cultivator, run.report);
  }
});

test("甲级中途的险、帮、走会改带出", () => {
  const risk = enterJia(1, 7, "balanced");
  let riskChosen = false;
  for (let step = 0; step < 40 && risk.cultivator.activeJobId; step += 1) {
    const actions = listAvailableActions(risk.world, CULTIVATOR_ID);
    if (!riskChosen && actions.some((action) => action.actionId === "choose-event:risk")) {
      const result = performAction(risk.world, CULTIVATOR_ID, "choose-event:risk" as never);
      assert.match(result.summary, /多带一份丹霞余砂/);
      riskChosen = true;
    }
    const progress = risk.world.dungeonExpeditions[CULTIVATOR_ID];
    if (riskChosen && progress && progress.stepIndex >= 1) {
      risk.cultivator.qi = Math.max(Math.floor(risk.cultivator.maxQi * 0.3), 2);
      risk.cultivator.injuryTicksRemaining = 0;
    }
    advanceWorld(risk.world, 1);
  }
  assert.equal(riskChosen, true);
  const riskReport = getCultivatorState(risk.world, CULTIVATOR_ID).dungeonExpedition.lastReport!;
  assert.equal(riskReport.outcome, "withdrew");
  assert.equal(bagCount(risk.cultivator.inventory, "danxia-cinder") - bagCount(risk.before, "danxia-cinder"), 2);
  assert.equal(riskReport.secondaryDrops["danxia-cinder"], 2);
  assert.match(riskReport.summary, /多留了一份/);
  assertReportMatchesBag(risk.before, risk.cultivator, riskReport);

  const help = enterJia(1, 7, "balanced");
  let helpChosen = false;
  for (let step = 0; step < 40 && help.cultivator.activeJobId; step += 1) {
    const actions = listAvailableActions(help.world, CULTIVATOR_ID);
    if (!helpChosen && actions.some((action) => action.actionId === "choose-event:help")) {
      const result = performAction(help.world, CULTIVATOR_ID, "choose-event:help" as never);
      assert.match(result.summary, /旁支换成火毒凝滴/);
      helpChosen = true;
    }
    const progress = help.world.dungeonExpeditions[CULTIVATOR_ID];
    if (helpChosen && progress && progress.stepIndex >= 1) {
      help.cultivator.qi = Math.max(Math.floor(help.cultivator.maxQi * 0.3), 2);
      help.cultivator.injuryTicksRemaining = 0;
    }
    advanceWorld(help.world, 1);
  }
  assert.equal(helpChosen, true);
  const helpReport = getCultivatorState(help.world, CULTIVATOR_ID).dungeonExpedition.lastReport!;
  assert.equal(bagCount(help.cultivator.inventory, "fire-poison-bead") - bagCount(help.before, "fire-poison-bead"), 1);
  assert.equal(bagCount(help.cultivator.inventory, "danxia-cinder") - bagCount(help.before, "danxia-cinder"), 0);
  assert.match(helpReport.summary, /换了旁支/);
  assert.match(helpReport.summary, /1份火毒凝滴/);
  assertReportMatchesBag(help.before, help.cultivator, helpReport);

  const walk = enterJia(1, 7, "balanced");
  let walkChosen = false;
  for (let step = 0; step < 40 && walk.cultivator.activeJobId; step += 1) {
    const actions = listAvailableActions(walk.world, CULTIVATOR_ID);
    if (!walkChosen && actions.some((action) => action.actionId === "choose-event:walk")) {
      walk.cultivator.injuryTicksRemaining = 3;
      const result = performAction(walk.world, CULTIVATOR_ID, "choose-event:walk" as never);
      assert.equal(walk.cultivator.injuryTicksRemaining, 1);
      assert.match(result.summary, /少带一份丹霞余砂/);
      assert.match(result.summary, /伤按下去两刻/);
      walkChosen = true;
    }
    const progress = walk.world.dungeonExpeditions[CULTIVATOR_ID];
    if (walkChosen && progress && progress.stepIndex >= 1) {
      walk.cultivator.qi = Math.max(Math.floor(walk.cultivator.maxQi * 0.3), 2);
    }
    advanceWorld(walk.world, 1);
  }
  assert.equal(walkChosen, true);
  const walkReport = getCultivatorState(walk.world, CULTIVATOR_ID).dungeonExpedition.lastReport!;
  assert.equal(walkReport.outcome, "withdrew");
  assert.equal(bagCount(walk.cultivator.inventory, "danxia-cinder") - bagCount(walk.before, "danxia-cinder"), 0);
  assert.match(walkReport.summary, /少带了一份/);
  assert.equal(walkReport.summary.includes("份丹霞余砂"), false);
  assertReportMatchesBag(walk.before, walk.cultivator, walkReport);
});

test("甲级中途只抽这一层的气质池，乙级撤出不带这三件", () => {
  const fire = jiaDungeonSideEvents("fire-poison").map((scene) => scene.id).sort();
  assert.deepEqual(fire, ["jia-sc-02", "jia-sc-07"]);
  assert.equal(jiaDungeonSideEvents().length, 8);
  assert.equal(jiaDungeonSideEvents("danxia").length, 3);
  assert.equal(jiaDungeonSideEvents("array").length, 3);

  const run = enterJia(2, 7, "balanced");
  const prompts = jiaDungeonSideEvents("fire-poison").map((scene) => scene.sceneChoice?.prompt ?? "");
  let description = "";
  for (let step = 0; step < 24 && !description; step += 1) {
    advanceWorld(run.world, 1);
    const side = listAvailableActions(run.world, CULTIVATOR_ID)
      .find((action) => String(action.actionId).startsWith("choose-event:"));
    if (side) description = side.description;
  }
  assert.ok(description);
  assert.match(description, /地宫里岔开一件闲事/);
  assert.ok(prompts.some((prompt) => description.includes(prompt)));

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  setRealm(cultivator, 4);
  cultivator.locationId = "qingzhou:dungeon-b";
  cultivator.dungeonProgress["乙"].highestClearedRank = 9;
  const before = { ...cultivator.inventory };
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);
  for (let step = 0; step < 40 && cultivator.activeJobId; step += 1) {
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (progress && progress.stepIndex >= 1) {
      cultivator.qi = Math.max(Math.floor(cultivator.maxQi * 0.3), 2);
      cultivator.injuryTicksRemaining = 0;
    }
    advanceWorld(world, 1);
  }
  assert.equal(cultivator.activeJobId, null);
  for (const itemId of ["danxia-cinder", "fire-poison-bead", "array-shard"] as const) {
    assert.equal(bagCount(cultivator.inventory, itemId) - bagCount(before, itemId), 0);
  }
  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport!;
  assert.equal(report.grade, "乙");
  assert.equal(report.summary.includes("丹霞余砂"), false);
  assert.equal(report.summary.includes("火毒凝滴"), false);
  assert.equal(report.summary.includes("阵纹残片"), false);
});

test("甲级门口的收获提示写着这一层的气质物", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  setRealm(cultivator, 12);
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress["甲"].highestClearedRank = 9;
  const hints = getCultivatorState(world, CULTIVATOR_ID).dungeon?.rankYieldHints ?? [];
  const card = (rank: number, itemId: string) => {
    const hint = hints.find((entry) => entry.rank === rank);
    assert.equal(hint?.notableSecondaryDrops.includes(itemId as ItemId), true);
    const name = hint?.notableSecondaryDropCards?.find((entry) => entry.itemId === itemId)?.itemName ?? "";
    assert.ok(name.length > 0);
  };
  card(1, "danxia-cinder");
  card(2, "fire-poison-bead");
  card(3, "array-shard");
  card(4, "danxia-cinder");
  card(7, "danxia-cinder");

  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  cultivator.locationId = "qingzhou:dungeon-b";
  const yi = getCultivatorState(world, CULTIVATOR_ID).dungeon?.rankYieldHints.find((entry) => entry.rank === 1);
  assert.equal(yi?.notableSecondaryDrops.includes("danxia-cinder"), false);
  assert.equal(yi?.notableSecondaryDrops.includes("fire-poison-bead"), false);
  assert.equal(yi?.notableSecondaryDrops.includes("array-shard"), false);
});
