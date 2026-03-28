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
  assert.equal(world.eventPools.travelPool.length, 11);
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
  assert.equal(nodeSpecificCount, 1476);

  for (const stateId of STATE_IDS) {
    assert.equal(world.eventPools.travelStateSpecific[stateId]?.length, 10);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:wilderness`]?.length, 2);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-c`]?.length, 54);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-b`]?.length, 54);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-a`]?.length, 54);
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

  assert.equal(eventsById.get("qz-f-01")?.name, "Qinglan Spirit Herb");
  assert.equal(eventsById.get("yz-h-02")?.name, "Smuggler Ferry");
  assert.equal(eventsById.get("zz-h-03")?.name, "Inspection Talisman");
  assert.equal(eventsById.get("sz-h-03")?.name, "Herbalist Exchange");
  assert.equal(eventsById.get("uz-h-03")?.name, "Watchfire Shelter");
  assert.equal(eventsById.get("lz-h-02")?.name, "Water Ration Choice");
  assert.equal(eventsById.get("rz-f-03")?.name, "Skyfire Baptism");
  assert.equal(eventsById.get("cz-h-02")?.name, "Ruins Diver's Claim");
  assert.equal(eventsById.get("wz-h-02")?.name, "Debt Collector's Choice");

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

  assert.equal(world.eventPools.travelPool[0]?.name, "Roadside Pickup");
  assert.equal(travelEventsById.get("qz-tr-f-01")?.name, "Herb Cart Surplus");
  assert.equal(travelEventsById.get("yz-tr-t-01")?.name, "Wet Deck Footing");
  assert.equal(travelEventsById.get("lz-tr-h-01")?.name, "Water Seller's Tip");
  assert.equal(travelEventsById.get("rz-tr-h-01")?.name, "Warning Banner Road");
});

test("realm-gated material events extend travel and exploration support for breakthroughs", () => {
  const world = createSeedWorld();
  const travelEventsById = new Map(world.eventPools.travelPool.map((event) => [event.id, event]));
  const wildernessEventsById = new Map(
    (world.eventPools.nodeSpecific["qingzhou:wilderness"] ?? []).map((event) => [event.id, event]),
  );
  const dungeonCEventsById = new Map(
    (world.eventPools.nodeSpecific["qingzhou:dungeon-c"] ?? []).map((event) => [event.id, event]),
  );
  const dungeonBEventsById = new Map(
    (world.eventPools.nodeSpecific["qingzhou:dungeon-b"] ?? []).map((event) => [event.id, event]),
  );
  const dungeonAEventsById = new Map(
    (world.eventPools.nodeSpecific["qingzhou:dungeon-a"] ?? []).map((event) => [event.id, event]),
  );

  assert.ok(travelEventsById.get("tr-f-04")?.minRealm);
  assert.deepEqual(travelEventsById.get("tr-f-04")?.effects.itemRewards, [{ itemId: "foundation-common", count: 1 }]);
  assert.ok(travelEventsById.get("tr-h-04")?.minRealm);
  assert.deepEqual(travelEventsById.get("tr-h-04")?.effects.itemRewards, [{ itemId: "core-common", count: 1 }]);

  assert.ok(wildernessEventsById.get("qingzhou:wilderness-spirit-herb-pocket")?.minRealm);
  assert.deepEqual(
    wildernessEventsById.get("qingzhou:wilderness-spirit-herb-pocket")?.effects.itemRewards,
    [{ itemId: "foundation-common", count: 1 }],
  );
  assert.deepEqual(
    dungeonCEventsById.get("qingzhou:dungeon-c-rank-1-cache")?.effects.itemRewards,
    [{ itemId: "qi-common", count: 1 }],
  );
  assert.ok(
    dungeonBEventsById.get("qingzhou:dungeon-b-rank-1-cache")?.effects.itemRewards?.some(
      (reward) => reward.itemId === "foundation-common" && reward.count === 1,
    ),
  );
  assert.equal(dungeonAEventsById.get("qingzhou:dungeon-a-rank-1-cache")?.dungeonGrade, "甲");
  assert.ok(
    dungeonAEventsById.get("qingzhou:dungeon-a-rank-1-cache")?.effects.itemRewards?.some(
      (reward) => reward.itemId === "core-common" && reward.count === 1,
    ),
  );
});

test("dungeon node pools keep shared tier events and regional overlays together", () => {
  const world = createSeedWorld();

  const qingzhouDungeonCIds = new Set(
    (world.eventPools.nodeSpecific["qingzhou:dungeon-c"] ?? []).map((event) => event.id),
  );
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-rank-1-cache"));
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-rank-9-cache"));
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-herb-lockbox-band-1-3"));

  const leizhouDungeonAIds = new Set(
    (world.eventPools.nodeSpecific["leizhou:dungeon-a"] ?? []).map((event) => event.id),
  );
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-rank-1-cache"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-rank-9-cache"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-thunder-glass-band-1-3"));
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
        nameCn: "Leizhou Travel Test",
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
  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  cultivator.locationId = "qingzhou:dungeon-b";

  const drawn = drawNodeSpecificEvent(
    world,
    cultivator,
    cultivator.locationId,
    "events-test:node-specific",
    { grade: "乙", rank: 1 },
  );

  assert.ok(drawn);
  assert.equal(drawn?.locationId, cultivator.locationId);
  assert.equal(drawn?.template.layer, "node-specific");
  assert.equal(drawn?.template.nodeType, "dungeon-b");
  assert.equal(drawn?.template.dungeonGrade, "乙");
});

test("minRealm filters shared travel and node-specific event draws", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  cultivator.locationId = "qingzhou:main-city";
  world.eventPools.globalCommon = [];
  world.eventPools.travelPool = [
    {
      id: "travel-gated",
      layer: "global-common",
      source: "travel",
      semanticType: "fortune",
      resultType: "resource",
      name: "Travel Gated",
      nameCn: "Travel Gated",
      description: "Synthetic gated travel event.",
      baseWeight: 1,
      stateId: null,
      nodeType: null,
      minRealm: "筑基",
      effects: { itemRewards: [{ itemId: "foundation-common", count: 1 }] },
    },
  ];
  world.eventPools.travelStateSpecific = {
    ...world.eventPools.travelStateSpecific,
    qingzhou: [],
  };

  assert.equal(
    drawEvent(world, "travel", cultivator, cultivator.locationId, "events-test:travel-min-realm"),
    null,
  );

  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  assert.equal(
    drawEvent(world, "travel", cultivator, cultivator.locationId, "events-test:travel-min-realm")?.template.id,
    "travel-gated",
  );

  cultivator.locationId = "qingzhou:dungeon-a";
  world.eventPools.nodeSpecific = {
    ...world.eventPools.nodeSpecific,
    "qingzhou:dungeon-a": [
      {
        id: "node-gated",
        layer: "node-specific",
        source: "exploration",
        semanticType: "fortune",
        resultType: "resource",
        name: "Node Gated",
        nameCn: "Node Gated",
        description: "Synthetic gated node event.",
        baseWeight: 1,
        stateId: "qingzhou",
        nodeType: "dungeon-a",
        minRealm: "金丹",
        effects: { itemRewards: [{ itemId: "core-common", count: 1 }] },
      },
    ],
  };

  assert.equal(
    drawNodeSpecificEvent(world, cultivator, cultivator.locationId, "events-test:node-min-realm"),
    null,
  );

  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  assert.equal(
    drawNodeSpecificEvent(world, cultivator, cultivator.locationId, "events-test:node-min-realm")?.template.id,
    "node-gated",
  );
});

test("dungeon grade and rank context filters node-specific event draws", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];

  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.locationId = "qingzhou:dungeon-a";
  world.eventPools.nodeSpecific = {
    ...world.eventPools.nodeSpecific,
    "qingzhou:dungeon-a": [
      {
        id: "node-rank-gated",
        layer: "node-specific",
        source: "exploration",
        semanticType: "fortune",
        resultType: "resource",
        name: "Node Rank Gated",
        nameCn: "Node Rank Gated",
        description: "Synthetic rank gated node event.",
        baseWeight: 1,
        stateId: "qingzhou",
        nodeType: "dungeon-a",
        dungeonGrade: "甲",
        minDungeonRank: 4,
        maxDungeonRank: 6,
        effects: { itemRewards: [{ itemId: "core-common", count: 1 }] },
      },
    ],
  };

  assert.equal(
    drawNodeSpecificEvent(world, cultivator, cultivator.locationId, "events-test:node-rank-low", { grade: "甲", rank: 3 }),
    null,
  );
  assert.equal(
    drawNodeSpecificEvent(world, cultivator, cultivator.locationId, "events-test:node-rank-match", { grade: "甲", rank: 5 })?.template.id,
    "node-rank-gated",
  );
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
