import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import { buildSectLevel, calculateSectLevel, sectBonusValue } from "./sect-level.js";
import { buildFullTopology } from "./topology.js";

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
  }
}

function seedLegacyPlayerSect(world: ReturnType<typeof createSeedWorld>) {
  world.sects["qing-yun-sect"] = {
    id: "qing-yun-sect",
    name: "Qing Yun Sect",
    alignment: "正道",
    stateId: "qingzhou",
    founderCultivatorId: "yun-zhong-he",
    treasury: 86000,
    memberIds: [],
    spiritVeins: ["Azure Ridge"],
    headquarters: "qingzhou:sect-outpost:qing-yun-sect",
    titleSlots: [
      { title: "外门", threshold: 0, maxSlots: Number.POSITIVE_INFINITY },
      { title: "内门", threshold: 200, maxSlots: 32 },
      { title: "精英", threshold: 600, maxSlots: 16 },
      { title: "长老", threshold: 1500, maxSlots: 4 },
      { title: "宗主", threshold: Number.POSITIVE_INFINITY, maxSlots: 1 },
    ],
    titleUpdateInterval: 2880,
    lastTitleUpdateTick: 0,
    admissionPolicy: {
      minimumRealmLevel: 1,
      allowedMotiveBuckets: ["dao-truth"],
    },
    admissionPolicyUpdatedAtTick: 0,
  };

  world.locations["qingzhou:sect-outpost:qing-yun-sect"] = {
    id: "qingzhou:sect-outpost:qing-yun-sect",
    stateId: "qingzhou",
    nodeType: "sect-outpost",
    name: "Qing Yun Sect Outpost",
    kind: "safe",
    risk: "safe",
    description: "Legacy player sect outpost for sect level tests.",
    organizationId: "qing-yun-sect",
    organizationType: "player-sect",
  };
  if (!world.states.qingzhou.locationIds.includes("qingzhou:sect-outpost:qing-yun-sect")) {
    world.states.qingzhou.locationIds.push("qingzhou:sect-outpost:qing-yun-sect");
  }
  world.topology = buildFullTopology(world.locations) as typeof world.topology;
}

function prepareSectWarWorld() {
  const world = createSeedWorld();
  seedLegacyPlayerSect(world);
  const sect = world.sects["qing-yun-sect"]!;
  const first = world.cultivators["yun-zhong-he"]!;
  const secondSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-sect-peer",
    name: "Shen Qing",
  });
  const second = world.cultivators[secondSummary.selectedCultivatorId]!;

  assert.ok(sect);

  sect.memberIds = [first.id, second.id];
  first.sectId = sect.id;
  second.sectId = sect.id;
  first.locationId = "qingzhou:sect-outpost:qing-yun-sect";
  second.locationId = "qingzhou:sect-outpost:qing-yun-sect";
  first.totalContribution = 3200;
  second.totalContribution = 1800;

  return { world, first, second, sect };
}

test("sect level scales from total sect contribution and exposes shared bonuses", () => {
  const { world, sect } = prepareSectWarWorld();
  const sectLevel = buildSectLevel(world, sect.id);

  assert.ok(sectLevel);
  assert.equal(calculateSectLevel(5000), sectLevel?.level);
  assert.ok((sectLevel?.bonuses.length ?? 0) > 0);
  assert.ok(sectBonusValue(sectLevel ?? null, "resource") > 0);
});

test("sect level bonuses increase errand rewards for all sect members", () => {
  const { world, first, second } = prepareSectWarWorld();
  const firstBefore = first.spiritStones;
  const secondBefore = second.spiritStones;

  performAction(world, first.id, "take-sect-errand");
  runUntilIdle(world, first.id);

  performAction(world, second.id, "take-sect-errand");
  runUntilIdle(world, second.id);

  assert.ok(first.spiritStones - firstBefore > 180);
  assert.ok(second.spiritStones - secondBefore > 180);
});

test("sect errands advance the active faction war objective for the sect alignment", () => {
  const { world, first } = prepareSectWarWorld();
  const war = world.factionWars["war-qingzhou-frontier"]!;
  const before = war.objectives[0]!.progress.righteous;

  performAction(world, first.id, "take-sect-errand");
  runUntilIdle(world, first.id);

  assert.ok(war.objectives[0]!.progress.righteous > before);
});
