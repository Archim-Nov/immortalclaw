import {
  saveCultivationRegistration,
  type ActionExecutionResult,
  type ActionId,
  type CultivationRegistrationRecord,
  type TickSummary,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord, TickRunRecord } from "../../persistence/src/world-repository.js";

export interface AgentOperationsRepository {
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
}

export async function saveAuthenticatedAgentRegistration(options: {
  repository: Pick<AgentOperationsRepository, "transactWorld">;
  agent: AgentProfileRecord;
  record: CultivationRegistrationRecord;
}): Promise<CultivationRegistrationRecord> {
  const { repository, agent, record } = options;
  return repository.transactWorld((world) =>
    saveCultivationRegistration(world, agent.selectedCultivatorId, record, agent.agentId),
  );
}

export async function performAuthenticatedAgentAction(options: {
  repository: Pick<AgentOperationsRepository, "performAction">;
  agent: AgentProfileRecord;
  actionId: ActionId;
}): Promise<ActionExecutionResult> {
  const { repository, agent, actionId } = options;
  return repository.performAction(agent.selectedCultivatorId, actionId);
}

export async function advanceAuthenticatedAgentWorld(options: {
  repository: Pick<AgentOperationsRepository, "advanceWorld">;
  steps: number;
}): Promise<TickSummary> {
  const { repository, steps } = options;
  return repository.advanceWorld(steps, "manual");
}
