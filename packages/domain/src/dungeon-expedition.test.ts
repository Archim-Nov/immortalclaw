import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { createDungeonExpeditionReport, expeditionPressureFor } from "./dungeon-expedition-service.js";
import type { DungeonBeat, DungeonExpeditionProgress, DungeonGrade, DungeonRank } from "./model.js";

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
    primaryMaterialName?: string;
    estimatedExpeditionYieldByPolicy: Record<string, { min: number; max: number }>;
    notableSecondaryDrops: string[];
  }> } | null }).dungeon;

  assert.equal(actions.some((action) => String(action.actionId).startsWith("start-dungeon-expedition:")), false);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("search-fortune:rank-")), false);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("challenge-guardian:rank-")), false);

  const enterAction = actions.find((action) => action.actionId === "enter-dungeon:rank-1:conservative");
  assert.ok(enterAction);
  assert.match(enterAction.label, /进丙级地宫第1阶/);
  assert.match(enterAction.label, /稳妥/);
  assert.match(enterAction.description, /稳妥偏守/);
  assert.match(enterAction.description, /云心草/);
  assert.match(enterAction.description, /三十刻/);
  assert.equal(/Enter dungeon|conservative|balanced|aggressive/i.test(`${enterAction.label} ${enterAction.description}`), false);
  const balancedEnter = actions.find((action) => action.actionId === "enter-dungeon:rank-1:balanced");
  const aggressiveEnter = actions.find((action) => action.actionId === "enter-dungeon:rank-1:aggressive");
  assert.ok(balancedEnter);
  assert.ok(aggressiveEnter);
  assert.match(balancedEnter.description, /这一趟走均衡/);
  assert.match(aggressiveEnter.description, /凶猛偏攻/);
  assert.equal(enterAction.description === balancedEnter.description, false);
  assert.equal(balancedEnter.description === aggressiveEnter.description, false);
  assert.equal(enterAction.description.includes("按这个姿态里稳的那一边走"), false);

  assert.ok(dungeonState);
  assert.ok(Array.isArray(dungeonState.rankYieldHints));
  assert.deepEqual(dungeonState.rankYieldHints?.[0]?.rank, 1);
  assert.equal(dungeonState.rankYieldHints?.[0]?.primaryMaterial, "cloud-heart-grass");
  assert.equal(dungeonState.rankYieldHints?.[0]?.primaryMaterialName, "云心草");
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

  let completion: ReturnType<typeof advanceWorld> | null = null;
  for (let step = 0; step < 80 && cultivator.activeJobId; step += 1) {
    const summary = advanceWorld(world, 1);
    if (summary.completedJobs.length === 0) continue;
    assert.equal(completion, null);
    completion = summary;
  }
  assert.ok(completion);
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
  assert.equal(report.primaryMaterial.itemName, "云心草");
  assert.equal(report.secondaryDrops["ruin-fragment"], 1);
  assert.equal(report.secondaryDropCards?.find((card) => card.itemId === "ruin-fragment")?.itemName, "残碑碎片");
  assert.equal(report.returnLocationId, "yangzhou:main-city");
  assert.match(report.summary, /2份云心草/);
  assert.match(report.summary, /1份残碑碎片/);
  assert.match(report.summary, /人已回到广津城/);
  assert.match(report.summary, /姿态是均衡/);
  assertNoRawIds(report.summary);
});

test("a rank-c run lists a side choice beside abort after the first step", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:balanced" as never);

  let side: { actionId: string; description: string }[] = [];
  for (let step = 0; step < 6 && side.length === 0; step += 1) {
    advanceWorld(world, 1);
    const actions = listAvailableActions(world, CULTIVATOR_ID);
    assert.ok(actions.some((action) => action.actionId === "abort-dungeon-expedition"));
    side = actions.filter((action) => String(action.actionId).startsWith("choose-event:"));
  }
  assert.ok(side.length >= 3, "expected a mid-run scene choice beside abort");
  for (const action of side) {
    assert.match(action.description, /地宫里岔开一件闲事/);
    assert.doesNotMatch(action.description, /口袋里多了|薄人情|灵力沉了|修为涨了/);
  }
});

test("a full cultivation bar says the next gain waits on breakthrough", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  cultivator.realmProgress = 100;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);
  const aborted = performAction(world, CULTIVATOR_ID, "abort-dungeon-expedition" as never);
  assert.match(aborted.summary, /修为已经满了，再涨要等破境/);
  assert.equal(aborted.summary.includes("修为涨了0"), false);

  const open = createDungeonExpeditionReport({
    progress: {
      cultivatorId: CULTIVATOR_ID,
      jobId: "job-open-bar",
      locationId: "qingzhou:dungeon-c",
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
      startedAtTick: 0,
      stepIndex: 1,
      maxSteps: 10,
      nextResolutionTick: 3,
      searchSteps: 1,
      guardianSteps: 0,
      primaryMaterialCount: 0,
      secondaryDrops: {},
      spiritStoneGain: 0,
      realmProgressGain: 0,
      unlockedNextRank: false,
      lastResolvedAction: "search",
      flavorEventTitles: [],
      wakeNodesEncountered: 0,
      maxWakeNodes: 3,
      pendingWakeNode: null,
      pendingWakeNodeDeadlineTick: null,
      resolvedWakeNodeCount: 0,
    },
    outcome: "aborted",
    endedAtTick: 1,
    returnLocationId: "qingzhou:main-city",
    primaryMaterial: "cloud-heart-grass",
  });
  assert.match(open.summary, /修为涨了0/);
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

  const timeoutTicks = pendingState.dungeonExpedition.wakeNodeHint?.timeoutTicks ?? 0;
  assert.ok(timeoutTicks >= 8 && timeoutTicks <= 12);
  assert.equal(pendingState.dungeonExpedition.wakeNodeHint?.decisionLine, "地宫岔路待决");
  assert.ok(pendingState.digest?.priorities?.includes("地宫岔路待决"));
  const listed = listAvailableActions(world, CULTIVATOR_ID).map((action) => String(action.actionId));
  assert.ok(listed.some((actionId) => actionId.startsWith("dungeon-wake-decision:")));
  advanceWorld(world, timeoutTicks);
  const resolvedState = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(resolvedState.dungeonExpedition.wakeNodeHint ?? null, null);
  const written = (cultivator.lifeLog ?? []).map((event) => event.text).join("");
  assert.match(written, /时辰到了，代选了/);
  assert.equal((written.match(/时辰到了，代选了/g) ?? []).length, 1, written);
  const dao = world.daoLogs.filter((entry) => entry.cultivatorId === CULTIVATOR_ID).map((entry) => entry.content).join("");
  assert.match(dao, /时辰到了，代选了/);
  assert.equal((dao.match(/时辰到了，代选了/g) ?? []).length, 1, dao);
  const wakeNote = (cultivator.travelNotes ?? []).find((note) => note.detail.includes("时辰到了，代选了"));
  assert.ok(wakeNote);
  assert.equal(wakeNote.detail.startsWith(wakeNote.title), false);
  assert.equal((`${wakeNote.title} ${wakeNote.detail}`.match(/时辰到了，代选了/g) ?? []).length, 1);
});

test("a manual dungeon wake choice is written into the beat and the dao log", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, CULTIVATOR_ID, expeditionActionId(1, "balanced") as never);
  let attempts = 0;
  while (!getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint && cultivator.activeJobId && attempts < 40) {
    advanceWorld(world, 1);
    attempts += 1;
  }
  const hint = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint;
  assert.ok(hint);
  const choice = listAvailableActions(world, CULTIVATOR_ID).find((action) => String(action.actionId).startsWith("dungeon-wake-decision:"));
  assert.ok(choice);
  const acted = performAction(world, CULTIVATOR_ID, choice.actionId);
  assert.equal(acted.accepted, true);
  assert.match(acted.summary, /在地宫里/);
  assert.doesNotMatch(acted.summary, /你选了/);
  const label = choice.label;
  if (label && acted.summary.includes(label)) {
    assert.equal(acted.summary.split(label).length - 1, 1, acted.summary);
  }
  assert.ok(acted.summary.split("。").length >= 3, acted.summary);
  const beat = world.dungeonExpeditions[CULTIVATOR_ID]?.beats?.at(-1);
  assert.doesNotMatch(beat?.detail ?? "", /你选了/);
  const dao = world.daoLogs.filter((entry) => entry.cultivatorId === CULTIVATOR_ID).map((entry) => entry.content).join("");
  assert.doesNotMatch(dao, /你选了/);
  assert.match(dao, /在地宫里/);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint ?? null, null);
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
  assert.equal(actions.some((action) => String(action.actionId).startsWith("start-dungeon-expedition:")), false);
  assert.ok(actions.some((action) => action.actionId === "enter-dungeon:rank-1:balanced"));

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
      assert.ok((wake?.options.length ?? 0) >= 3);
      assert.ok(wake?.options.some((option) => option.optionId === "aid-wounded" && option.label.length > 0));
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

function herbGathererBeat(grade: DungeonGrade): DungeonBeat | null {
  for (let n = 0; n < 48; n += 1) {
    const pressure = expeditionPressureFor({
      policy: "conservative",
      rank: 1,
      grade,
      action: "search",
      seed: `herb:${grade}:${n}`,
      qiRatio: 1,
    });
    if (pressure.beat.title === "灯下的采药人") return pressure.beat;
  }
  return null;
}

function reportWithBeat(grade: DungeonGrade, beat: DungeonBeat) {
  const progress = {
    cultivatorId: CULTIVATOR_ID,
    jobId: `job-${grade}`,
    locationId: grade === "乙" ? "yangzhou:dungeon-b" : grade === "甲" ? "yangzhou:dungeon-a" : "yangzhou:dungeon-c",
    grade,
    targetRank: 1,
    policy: "conservative",
    strategy: { posture: "conservative", bias: "survival-first", pushPreference: "neutral" },
    startedAtTick: 0,
    stepIndex: 4,
    maxSteps: 10,
    nextResolutionTick: 12,
    searchSteps: 3,
    guardianSteps: 1,
    primaryMaterialCount: 1,
    secondaryDrops: {},
    spiritStoneGain: 12,
    realmProgressGain: 4,
    unlockedNextRank: false,
    lastResolvedAction: "search",
    flavorEventTitles: [],
    wakeNodesEncountered: 0,
    maxWakeNodes: 3,
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    beats: [beat],
  } satisfies DungeonExpeditionProgress;
  return createDungeonExpeditionReport({
    progress,
    outcome: "completed",
    endedAtTick: 30,
    returnLocationId: "yangzhou:main-city",
    returnPlaceName: "广津城",
    primaryMaterial: "cloud-heart-grass",
  });
}

test("乙级 rank-1 报告按当前等级写第一层，不写死丙级地宫", () => {
  for (const grade of ["丙", "乙", "甲"] as const) {
    const beat = herbGathererBeat(grade);
    assert.ok(beat, `${grade} rank-1 should still roll 灯下的采药人`);
    assert.match(beat.detail, new RegExp(`^${grade}级地宫的第一层里`));
    const report = reportWithBeat(grade, beat);
    const text = (report.beats ?? []).map((entry) => `${entry.title}\n${entry.detail}`).join("\n");
    assert.match(text, new RegExp(`${grade}级地宫的第一层`));
    assert.match(report.summary, new RegExp(`${grade}级地宫的第一层`));
    if (grade !== "丙") {
      assert.equal(text.includes("丙级地宫"), false, text);
      assert.equal(report.summary.includes("丙级地宫"), false, report.summary);
    }
  }

  for (const rank of [2, 3, 4, 5, 6, 7, 8, 9] as const satisfies readonly DungeonRank[]) {
    for (let n = 0; n < 16; n += 1) {
      const pressure = expeditionPressureFor({
        policy: "balanced",
        rank,
        grade: "乙",
        action: "search",
        seed: `other-rank:${rank}:${n}`,
        qiRatio: 0.9,
      });
      assert.equal(pressure.beat.detail.includes("丙级地宫"), false, pressure.beat.detail);
      assert.equal(pressure.beat.title === "灯下的采药人", false);
    }
  }
});

test("筑基走完乙级第一层后，报告见闻里没有丙级地宫", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "yangzhou:dungeon-b";
  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  cultivator.qi = cultivator.maxQi = 400;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 400;
  cultivator.injuryTicksRemaining = 0;
  performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-1:conservative" as never);

  for (let tick = 0; tick < 80 && cultivator.activeJobId; tick += 1) {
    advanceWorld(world, 1);
  }

  const report = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.equal(report.grade, "乙");
  assert.equal(report.targetRank, 1);
  assert.equal(cultivator.activeJobId, null);
  const text = (report.beats ?? []).map((beat) => `${beat.title}\n${beat.detail}`).join("\n");
  assert.equal(text.includes("丙级地宫"), false, text);
  assert.equal((report.summary ?? "").includes("丙级地宫"), false, report.summary);
  const herb = report.beats?.find((beat) => beat.title === "灯下的采药人");
  if (herb) assert.match(herb.detail, /^乙级地宫的第一层里/);
});
