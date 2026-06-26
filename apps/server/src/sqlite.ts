import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createSchema, type SqliteDatabaseLike } from "@immortal-claw/persistence";

// Opens a node:sqlite database, ensures the parent directory exists, enables WAL,
// and creates the world schema. The returned handle satisfies SqliteDatabaseLike
// (exec + prepare → all/run), so it feeds straight into the world repository and
// the SQLite auth client.

export function openDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  createSchema(db as unknown as SqliteDatabaseLike);

  return db;
}

export function asDatabaseLike(db: DatabaseSync): SqliteDatabaseLike {
  return db as unknown as SqliteDatabaseLike;
}
