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
  world.messages = [];

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

test("buildPublicWorldChronicle includes spoken lines as dialogue", async () => {
  const world = seedWithActivity();
  const cultivatorId = Object.keys(world.cultivators)[0]!;
  world.messages = [
    {
      id: "msg-spoken",
      cultivatorId,
      tick: 11,
      from: "青萝",
      fromCultivatorId: cultivatorId,
      toCultivatorId: "someone-else",
      subject: "城门口",
      content: "长信正文不该盖过嘴里那句。",
      spokenLine: "今夜子时，青岚城见。",
    },
    {
      id: "msg-blank",
      cultivatorId,
      tick: 12,
      from: "空",
      subject: "无",
      content: "   ",
    },
    {
      id: "msg-registry",
      cultivatorId,
      tick: 13,
      from: "Immortal Registry",
      subject: "Registration Locked",
      content: "Registration has been recorded.",
    },
  ];

  const payload = await buildPublicWorldChronicle({
    world: {
      async readWorld() {
        return world;
      },
    },
  });

  assert.equal(payload.entries[0]?.id, "dialogue:msg-spoken");
  assert.equal(payload.entries[0]?.kind, "dialogue");
  assert.equal(payload.entries[0]?.summary, "今夜子时，青岚城见。");
  assert.equal(payload.entries[0]?.actorName, "青萝");
  assert.equal(payload.entries.some((entry) => entry.id === "dialogue:msg-blank"), false);
  assert.equal(payload.entries.some((entry) => entry.id === "dialogue:msg-registry"), false);
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
