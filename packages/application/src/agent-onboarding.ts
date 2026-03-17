import type { AgentStateResponse, AgentView } from "../../contracts/src/runtime-api.js";
import {
  deriveDetailedAttributes,
  deriveMainAttributes,
  extractFiveElementScores,
} from "../../domain/src/attributes.js";
import type { CultivatorStateView, WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface AgentOnboardingRepository {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  readWorld(): Promise<WorldState>;
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
  const [payload, world] = await Promise.all([
    repository.getCultivatorState(agent.selectedCultivatorId),
    repository.readWorld(),
  ]);
  const cultivator = world.cultivators[agent.selectedCultivatorId];
  const mainAttributes = deriveMainAttributes(cultivator?.registrationRecord ?? null);

  return {
    agent: toAgentView(agent),
    ...payload,
    fiveElementScores: extractFiveElementScores(cultivator?.registrationRecord ?? null),
    mainAttributes,
    detailedAttributes: deriveDetailedAttributes(mainAttributes),
  };
}
