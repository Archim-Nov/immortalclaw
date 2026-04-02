import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { STATE_IDS } from "../../domain/src/constants.js";
import { createGeographyRegistryForTest } from "../../domain/src/geography-registry.js";
import {
  createSeedWorld,
  saveCultivationRegistration,
  toPersistedWorldState,
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

function createInstrumentedSqlStorage(options: { failWorldUpdateOnce?: boolean } = {}) {
  const database = new DatabaseSync(":memory:");
  createSchema(database);
  let worldStateSelects = 0;
  let worldStateUpdates = 0;
  let shouldFailNextWorldUpdate = options.failWorldUpdateOnce ?? false;

  const sql = {
    exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]) {
      const normalizedQuery = query.trimStart().toUpperCase();
      if (normalizedQuery.startsWith("SELECT") && query.includes("FROM world_state")) {
        worldStateSelects += 1;
      }
      if (normalizedQuery.startsWith("UPDATE WORLD_STATE")) {
        worldStateUpdates += 1;
        if (shouldFailNextWorldUpdate) {
          shouldFailNextWorldUpdate = false;
          throw new Error("Simulated sqlite persist failure");
        }
      }

      const isSelect = normalizedQuery.startsWith("SELECT");
      if (bindings.length === 0 && !isSelect) {
        database.exec(query);
        return {
          toArray() {
            return [] as T[];
          },
          one() {
            return undefined as T | undefined;
          },
          rowsRead: 0,
          rowsWritten: 0,
        };
      }

      const statement = database.prepare(query);
      if (isSelect) {
        const rows = bindings.length > 0 ? statement.all(...bindings) : statement.all();
        return {
          toArray() {
            return rows as T[];
          },
          one() {
            return (rows as T[])[0];
          },
          rowsRead: rows.length,
          rowsWritten: 0,
        };
      }

      const result = bindings.length > 0 ? statement.run(...bindings) : statement.run();
      return {
        toArray() {
          return [] as T[];
        },
        one() {
          return undefined as T | undefined;
        },
        rowsRead: 0,
        rowsWritten: Number(result.changes),
      };
    },
  };

  return {
    repository: createSqliteWorldRepository({ sql }),
    counters: {
      get worldStateSelects() {
        return worldStateSelects;
      },
      get worldStateUpdates() {
        return worldStateUpdates;
      },
    },
  };
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
  const legacyStateId = legacyEventLocationId.split(":")[0] as (typeof STATE_IDS)[number];

  (world as typeof world & { zones?: Record<string, unknown> }).zones = {
    legacy: { id: "legacy" },
  };
  world.topology.distanceMatrix = new Map([
    ["legacy-edge", "Infinity" as never],
    ["finite-edge", 12],
  ]);
  world.cultivators[cultivatorId] = {
    ...cultivator,
    neutralSectId: undefined as never,
    neutralContribution: undefined as never,
    breakthroughRecords: undefined as never,
    dungeonProgress: undefined as never,
    reputation: 34,
    karma: 12,
    stateReputation: undefined as never,
    factionReputation: {
      townsfolk: 12,
      "market-guild": 7,
      "rogue-cultivators": 4,
      "qing-yun-sect": 9,
    },
    nextTribulationTick: 42,
    realmProgress: 144,
  } as typeof cultivator & { nextTribulationTick: number };
  delete (world as unknown as Record<string, unknown>).neutralSects;
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
  assert.equal("karma" in normalizedCultivator, false);
  assert.equal("reputation" in normalizedCultivator, false);
  assert.equal(normalizedCultivator.neutralSectId, null);
  assert.equal(normalizedCultivator.neutralContribution, 0);
  assert.deepEqual(normalizedCultivator.breakthroughRecords, []);
  assert.deepEqual(normalizedCultivator.dungeonProgress, {
    丙: { highestClearedRank: 0 },
    乙: { highestClearedRank: 0 },
    甲: { highestClearedRank: 0 },
  });
  assert.equal(normalizedCultivator.realmProgress, 100);
  assert.deepEqual(
    normalizedCultivator.stateReputation,
    Object.fromEntries(
      STATE_IDS.map((stateId) => [stateId, stateId === legacyStateId ? 34 : 0]),
    ),
  );
  assert.deepEqual(normalizedCultivator.factionReputation, { "qing-yun-sect": 9 });
  assert.ok(Object.keys(normalized.neutralSects).length > 0);
  assert.equal("zoneId" in normalizedEvent, false);
  assert.equal(normalizedEvent.locationId, legacyEventLocationId);
  assert.equal("zoneId" in normalizedCombat, false);
  assert.equal(normalizedCombat.locationId, legacyEventLocationId);
  assert.equal(normalized.topology.distanceMatrix.get("legacy-edge"), undefined);
  assert.equal(normalized.topology.distanceMatrix.get("finite-edge"), undefined);
  assert.ok((normalized.topology.distanceMatrix.get("qingzhou:main-city|qingzhou:main-city") ?? 0) === 0);
});

test("deserializeStoredWorld hydrates migrated P3 structures into legacy snapshots", () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  delete (world as unknown as Record<string, unknown>).sects;
  delete (world as unknown as Record<string, unknown>).wildernessLayers;
  delete (world as unknown as Record<string, unknown>).wildernessProgress;
  delete (world as unknown as Record<string, unknown>).dungeonExpeditions;
  delete (world as unknown as Record<string, unknown>).dungeonExpeditionReports;
  delete (world as unknown as Record<string, unknown>).guixuNodes;
  delete (world as unknown as Record<string, unknown>).guixuProgress;
  delete (world as unknown as Record<string, unknown>).factionWars;
  delete (world as unknown as Record<string, unknown>).itemDefinitions;

  const cultivator = world.cultivators[cultivatorId]!;
  cultivator.inventory = ({
    "healing-pill": 1,
    "qi-pill": 0,
    "ward-talisman": 0,
    "spirit-ore": 0,
    "ruin-fragment": 0,
    "beast-core": 0,
    "sword-manual": 2,
    "alchemy-manual": 1,
    "array-manual": 1,
  } as unknown) as typeof cultivator.inventory;

  const normalized = deserializeStoredWorld(world as never);

  assert.deepEqual(normalized.sects, {});
  assert.deepEqual(normalized.wildernessLayers, {});
  assert.deepEqual(normalized.wildernessProgress, {});
  assert.deepEqual((normalized as typeof normalized & { dungeonExpeditions?: Record<string, unknown> }).dungeonExpeditions, {});
  assert.deepEqual((normalized as typeof normalized & { dungeonExpeditionReports?: Record<string, unknown> }).dungeonExpeditionReports, {});
  assert.ok(normalized.guixuNodes["guixu-threshold-gate"]);
  assert.ok(normalized.guixuProgress);
  assert.ok(normalized.factionWars["war-qingzhou-frontier"]);
  assert.ok(normalized.itemDefinitions["eight-wastes-pass"]);
  assert.ok(normalized.itemDefinitions["healing-pill"].tags.includes("pill"));
  assert.equal(normalized.itemDefinitions["eight-wastes-pass"].use.kind, "ticket");
  assert.deepEqual(normalized.itemDefinitions["eight-wastes-pass"].use.ticketTargets, ["eight-wastes-threshold"]);
  assert.equal(normalized.cultivators[cultivatorId]!.inventory["eight-wastes-pass"], 0);
  assert.equal(normalized.cultivators[cultivatorId]!.inventory["legendary-artifact"], 0);
  assert.equal("sword-manual" in (normalized.itemDefinitions as Record<string, unknown>), false);
  assert.equal("alchemy-manual" in (normalized.itemDefinitions as Record<string, unknown>), false);
  assert.equal("array-manual" in (normalized.itemDefinitions as Record<string, unknown>), false);
  assert.equal("sword-manual" in (normalized.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
  assert.equal("alchemy-manual" in (normalized.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
  assert.equal("array-manual" in (normalized.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
});

test("deserializeStoredWorld backfills dungeon expedition flavor arrays in legacy snapshots", () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  world.dungeonExpeditions = ({
    [cultivatorId]: {
      cultivatorId,
      jobId: "legacy-expedition-job",
      locationId: "qingzhou:dungeon-c",
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      startedAtTick: 12,
      stepIndex: 1,
      maxSteps: 10,
      nextResolutionTick: 15,
      searchSteps: 1,
      guardianSteps: 0,
      primaryMaterialCount: 2,
      secondaryDrops: { "ruin-fragment": 1 },
      spiritStoneGain: 18,
      realmProgressGain: 4,
      unlockedNextRank: false,
      lastResolvedAction: "search",
    },
  } as unknown) as typeof world.dungeonExpeditions;
  world.dungeonExpeditionReports = ({
    [cultivatorId]: {
      cultivatorId,
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      outcome: "completed",
      startedAtTick: 12,
      endedAtTick: 42,
      stepsResolved: 10,
      primaryMaterial: {
        itemId: "qi-common",
        count: 3,
      },
      secondaryDrops: { "ruin-fragment": 2 },
      spiritStoneGain: 60,
      realmProgressGain: 12,
      unlockedNextRank: true,
      returnLocationId: "qingzhou:main-city",
      summary: "Legacy expedition summary.",
    },
  } as unknown) as typeof world.dungeonExpeditionReports;

  const normalized = deserializeStoredWorld(world as never);

  assert.deepEqual(normalized.dungeonExpeditions[cultivatorId]?.flavorEventTitles, []);
  assert.deepEqual(normalized.dungeonExpeditionReports[cultivatorId]?.flavorEvents, []);
});

test("deserializeStoredWorld merges newly registered geography while preserving cultivator positions", () => {
  const world = createSeedWorld();
  const cultivatorId = "yun-zhong-he";
  const persisted = toPersistedWorldState(world) as typeof toPersistedWorldState extends (...args: never[]) => infer T ? T : never;
  const registry = createGeographyRegistryForTest({
    haizhou: createSyntheticStateDefinition(),
  });

  (persisted as Record<string, unknown>).eventPools = {
    globalCommon: [],
    stateSpecific: {},
    travelStateSpecific: {},
    nodeSpecific: {},
    travelPool: [],
  };

  const hydrated = deserializeStoredWorld(persisted as never, {
    geographyRegistry: registry,
  } as never);

  assert.equal(hydrated.cultivators[cultivatorId]?.locationId, world.cultivators[cultivatorId]?.locationId);
  assert.ok(hydrated.states.haizhou);
  assert.ok(hydrated.locations["haizhou:main-city"]);
  assert.ok(hydrated.questBoards["haizhou:main-city"]);
  assert.ok((hydrated.eventPools.travelStateSpecific as Record<string, unknown>).qingzhou);
});

test("repository reuses a hydrated in-memory cache across repeated reads", async () => {
  const { repository, counters } = createInstrumentedSqlStorage();

  const first = await repository.readWorld();
  const second = await repository.readWorld();

  assert.equal(counters.worldStateSelects, 1);
  assert.deepEqual(second, first);
});

test("repository discards dirty cache after persist failure", async () => {
  const { repository, counters } = createInstrumentedSqlStorage({ failWorldUpdateOnce: true });
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  await assert.rejects(
    () =>
      repository.transactWorld((draftWorld) => {
        draftWorld.cultivators[cultivatorId]!.spiritStones += 99;
        return null;
      }),
    /Simulated sqlite persist failure/,
  );

  const hydrated = await repository.readWorld();

  assert.equal(hydrated.cultivators[cultivatorId]!.spiritStones, world.cultivators[cultivatorId]!.spiritStones);
  assert.equal(counters.worldStateSelects, 2);
});
