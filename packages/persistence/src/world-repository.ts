import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";

export interface TickRunRecord {
  tick: number;
  advancedTicks: number;
  recordedAt: string;
  trigger: "manual" | "scheduled";
}

export interface TickLockRecord {
  lockId: string;
  ownerId: string;
  acquiredAt: string;
}

export interface WorldRepository {
  readWorld(): Promise<WorldState>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  acquireTickLock(ownerId: string): Promise<TickLockRecord | null>;
  releaseTickLock(lockId: string): Promise<void>;
}
