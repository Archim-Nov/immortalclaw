import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
} from "../../domain/src/runtime.js";
import type { TickRunRecord } from "../../persistence/src/world-repository.js";

export interface RuntimeRepository {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId, line?: string): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
}

export interface RuntimeService {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId, line?: string): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
}

export function createRuntimeService(options: { world: RuntimeRepository }): RuntimeService {
  const { world } = options;

  return {
    async getCultivatorState(cultivatorId) {
      return world.getCultivatorState(cultivatorId);
    },
    async listActions(cultivatorId) {
      return world.listAvailableActions(cultivatorId);
    },
    async performAction(cultivatorId, actionId, line) {
      return world.performAction(cultivatorId, actionId, line);
    },
    async advanceWorld(steps, trigger) {
      return world.advanceWorld(steps, trigger);
    },
  };
}
