export const SQLITE_WORLD_SCHEMA = `
CREATE TABLE IF NOT EXISTS world_state (
  world_key TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  tick INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cultivator_records (
  cultivator_id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  snapshot TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS world_actions (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  cultivator_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  accepted INTEGER NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_world_actions_tick ON world_actions(tick DESC);
CREATE INDEX IF NOT EXISTS idx_world_actions_cultivator ON world_actions(cultivator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_world_events_tick ON world_events(tick DESC);

CREATE TABLE IF NOT EXISTS tick_runs (
  id TEXT PRIMARY KEY,
  tick INTEGER NOT NULL,
  advanced_ticks INTEGER NOT NULL,
  trigger TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tick_runs_recorded_at ON tick_runs(recorded_at DESC);
`;

export interface SqlSchemaStorage {
  exec(query: string, ...bindings: unknown[]): unknown;
}

export interface SqliteDatabaseStatement {
  all(...bindings: unknown[]): unknown[];
  run(...bindings: unknown[]): { changes: number | bigint };
}

export interface SqliteDatabaseLike {
  exec(query: string): void;
  prepare(query: string): SqliteDatabaseStatement;
}

export function createSchema(storage: SqlSchemaStorage): void {
  for (const statement of SQLITE_WORLD_SCHEMA
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    storage.exec(`${statement};`);
  }
}
