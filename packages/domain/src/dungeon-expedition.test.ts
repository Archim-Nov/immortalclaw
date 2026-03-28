import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";

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
  assert.match(balancedAction.description, /qi-common/i);

  assert.ok(dungeonState);
  assert.ok(Array.isArray(dungeonState.rankYieldHints));
  assert.deepEqual(dungeonState.rankYieldHints?.[0]?.rank, 1);
  assert.equal(dungeonState.rankYieldHints?.[0]?.primaryMaterial, "qi-common");
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
    lastReport?: { outcome?: string } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.active ?? null, null);
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "completed");
  assert.equal(world.cultivators[CULTIVATOR_ID]?.locationId, "qingzhou:main-city");
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
    lastReport?: { outcome?: string } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.active ?? null, null);
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "aborted");
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
    lastReport?: { outcome?: string } | null;
  } | null };
  assert.equal(state.dungeonExpedition?.lastReport?.outcome, "catastrophic");
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
