import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  createSeedWorld,
  saveCultivationRegistration,
  type CultivationRegistrationRecord,
} from "../../domain/src/runtime.js";
import { createSchema } from "./sqlite-schema.js";
import {
  createSqliteWorldRepository,
  deserializeStoredWorld,
  SqliteWorldRepository,
} from "./sqlite-world-repository.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "A",
      Q2: "B",
      Q3: "C",
      Q4: "D",
      Q5: "A",
      Q6: "B",
      Q7: "C",
      Q8: "D",
      Q9: "A",
      Q10: "B",
      Q11: "C",
      Q12: "D",
      Q13: "A",
      Q14: "B",
      Q15: "C",
      Q16: "D",
      Q17: "A",
      Q18: "B",
    },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      behavior_aspect: "Water / Observation",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 8,
      },
      spirit_root_result: "Water single root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator with clear water dominance.",
  };
}

function createRepository(now = () => "2026-03-10T00:00:00.000Z") {
  const database = new DatabaseSync(":memory:");
  createSchema(database);
  return createSqliteWorldRepository({ database, now });
}

test("SqliteWorldRepository constructor does not create schema", () => {
  const queries: string[] = [];
  const sql = {
    exec(query: string) {
      queries.push(query);
      return {
        toArray() {
          return [];
        },
        one() {
          return undefined;
        },
        rowsRead: 0,
        rowsWritten: 0,
      };
    },
  };

  new SqliteWorldRepository(sql);

  assert.deepEqual(queries, []);
});

test("createSchema creates the expected world tables and indexes", () => {
  const database = new DatabaseSync(":memory:");
  createSchema(database);

  const tableNames = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);
  const indexNames = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);

  assert.deepEqual(tableNames, [
    "cultivator_records",
    "tick_runs",
    "world_actions",
    "world_events",
    "world_state",
  ]);
  assert.ok(indexNames.includes("idx_tick_runs_recorded_at"));
  assert.ok(indexNames.includes("idx_world_actions_cultivator"));
  assert.ok(indexNames.includes("idx_world_actions_tick"));
  assert.ok(indexNames.includes("idx_world_events_tick"));
});

test("readWorld seeds sqlite and getWorldMetadata tracks the stored snapshot", async () => {
  const repository = createRepository();

  const first = await repository.readWorld();
  const second = await repository.readWorld();
  const metadata = await repository.getWorldMetadata();

  assert.deepEqual(second, first);
  assert.notEqual(second, first);
  assert.equal(metadata.tick, first.tick);
  assert.equal(metadata.updatedAt, first.updatedAt);
});

test("transactWorld persists mutations and preserves cloned results", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const mutatedCultivator = await repository.transactWorld((draftWorld) => {
    draftWorld.cultivators[cultivatorId].spiritStones += 42;
    return draftWorld.cultivators[cultivatorId];
  });
  mutatedCultivator.spiritStones = -1;

  const refreshedWorld = await repository.readWorld();
  assert.equal(refreshedWorld.cultivators[cultivatorId].spiritStones, world.cultivators[cultivatorId].spiritStones + 42);
  assert.notEqual(refreshedWorld.cultivators[cultivatorId].spiritStones, mutatedCultivator.spiritStones);
});

test("world mutation methods write logs and registration records", async () => {
  const repository = createRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const actions = await repository.listAvailableActions(cultivatorId);
  assert.ok(actions.length > 0);

  const actionResult = await repository.performAction(cultivatorId, actions[0]!.actionId);
  const summary = await repository.advanceWorld(1);

  await repository.transactWorld((draftWorld) => {
    saveCultivationRegistration(draftWorld, cultivatorId, createRegistrationRecord(), "agent-1");
    return null;
  });

  const registration = await repository.getCultivationRegistration(cultivatorId);
  const latestTickRun = await repository.getLatestTickRun();

  assert.equal(actionResult.cultivatorId, cultivatorId);
  assert.ok(registration);
  assert.equal(registration?.cultivator_id, cultivatorId);
  assert.equal(latestTickRun?.tick, summary.tick);
});

test("deserializeStoredWorld normalizes legacy stored snapshot fields", () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const cultivator = world.cultivators[cultivatorId];
  const legacyEventLocationId = cultivator.locationId;

  (world as typeof world & { zones?: Record<string, unknown> }).zones = {
    legacy: { id: "legacy" },
  };
  world.topology.distanceMatrix = new Map([
    ["legacy-edge", "Infinity" as never],
    ["finite-edge", 12],
  ]);
  world.cultivators[cultivatorId] = {
    ...cultivator,
    nextTribulationTick: 42,
  } as typeof cultivator & { nextTribulationTick: number };
  world.worldEvents = [
    {
      id: "legacy-event",
      tick: world.tick,
      cultivatorId,
      zoneId: legacyEventLocationId,
      title: "Legacy Event",
      content: "Stored with legacy zoneId",
      severity: "low",
      tags: ["legacy"],
    } as never,
  ];
  world.combatLogs = [
    {
      id: "legacy-combat",
      tick: world.tick,
      cultivatorId,
      zoneId: legacyEventLocationId,
      encounterId: "mine-beast",
      enemyName: "Mine Beast",
      outcome: "victory",
      damageTaken: 0,
      spiritualPowerSpent: 0,
      loot: {},
      summary: "Stored with legacy zoneId",
    } as never,
  ];

  const normalized = deserializeStoredWorld(world as never);
  const normalizedCultivator = normalized.cultivators[cultivatorId];
  const normalizedEvent = normalized.worldEvents[0];
  const normalizedCombat = normalized.combatLogs[0];

  assert.equal("zones" in normalized, false);
  assert.equal("nextTribulationTick" in normalizedCultivator, false);
  assert.equal("zoneId" in normalizedEvent, false);
  assert.equal(normalizedEvent.locationId, legacyEventLocationId);
  assert.equal("zoneId" in normalizedCombat, false);
  assert.equal(normalizedCombat.locationId, legacyEventLocationId);
  assert.equal(normalized.topology.distanceMatrix.get("legacy-edge"), Infinity);
  assert.equal(normalized.topology.distanceMatrix.get("finite-edge"), 12);
});
