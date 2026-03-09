import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { WorldState } from "./model.js";
import { createSeedWorld } from "./seed.js";

type StoreOptions = {
  filePath?: string;
};

function cloneWorld(world: WorldState): WorldState {
  return structuredClone(world);
}

export class SqliteWorldStore {
  readonly filePath: string;
  private readonly db: DatabaseSync;

  constructor(options: StoreOptions = {}) {
    this.filePath = resolve(options.filePath ?? "data/immortal-world.sqlite");
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA busy_timeout = 3000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS world_snapshots (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        tick INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `);
    this.ensureSeed();
  }

  private ensureSeed(): void {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM world_snapshots WHERE id = 1")
      .get() as { count: number };
    if (row.count > 0) {
      return;
    }

    const world = createSeedWorld();
    this.saveInsideTransaction(world);
  }

  private readInsideTransaction(): WorldState {
    const row = this.db
      .prepare("SELECT payload FROM world_snapshots WHERE id = 1")
      .get() as { payload: string } | undefined;

    if (!row) {
      const world = createSeedWorld();
      this.saveInsideTransaction(world);
      return world;
    }

    return JSON.parse(row.payload) as WorldState;
  }

  private saveInsideTransaction(world: WorldState): void {
    world.updatedAt = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO world_snapshots (id, version, tick, updated_at, payload)
        VALUES (1, @version, @tick, @updatedAt, @payload)
        ON CONFLICT(id) DO UPDATE SET
          version = excluded.version,
          tick = excluded.tick,
          updated_at = excluded.updated_at,
          payload = excluded.payload
      `)
      .run({
        version: world.version,
        tick: world.tick,
        updatedAt: world.updatedAt,
        payload: JSON.stringify(world),
      });
  }

  read(): WorldState {
    return cloneWorld(this.readInsideTransaction());
  }

  write(world: WorldState): void {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      this.saveInsideTransaction(cloneWorld(world));
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  transact<TResult>(mutate: (world: WorldState) => TResult): TResult {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const world = this.readInsideTransaction();
      const result = mutate(world);
      this.saveInsideTransaction(world);
      this.db.exec("COMMIT;");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

export function createWorldStore(options: StoreOptions = {}): SqliteWorldStore {
  return new SqliteWorldStore(options);
}
