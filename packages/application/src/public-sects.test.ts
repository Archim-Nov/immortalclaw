import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import { buildPublicSectsDirectory } from "./public-sects.js";

test("buildPublicSectsDirectory lists player and neutral sects ranked by following", async () => {
  const world = createSeedWorld();
  const founderId = Object.keys(world.cultivators)[0];
  if (!founderId) {
    throw new Error("Seed world should include at least one cultivator.");
  }
  const founder = world.cultivators[founderId]!;
  const stateId = world.locations[founder.locationId]!.stateId;

  world.sects = {
    "sect-azure": {
      id: "sect-azure",
      name: "青云宗",
      alignment: "正道",
      stateId,
      founderCultivatorId: founderId,
      treasury: 0,
      memberIds: [founderId, "m2", "m3"],
      spiritVeins: [],
      headquarters: "loc-unknown",
      titleSlots: [],
      titleUpdateInterval: 100,
      lastTitleUpdateTick: 0,
      admissionPolicy: { minimumRealmLevel: 4, allowedMotiveBuckets: [] },
      admissionPolicyUpdatedAtTick: 0,
    },
  } as never;
  world.neutralSects = {
    "neutral-pavilion": {
      id: "neutral-pavilion",
      name: "万宝阁",
      alignment: "中立",
      stateId,
      headquarters: "loc-unknown",
      description: "买卖灵材的中立势力。",
      rewardMultiplier: 1,
      joinable: true,
      competitive: false,
      memberIds: ["m4"],
    },
  } as never;

  const payload = await buildPublicSectsDirectory({
    world: {
      async readWorld() {
        return world;
      },
    },
  });

  assert.equal(payload.tick, world.tick);
  assert.equal(payload.sects.length, 2);
  // Ranked by member count: 青云宗 (3) before 万宝阁 (1).
  assert.equal(payload.sects[0]?.id, "sect-azure");
  assert.equal(payload.sects[0]?.kind, "player");
  assert.equal(payload.sects[0]?.memberCount, 3);
  assert.equal(payload.sects[0]?.founderName, world.cultivators[founderId]?.name);
  assert.equal(payload.sects[0]?.minimumRealmLevel, 4);
  assert.equal(payload.sects[1]?.id, "neutral-pavilion");
  assert.equal(payload.sects[1]?.kind, "neutral");
  assert.equal(payload.sects[1]?.description, "买卖灵材的中立势力。");
});
