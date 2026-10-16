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
  performAction(cultivatorId: string, actionId: ActionId, line?: string, itemId?: string): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
}

export async function saveAuthenticatedAgentRegistration(options: {
  world: Pick<AgentOperationsRepository, "transactWorld">;
  agent: AgentProfileRecord;
  record: CultivationRegistrationRecord;
}): Promise<CultivationRegistrationRecord> {
  const { world, agent, record } = options;
  return world.transactWorld((draftWorld) =>
    saveCultivationRegistration(draftWorld, agent.selectedCultivatorId, record, agent.agentId),
  );
}

export async function performAuthenticatedAgentAction(options: {
  world: Pick<AgentOperationsRepository, "performAction">;
  agent: AgentProfileRecord;
  actionId: ActionId;
  line?: string;
  itemId?: string;
}): Promise<ActionExecutionResult> {
  const { world, agent, actionId, line, itemId } = options;
  return world.performAction(agent.selectedCultivatorId, actionId, line, itemId);
}

export async function advanceAuthenticatedAgentWorld(options: {
  world: Pick<AgentOperationsRepository, "advanceWorld">;
  steps: number;
}): Promise<TickSummary> {
  const { world, steps } = options;
  return world.advanceWorld(steps, "manual");
}
