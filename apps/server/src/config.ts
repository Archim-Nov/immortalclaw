import type { WorldDOEnv } from "@immortal-claw/world-do/env";

// Self-hosted server configuration, parsed and validated from the environment.
// Fails fast with a clear message on invalid input (boundary validation).

export interface ServerConfig {
  port: number;
  dbPath: string;
  env: WorldDOEnv;
}

const DEFAULT_PORT = 8787;
const DEFAULT_DB_PATH = "./data/world.sqlite";
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:5173";

export function loadConfig(source: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: readPort(source.PORT),
    dbPath: source.DB_PATH?.trim() || DEFAULT_DB_PATH,
    env: {
      // SqliteAuthClient replaces Supabase locally; these stay empty and unused.
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      FRONTEND_ORIGIN: source.FRONTEND_ORIGIN?.trim() || DEFAULT_FRONTEND_ORIGIN,
      // The reused runtime ticks every 60s; WORLD_TICK_STEPS controls steps-per-tick (clamped 1..20).
      WORLD_TICK_STEPS: source.WORLD_TICK_STEPS,
      WORLD_RESET_TOKEN: source.WORLD_RESET_TOKEN,
    },
  };
}

function readPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error(`PORT must be an integer in [1, 65535], got: ${value}`);
  }
  return parsed;
}
