import assert from "node:assert/strict";
import test from "node:test";

import { STATE_IDS } from "./constants.js";
import type { EventTemplate } from "./events.js";
import { drawEvent, drawNodeSpecificEvent } from "./events.js";
import { advanceWorld, createSeedWorld, performAction } from "./index.js";

test("event pool shape satisfies Phase 2 minimum structure", () => {
  const world = createSeedWorld();

  assert.ok(world.eventPools);
  assert.equal(world.eventPools.globalCommon.length, 15);
  assert.equal(world.eventPools.travelPool.length, 9);
  assert.equal(Object.keys(world.eventPools.stateSpecific).length, 9);
  assert.equal(Object.keys(world.eventPools.travelStateSpecific).length, 9);

  const totalStateEvents = Object.values(
    world.eventPools.stateSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(totalStateEvents, 81);

  const totalTravelStateEvents = Object.values(
    world.eventPools.travelStateSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(totalTravelStateEvents, 90);

  const nodeSpecificCount = Object.values(
    world.eventPools.nodeSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(nodeSpecificCount, 270);

  for (const stateId of STATE_IDS) {
    assert.equal(world.eventPools.travelStateSpecific[stateId]?.length, 10);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-c`]?.length, 9);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-b`]?.length, 10);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-a`]?.length, 10);
  }
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

test("state-specific pools carry distinct Jiuzhou flavor anchors", () => {
  const world = createSeedWorld();
  const eventsById = new Map(
    Object.values(world.eventPools.stateSpecific)
      .flat()
      .map((event) => [event.id, event]),
  );

  assert.equal(eventsById.get("qz-f-01")?.nameCn, "青岚灵草");
  assert.equal(eventsById.get("yz-h-02")?.nameCn, "夜渡私船");
  assert.equal(eventsById.get("zz-h-03")?.nameCn, "巡检凭符");
  assert.equal(eventsById.get("sz-h-03")?.nameCn, "药农换购");
  assert.equal(eventsById.get("uz-h-03")?.nameCn, "烽火歇营");
  assert.equal(eventsById.get("lz-h-02")?.nameCn, "水袋取舍");
  assert.equal(eventsById.get("rz-f-03")?.nameCn, "霆火淬神");
  assert.equal(eventsById.get("cz-h-02")?.nameCn, "遗迹分润");
  assert.equal(eventsById.get("wz-h-02")?.nameCn, "债账取舍");

  assert.equal(eventsById.get("qz-t-02")?.baseWeight, 0.85);
  assert.equal(eventsById.get("rz-f-03")?.baseWeight, 1.15);
});

test("travel keeps a shared base pool and loads Jiuzhou route overlays", () => {
  const world = createSeedWorld();
  const travelEventsById = new Map(
    Object.values(world.eventPools.travelStateSpecific)
      .flat()
      .map((event) => [event.id, event]),
  );
  assert.equal(travelEventsById.get("qz-tr-h-03")?.source, "travel");
  assert.equal(travelEventsById.get("zz-tr-f-04")?.resultType, "resource");

  assert.equal(world.eventPools.travelPool[0]?.nameCn, "路边捡漏");
  assert.equal(travelEventsById.get("qz-tr-f-01")?.nameCn, "药车余货");
  assert.equal(travelEventsById.get("yz-tr-t-01")?.nameCn, "湿板练步");
  assert.equal(travelEventsById.get("lz-tr-h-01")?.nameCn, "卖水人的路话");
  assert.equal(travelEventsById.get("rz-tr-h-01")?.nameCn, "警旗导路");
});

test("dungeon node pools keep shared tier events and regional overlays together", () => {
  const world = createSeedWorld();

  const qingzhouDungeonCIds = new Set(
    (world.eventPools.nodeSpecific["qingzhou:dungeon-c"] ?? []).map((event) => event.id),
  );
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-cracked-cache"));
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-herb-lockbox"));

  const leizhouDungeonAIds = new Set(
    (world.eventPools.nodeSpecific["leizhou:dungeon-a"] ?? []).map((event) => event.id),
  );
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-vault-break"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-thunder-glass"));
});

test("drawEvent travel path can resolve from the current state's travel overlay", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.locationId = "leizhou:main-city";
  world.eventPools.travelPool = [];
  world.eventPools.travelStateSpecific = {
    ...world.eventPools.travelStateSpecific,
    leizhou: [
      {
        id: "rz-tr-test",
        layer: "state-specific",
        source: "travel",
        semanticType: "human",
        resultType: "status",
        name: "Leizhou Travel Test",
        nameCn: "雷州赶路测试",
        description: "Synthetic travel overlay event for coverage.",
        baseWeight: 1,
        stateId: "leizhou",
        nodeType: null,
        minRealm: null,
        effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] },
      },
    ],
  };

  const drawn = drawEvent(
    world,
    "travel",
    cultivator,
    cultivator.locationId,
    "events-test:travel-overlay",
  );

  assert.ok(drawn);
  assert.equal(drawn?.template.id, "rz-tr-test");
  assert.equal(drawn?.template.source, "travel");
});

test("drawNodeSpecificEvent returns a dungeon-local overlay candidate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.locationId = "qingzhou:dungeon-b";

  const drawn = drawNodeSpecificEvent(
    world,
    cultivator,
    cultivator.locationId,
    "events-test:node-specific",
  );

  assert.ok(drawn);
  assert.equal(drawn?.locationId, cultivator.locationId);
  assert.equal(drawn?.template.layer, "node-specific");
  assert.equal(drawn?.template.nodeType, "dungeon-b");
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
