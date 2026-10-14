import assert from "node:assert/strict";
import test from "node:test";

import { STATE_IDS } from "./constants.js";
import type { EventTemplate } from "./events.js";
import { drawEvent, drawNodeSpecificEvent } from "./events.js";
import { advanceWorld, createSeedWorld, hydrateWorldState, performAction, toPersistedWorldState } from "./index.js";

function createSyntheticStateDefinition() {
  return {
    name: "海州",
    risk: "medium",
    starter: false,
    neutralSect: {
      id: "hai-men-ge",
      name: "海门阁",
      description: "海州沿岸的中立门派，维系港口与海路秩序。",
      rewardMultiplier: 0.7,
    },
    locations: [
      { nodeType: "main-city", name: "海晖城" },
      { nodeType: "sub-town-east", name: "潮生镇" },
      { nodeType: "sub-town-west", name: "渔火镇" },
      { nodeType: "sub-town-south", name: "归帆镇" },
      { nodeType: "wilderness" },
      { nodeType: "dungeon-c" },
      { nodeType: "dungeon-b" },
      { nodeType: "dungeon-a" },
    ],
    crossStateConnections: [{ to: "qingzhou", ticks: 7 }],
  } as const;
}

test("event pool shape satisfies Phase 2 minimum structure", () => {
  const world = createSeedWorld();

  assert.ok(world.eventPools);
  assert.equal(world.eventPools.globalCommon.length, 87);
  assert.equal(world.eventPools.travelPool.length, 84);
  assert.equal(Object.keys(world.eventPools.stateSpecific).length, 9);
  assert.equal(Object.keys(world.eventPools.travelStateSpecific).length, 9);

  const totalStateEvents = Object.values(
    world.eventPools.stateSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(totalStateEvents, 189);

  const totalTravelStateEvents = Object.values(
    world.eventPools.travelStateSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(totalTravelStateEvents, 189);

  const nodeSpecificCount = Object.values(
    world.eventPools.nodeSpecific as Record<string, readonly EventTemplate[]>,
  ).reduce(
    (sum, events) => sum + events.length,
    0,
  );
  assert.equal(nodeSpecificCount, 3330);

  for (const stateId of STATE_IDS) {
    assert.equal(world.eventPools.stateSpecific[stateId]?.length, 21);
    assert.equal(world.eventPools.travelStateSpecific[stateId]?.length, 21);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:wilderness`]?.length, 18);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-c`]?.length, 120);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-b`]?.length, 116);
    assert.equal(world.eventPools.nodeSpecific[`${stateId}:dungeon-a`]?.length, 116);
    assert.equal(
      (world.eventPools.nodeSpecific[`${stateId}:dungeon-c`] ?? []).filter((event) => event.id.includes("-band-")).length,
      54,
    );
  }
});

test("extended geography registry adds seeded event-pool entries without editing hardcoded state lists", () => {
  const world = createSeedWorld({
    geographyRegistry: {
      haizhou: createSyntheticStateDefinition(),
    },
  } as never);

  assert.ok(world.locations["haizhou:main-city"]);
  assert.ok(Object.hasOwn(world.eventPools.nodeSpecific, "haizhou:wilderness"));
  assert.ok(
    Array.isArray(
      (world.eventPools.travelStateSpecific as Record<string, readonly EventTemplate[]>)["haizhou"],
    ),
  );
});

test("hydrateWorldState rebuilds event pools from persisted world state", () => {
  const world = createSeedWorld();
  const persisted = toPersistedWorldState(world);

  const hydrated = hydrateWorldState(persisted);

  assert.ok(hydrated.eventPools.travelStateSpecific.qingzhou);
  assert.equal(hydrated.eventPools.travelPool.length, 84);
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
  assert.deepEqual(travelEventsById.get("tr-f-04")?.effects.itemRewards, [{ itemId: "jade-marrow-sand", count: 1 }]);
  assert.ok(travelEventsById.get("tr-h-04")?.minRealm);
  assert.deepEqual(travelEventsById.get("tr-h-04")?.effects.itemRewards, [{ itemId: "star-fall-sand", count: 1 }]);

  assert.ok(wildernessEventsById.get("qingzhou:wilderness-spirit-herb-pocket")?.minRealm);
  assert.deepEqual(
    wildernessEventsById.get("qingzhou:wilderness-spirit-herb-pocket")?.effects.itemRewards,
    [{ itemId: "purple-palace-earth", count: 1 }],
  );
  assert.deepEqual(
    dungeonCEventsById.get("qingzhou:dungeon-c-rank-1-cache")?.effects.itemRewards,
    [{ itemId: "spirit-brook-bamboo", count: 1 }],
  );
  assert.ok(
    dungeonBEventsById.get("qingzhou:dungeon-b-rank-1-cache")?.effects.itemRewards?.some(
      (reward) => reward.itemId === "cold-moon-crystal" && reward.count === 1,
    ),
  );
  assert.equal(dungeonAEventsById.get("qingzhou:dungeon-a-rank-1-cache")?.dungeonGrade, "甲");
  assert.ok(
    dungeonAEventsById.get("qingzhou:dungeon-a-rank-1-cache")?.effects.itemRewards?.some(
      (reward) => reward.itemId === "moon-glory-jade" && reward.count === 1,
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
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-pinework-coffer-band-1-3"));
  assert.ok(qingzhouDungeonCIds.has("qingzhou:dungeon-c-valley-rumor-band-7-9"));

  const leizhouDungeonAIds = new Set(
    (world.eventPools.nodeSpecific["leizhou:dungeon-a"] ?? []).map((event) => event.id),
  );
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-rank-1-cache"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-rank-9-cache"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-thunder-glass-band-1-3"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-storm-cradle-band-1-3"));
  assert.ok(leizhouDungeonAIds.has("leizhou:dungeon-a-storm-whisper-band-7-9"));
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
        minRealm: null,
        layer: "state-specific",
        source: "travel",
        semanticType: "human",
        resultType: "status",
        signalType: "decision",
        name: "Leizhou Travel Test",
        nameCn: "Leizhou Travel Test",
        description: "Synthetic travel overlay event for coverage.",
        baseWeight: 1,
        stateId: "leizhou",
        nodeType: null,
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
      signalType: "decision",
      name: "Travel Gated",
      nameCn: "Travel Gated",
      description: "Synthetic gated travel event.",
      baseWeight: 1,
      stateId: null,
      nodeType: null,
      minRealm: "筑基",
      effects: { itemRewards: [{ itemId: "jade-marrow-sand", count: 1 }] },
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
        signalType: "decision",
        name: "Node Gated",
        nameCn: "Node Gated",
        description: "Synthetic gated node event.",
        baseWeight: 1,
        stateId: "qingzhou",
        nodeType: "dungeon-a",
        minRealm: "金丹",
        effects: { itemRewards: [{ itemId: "moon-glory-jade", count: 1 }] },
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
        minRealm: null,
        layer: "node-specific",
        source: "exploration",
        semanticType: "fortune",
        resultType: "resource",
        signalType: "decision",
        name: "Node Rank Gated",
        nameCn: "Node Rank Gated",
        description: "Synthetic rank gated node event.",
        baseWeight: 1,
        stateId: "qingzhou",
        nodeType: "dungeon-a",
        dungeonGrade: "甲",
        minDungeonRank: 4,
        maxDungeonRank: 6,
        effects: { itemRewards: [{ itemId: "moon-glory-jade", count: 1 }] },
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

test("every event template has a valid signalType", () => {
  const world = createSeedWorld();
  const allEvents: EventTemplate[] = [
    ...world.eventPools.globalCommon,
    ...world.eventPools.travelPool,
    ...Object.values(world.eventPools.stateSpecific).flat(),
    ...Object.values(world.eventPools.travelStateSpecific).flat(),
  ];

  for (const event of allEvents) {
    assert.ok(
      event.signalType === "flavor" || event.signalType === "decision",
      `Event ${event.id} has invalid signalType: ${event.signalType}`,
    );
  }

  const decisionCount = allEvents.filter((e) => e.signalType === "decision").length;
  const ratio = decisionCount / allEvents.length;
  assert.ok(ratio >= 0.4, `Decision ratio ${(ratio * 100).toFixed(1)}% is below 40% minimum`);
});

test("travel event descriptions meet the minimum richness threshold", () => {
  const world = createSeedWorld();
  const travelEvents: EventTemplate[] = [
    ...world.eventPools.travelPool,
    ...Object.values(world.eventPools.travelStateSpecific).flat(),
  ];

  for (const event of travelEvents) {
    assert.ok(
      event.description.trim().length >= 20,
      `Travel event ${event.id} description is too short: ${event.description}`,
    );
  }
});

test("single travel emits at most two flavor events even across many travel ticks", () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const world = createSeedWorld();
    world.nextJobSequence = seed;

    const started = performAction(world, "yun-zhong-he", "travel-to:qingzhou:sub-town-east");
    assert.equal(started.accepted, true);

    const jobId = world.cultivators["yun-zhong-he"]!.activeJobId!;
    world.jobs[jobId]!.remainingTicks = 12;
    advanceWorld(world, 12);

    const flavorTravelEvents = world.worldEvents.filter((event) =>
      event.tags.includes("event-pool")
      && event.tags.includes("travel")
      && event.tags.includes("signal-type:flavor")
    );

    assert.ok(
      flavorTravelEvents.length <= 2,
      `seed ${seed} emitted ${flavorTravelEvents.length} travel flavor events`,
    );
  }
});

const CJK = /[\u4e00-\u9fff]/;
const GATED_MATS = new Set([
  "mystic-jade-stone",
  "jade-marrow-sand",
  "purple-palace-earth",
  "foundation-spirit-amber",
  "cold-moon-crystal",
  "still-cloud-wood",
  "tranquil-bamboo",
  "wind-control-crystal",
  "nine-turn-core-sand",
  "golden-spirit-flower",
  "purple-celestial-leaf",
  "star-fall-sand",
  "moon-glory-jade",
  "flowing-aurora-core",
  "dragon-radiance-crystal",
  "nine-turn-golden-marrow",
  "nurture-nascent-dew",
  "anchor-nascent-sand",
  "shatter-nascent-lotus",
  "divine-embryo-dew",
  "divine-transformation-seal",
]);
const REALM_RANK: Record<string, number> = { 炼气: 0, 筑基: 1, 金丹: 2, 元婴: 3, 化神: 4 };

test("thickened pools keep two-way choices, Chinese copy, and early material gates", () => {
  const world = createSeedWorld();
  const pools = [
    ...world.eventPools.globalCommon,
    ...world.eventPools.travelPool,
    ...Object.values(world.eventPools.stateSpecific).flat(),
    ...Object.values(world.eventPools.travelStateSpecific).flat(),
    ...Object.values(world.eventPools.nodeSpecific).flat(),
  ];
  const byId = new Map(pools.map((event) => [event.id, event]));

  for (const id of ["g-h-06", "g-h-09", "g-h-12", "g-h-15", "tr-h-05", "tr-h-09", "qz-h-04", "wz-tr-h-04"]) {
    const event = byId.get(id);
    assert.ok(event?.moralityChoice, `${id} should offer a choice`);
    assert.equal(event?.moralityChoice?.options.length, 2);
    assert.ok(CJK.test(event?.description ?? ""), `${id} description should be Chinese`);
    assert.ok(CJK.test(event?.nameCn ?? ""), `${id} title should be Chinese`);
  }

  const choices = pools.filter((event) => event.moralityChoice);
  assert.ok(choices.length >= 20);
  for (const event of choices) {
    const [left, right] = event.moralityChoice!.options;
    assert.ok(left && right);
    assert.notEqual(Math.sign(left.moralityDelta), Math.sign(right.moralityDelta));
    assert.ok(CJK.test(event.moralityChoice!.prompt));
    const stones = [left, right].map((option) => option.effectBundle.spiritStones ?? 0);
    assert.ok(Math.max(...stones) <= 80, `${event.id} choice stones are too high`);
  }

  for (const event of pools) {
    if (event.id.startsWith("g-f-1") || event.id.startsWith("g-h-1") || event.id.includes("-once-") || event.id.includes("-wild-")) {
      assert.ok(CJK.test(event.description), `${event.id} should be written in Chinese`);
    }
    if (event.dungeonGrade) continue;
    const rank = event.minRealm ? REALM_RANK[event.minRealm] : 0;
    for (const reward of event.effects.itemRewards ?? []) {
      if (!GATED_MATS.has(reward.itemId)) continue;
      const needs = reward.itemId === "star-fall-sand" || reward.itemId === "moon-glory-jade"
        || reward.itemId === "golden-spirit-flower"
        || reward.itemId === "purple-celestial-leaf"
        ? 2
        : 1;
      assert.ok(rank >= needs, `${event.id} drops ${reward.itemId} below its realm gate`);
    }
  }
});

test("scene choices offer three or four thin options without touching morality pairs", () => {
  const world = createSeedWorld();
  const pools = [
    ...world.eventPools.globalCommon,
    ...world.eventPools.travelPool,
    ...Object.values(world.eventPools.stateSpecific).flat(),
    ...Object.values(world.eventPools.travelStateSpecific).flat(),
    ...Object.values(world.eventPools.nodeSpecific).flat(),
  ];
  const byId = new Map(pools.map((event) => [event.id, event]));
  const scenes = pools.filter((event) => event.sceneChoice);
  const broad = scenes.filter((event) => (event.sceneChoice?.options.length ?? 0) >= 3);
  assert.equal(broad.length, scenes.length);
  assert.ok(scenes.length >= 120, `expected the scene pool to double past 60, got ${scenes.length}`);
  assert.ok(scenes.some((event) => event.sceneChoice?.options.length === 3));
  assert.ok(scenes.filter((event) => event.sceneChoice?.options.length === 4).length >= 70);

  const exploration = scenes.filter((event) => event.source === "exploration");
  const travel = scenes.filter((event) => event.source === "travel");
  const human = scenes.filter((event) => event.semanticType === "human");
  assert.ok(exploration.length >= 60);
  assert.ok(travel.length >= 60);
  assert.ok(human.length >= 70);

  for (const id of ["g-sc-13", "g-sc-30", "tr-sc-18", "tr-sc-26", "qz-sc-h-03", "yz-tr-sc-04", "g-fl-01", "tr-fl-15", "qz-f-06", "qz-tr-h-06"]) {
    assert.ok(byId.has(id), `${id} should be in the thickened pools`);
  }
  assert.equal(byId.get("g-f-01")?.baseWeight, 0.7);
  assert.equal(byId.get("g-sc-01")?.baseWeight, 1.05);
  assert.equal(byId.get("qz-sc-h-01")?.baseWeight, 1.02);
  const sceneTitles = scenes.map((event) => event.nameCn);
  assert.equal(new Set(sceneTitles).size, sceneTitles.length, "scene titles should stay distinct");

  for (const event of scenes) {
    assert.equal(event.moralityChoice, undefined, `${event.id} should stay off the morality pair`);
    assert.equal(event.minRealm, null, `${event.id} should stay 炼气-safe`);
    assert.ok(CJK.test(event.description), `${event.id} description`);
    assert.ok(CJK.test(event.nameCn), `${event.id} title`);
    assert.ok(CJK.test(event.sceneChoice?.prompt ?? ""), `${event.id} prompt`);
    const ids = new Set<string>();
    for (const option of event.sceneChoice?.options ?? []) {
      assert.ok(!ids.has(option.id), `${event.id} repeats ${option.id}`);
      ids.add(option.id);
      assert.ok(CJK.test(option.label), `${event.id} ${option.id} label`);
      assert.ok(CJK.test(option.summary), `${event.id} ${option.id} summary`);
      assert.equal(option.effectBundle.itemRewards, undefined, `${event.id} should not drop materials`);
      const stones = option.effectBundle.spiritStones ?? 0;
      assert.ok(stones <= 16, `${event.id} ${option.id} stones ${stones}`);
    }
    const help = event.sceneChoice?.options.find((option) => option.id === "help");
    const walk = event.sceneChoice?.options.find((option) => option.id === "walk");
    assert.equal(help?.effectBundle.reputationChange, 1);
    assert.equal(help?.effectBundle.spiritStones, 4);
    assert.ok(help?.summary.includes("薄人情"));
    assert.equal(walk?.effectBundle.spiritStones, undefined);
  }

  for (const event of pools.filter((entry) => entry.moralityChoice)) {
    assert.equal(event.moralityChoice?.options.length, 2, `${event.id} morality pair`);
    assert.equal(event.sceneChoice, undefined);
  }
});
