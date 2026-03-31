import assert from "node:assert/strict";
import test from "node:test";

import { createSeedWorld } from "./seed.js";
import { buildFullTopology, getDistance } from "./topology.js";

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

function createDisconnectedStateDefinition() {
  return {
    ...createSyntheticStateDefinition(),
    name: "孤州",
    locations: [
      { nodeType: "main-city", name: "孤城" },
      { nodeType: "sub-town-east", name: "东汀镇" },
      { nodeType: "sub-town-west", name: "西汀镇" },
      { nodeType: "sub-town-south", name: "南汀镇" },
      { nodeType: "wilderness" },
      { nodeType: "dungeon-c" },
      { nodeType: "dungeon-b" },
      { nodeType: "dungeon-a" },
    ],
    crossStateConnections: [],
  } as const;
}

test("topology builds cross-state routes from injected geography registry entries", () => {
  const graph = buildFullTopology(
    {
      "qingzhou:main-city": {
        id: "qingzhou:main-city",
        stateId: "qingzhou",
        nodeType: "main-city",
      },
      "haizhou:main-city": {
        id: "haizhou:main-city",
        stateId: "haizhou",
        nodeType: "main-city",
      },
    } as never,
    {
      geographyRegistry: {
        haizhou: createSyntheticStateDefinition(),
      },
    } as never,
  );

  assert.equal(
    getDistance(graph, "qingzhou:main-city" as never, "haizhou:main-city" as never),
    7,
  );
});

test("seeded world includes locations from an extended geography registry", () => {
  const world = createSeedWorld({
    geographyRegistry: {
      haizhou: createSyntheticStateDefinition(),
    },
  } as never);

  assert.ok(world.states.haizhou);
  assert.ok(world.locations["haizhou:main-city"]);
});

test("geography registry validation rejects disconnected states", () => {
  assert.throws(
    () =>
      createSeedWorld({
        geographyRegistry: {
          isolated: createDisconnectedStateDefinition(),
        },
      } as never),
    /cross-state|disconnected/i,
  );
});
