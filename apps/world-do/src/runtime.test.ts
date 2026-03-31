import assert from "node:assert/strict";
import test from "node:test";
import { createWorldDoRuntime } from "./runtime.js";

test("world-do runtime schedules the next alarm before advancing the world", async () => {
  let alarmScheduledAt: number | null = null;
  let advanceCalls = 0;

  const runtime = createWorldDoRuntime({
    env: {
      FRONTEND_ORIGIN: "https://immortal-claw.pages.dev",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      WORLD_TICK_STEPS: "2",
    },
    storage: {
      async getAlarm() {
        return null;
      },
      async setAlarm(value: number) {
        alarmScheduledAt = value;
      },
    },
    world: {
      async advanceWorld(steps: number) {
        advanceCalls += steps;
        return { advancedTicks: steps, tick: 1 };
      },
    },
  });

  await runtime.alarm();

  assert.equal(typeof alarmScheduledAt, "number");
  assert.equal(advanceCalls, 2);
});

test("world-do runtime reset clears storage state before reseeding", async () => {
  const calls: string[] = [];

  const runtime = createWorldDoRuntime({
    env: {
      FRONTEND_ORIGIN: "https://immortal-claw.pages.dev",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      WORLD_TICK_STEPS: "2",
    },
    storage: {
      async getAlarm() {
        return null;
      },
      async setAlarm() {},
      async deleteAlarm() {
        calls.push("delete-alarm");
      },
    } as never,
    world: {
      async advanceWorld() {
        return { advancedTicks: 0, tick: 0 };
      },
      async resetWorldStorage() {
        calls.push("reset-world-storage");
      },
    } as never,
  });

  await runtime.resetForRollout();

  assert.deepEqual(calls, ["reset-world-storage", "delete-alarm"]);
});
