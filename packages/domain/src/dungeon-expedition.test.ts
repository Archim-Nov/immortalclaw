import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { createDungeonExpeditionReport } from "./dungeon-expedition-service.js";
import type { DungeonExpeditionProgress } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function expeditionActionId(rank: number, policy: "conservative" | "balanced" | "aggressive") {
  return `start-dungeon-expedition:rank-${rank}:${policy}`;
}

test("dungeon actions expose managed expeditions and rank yield hints to agents", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";

  const actions = listAvailableActions(world, CULTIVATOR_ID);
  const state = getCultivatorState(world, CULTIVATOR_ID) as typeof getCultivatorState extends (...args: never[]) => infer T ? T : never;
  const dungeonState = (state as { dungeon?: { rankYieldHints?: Array<{
    rank: number;
    primaryMaterial: string;
    estimatedExpeditionYieldByPolicy: Record<string, { min: number; max: number }>;
    notableSecondaryDrops: string[];
  }> } | null }).dungeon;

  assert.ok(actions.some((action) => action.actionId === expeditionActionId(1, "conservative")));
  assert.ok(actions.some((action) => action.actionId === expeditionActionId(1, "balanced")));
  assert.ok(actions.some((action) => action.actionId === expeditionActionId(1, "aggressive")));
  assert.equal(actions.some((action) => String(action.actionId).startsWith("search-fortune:rank-")), false);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("challenge-guardian:rank-")), false);

  const balancedAction = actions.find((action) => action.actionId === expeditionActionId(1, "balanced"));
  assert.ok(balancedAction);
  assert.match(balancedAction.label, /地宫远征/);
  assert.match(balancedAction.label, /均衡/);
  assert.match(balancedAction.description, /云心草/);
  assert.equal(/[a-z]+-[a-z0-9-]+/i.test(`${balancedAction.label} ${balancedAction.description}`), false);
  const enterAction = actions.find((action) => action.actionId === "enter-dungeon:rank-1:conservative");
  assert.ok(enterAction);
  assert.match(enterAction.label, /进丙级地宫第1阶/);
  assert.match(enterAction.label, /稳妥/);
  assert.equal(/Enter dungeon|conservative|balanced|aggressive/i.test(`${enterAction.label} ${enterAction.description}`), false);

  assert.ok(dungeonState);
  assert.ok(Array.isArray(dungeonState.rankYieldHints));
  assert.deepEqual(dungeonState.rankYieldHints?.[0]?.rank, 1);
  assert.equal(dungeonState.rankYieldHints?.[0]?.primaryMaterial, "cloud-heart-grass");
  assert.ok((dungeonState.rankYieldHints?.[0]?.estimatedExpeditionYieldByPolicy?.balanced?.min ?? 0) > 0);
  assert.ok(dungeonState.rankYieldHints?.[0]?.notableSecondaryDrops.includes("ruin-fragment"));
});

test("managed expeditions create one 30-tick job and only expose abort while busy", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  const started = performAction(world, CULTIVATOR_ID, expeditionActionId(1, "balanced") as never);
  assert.equal(started.job?.totalTicks, 30);
  assert.equal((started.job?.meta as { dungeonExpeditionPolicy?: string } | undefined)?.dungeonExpeditionPolicy, "balanced");
  assert.equal((started.job?.meta as { dungeonExpeditionTargetRank?: number } | undefined)?.dungeonExpeditionTargetRank, 1);

  const busyActions = listAvailableActions(world, CULTIVATOR_ID);
  assert.deepEqual(busyActions.map((action) => action.actionId), ["abort-dungeon-expedition"]);

  for (let step = 0; step < 29; step += 1) {
    const summary = advanceWorld(world, 1);
    assert.equal(summary.completedJobs.length, 0);
  }

  const completion = advanceWorld(world, 1);
  assert.equal(completion.completedJobs.length, 1);
  assert.equal(completion.completedJobs[0]?.actionId, expeditionActionId(1, "balanced"));

  const state = getCultivatorState(world, CULTIVATOR_ID) as { dungeonExpedition?: {
    active: unknown;
    lastReport?: { outcome?: string; flavorEvents?: string[] } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.active ?? null, null);
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "completed");
  assert.ok(Array.isArray(state.dungeonExpedition?.lastReport?.flavorEvents));
  assert.ok((state.dungeonExpedition?.lastReport?.flavorEvents?.length ?? 0) > 0);
  assert.ok((state.dungeonExpedition?.lastReport?.flavorEvents?.length ?? 0) <= 3);
  assert.equal(
    new Set(state.dungeonExpedition?.lastReport?.flavorEvents ?? []).size,
    state.dungeonExpedition?.lastReport?.flavorEvents?.length ?? 0,
  );
  assert.equal(
    (state.dungeonExpedition?.lastReport?.flavorEvents ?? []).every((title) => !title.startsWith("[")),
    true,
  );
  assert.equal(world.cultivators[CULTIVATOR_ID]?.locationId, "qingzhou:main-city");
  const finished = getCultivatorState(world, CULTIVATOR_ID);
  const summary = finished.dungeonExpedition?.lastReport?.summary ?? "";
  const notes = finished.travelogue.notes.map((note) => `${note.title} ${note.detail}`).join("\n");
  const digestText = [
    finished.digest?.summary ?? "",
    ...(finished.digest?.growth ?? []),
    ...(finished.digest?.fights ?? []),
  ].join("\n");
  const returnEvent = finished.recentEvents.find((event) => event.title === "地宫归来");
  assert.ok(returnEvent);
  const playerFacing = `${summary}\n${notes}\n${digestText}\n${returnEvent.title} ${returnEvent.content}`;
  assert.match(summary, /云心草/);
  assert.match(summary, /青岚城/);
  assert.match(notes, /地宫归来/);
  assert.match(notes, /云心草/);
  assert.match(digestText, /云心草/);
  assertNoRawIds(playerFacing);
});

function assertNoRawIds(text: string): void {
  assert.equal(/[a-z]+-[a-z0-9-]+/i.test(text), false, text);
  assert.equal(/[a-z]+:[a-z0-9:-]+/i.test(text), false, text);
  assert.equal(/\([A-Za-z]/.test(text), false, text);
}

test("an expedition report keeps item ids in state and Chinese names in the summary", () => {
  const progress = {
    cultivatorId: CULTIVATOR_ID,
    jobId: "job-surface",
    locationId: "yangzhou:dungeon-c",
    grade: "丙",
    targetRank: 1,
    policy: "balanced",
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    startedAtTick: 0,
    stepIndex: 4,
    maxSteps: 10,
    nextResolutionTick: 12,
    searchSteps: 3,
    guardianSteps: 1,
    primaryMaterialCount: 2,
    secondaryDrops: { "ruin-fragment": 1 },
    spiritStoneGain: 40,
    realmProgressGain: 6,
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
    outcome: "completed",
    endedAtTick: 30,
    returnLocationId: "yangzhou:main-city",
    returnPlaceName: "广津城",
    primaryMaterial: "cloud-heart-grass",
  });
  assert.equal(report.primaryMaterial.itemId, "cloud-heart-grass");
  assert.equal(report.secondaryDrops["ruin-fragment"], 1);
  assert.equal(report.returnLocationId, "yangzhou:main-city");
  assert.match(report.summary, /2份云心草/);
  assert.match(report.summary, /1份残碑碎片/);
  assert.match(report.summary, /人已回到广津城/);
  assert.match(report.summary, /姿态是均衡/);
  assertNoRawIds(report.summary);
});

test("managed expeditions can be aborted while the cultivator is busy", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "conservative") as never);
  const aborted = performAction(world, CULTIVATOR_ID, "abort-dungeon-expedition" as never);

  assert.equal(aborted.accepted, true);
  assert.equal(world.cultivators[CULTIVATOR_ID]?.activeJobId, null);
  assert.deepEqual(Object.keys(world.jobs), []);
  assert.equal(world.cultivators[CULTIVATOR_ID]?.locationId, "qingzhou:main-city");

  const state = getCultivatorState(world, CULTIVATOR_ID) as { dungeonExpedition?: {
    active: unknown;
    lastReport?: { outcome?: string; flavorEvents?: string[] } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.active ?? null, null);
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "aborted");
  assert.deepEqual(state.dungeonExpedition?.lastReport?.flavorEvents, []);
});

test("managed expeditions catastrophically end early when danger thresholds are breached", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.maxQi = 100;
  cultivator.qi = 18;
  cultivator.maxSpiritualPower = 100;
  cultivator.spiritualPower = 10;

  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "aggressive") as never);

  const firstThreeTicks = advanceWorld(world, 3);
  assert.equal(firstThreeTicks.completedJobs.length, 1);
  assert.equal(firstThreeTicks.completedJobs[0]?.actionId, expeditionActionId(1, "aggressive"));

  const state = getCultivatorState(world, CULTIVATOR_ID) as { dungeonExpedition?: {
    lastReport?: { outcome?: string; flavorEvents?: string[] } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "catastrophic");
  assert.ok(Array.isArray(state.dungeonExpedition?.lastReport?.flavorEvents));
  assert.ok((state.dungeonExpedition?.lastReport?.flavorEvents?.length ?? 0) <= 3);
  assert.equal(world.cultivators[CULTIVATOR_ID]?.activeJobId, null);
  assert.equal(world.cultivators[CULTIVATOR_ID]?.locationId, "qingzhou:main-city");
});

test("legacy dungeon micro-actions remain executable for compatibility", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];
  const beforeFragments = cultivator.inventory["ruin-fragment"];

  cultivator.locationId = "qingzhou:dungeon-c";

  const started = performAction(world, CULTIVATOR_ID, "search-fortune:rank-1");
  assert.equal(started.job?.totalTicks, 3);

  const resolved = advanceWorld(world, 3);
  assert.equal(resolved.completedJobs.length, 1);
  assert.equal(resolved.completedJobs[0]?.actionId, "search-fortune:rank-1");
  assert.ok(cultivator.inventory["ruin-fragment"] >= beforeFragments);
});

test("dungeon expeditions generate at most three wake nodes per run", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "balanced") as never);

  let observedWakeNodes = 0;
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (progress) {
      observedWakeNodes = Math.max(observedWakeNodes, progress.wakeNodesEncountered);
    }
  }

  assert.ok(observedWakeNodes >= 0);
  assert.ok(observedWakeNodes <= 3);
});

test("state view shows wakeNodeHint while a dungeon wake node is pending", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "aggressive") as never);
  let attempts = 0;
  while (!getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint && cultivator.activeJobId && attempts < 30) {
    advanceWorld(world, 1);
    attempts += 1;
  }

  const state = getCultivatorState(world, CULTIVATOR_ID);
  assert.ok(state.dungeonExpedition.wakeNodeHint);
});

test("pending dungeon wake nodes auto-resolve after timeout ticks", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "aggressive") as never);
  let attempts = 0;
  while (!getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint && cultivator.activeJobId && attempts < 30) {
    advanceWorld(world, 1);
    attempts += 1;
  }
  const pendingState = getCultivatorState(world, CULTIVATOR_ID);
  assert.ok(pendingState.dungeonExpedition.wakeNodeHint);

  const timeoutTicks = pendingState.dungeonExpedition.wakeNodeHint?.timeoutTicks ?? 3;
  advanceWorld(world, timeoutTicks);
  const resolvedState = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(resolvedState.dungeonExpedition.wakeNodeHint ?? null, null);
});

test("wakeNodeHint remains null when no wake node is pending", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, CULTIVATOR_ID);

  assert.equal(state.dungeonExpedition.wakeNodeHint ?? null, null);
});

test("start-dungeon-expedition:rank-1:balanced starts an expedition with strategy posture", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;

  const actions = listAvailableActions(world, CULTIVATOR_ID);
  assert.ok(actions.some((action) => action.actionId === "start-dungeon-expedition:rank-1:balanced"));

  const started = performAction(world, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:balanced" as never);
  assert.equal(started.accepted, true);
  assert.equal(started.job?.totalTicks, 30);
  assert.equal(world.dungeonExpeditions[CULTIVATOR_ID]?.policy, "balanced");
});

test("dungeon wake nodes expose context/options/defaults and remain capped by wake budget", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];

  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:aggressive" as never);

  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (!progress) {
      continue;
    }

    const pendingWakeNode = progress.pendingWakeNode;
    if (pendingWakeNode) {
      assert.ok(pendingWakeNode.context.length > 0);
      assert.ok(pendingWakeNode.options.length >= 2);
      assert.ok(pendingWakeNode.options.length <= 4);
      assert.match(pendingWakeNode.context, /[\u4e00-\u9fff]/);
      assert.equal(/[A-Za-z]/.test(pendingWakeNode.context), false);
      assert.ok(
        pendingWakeNode.options.some(
          (option: { optionId: string }) => option.optionId === pendingWakeNode.defaultOptionId,
        ),
      );
      const state = getCultivatorState(world, CULTIVATOR_ID);
      assert.equal(state.dungeonExpedition.wakeNodeHint?.nodeId, pendingWakeNode.nodeId);
    }

    assert.ok(progress.wakeNodesEncountered <= progress.maxWakeNodes);
    assert.equal(progress.maxWakeNodes, 3);
  }
});

test("wake node timeout auto-resolution follows run strategy", () => {
  const conservative = createSeedWorld();
  const conservativeCultivator = conservative.cultivators[CULTIVATOR_ID];
  conservativeCultivator.locationId = "qingzhou:dungeon-c";
  conservativeCultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(conservative, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:conservative" as never);

  const aggressive = createSeedWorld();
  const aggressiveCultivator = aggressive.cultivators[CULTIVATOR_ID];
  aggressiveCultivator.locationId = "qingzhou:dungeon-c";
  aggressiveCultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(aggressive, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:aggressive" as never);

  for (let tick = 0; tick < 80; tick += 1) {
    advanceWorld(conservative, 1);
    advanceWorld(aggressive, 1);
    if (!conservativeCultivator.activeJobId && !aggressiveCultivator.activeJobId) {
      break;
    }
  }

  const conservativeReport = getCultivatorState(conservative, CULTIVATOR_ID).dungeonExpedition.lastReport;
  const aggressiveReport = getCultivatorState(aggressive, CULTIVATOR_ID).dungeonExpedition.lastReport;

  assert.ok(conservativeReport);
  assert.ok(aggressiveReport);
  assert.ok((aggressiveReport?.spiritStoneGain ?? 0) >= (conservativeReport?.spiritStoneGain ?? 0));
});

test("a conservative rank-1 run still offers a mid-run choice and a named pack", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID];
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);

  let sawChoice = false;
  let sawMoral = false;
  let sawPack = false;
  let sawScout = false;
  const scenes = new Set<string>();
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
    const progress = world.dungeonExpeditions[CULTIVATOR_ID];
    if (progress?.beats?.some((beat) => beat.title === "探路")) sawScout = true;
    const state = getCultivatorState(world, CULTIVATOR_ID);
    if (state.travelogue.notes.some((note) => note.title === "探路" || note.detail.includes("探路"))) sawScout = true;
    const actions = listAvailableActions(world, CULTIVATOR_ID).map((action) => String(action.actionId));
    const choices = actions.filter((actionId) => actionId.startsWith("dungeon-wake-decision:"));
    const wake = state.currentJob?.meta?.dungeonWake;
    const hint = state.dungeonExpedition.wakeNodeHint;
    if (choices.length > 0) {
      sawChoice = true;
      assert.ok(actions.includes("abort-dungeon-expedition"));
      assert.ok(wake);
      assert.equal(wake.defaultOptionId, hint?.defaultOptionId);
      scenes.add(wake.context);
    }
    if (choices.includes("dungeon-wake-decision:aid-wounded")) {
      sawMoral = true;
      assert.ok(choices.includes("dungeon-wake-decision:take-pouch"));
      assert.equal(hint?.defaultOptionId, "aid-wounded");
      assert.match(wake?.context ?? "", /水囊|袋子/);
    }
    const rounds = world.dungeonExpeditions[CULTIVATOR_ID]?.combatRounds ?? [];
    if (rounds.some((round) => /石刀客/.test(round.enemyName))) sawPack = true;
  }

  assert.equal(sawChoice, true);
  assert.equal(sawMoral, true);
  assert.ok(scenes.size >= 2);
  assert.equal(sawPack, true);
  assert.equal(sawScout, true);
  const finished = getCultivatorState(world, CULTIVATOR_ID);
  const notes = finished.travelogue.notes.map((note) => `${note.title} ${note.detail}`).join("\n");
  assert.match(notes, /扶起伤者/);
  assert.equal(notes.includes("拿走了袋子"), false);
  assert.equal(finished.currentJob ?? null, null);
  const enemies = (finished.dungeonExpedition.lastReport?.combatRounds ?? []).map((round) => round.enemyName).join("\n");
  assert.match(enemies, /石刀客/);
});
