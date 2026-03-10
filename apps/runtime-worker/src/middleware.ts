import type { Hono } from "hono";
import type { RuntimeWorkerEnv } from "./env.js";

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
  app.onError((error, context) => {
    const status = readStatus(error) as 400 | 409 | 500;
    return context.json({ error: readMessage(error) }, status);
  });
}
