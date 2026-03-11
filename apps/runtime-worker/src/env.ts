import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import {
  createInMemoryWorldRepository,
  createSupabaseWorldRepository,
} from "../../../packages/persistence/src/index.js";

export const LOCAL_VITE_DEV_ORIGIN = "http://localhost:5173";

export interface RuntimeWorkerBindings {
  FRONTEND_ORIGIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  WORLD_TICK_STEPS?: string;
  REPOSITORY?: WorldRepository;
}

export interface RuntimeWorkerVariables {
  repository?: WorldRepository;
}

export interface RuntimeWorkerEnv {
  Bindings: RuntimeWorkerBindings;
  Variables: RuntimeWorkerVariables;
}

function invalidFrontendOriginError() {
  return new Error(
    "FRONTEND_ORIGIN must be a valid absolute origin like https://immortal-claw.pages.dev",
  );
}

export function readFrontendOrigin(bindings?: RuntimeWorkerBindings): string {
  const trimmed = bindings?.FRONTEND_ORIGIN?.trim();
  if (!trimmed) {
    throw new Error("FRONTEND_ORIGIN must be configured.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw invalidFrontendOriginError();
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw invalidFrontendOriginError();
  }

  return url.origin;
}

export function resolveCorsOrigins(bindings?: RuntimeWorkerBindings): string[] {
  return [...new Set([readFrontendOrigin(bindings), LOCAL_VITE_DEV_ORIGIN])];
}

export function readTickSteps(bindings: RuntimeWorkerBindings): number {
  const parsed = Number(bindings.WORLD_TICK_STEPS ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

export function resolveRepository(
  bindings: RuntimeWorkerBindings,
  repository?: WorldRepository,
): WorldRepository {
  if (repository) {
    return repository;
  }

  if (bindings.REPOSITORY) {
    return bindings.REPOSITORY;
  }

  if (bindings.SUPABASE_URL && bindings.SUPABASE_SECRET_KEY) {
    return createSupabaseWorldRepository({
      url: bindings.SUPABASE_URL,
      secretKey: bindings.SUPABASE_SECRET_KEY,
    });
  }

  return createInMemoryWorldRepository();
}
