import type { AgentStateResponse, AgentView } from "../../contracts/src/runtime-api.js";
import type { CultivatorStateView } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface AgentOnboardingRepository {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
}

export function toAgentView(agent: AgentProfileRecord): AgentView {
  return {
    agentId: agent.agentId,
    name: agent.name,
    selectedCultivatorId: agent.selectedCultivatorId,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastSeenAt: agent.lastSeenAt,
  };
}

export async function buildAuthenticatedAgentState(options: {
  repository: AgentOnboardingRepository;
  agent: AgentProfileRecord;
}): Promise<AgentStateResponse> {
  const { repository, agent } = options;
  const payload = await repository.getCultivatorState(agent.selectedCultivatorId);
  return {
    agent: toAgentView(agent),
    ...payload,
  };
}
