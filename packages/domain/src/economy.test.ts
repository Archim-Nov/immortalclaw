import assert from "node:assert/strict";
import test from "node:test";
import type { Cultivator, StatusEffect } from "./model.js";
import { createSeedWorld } from "./seed.js";
import {
  computeActivityContext,
  computeDaoPotential,
  computeReadiness,
  computeRecoveryState,
} from "./economy.js";

function baseCultivator(overrides: Partial<Cultivator> = {}): Cultivator {
  const world = createSeedWorld();
  const original = world.cultivators["yun-zhong-he"];
  return {
    ...original,
    inventory: { ...original.inventory },
    factionReputation: { ...original.factionReputation },
    statusEffects: [...original.statusEffects],
    activeQuests: [...original.activeQuests],
    ...overrides,
  };
}

function makeEffect(id: StatusEffect["id"]): StatusEffect {
  return {
    id,
    name: id,
    description: id,
    source: "test",
    remainingTicks: 3,
    intensity: 1,
  };
}

test("computeReadiness returns ready for healthy stocked cultivator", () => {
  const cultivator = baseCultivator({
    qi: 70,
    maxQi: 100,
    injuryTicksRemaining: 0,
    spiritStones: 100,
    statusEffects: [],
  });
  assert.equal(computeReadiness(cultivator), "ready");
});

test("computeRecoveryState returns depleted when qi is critically low", () => {
  const cultivator = baseCultivator({
    injuryTicksRemaining: 0,
    qi: 20,
    maxQi: 100,
  });
  assert.equal(computeRecoveryState(cultivator), "depleted");
});

test("computeActivityContext maps travel job to traveling", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"];
  const jobId = "job-test";
  world.jobs[jobId] = {
    id: jobId,
    cultivatorId: cultivator.id,
    actionId: "travel-to:qingzhou:sub-town-east",
    label: "Travel",
    remainingTicks: 1,
    totalTicks: 1,
  };
  cultivator.activeJobId = jobId;

  assert.equal(computeActivityContext(cultivator, world), "traveling");
});

test("computeDaoPotential returns expected shape and tier progression", () => {
  const weak = baseCultivator({
    realm: "炼气",
    realmLevel: 1,
    qi: 20,
    maxQi: 100,
    spiritualPower: 20,
    maxSpiritualPower: 100,
    spiritStones: 0,
    injuryTicksRemaining: 6,
    statusEffects: [makeEffect("poisoned"), makeEffect("deviation")],
  });
  const strong = baseCultivator({
    realm: "金丹",
    realmLevel: 9,
    qi: 100,
    maxQi: 100,
    spiritualPower: 100,
    maxSpiritualPower: 100,
    spiritStones: 400,
    injuryTicksRemaining: 0,
    statusEffects: [makeEffect("clear-mind")],
    inventory: {
      ...baseCultivator().inventory,
      "healing-pill": 2,
      "qi-pill": 2,
    },
  });

  const weakPotential = computeDaoPotential(weak);
  const strongPotential = computeDaoPotential(strong);
  const tierRank = {
    novice: 1,
    apprentice: 2,
    adept: 3,
    expert: 4,
    master: 5,
    grandmaster: 6,
  } as const;

  assert.ok(typeof weakPotential.score === "number");
  assert.ok(typeof weakPotential.breakdown.realmBase === "number");
  assert.ok(tierRank[strongPotential.tier] > tierRank[weakPotential.tier]);
  assert.ok(strongPotential.score > weakPotential.score);
});
