import { Hono } from "hono";
import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import type { RuntimeWorkerEnv } from "./env.js";
import { registerRuntimeMiddleware } from "./middleware.js";
import { registerRuntimeRoutes } from "./routes.js";

export interface CreateAppOptions {
  repository?: WorldRepository;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<RuntimeWorkerEnv>();
  registerRuntimeMiddleware(app);
  registerRuntimeRoutes(app, options);
  return app;
}

export const app = createApp();
