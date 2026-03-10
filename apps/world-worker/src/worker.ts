import { advanceWorld } from "../../../packages/domain/src/engine.js";
import { createSqliteWorldStore } from "../../../packages/domain/src/store.js";

const LEGACY_HARNESS_NOTICE =
  "[world-worker] Legacy local SQLite harness. Production scheduled ticks should go through apps/runtime-worker.";

const store = createSqliteWorldStore({
  filePath: process.env.WORLD_DB_PATH,
});

const tickIntervalMs = clampNumber(process.env.WORLD_TICK_INTERVAL_MS, 5000, 500, 60000);
const tickSteps = clampNumber(process.env.WORLD_TICK_STEPS, 1, 1, 20);

let running = false;

function clampNumber(
  input: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(input ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function runCycle(): void {
  if (running) {
    return;
  }

  running = true;
  try {
    const summary = store.transact((world) => advanceWorld(world, tickSteps));
    const eventCount = summary.triggeredEvents.length;
    const combatCount = summary.completedJobs.filter((job) =>
      ["hunt-mine-beast", "challenge-guardian"].includes(job.actionId),
    ).length;
    console.log(
      `[world-worker] tick=${summary.tick} steps=${summary.advancedTicks} jobs=${summary.completedJobs.length} events=${eventCount} combats=${combatCount}`,
    );
  } catch (error) {
    console.error("[world-worker] cycle failed", error);
  } finally {
    running = false;
  }
}

console.warn(LEGACY_HARNESS_NOTICE);
console.log(
  `[world-worker] using ${store.filePath}, interval=${tickIntervalMs}ms, steps=${tickSteps}`,
);

runCycle();
const timer = setInterval(runCycle, tickIntervalMs);

function shutdown(signal: string): void {
  clearInterval(timer);
  console.log(`[world-worker] stopping on ${signal}`);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
