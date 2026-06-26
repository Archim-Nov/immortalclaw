import { serve } from "@hono/node-server";
import { Hono } from "hono";
import {
  deduplicateWebhookTargets,
  dispatchWebhooks,
  resolveWebhookTargets,
} from "@immortal-claw/application";
import type { TickSummary } from "@immortal-claw/domain";
import { createSqliteAuthClient, createSqliteWorldRepository } from "@immortal-claw/persistence";
import type { WorldDOHonoEnv } from "@immortal-claw/world-do/env";
import { registerMiddleware } from "@immortal-claw/world-do/middleware";
import { registerRoutes } from "@immortal-claw/world-do/routes";
import { createWorldDoRuntime } from "@immortal-claw/world-do/runtime";
import { loadConfig } from "./config.js";
import { asDatabaseLike, openDatabase } from "./sqlite.js";
import { createTickScheduler } from "./tick-scheduler.js";

// Self-hosted Node entry. Mirrors the Durable Object constructor wiring exactly,
// but uses node:sqlite for both the world repository and the auth client, a
// setTimeout-based scheduler in place of DO alarms, and @hono/node-server as the
// HTTP transport. All routing, middleware, tick and webhook logic is reused
// unchanged from the platform-agnostic modules.

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  const dbLike = asDatabaseLike(db);

  const world = createSqliteWorldRepository({ database: dbLike });
  const auth = createSqliteAuthClient({ database: dbLike });

  const app = new Hono<WorldDOHonoEnv>();
  app.use("*", async (context, next) => {
    context.set("world", world);
    context.set("auth", auth);
    await next();
  });

  const scheduler = createTickScheduler();
  const runtime = createWorldDoRuntime({
    env: config.env,
    storage: scheduler,
    world,
    dispatchAfterAdvance: (tickResult) => {
      const summary = tickResult as TickSummary | null | undefined;
      if (!summary?.completedJobs?.length) {
        return;
      }
      void (async () => {
        try {
          const profiles = await auth.listAgentProfiles();
          const snapshot = await world.readWorld();
          const targets = deduplicateWebhookTargets(resolveWebhookTargets(snapshot, summary, profiles));
          if (targets.length > 0) {
            await dispatchWebhooks(targets);
          }
        } catch {
          // Best-effort: a tick must not fail because webhook dispatch failed.
        }
      })();
    },
  });

  app.post("/internal/reset-storage", async (context) => {
    const configuredToken = config.env.WORLD_RESET_TOKEN?.trim();
    if (!configuredToken) {
      return context.json({ ok: false, error: "WORLD_RESET_TOKEN is not configured." }, 503);
    }
    const providedToken = context.req.header("x-world-reset-token")?.trim();
    if (!providedToken || providedToken !== configuredToken) {
      return context.json({ ok: false, error: "Forbidden" }, 403);
    }
    await runtime.resetForRollout();
    return context.json({ ok: true, reset: true });
  });

  registerMiddleware(app, config.env);
  registerRoutes(app);

  await runtime.initialize();

  const server = serve({
    fetch: (request: Request) => app.fetch(request, config.env),
    port: config.port,
  });

  scheduler.start(() => runtime.alarm());

  console.log(`immortal-claw self-hosted server listening on http://127.0.0.1:${config.port}`);
  console.log(`  db = ${config.dbPath} | auto-tick every 60s (WORLD_TICK_STEPS steps, clamped 1..20)`);

  let closing = false;
  const shutdown = (signal: string): void => {
    if (closing) {
      return;
    }
    closing = true;
    console.log(`\n${signal} received — shutting down gracefully.`);
    scheduler.stop();
    server.close();
    try {
      db.close();
    } catch {
      // already closed
    }
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Failed to start immortal-claw self-hosted server:", error);
  process.exitCode = 1;
});
