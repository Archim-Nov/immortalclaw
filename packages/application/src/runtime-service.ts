import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
} from "../../domain/src/index.js";

export interface RuntimeRepository {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number): Promise<TickSummary>;
}

export interface RuntimeService {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number): Promise<TickSummary>;
}

export function createRuntimeService(options: { repository: RuntimeRepository }): RuntimeService {
  const { repository } = options;

  return {
    async getCultivatorState(cultivatorId) {
      return repository.getCultivatorState(cultivatorId);
    },
    async listActions(cultivatorId) {
      return repository.listAvailableActions(cultivatorId);
    },
    async performAction(cultivatorId, actionId) {
      return repository.performAction(cultivatorId, actionId);
    },
    async advanceWorld(steps) {
      return repository.advanceWorld(steps);
    },
  };
}
