import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
  WorldState,
} from "../../domain/src/index.js";
import type { TickLockRecord, TickRunRecord, WorldRepository } from "./world-repository.js";

export interface SupabaseWorldRepositoryOptions {
  url: string;
  serviceRoleKey: string;
}

export class SupabaseWorldRepository implements WorldRepository {
  constructor(private readonly options: SupabaseWorldRepositoryOptions) {
    void this.options;
  }

  async readWorld(): Promise<WorldState> {
    throw new Error("SupabaseWorldRepository.readWorld is not implemented yet.");
  }

  async getCultivatorState(_cultivatorId: string): Promise<CultivatorStateView> {
    throw new Error("SupabaseWorldRepository.getCultivatorState is not implemented yet.");
  }

  async listAvailableActions(_cultivatorId: string): Promise<AvailableAction[]> {
    throw new Error("SupabaseWorldRepository.listAvailableActions is not implemented yet.");
  }

  async performAction(_cultivatorId: string, _actionId: ActionId): Promise<ActionExecutionResult> {
    throw new Error("SupabaseWorldRepository.performAction is not implemented yet.");
  }

  async advanceWorld(_steps: number): Promise<TickSummary> {
    throw new Error("SupabaseWorldRepository.advanceWorld is not implemented yet.");
  }

  async getLatestTickRun(): Promise<TickRunRecord | null> {
    throw new Error("SupabaseWorldRepository.getLatestTickRun is not implemented yet.");
  }

  async acquireTickLock(_ownerId: string): Promise<TickLockRecord | null> {
    throw new Error("SupabaseWorldRepository.acquireTickLock is not implemented yet.");
  }

  async releaseTickLock(_lockId: string): Promise<void> {
    throw new Error("SupabaseWorldRepository.releaseTickLock is not implemented yet.");
  }
}

export function createSupabaseWorldRepository(options: SupabaseWorldRepositoryOptions) {
  return new SupabaseWorldRepository(options);
}
