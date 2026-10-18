import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  getDaoLogs,
  performAction,
} from "./index.js";
import type { ActionJob } from "./model.js";
import { resolveWildernessSurvey } from "./wilderness-service.js";
import { getWildernessEventDefinition } from "./wilderness-events.js";

const CULTIVATOR_ID = "yun-zhong-he";
const STARTER_LAYER_ID = "starter-wilderness-tier-1";
const STARTER_POOL = [
  "wilderness-calm-foraging",
  "wilderness-beast-trace",
  "wilderness-spirit-vein-fragment",
] as const;

function playerSurfaces(world: ReturnType<typeof createSeedWorld>): string {
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const digest = state.digest;
  return [
    ...state.recentEvents.map((event) => `${event.title}\n${event.content}`),
    ...state.travelogue.notes.map((note) => `${note.title}\n${note.detail}`),
    ...getDaoLogs(world, CULTIVATOR_ID).map((entry) => `${entry.title}\n${entry.content}`),
    digest?.summary ?? "",
    ...(digest?.growth ?? []),
    ...(digest?.fights ?? []),
    ...(digest?.relationships ?? []),
    ...(digest?.priorities ?? []),
    ...(digest?.quotes ?? []).map((quote) => quote.line),
  ].join("\n");
}

function enterTideShore() {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "yangzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 800;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 800;
  performAction(world, CULTIVATOR_ID, "enter-wilderness:starter-wilderness-tier-1" as never);
  performAction(world, CULTIVATOR_ID, "wild-choice:yang-dry" as never);
  return { world, cultivator };
}

function surveyJob(eventId: string): ActionJob {
  return {
    id: `job-${eventId}`,
    cultivatorId: CULTIVATOR_ID,
    actionId: "survey-wilderness",
    label: "再探听潮浦",
    remainingTicks: 0,
    totalTicks: 2,
    meta: { wildernessEventId: eventId },
  };
}

function runSurvey(eventId: string | null) {
  const ready = enterTideShore();
  const stones = ready.cultivator.spiritStones;
  const started = performAction(ready.world, CULTIVATOR_ID, "survey-wilderness" as never);
  assert.equal(started.accepted, true);
  const job = ready.cultivator.activeJobId ? ready.world.jobs[ready.cultivator.activeJobId] : null;
  assert.ok(job);
  if (eventId) {
    job.meta = { ...(job.meta ?? {}), wildernessEventId: eventId };
  }
  const picked = job.meta?.wildernessEventId ?? "";
  let summary = "";
  for (let guard = 0; ready.cultivator.activeJobId && guard < 6; guard += 1) {
    const tick = advanceWorld(ready.world, 1);
    const done = tick.completedJobs.find((entry) => entry.cultivatorId === CULTIVATOR_ID && entry.actionId === "survey-wilderness");
    if (done) summary = done.summary;
  }
  return { ...ready, stones, summary, picked };
}

test("every wilderness layer event pool id is defined", () => {
  const world = createSeedWorld();
  const layers = Object.values(world.wildernessLayers);
  assert.ok(layers.length > 0);
  const starter = world.wildernessLayers[STARTER_LAYER_ID];
  assert.ok(starter);
  assert.deepEqual([...starter.eventPool], [...STARTER_POOL]);

  for (const layer of layers) {
    assert.ok(layer.eventPool.length > 0, layer.layerId);
    for (const eventId of layer.eventPool) {
      const definition = getWildernessEventDefinition(eventId);
      assert.ok(definition, `${layer.layerId} references missing wilderness event ${eventId}`);
      assert.equal(definition.eventId, eventId);
    }
  }

  for (const eventId of STARTER_POOL) {
    const definition = getWildernessEventDefinition(eventId);
    assert.ok(definition);
    assert.equal(definition.severity, "medium");
    assert.equal(definition.encounterBuildId ?? null, null);
    assert.equal(definition.injuryTicks ?? 0, 0);
    assert.equal(definition.combatMode ?? null, null);
    assert.ok((definition.spiritStoneReward ?? 0) > 0);
    assert.ok((definition.spiritStoneReward ?? 0) <= 80);
    for (const text of [definition.title, definition.content, definition.summary]) {
      assert.equal(/[A-Za-z]/u.test(text), false, text);
    }
  }
});

test("resolveWildernessSurvey accepts every starter pool id", () => {
  for (const eventId of STARTER_POOL) {
    const { world, cultivator } = enterTideShore();
    const stones = cultivator.spiritStones;
    const wood = cultivator.inventory["still-cloud-wood"];
    const ore = cultivator.inventory["spirit-ore"];
    const definition = getWildernessEventDefinition(eventId);
    assert.ok(definition);
    const summary = resolveWildernessSurvey(world, cultivator, surveyJob(eventId));
    assert.match(summary, /听潮浦这一段走完了/);
    assert.equal(/[A-Za-z]/u.test(summary), false, summary);
    assert.equal(summary.includes("Unknown wilderness"), false);
    assert.equal(world.wildernessProgress[CULTIVATOR_ID]?.lastEventId, eventId);
    assert.equal(cultivator.spiritStones, stones + (definition.spiritStoneReward ?? 0));
    assert.equal(cultivator.injuryTicksRemaining, 0);
    if (eventId === "wilderness-calm-foraging") {
      assert.equal(cultivator.inventory["still-cloud-wood"], wood + 1);
    } else {
      assert.equal(cultivator.inventory["spirit-ore"], ore + 1);
    }
    const sight = world.worldEvents.find((event) => event.title === definition.title);
    assert.ok(sight);
    assert.equal(sight.content, definition.content);
    assert.equal(/[A-Za-z]/u.test(`${sight.title}\n${sight.content}`), false);
  }
});

test("survey-wilderness on the starter layer finishes for the pool pick and for each id", () => {
  const natural = runSurvey(null);
  assert.ok(STARTER_POOL.includes(natural.picked as (typeof STARTER_POOL)[number]), natural.picked);
  assert.match(natural.summary, /听潮浦这一段走完了/);
  assert.equal(natural.summary.includes("行动提前结束"), false);
  assert.equal(natural.summary.includes("Unknown wilderness"), false);
  assert.equal(playerSurfaces(natural.world).includes("Unknown wilderness event"), false);
  assert.equal(natural.cultivator.activeJobId, null);

  for (const eventId of STARTER_POOL) {
    const finished = runSurvey(eventId);
    const definition = getWildernessEventDefinition(eventId);
    assert.ok(definition);
    assert.match(finished.summary, /听潮浦这一段走完了/);
    assert.equal(/[A-Za-z]/u.test(finished.summary), false, finished.summary);
    assert.equal(finished.summary.includes("行动提前结束"), false);
    assert.equal(finished.cultivator.spiritStones, finished.stones + (definition.spiritStoneReward ?? 0));
    assert.equal(finished.world.wildernessProgress[CULTIVATOR_ID]?.lastEventId, eventId);
    const shown = playerSurfaces(finished.world);
    assert.equal(shown.includes("Unknown wilderness event"), false, shown);
    assert.match(shown, new RegExp(definition.title));
    assert.match(shown, new RegExp(definition.content));
  }
});

test("an unknown wilderness survey event aborts in Chinese", () => {
  const aborted = runSurvey("wilderness-does-not-exist");
  assert.match(aborted.summary, /行动提前结束/);
  assert.match(aborted.summary, /再探时岔路散了，这一段见闻没留下/);
  assert.equal(aborted.summary.includes("Unknown wilderness"), false, aborted.summary);
  assert.equal(/Unknown wilderness event/u.test(aborted.summary), false);
  assert.equal(aborted.cultivator.activeJobId, null);
  const shown = playerSurfaces(aborted.world);
  assert.match(shown, /再探时岔路散了，这一段见闻没留下/);
  assert.equal(shown.includes("Unknown wilderness event"), false, shown);
  assert.equal(shown.includes("wilderness-does-not-exist"), false, shown);
  const state = getCultivatorState(aborted.world, CULTIVATOR_ID);
  const interruption = state.recentEvents.find((event) => event.title === "行动中断");
  assert.ok(interruption);
  assert.match(interruption.content, /再探时岔路散了，这一段见闻没留下/);
  assert.equal(interruption.content.includes("Unknown"), false);
});
