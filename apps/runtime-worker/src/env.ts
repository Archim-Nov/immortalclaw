import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import {
  createInMemoryWorldRepository,
  createSupabaseWorldRepository,
} from "../../../packages/persistence/src/index.js";

export interface RuntimeWorkerBindings {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
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

  if (bindings.SUPABASE_URL && bindings.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseWorldRepository({
      url: bindings.SUPABASE_URL,
      serviceRoleKey: bindings.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  return createInMemoryWorldRepository();
}
