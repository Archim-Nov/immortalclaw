import assert from "node:assert/strict";
import test from "node:test";

import type { EventTemplate } from "./events.js";
import { drawEvent } from "./events.js";
import { advanceWorld, createSeedWorld, performAction } from "./index.js";

test("event pool shape satisfies Phase 2 minimum structure", () => {
  const world = createSeedWorld();

  assert.ok(world.eventPools);
  assert.equal(world.eventPools.globalCommon.length, 15);
  assert.equal(world.eventPools.travelPool.length, 9);
  assert.equal(Object.keys(world.eventPools.stateSpecific).length, 9);

  const totalStateEvents = Object.values(
    world.eventPools.stateSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(totalStateEvents, 81);

  const nodeSpecificCount = Object.values(
    world.eventPools.nodeSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.ok(nodeSpecificCount >= 36);
});

test("drawEvent exploration path returns a merged event candidate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  const drawn = drawEvent(
    world,
    "exploration",
    cultivator,
    cultivator.locationId,
    "events-test:exploration",
  );

  assert.ok(drawn);
  assert.equal(drawn?.locationId, cultivator.locationId);
  assert.equal(drawn?.template.source, "exploration");
});

test("engine travel triggers event-pool world event during route progression", () => {
  const world = createSeedWorld();

  const action = performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
  assert.equal(action.accepted, true);

  const before = world.worldEvents.length;
  const summary = advanceWorld(world, 1);
  const after = world.worldEvents.length;

  assert.equal(summary.completedJobs.length, 1);
  assert.equal(world.cultivators["yun-zhong-he"].locationId, "qingzhou:sub-town-east");

  const pooled = world.worldEvents.filter((event) => event.tags.includes("event-pool"));
  assert.ok(after > before || pooled.length > 0);
});
