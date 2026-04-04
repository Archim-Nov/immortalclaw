import assert from "node:assert/strict";
import test from "node:test";
import * as domainIndex from "./index.js";
import * as domainRuntime from "./runtime.js";

const DEFAULT_CULTIVATOR_ID = "yun-zhong-he";

test("runtime surface stays focused on world-rule helpers instead of questionnaire and stat-page helpers", () => {
  assert.equal("performAction" in domainRuntime, true);
  assert.equal("advanceWorld" in domainRuntime, true);
  assert.equal("deriveRegistrationRecordFromAnswers" in domainRuntime, false);
  assert.equal("getRegistrationQuestionnaire" in domainRuntime, false);
  assert.equal("buildRegistrationProfile" in domainRuntime, false);
  assert.equal("extractFiveElementScores" in domainRuntime, false);
});

test("domain index no longer re-exports constants topology or quest internals", () => {
  assert.equal("createSqliteWorldStore" in domainIndex, false);
  assert.equal("SqliteWorldStore" in domainIndex, false);
  assert.equal("createWorldStore" in domainIndex, false);
  assert.equal("DEFAULT_ACTION_DURATIONS" in domainIndex, false);
  assert.equal("buildFullTopology" in domainIndex, false);
  assert.equal("acceptQuest" in domainIndex, false);
});

test("domain barrels do not expose dead engine helpers", () => {
  for (const exportedName of [
    "createCultivator",
    "getCombatLogs",
    "listCultivators",
    "selectCultivatorForAgent",
  ] as const) {
    assert.equal(exportedName in domainIndex, false);
    assert.equal(exportedName in domainRuntime, false);
  }
});

test("domain barrels do not expose economy internals", () => {
  for (const exportedName of [
    "computeReadiness",
    "computeRecoveryState",
    "computeActivityContext",
    "computeDaoPotential",
  ] as const) {
    assert.equal(exportedName in domainIndex, false);
    assert.equal(exportedName in domainRuntime, false);
  }
});

test("cultivator state view exposes dedicated bahuang field", () => {
  const world = domainIndex.createSeedWorld();
  const state = domainIndex.getCultivatorState(world, DEFAULT_CULTIVATOR_ID);

  assert.equal("bahuang" in state, true);
  assert.equal(state.bahuang, null);
});

test("cultivator wilderness view stays resource-oriented", () => {
  const world = domainIndex.createSeedWorld();
  const state = domainIndex.getCultivatorState(world, DEFAULT_CULTIVATOR_ID);

  assert.equal(state.wilderness, null);
  assert.equal("wilderness" in state, true);
  assert.equal("dungeonExpedition" in state, true);
});

test("cultivator dungeon view remains progression-oriented", () => {
  const world = domainIndex.createSeedWorld();
  const state = domainIndex.getCultivatorState(world, DEFAULT_CULTIVATOR_ID);

  assert.equal("dungeon" in state, true);
  assert.equal("dungeonExpedition" in state, true);
  assert.equal("active" in state.dungeonExpedition, true);
  assert.equal("lastReport" in state.dungeonExpedition, true);
  assert.equal("wakeNodeHint" in state.dungeonExpedition, true);
});

test("seed world state includes dedicated bahuang progress container", () => {
  const world = domainIndex.createSeedWorld();

  assert.equal("bahuangProgress" in world, true);
  assert.deepEqual(world.bahuangProgress, {});
});

test("strategy and wake node type contracts stay available from domain index", () => {
  const strategy: import("./index.js").RunStrategy = {
    posture: "balanced",
    bias: "survival-first",
    pushPreference: "neutral",
  };
  const wakeNodeOption: import("./index.js").WakeNodeOption = {
    optionId: "hold-line",
    label: "Hold Line",
    description: "Preserve formation and wait for a safer opening.",
  };
  const wakeNode: import("./index.js").WakeNode = {
    nodeId: "wake-split-001",
    context: "A split path appears with unstable pressure.",
    options: [wakeNodeOption],
    defaultOptionId: wakeNodeOption.optionId,
    timeoutTicks: 3,
  };

  assert.equal(strategy.posture, "balanced");
  assert.equal(wakeNode.options.length, 1);
});

test("bahuang expedition type contracts stay available from domain index", () => {
  const progress: import("./index.js").BahuangExpeditionProgress = {
    cultivatorId: DEFAULT_CULTIVATOR_ID,
    status: "active",
    depth: 1,
    supplies: { rations: 3, talismans: 1 },
    pressure: 0,
    strategy: {
      posture: "conservative",
      bias: "survival-first",
      pushPreference: "retreat",
    },
    encounteredWakeNodes: [],
    pendingWakeNodeIndex: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    rewards: { spiritStones: 0, items: {}, realmProgress: 0 },
  };
  const stateView: import("./index.js").BahuangExpeditionStateView = {
    status: progress.status,
    depth: progress.depth,
    supplies: progress.supplies,
    pressure: progress.pressure,
    strategy: progress.strategy,
    pendingWakeNode: null,
    rewards: progress.rewards,
  };

  assert.equal(stateView.status, "active");
  assert.equal(stateView.pendingWakeNode, null);
});
