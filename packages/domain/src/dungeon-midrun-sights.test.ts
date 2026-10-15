import assert from "node:assert/strict";
import test from "node:test";

import { previewBahuangWakes } from "./bahuang-service.js";
import {
  appendDungeonBeats,
  carriedClause,
  createDungeonExpeditionProgress,
  maybeCreateDungeonWakeNode,
  settleDungeonWakeNode,
  withCarriedLine,
} from "./dungeon-expedition-service.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import type { BahuangExpeditionProgress, Cultivator } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function assertChineseProse(text: string): void {
  assert.match(text, /[\u4e00-\u9fff]/);
  assert.equal(/[A-Za-z]/.test(text), false, text);
}

function progressFor(cultivator: Cultivator, jobId: string, policy: "conservative" | "balanced" | "aggressive" = "balanced") {
  return createDungeonExpeditionProgress({
    cultivatorId: cultivator.id,
    jobId,
    locationId: cultivator.locationId,
    grade: "丙",
    targetRank: 1,
    policy,
    startedAtTick: 0,
  });
}

test("mid-run dungeon wakes are Chinese and give three or four choices", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const kinds = new Set<string>();
  for (let i = 0; i < 30; i += 1) {
    const progress = progressFor(cultivator, `job-${i}`, i % 2 === 0 ? "balanced" : "aggressive");
    progress.stepIndex = 6;
    progress.usedWakeScenes = ["moral"];
    const node = maybeCreateDungeonWakeNode({
      progress,
      cultivator,
      actionKind: "search",
      worldTick: i,
      sectName: "苍木谷",
    });
    assert.ok(node);
    kinds.add(node?.sceneKind ?? "");
    assert.ok((node?.options.length ?? 0) >= 3);
    assert.ok((node?.options.length ?? 0) <= 4);
    assertChineseProse(node?.context ?? "");
    for (const option of node?.options ?? []) {
      assertChineseProse(option.label);
      assertChineseProse(option.description);
    }
    assert.ok(node?.options.some((option) => option.optionId === node.defaultOptionId));
  }
  assert.ok(kinds.has("fork"));
  assert.ok(kinds.has("relic"));
  assert.ok(kinds.has("fellow"));
  assert.ok(kinds.has("loot"));
  const fellow = maybeCreateDungeonWakeNode({
    progress: Object.assign(progressFor(cultivator, "fellow-job"), {
      stepIndex: 6,
      usedWakeScenes: ["moral", "fork", "relic", "loot"],
    }),
    cultivator,
    actionKind: "search",
    worldTick: 1,
    sectName: "苍木谷",
  });
  assert.equal(fellow?.sceneKind, "fellow");
  assert.match(fellow?.context ?? "", /苍木谷/);
});

test("the third step is still the wounded traveler, and a run still wakes at most three times", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const moral = maybeCreateDungeonWakeNode({
    progress: Object.assign(progressFor(cultivator, "moral-job", "aggressive"), { stepIndex: 3 }),
    cultivator,
    actionKind: "search",
    worldTick: 1,
  });
  assert.equal(moral?.sceneKind, "moral");
  assert.deepEqual(
    moral?.options.map((option) => option.optionId),
    ["aid-wounded", "share-water", "take-pouch"],
  );

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:balanced" as never);
  let observed = 0;
  let firstContext = "";
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (!progress) continue;
    observed = Math.max(observed, progress.wakeNodesEncountered);
    if (!firstContext && progress.pendingWakeNode) firstContext = progress.pendingWakeNode.context;
  }
  assert.ok(observed <= 3);
  assert.match(firstContext, /水囊|袋子/);
});

test("new wake rewards stay thin, and a sighting lands every few beats", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  const progress = progressFor(cultivator, "loot-job", "aggressive");
  progress.pendingWakeNode = {
    nodeId: "loot",
    sceneKind: "loot",
    context: "石台上有一只袋子。",
    options: [
      { optionId: "yield-loot", label: "让一步", description: "先松开。" },
      { optionId: "seize-loot", label: "先伸手", description: "比对面快半息。" },
    ],
    defaultOptionId: "seize-loot",
    timeoutTicks: 3,
  };
  const seized = settleDungeonWakeNode(progress, "seize-loot");
  assert.equal(seized.stoneDelta, 12);
  assert.equal(seized.moralityDelta, -2);
  assert.match(seized.beat?.detail ?? "", /袋子/);

  const quiet = progressFor(cultivator, "sight-job");
  quiet.nextSightingGap = 2;
  const first = appendDungeonBeats(quiet, [{
    kind: "find",
    title: "石室残材",
    detail: "角落里还有一截温热的灵材。",
    mood: "小有收获",
  }], "sight-job", "丙级地宫第1层");
  assert.equal(first.sighting, null);
  const second = appendDungeonBeats(first.progress, [{
    kind: "close-call",
    title: "夹壁骤合",
    detail: "石壁往中间挤，人是侧身出来的。",
    mood: "后背发凉",
  }], "sight-job", "丙级地宫第1层");
  assert.match(second.sighting?.detail ?? "", /见闻/);
  assert.match(second.sighting?.detail ?? "", /灵材/);
  assert.match(second.sighting?.detail ?? "", /石壁/);
});

test("a carried line is short, reusable, and a finished run can retell a 见闻", () => {
  const line = carriedClause({
    stones: 6,
    items: [{ name: "残阵碎片", count: 2 }],
    seed: "carry",
  });
  assert.equal(line, "带出何物：2份残阵碎片，6枚灵石。");
  const beats = withCarriedLine(["这一场赢了。"], line);
  assert.equal(beats[0], `这一场赢了。${line}`);
  assert.deepEqual(withCarriedLine(beats, line), beats);

  const empty = carriedClause({ stones: 0, items: [], seed: "empty-carry" });
  assert.match(empty, /^带出何物：.+。$/);

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 0;
  cultivator.qi = cultivator.maxQi = 400;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 400;
  performAction(world, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:conservative" as never);
  let sawChineseWake = false;
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const hint = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint;
    if (!hint) continue;
    sawChineseWake = true;
    for (const option of hint.options) assertChineseProse(option.label);
    const actions = listAvailableActions(world, CULTIVATOR_ID);
    const choice = actions.find((action) => String(action.actionId).startsWith("dungeon-wake-decision:"));
    assert.ok(choice);
    assert.match(choice?.label ?? "", /[\u4e00-\u9fff]/);
  }
  assert.equal(sawChineseWake, true);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const notes = state.travelogue.notes.map((note) => `${note.title} ${note.detail}`).join("\n");
  assert.match(notes, /见闻/);
  assert.match(`${state.digest?.summary ?? ""}\n${(state.digest?.growth ?? []).join("\n")}`, /见闻/);
  const wins = (state.dungeonExpedition.lastReport?.combatRounds ?? []).filter((round) => round.outcome === "win");
  assert.ok(wins.length > 0);
  const told = wins.map((round) => round.beats.join("")).join("\n");
  assert.match(told, /带出何物：/);
  assert.match(state.dungeonExpedition.lastReport?.summary ?? "", /带出何物：/);
  assert.match(notes, /带出何物：/);
  assert.match(state.digest?.summary ?? "", /带出何物|见闻/);
});

test("bahuang wakes are Chinese, with three or four choices, and a finished run says what was carried", () => {
  const progress = {
    cultivatorId: CULTIVATOR_ID,
    status: "active",
    depth: 2,
    supplies: { rations: 4, talismans: 1 },
    pressure: 3,
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    encounteredWakeNodes: [],
    pendingWakeNodeIndex: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    rewards: { spiritStones: 0, items: {}, realmProgress: 0 },
  } satisfies BahuangExpeditionProgress;
  const wakes = previewBahuangWakes(progress);
  assert.equal(wakes.length, 4);
  for (const wake of wakes) {
    assert.ok(wake.options.length >= 3);
    assert.ok(wake.options.length <= 4);
    assertChineseProse(wake.context);
    for (const option of wake.options) {
      assertChineseProse(option.label);
      assertChineseProse(option.description);
    }
  }

  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.qi = cultivator.maxQi = 5000;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 5000;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;
  performAction(world, CULTIVATOR_ID, "enter-bahuang:aggressive" as never);
  let safety = 0;
  let sawWake = false;
  while (world.bahuangProgress[CULTIVATOR_ID]?.status === "active" && safety < 30) {
    advanceWorld(world, 1);
    safety += 1;
    const pending = getCultivatorState(world, CULTIVATOR_ID).bahuang?.pendingWakeNode;
    if (!pending) continue;
    sawWake = true;
    assert.ok(pending.options.length >= 3);
    for (const option of pending.options) assertChineseProse(option.label);
  }
  assert.equal(sawWake, true);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const notes = state.travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /见闻|带出何物/);
});
