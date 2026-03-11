import type { Hono } from "hono";
import { cors } from "hono/cors";
import {
  LOCAL_VITE_DEV_ORIGIN,
  readFrontendOrigin,
  resolveCorsOrigins,
  type RuntimeWorkerEnv,
} from "./env.js";

function readStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }

  return 500;
}

function readMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error.";
}

export function registerRuntimeMiddleware(app: Hono<RuntimeWorkerEnv>) {
  app.use(
    "*",
    cors({
      origin(origin, context) {
        if (!origin) {
          return null;
        }

        if (origin === LOCAL_VITE_DEV_ORIGIN) {
          return origin;
        }

        return resolveCorsOrigins(context.env).includes(origin) ? origin : null;
      },
    }),
  );

  app.use("*", async (context, next) => {
    if (context.req.header("origin")) {
      readFrontendOrigin(context.env);
    }

    await next();
  });

  app.onError((error, context) => {
    const status = readStatus(error) as 400 | 409 | 500;
    return context.json({ error: readMessage(error) }, status);
  });
}
