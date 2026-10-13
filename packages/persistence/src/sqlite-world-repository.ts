import { stampActionRejection } from "../../domain/src/gameplay-error.js";
import {
  advanceWorld as advanceWorldState,
  getCultivationRegistration,
  getCultivatorState as readCultivatorState,
  createSeedPersistedWorld,
  hydrateWorldState,
  listAvailableActions as readAvailableActions,
  performAction as performWorldAction,
  toPersistedWorldState,
} from "../../domain/src/runtime.js";
import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivatorStateView,
  PersistedWorldState,
  ProjectedPersistedWorldState,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type { WorldEvent } from "../../domain/src/model.js";
import { STATE_IDS } from "../../domain/src/constants.js";
import type { SqliteDatabaseLike } from "./sqlite-schema.js";
import { hydrateMigratedP3WorldState } from "./world-shape.js";
import type { TickRunRecord, WorldRepository } from "./world-repository.js";

const DEFAULT_WORLD_KEY = "primary";

interface WorldSnapshotRow {
  version: number;
  tick: number;
  updated_at: string;
  payload: string;
}

interface TickRunRow {
  tick: number;
  advanced_ticks: number;
  trigger: TickRunRecord["trigger"];
  recorded_at: string;
}

type JsonSafeNumber = number | "Infinity";

export interface SqlStorageCursor<T> {
  toArray(): T[];
  one(): T | undefined;
  readonly rowsRead: number;
  readonly rowsWritten: number;
}

export interface SqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>;
}

export interface SqliteWorldRepositoryOptions {
  sql: SqlStorage;
  now?: () => string;
  worldKey?: string;
}

export interface CreateSqliteWorldRepositoryOptions {
  sql?: SqlStorage;
  database?: SqliteDatabaseLike;
  now?: () => string;
  worldKey?: string;
}

interface DeserializeStoredWorldOptions {
  geographyRegistry?: import("../../domain/src/geography-registry.js").GeographyRegistryOverrides;
}

function createSqlStorageCursor<T>(
  rows: T[],
  rowsWritten: number,
): SqlStorageCursor<T> {
  return {
    toArray() {
      return rows;
    },
    one() {
      return rows[0];
    },
    rowsRead: rows.length,
    rowsWritten,
  };
}

function createDatabaseSqlStorage(database: SqliteDatabaseLike): SqlStorage {
  return {
    exec<T>(query: string, ...bindings: unknown[]): SqlStorageCursor<T> {
      const normalizedQuery = query.trimStart().toUpperCase();
      const isSelect = normalizedQuery.startsWith("SELECT");

      if (bindings.length === 0 && !isSelect) {
        database.exec(query);
        return createSqlStorageCursor<T>([], 0);
      }

      const statement = database.prepare(query);
      if (isSelect) {
        const rows = bindings.length > 0 ? statement.all(...bindings) : statement.all();
        return createSqlStorageCursor(rows as T[], 0);
      }

      const result = bindings.length > 0 ? statement.run(...bindings) : statement.run();
      return createSqlStorageCursor<T>([], Number(result.changes));
    },
  };
}

function serializeFiniteNumber(value: number): JsonSafeNumber {
  return Number.isFinite(value) ? value : "Infinity";
}

function deserializeFiniteNumber(value: unknown): number {
  if (value === null || value === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }
  return typeof value === "number" ? value : Number(value);
}

function serializeWorldForStorage(world: ProjectedPersistedWorldState): PersistedWorldState {
  const copy = structuredClone(world);

  for (const sect of Object.values(copy.sects)) {
    sect.titleSlots = sect.titleSlots.map((slot) => ({
      ...slot,
      threshold: deserializeFiniteNumber(serializeFiniteNumber(slot.threshold)),
      maxSlots: deserializeFiniteNumber(serializeFiniteNumber(slot.maxSlots)),
    }));
  }

  return copy;
}

// MIGRATION: Converts legacy zoneId fields from pre-九州 snapshots to locationId.
function normalizeLegacyZoneField<T extends { locationId?: string; zoneId?: string }>(entry: T): T {
  if (entry.zoneId !== undefined && entry.locationId === undefined) {
    entry.locationId = entry.zoneId;
  }

  delete entry.zoneId;
  return entry;
}

// MIGRATION: Strips retired faction names from pre-九州 snapshots.
function stripLegacyCityShellStandings(factionReputation: Record<string, number>): Record<string, number> {
  const copy = { ...factionReputation };
  delete copy.townsfolk;
  delete copy["market-guild"];
  delete copy["rogue-cultivators"];
  return copy;
}

function normalizeStateReputation(
  stateReputation: unknown,
  legacyReputation: unknown,
  locationId: string,
): Record<(typeof STATE_IDS)[number], number> {
  const normalized = Object.fromEntries(STATE_IDS.map((stateId) => [stateId, 0])) as Record<(typeof STATE_IDS)[number], number>;
  let hasExplicitStateValue = false;

  if (stateReputation && typeof stateReputation === "object") {
    for (const stateId of STATE_IDS) {
      const rawValue = (stateReputation as Record<string, unknown>)[stateId];
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        normalized[stateId] = rawValue;
        hasExplicitStateValue = true;
      }
    }
  }

  if (!hasExplicitStateValue && typeof legacyReputation === "number" && Number.isFinite(legacyReputation)) {
    normalized[locationId.split(":")[0] as (typeof STATE_IDS)[number]] = legacyReputation;
  }

  return normalized;
}

function normalizeStoredWorldShape(world: WorldState): WorldState {
  const copy = hydrateMigratedP3WorldState(world);

  delete (copy as WorldState & { zones?: unknown }).zones;

  for (const cultivator of Object.values(copy.cultivators)) {
    // MIGRATION: Strip retired legacy fields from pre-九州 cultivator snapshots.
    const legacyCultivator = cultivator as typeof cultivator & {
      nextTribulationTick?: unknown;
      reputation?: unknown;
      karma?: unknown;
      stateReputation?: unknown;
    };
    delete legacyCultivator.nextTribulationTick;
    if (cultivator.neutralSectId === undefined) {
      cultivator.neutralSectId = null;
    }
    if (cultivator.neutralContribution === undefined) {
      cultivator.neutralContribution = 0;
    }
    cultivator.stateReputation = normalizeStateReputation(
      legacyCultivator.stateReputation,
      legacyCultivator.reputation,
      cultivator.locationId,
    );
    delete legacyCultivator.reputation;
    delete legacyCultivator.karma;
    cultivator.factionReputation = stripLegacyCityShellStandings(cultivator.factionReputation ?? {});
    if (!Array.isArray(cultivator.productionQueue)) {
      cultivator.productionQueue = [];
    }
    if (!Array.isArray(cultivator.pendingGifts)) {
      cultivator.pendingGifts = [];
    }
    if (typeof cultivator.lastGiftTick !== "number") {
      cultivator.lastGiftTick = -1;
    }
    if (!Array.isArray(cultivator.guixuCompletedNodeIds)) {
      cultivator.guixuCompletedNodeIds = [];
    }
  }

  const legacyCopy = copy as unknown as Record<string, unknown>;
  if (!copy.commissions || typeof copy.commissions !== "object") {
    legacyCopy.commissions = {};
  }
  if (typeof legacyCopy.nextCommissionSequence !== "number") {
    legacyCopy.nextCommissionSequence = 1;
  }

  for (const event of copy.worldEvents) {
    normalizeLegacyZoneField(event as typeof event & { zoneId?: string });
  }

  for (const combatLog of copy.combatLogs) {
    normalizeLegacyZoneField(combatLog as typeof combatLog & { zoneId?: string });
  }

  return copy;
}

function deserializeStoredWorld(
  world: PersistedWorldState | WorldState,
  options: DeserializeStoredWorldOptions = {},
): WorldState {
  const copy = normalizeStoredWorldShape(world as WorldState);

  for (const sect of Object.values(copy.sects)) {
    sect.titleSlots = sect.titleSlots.map((slot) => ({
      ...slot,
      threshold: deserializeFiniteNumber(slot.threshold),
      maxSlots: deserializeFiniteNumber(slot.maxSlots),
    }));
  }

  return hydrateMigratedP3WorldState(copy, options);
}

export class SqliteWorldRepository implements WorldRepository {
  private readonly now: () => string;
  private readonly worldKey: string;
  private cachedSnapshot: { world: WorldState; revision: number } | null = null;

  constructor(private readonly sql: SqlStorage, options: Omit<SqliteWorldRepositoryOptions, "sql"> = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.worldKey = options.worldKey ?? DEFAULT_WORLD_KEY;
  }

  async readWorld(): Promise<WorldState> {
    const snapshot = this.getSnapshot();
    return structuredClone(snapshot.world);
  }

  async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
    const snapshot = this.getSnapshot();
    const draftWorld = structuredClone(snapshot.world);
    const result = mutator(draftWorld);

    try {
      this.commitWorld(draftWorld, snapshot.revision);
      return structuredClone(result);
    } catch (error) {
      this.cachedSnapshot = null;
      throw error;
    }
  }

  async getWorldMetadata(): Promise<{ tick: number; updatedAt: string }> {
    if (this.cachedSnapshot) {
      return {
        tick: this.cachedSnapshot.world.tick,
        updatedAt: this.cachedSnapshot.world.updatedAt,
      };
    }

    const row = this.readWorldRow();
    if (row) {
      return {
        tick: row.tick,
        updatedAt: row.updated_at,
      };
    }

    const world = await this.readWorld();
    return {
      tick: world.tick,
      updatedAt: world.updatedAt,
    };
  }

  async getCultivatorState(cultivatorId: string): Promise<CultivatorStateView> {
    return readCultivatorState(await this.readWorld(), cultivatorId);
  }

  async listAvailableActions(cultivatorId: string): Promise<AvailableAction[]> {
    return readAvailableActions(await this.readWorld(), cultivatorId);
  }

  async performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult> {
    const snapshot = this.getSnapshot();
    const draftWorld = structuredClone(snapshot.world);

    try {
      const result = performWorldAction(draftWorld, cultivatorId, actionId);
      this.commitWorld(draftWorld, snapshot.revision);
      this.insertWorldAction(result);
      return structuredClone(result);
    } catch (error) {
      this.cachedSnapshot = null;
      throw stampActionRejection(error);
    }
  }

  async advanceWorld(steps: number, trigger: TickRunRecord["trigger"] = "manual"): Promise<TickSummary> {
    const snapshot = this.getSnapshot();
    const draftWorld = structuredClone(snapshot.world);

    try {
      const summary = advanceWorldState(draftWorld, steps);
      const recordedAt = this.now();

      this.commitWorld(draftWorld, snapshot.revision);
      this.insertTickRun(summary, trigger, recordedAt);
      this.insertWorldEvents(summary.triggeredEvents, recordedAt);

      return structuredClone(summary);
    } catch (error) {
      this.cachedSnapshot = null;
      throw error;
    }
  }

  async getLatestTickRun(): Promise<TickRunRecord | null> {
    const row = this.sql.exec<TickRunRow>(
      `SELECT tick, advanced_ticks, trigger, recorded_at
       FROM tick_runs
       ORDER BY recorded_at DESC
       LIMIT 1`,
    ).toArray()[0];

    if (!row) {
      return null;
    }

    return {
      tick: row.tick,
      advancedTicks: row.advanced_ticks,
      trigger: row.trigger,
      recordedAt: row.recorded_at,
    };
  }

  async getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null> {
    return getCultivationRegistration(await this.readWorld(), cultivatorId);
  }

  async resetWorldStorage(): Promise<void> {
    this.sql.exec("DELETE FROM tick_runs");
    this.sql.exec("DELETE FROM world_events");
    this.sql.exec("DELETE FROM world_actions");
    this.sql.exec("DELETE FROM cultivator_records");
    this.sql.exec("DELETE FROM world_state");
    this.cachedSnapshot = null;
  }

  private getSnapshot(): { world: WorldState; revision: number } {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    const snapshot = this.readSnapshotFromStorage();
    this.cachedSnapshot = snapshot;
    return snapshot;
  }

  private readSnapshotFromStorage(): { world: WorldState; revision: number } {
    const row = this.readWorldRow();
    if (row) {
      return {
        world: deserializeStoredWorld(JSON.parse(row.payload) as PersistedWorldState),
        revision: row.version,
      };
    }

    const seedWorld = createSeedPersistedWorld();
    const seededAt = this.now();
    this.insertInitialSnapshot(seedWorld, seededAt);
    const seededWorld = structuredClone(seedWorld);
    seededWorld.updatedAt = seededAt;
    return {
      world: hydrateWorldState(seededWorld),
      revision: 1,
    };
  }

  private readWorldRow(): WorldSnapshotRow | undefined {
    return this.sql.exec<WorldSnapshotRow>(
      `SELECT version, tick, updated_at, payload
       FROM world_state
       WHERE world_key = ?
       LIMIT 1`,
      this.worldKey,
    ).toArray()[0];
  }

  private insertInitialSnapshot(world: ProjectedPersistedWorldState, updatedAt = this.now()): void {
    const persistedWorld = structuredClone(world);
    persistedWorld.updatedAt = updatedAt;

    this.sql.exec(
      `INSERT INTO world_state (world_key, version, tick, updated_at, payload)
       VALUES (?, ?, ?, ?, ?)`,
      this.worldKey,
      1,
      persistedWorld.tick,
      persistedWorld.updatedAt,
      JSON.stringify(serializeWorldForStorage(persistedWorld)),
    );
    this.upsertCultivatorRecords(persistedWorld);
  }

  private persistWorld(world: ProjectedPersistedWorldState, expectedRevision: number): number {
    world.updatedAt = this.now();

    const result = this.sql.exec(
      `UPDATE world_state
       SET version = ?, tick = ?, updated_at = ?, payload = ?
       WHERE world_key = ? AND version = ?`,
      expectedRevision + 1,
      world.tick,
      world.updatedAt,
      JSON.stringify(serializeWorldForStorage(world)),
      this.worldKey,
      expectedRevision,
    );

    if (result.rowsWritten === 0) {
      throw Object.assign(new Error("World snapshot changed before write. Retry the request."), {
        status: 409,
      });
    }

    this.upsertCultivatorRecords(world);
    return expectedRevision + 1;
  }

  private commitWorld(world: WorldState, expectedRevision: number): void {
    const persistedWorld = toPersistedWorldState(world);
    const revision = this.persistWorld(persistedWorld, expectedRevision);
    this.cachedSnapshot = {
      world: hydrateWorldState(persistedWorld),
      revision,
    };
  }

  private upsertCultivatorRecords(world: ProjectedPersistedWorldState): void {
    for (const cultivator of Object.values(world.cultivators)) {
      this.sql.exec(
        `INSERT INTO cultivator_records (cultivator_id, tick, updated_at, snapshot)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cultivator_id) DO UPDATE SET
           tick = excluded.tick,
           updated_at = excluded.updated_at,
           snapshot = excluded.snapshot`,
        cultivator.id,
        world.tick,
        world.updatedAt,
        JSON.stringify(structuredClone(cultivator)),
      );
    }
  }

  private insertWorldAction(result: ActionExecutionResult): void {
    this.sql.exec(
      `INSERT INTO world_actions (id, tick, cultivator_id, action_id, accepted, summary, created_at, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      result.tick,
      result.cultivatorId,
      result.actionId,
      result.accepted ? 1 : 0,
      result.summary,
      this.now(),
      JSON.stringify(result),
    );
  }

  private insertWorldEvents(events: WorldEvent[], createdAt: string): void {
    for (const event of events) {
      this.sql.exec(
        `INSERT INTO world_events (id, tick, event_type, created_at, payload)
         VALUES (?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        event.tick,
        event.title,
        createdAt,
        JSON.stringify(event),
      );
    }
  }

  private insertTickRun(summary: TickSummary, trigger: TickRunRecord["trigger"], recordedAt: string): void {
    // MIGRATION: Strip retired tribulations field from pre-cleanup tick summaries.
    const persistedSummary = structuredClone(summary) as TickSummary & { tribulations?: unknown };
    delete persistedSummary.tribulations;

    this.sql.exec(
      `INSERT INTO tick_runs (id, tick, advanced_ticks, trigger, recorded_at, payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      persistedSummary.tick,
      persistedSummary.advancedTicks,
      trigger,
      recordedAt,
      JSON.stringify(persistedSummary),
    );
  }
}

export function createSqliteWorldRepository(options: CreateSqliteWorldRepositoryOptions): SqliteWorldRepository {
  const sql = options.sql ?? (options.database ? createDatabaseSqlStorage(options.database) : null);
  if (!sql) {
    throw new Error("SqliteWorldRepository requires either sql or database.");
  }

  return new SqliteWorldRepository(sql, {
    now: options.now,
    worldKey: options.worldKey,
  });
}

export { deserializeStoredWorld };
