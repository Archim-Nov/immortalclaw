import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import {
  createInMemoryWorldRepository,
  createSupabaseWorldRepository,
} from "../../../packages/persistence/src/index.js";

export const DEFAULT_FRONTEND_ORIGIN = "https://immortal-claw.pages.dev";
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

function normalizeOrigin(origin: string | undefined): string | undefined {
  const trimmed = origin?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function readFrontendOrigin(bindings?: RuntimeWorkerBindings): string {
  return normalizeOrigin(bindings?.FRONTEND_ORIGIN) ?? DEFAULT_FRONTEND_ORIGIN;
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
