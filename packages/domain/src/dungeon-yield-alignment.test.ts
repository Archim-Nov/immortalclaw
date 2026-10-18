import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import {
  buildDungeonRankYieldHints,
  createDungeonExpeditionReport,
  estimatedPrimaryYield,
  expeditionPrimaryMaterialId,
  pickExpeditionBreakthroughDrop,
} from "./dungeon-expedition-service.js";
import type {
  DungeonExpeditionPolicy,
  DungeonExpeditionProgress,
  DungeonGrade,
  DungeonRank,
  ItemId,
} from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";
const POLICIES = ["conservative", "balanced", "aggressive"] as const satisfies readonly DungeonExpeditionPolicy[];

function bagCount(inventory: Partial<Record<string, number>>, itemId: string): number {
  return inventory[itemId] ?? 0;
}

test("yield hints and expedition drops read the same table", () => {
  const cases: Array<{ grade: DungeonGrade; band: ItemId; ranks: DungeonRank[] }> = [
    { grade: "甲", band: "golden-spirit-flower", ranks: [1, 4, 7] },
    { grade: "乙", band: "mystic-jade-stone", ranks: [1, 4, 7] },
    { grade: "丙", band: "cloud-heart-grass", ranks: [1, 4, 7] },
  ];
  for (const entry of cases) {
    const hints = buildDungeonRankYieldHints(entry.ranks, entry.band, entry.grade);
    for (const hint of hints) {
      assert.equal(
        hint.primaryMaterial,
        expeditionPrimaryMaterialId(entry.grade, hint.rank, entry.band),
      );
      for (const policy of POLICIES) {
        const range = estimatedPrimaryYield(hint.rank, policy);
        assert.deepEqual(hint.estimatedExpeditionYieldByPolicy[policy], range);
        let soFar = 0;
        const seen: Partial<Record<ItemId, number>> = {};
        for (let step = 0; step < 10; step += 1) {
          const itemId = pickExpeditionBreakthroughDrop({
            band: entry.band,
            grade: entry.grade,
            rank: hint.rank,
            policy,
            stepIndex: step,
            maxSteps: 10,
            primarySoFar: soFar,
            seen,
            runSeed: `align:${entry.grade}:${hint.rank}:${policy}`,
            stepSeed: `align:${entry.grade}:${hint.rank}:${policy}:${step}`,
          });
          if (itemId === hint.primaryMaterial) soFar += 1;
          else seen[itemId] = (seen[itemId] ?? 0) + 1;
        }
        assert.ok(
          soFar >= range.min && soFar <= range.max,
          `${entry.grade} rank ${hint.rank} ${policy} dropped ${soFar}, expected ${range.min}-${range.max}`,
        );
      }
    }
  }
  assert.equal(expeditionPrimaryMaterialId("甲", 1, "golden-spirit-flower"), "golden-spirit-flower");
  assert.equal(expeditionPrimaryMaterialId("甲", 4, "golden-spirit-flower"), "infant-fire-lotus");
  assert.equal(expeditionPrimaryMaterialId("甲", 7, "golden-spirit-flower"), "divine-thought-crystal");
});

test("a finished balanced 甲 rank 1 brings back the promised 金灵花", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.locationId = "yangzhou:dungeon-a";
  cultivator.maxQi = 800;
  cultivator.qi = 800;
  cultivator.maxSpiritualPower = 800;
  cultivator.spiritualPower = 800;
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 9 },
  };
  const before = bagCount(cultivator.inventory, "golden-spirit-flower");
  const gate = getCultivatorState(world, CULTIVATOR_ID);
  const hint = gate.dungeon?.rankYieldHints.find((entry) => entry.rank === 1);
  const card = listAvailableActions(world, CULTIVATOR_ID)
    .find((action) => action.actionId === "enter-dungeon:rank-1:balanced");
  assert.ok(hint);
  assert.equal(hint.primaryMaterial, "golden-spirit-flower");
  assert.equal(hint.primaryMaterialName, "金灵花");
  assert.deepEqual(hint.estimatedExpeditionYieldByPolicy.balanced, estimatedPrimaryYield(1, "balanced"));
  assert.ok(card);
  assert.match(card.description, /3到4份金灵花/);
  assert.match(gate.realmPath.where, /丹霞内府/);
  assert.match(gate.realmPath.where, /金灵花/);
  assert.match(gate.breakthrough?.materialSources.map((source) => source.note).join("") ?? "", /金灵花/);
  assert.match(gate.breakthrough?.materialSources.map((source) => source.note).join("") ?? "", /丹霞内府/);

  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:balanced");
  for (let step = 0; step < 80 && cultivator.activeJobId; step += 1) {
    cultivator.qi = cultivator.maxQi;
    cultivator.spiritualPower = cultivator.maxSpiritualPower;
    cultivator.injuryTicksRemaining = 0;
    advanceWorld(world, 1);
  }

  assert.equal(cultivator.activeJobId, null);
  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.equal(report.outcome, "completed");
  assert.equal(report.stepsResolved, 10);
  const gained = bagCount(cultivator.inventory, "golden-spirit-flower") - before;
  assert.equal(report.primaryMaterial.itemId, "golden-spirit-flower");
  assert.equal(report.primaryMaterial.count, gained);
  assert.ok(gained >= hint.estimatedExpeditionYieldByPolicy.balanced.min, `gained ${gained}`);
  assert.ok(gained <= hint.estimatedExpeditionYieldByPolicy.balanced.max, `gained ${gained}`);
  assert.match(report.summary, new RegExp(`${gained}份金灵花`));

  const seen = new Set<string>();
  for (const beat of report.beats ?? []) {
    const key = `${beat.title}\n${beat.detail}`;
    assert.equal(seen.has(key), false, `${beat.title}：${beat.detail}`);
    seen.add(key);
  }
  const mantra = (report.beats ?? []).filter((beat) => beat.title === "壁上的半句口诀");
  assert.ok(mantra.length <= 1);
});

test("乙 and 丙 finished runs land on the same yield table", () => {
  const runs: Array<{ grade: "乙" | "丙"; level: number; realm: "筑基" | "炼气"; place: string; itemId: ItemId; name: string }> = [
    { grade: "乙", level: 4, realm: "筑基", place: "qingzhou:dungeon-b", itemId: "mystic-jade-stone", name: "玄英石" },
    { grade: "丙", level: 3, realm: "炼气", place: "qingzhou:dungeon-c", itemId: "cloud-heart-grass", name: "云心草" },
  ];
  for (const run of runs) {
    const world = createSeedWorld();
    const cultivator = world.cultivators[CULTIVATOR_ID]!;
    cultivator.realm = run.realm;
    cultivator.realmLevel = run.level;
    cultivator.locationId = run.place;
    cultivator.maxQi = 800;
    cultivator.qi = 800;
    cultivator.maxSpiritualPower = 800;
    cultivator.spiritualPower = 800;
    cultivator.injuryTicksRemaining = 0;
    cultivator.activeJobId = null;
    cultivator.dungeonProgress[run.grade].highestClearedRank = 9;
    const before = bagCount(cultivator.inventory, run.itemId);
    const hint = getCultivatorState(world, CULTIVATOR_ID).dungeon?.rankYieldHints.find((entry) => entry.rank === 1);
    assert.equal(hint?.primaryMaterial, run.itemId);
    assert.deepEqual(hint?.estimatedExpeditionYieldByPolicy.balanced, estimatedPrimaryYield(1, "balanced"));
    const card = listAvailableActions(world, CULTIVATOR_ID)
      .find((action) => action.actionId === "enter-dungeon:rank-1:balanced");
    assert.match(card?.description ?? "", new RegExp(`3到4份${run.name}`));

    performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:balanced");
    for (let step = 0; step < 80 && cultivator.activeJobId; step += 1) {
      cultivator.qi = cultivator.maxQi;
      cultivator.spiritualPower = cultivator.maxSpiritualPower;
      cultivator.injuryTicksRemaining = 0;
      advanceWorld(world, 1);
    }
    const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
    assert.equal(cultivator.activeJobId, null);
    assert.equal(report?.outcome, "completed");
    const gained = bagCount(cultivator.inventory, run.itemId) - before;
    assert.equal(report?.primaryMaterial.count, gained);
    assert.ok(gained >= (hint?.estimatedExpeditionYieldByPolicy.balanced.min ?? 99), `${run.grade} gained ${gained}`);
  }
});

test("a report does not tell two different totals for the same run", () => {
  const progress = {
    cultivatorId: CULTIVATOR_ID,
    jobId: "job-totals",
    locationId: "yangzhou:dungeon-a",
    grade: "甲",
    targetRank: 1,
    policy: "balanced",
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    startedAtTick: 0,
    stepIndex: 10,
    maxSteps: 10,
    nextResolutionTick: 30,
    searchSteps: 8,
    guardianSteps: 2,
    primaryMaterialCount: 3,
    secondaryDrops: { "ruin-fragment": 18, "ward-talisman": 1 },
    spiritStoneGain: 462,
    realmProgressGain: 12,
    unlockedNextRank: true,
    lastResolvedAction: "guardian",
    flavorEventTitles: [],
    wakeNodesEncountered: 0,
    maxWakeNodes: 3,
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    carriedLine: "带出何物：镇煞符，2份残碑碎片，186枚灵石。",
    beats: [{
      kind: "find",
      title: "守关",
      detail: "这一场赢了。带出何物：镇煞符，2份残碑碎片，186枚灵石。",
      mood: "赢了",
    }],
    combatRounds: [{
      enemyName: "丹霞守关",
      outcome: "win",
      rounds: 4,
      party: [],
      beats: ["这一场赢了。带出何物：镇煞符，2份残碑碎片，186枚灵石。"],
      highlights: [],
    }],
  } satisfies DungeonExpeditionProgress;
  const report = createDungeonExpeditionReport({
    progress,
    outcome: "completed",
    endedAtTick: 30,
    returnLocationId: "yangzhou:main-city",
    returnPlaceName: "广津城",
    primaryMaterial: "golden-spirit-flower",
  });
  assert.match(report.summary, /3份金灵花/);
  assert.match(report.summary, /18份残碑碎片/);
  assert.match(report.summary, /灵石462枚/);
  assert.match(report.summary, /最近一场胜仗当场带出何物：镇煞符，2份残碑碎片，186枚灵石。这一笔已经算进上面的总数。/);
  assert.equal((report.summary.match(/带出何物：/g) ?? []).length, 1);
  assert.equal((report.summary.match(/186枚灵石/g) ?? []).length, 1);
  assert.equal((report.summary.match(/2份残碑碎片/g) ?? []).length, 1);
  const opening = report.summary.split("最近一场")[0] ?? "";
  assert.equal(opening.includes("186"), false);
  assert.equal(opening.includes("2份残碑碎片"), false);
});
