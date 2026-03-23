import type { AgentActionsResponse } from "../../contracts/src/runtime-api.js";
import type { AvailableAction } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { toAgentView } from "./agent-onboarding.js";

export interface AgentActionsRepository {
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
}

export async function buildAuthenticatedAgentActions(options: {
  world: AgentActionsRepository;
  agent: AgentProfileRecord;
}): Promise<AgentActionsResponse> {
  const { world, agent } = options;
  return {
    agent: toAgentView(agent),
    cultivatorId: agent.selectedCultivatorId,
    actions: await world.listAvailableActions(agent.selectedCultivatorId),
  };
}
