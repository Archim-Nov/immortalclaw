import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "../../domain/src/index.js";
import type { ActionId, TickSummary, WorldState } from "../../domain/src/index.js";
import type { TickLockRecord, TickRunRecord, WorldRepository } from "./world-repository.js";

export interface InMemoryWorldRepositoryOptions {
  world?: WorldState;
  now?: () => string;
}

export class InMemoryWorldRepository implements WorldRepository {
  private world: WorldState;
  private latestTickRun: TickRunRecord | null = null;
  private activeLock: TickLockRecord | null = null;
  private readonly now: () => string;

  constructor(options: InMemoryWorldRepositoryOptions = {}) {
    this.world = structuredClone(options.world ?? createSeedWorld());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async readWorld(): Promise<WorldState> {
    return structuredClone(this.world);
  }

  async getCultivatorState(cultivatorId: string) {
    return getCultivatorState(this.world, cultivatorId);
  }

  async listAvailableActions(cultivatorId: string) {
    return listAvailableActions(this.world, cultivatorId);
  }

  async performAction(cultivatorId: string, actionId: ActionId) {
    return performAction(this.world, cultivatorId, actionId);
  }

  async advanceWorld(steps: number): Promise<TickSummary> {
    const summary = advanceWorld(this.world, steps);
    this.latestTickRun = {
      tick: summary.tick,
      advancedTicks: summary.advancedTicks,
      recordedAt: this.now(),
      trigger: "manual",
    };
    return summary;
  }

  async getLatestTickRun(): Promise<TickRunRecord | null> {
    return this.latestTickRun ? { ...this.latestTickRun } : null;
  }

  async acquireTickLock(ownerId: string): Promise<TickLockRecord | null> {
    if (this.activeLock) {
      return null;
    }

    const timestamp = this.now();
    const lock = {
      lockId: `tick-lock:${ownerId}:${timestamp}`,
      ownerId,
      acquiredAt: timestamp,
    };
    this.activeLock = lock;
    return { ...lock };
  }

  async releaseTickLock(lockId: string): Promise<void> {
    if (this.activeLock?.lockId === lockId) {
      this.activeLock = null;
    }
  }
}

export function createInMemoryWorldRepository(options: InMemoryWorldRepositoryOptions = {}) {
  return new InMemoryWorldRepository(options);
}
