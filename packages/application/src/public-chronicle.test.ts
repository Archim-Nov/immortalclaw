import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type { WorldState } from "../../domain/src/runtime.js";
import { buildPublicWorldChronicle } from "./public-chronicle.js";

function seedWithActivity(): WorldState {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  world.worldEvents = [
    { id: "evt-late", tick: 9, cultivatorId, locationId: "loc", title: "Late event", content: "newer", severity: "low", tags: ["道"] },
    { id: "evt-early", tick: 3, cultivatorId: null, locationId: "loc", title: "Early event", content: "older", severity: "high", tags: [] },
  ];
  world.combatLogs = [
    {
      id: "cmb-mid",
      tick: 6,
      cultivatorId,
      locationId: "loc",
      encounterId: "enc-1",
      enemyName: "妖兽",
      outcome: "victory",
      damageTaken: 10,
      spiritualPowerSpent: 5,
      loot: {},
      summary: "Won the fight.",
    },
  ];

  return world;
}

test("buildPublicWorldChronicle merges events and combats newest-first with actor names", async () => {
  const world = seedWithActivity();
  const cultivatorId = Object.keys(world.cultivators)[0]!;

  const payload = await buildPublicWorldChronicle({
    world: {
      async readWorld() {
        return world;
      },
    },
  });

  assert.equal(payload.tick, world.tick);
  assert.deepEqual(
    payload.entries.map((entry) => entry.id),
    ["event:evt-late", "combat:cmb-mid", "event:evt-early"],
  );
  assert.equal(payload.entries[0]?.kind, "event");
  assert.equal(payload.entries[0]?.actorName, world.cultivators[cultivatorId]?.name);
  assert.equal(payload.entries[1]?.kind, "combat");
  assert.equal(payload.entries[1]?.tone, "victory");
  assert.equal(payload.entries[2]?.actorName, null);
});

test("buildPublicWorldChronicle clamps the limit", async () => {
  const world = seedWithActivity();

  const payload = await buildPublicWorldChronicle({
    world: {
      async readWorld() {
        return world;
      },
    },
    limit: 2,
  });

  assert.equal(payload.entries.length, 2);
});
