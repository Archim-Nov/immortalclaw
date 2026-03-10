import type { Hono } from "hono";
import type { RuntimeWorkerEnv } from "./env.js";

export function registerRuntimeMiddleware(app: Hono<RuntimeWorkerEnv>) {
  app.onError((error, context) => {
    return context.json({ error: error.message }, 400);
  });
}
