import type { AgentStateResponse, AgentView } from "../../contracts/src/runtime-api.js";
import {
  computeEffectiveFiveElementScores,
  computeEffectiveMainAttributes,
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
  world: AgentOnboardingRepository;
  agent: AgentProfileRecord;
}): Promise<AgentStateResponse> {
  const { world, agent } = options;
  const [payload, snapshot] = await Promise.all([
    world.getCultivatorState(agent.selectedCultivatorId),
    world.readWorld(),
  ]);
  const cultivator = snapshot.cultivators[agent.selectedCultivatorId];
  const baselineMainAttributes = deriveMainAttributes(cultivator?.registrationRecord ?? null);
  const mainAttributes = computeEffectiveMainAttributes(
    baselineMainAttributes,
    cultivator?.mainAttributeGrowth ?? { gengu: 0, tipu: 0, lingyuan: 0, shenshi: 0, wuxing: 0, daoxin: 0, shenfa: 0, bingpo: 0 },
    cultivator?.mainAttributePercentageBonus ?? 0,
  );
  const baselineFiveElements = extractFiveElementScores(cultivator?.registrationRecord ?? null);
  const fiveElementScores = computeEffectiveFiveElementScores(
    baselineFiveElements,
    cultivator?.fiveElementGrowth ?? { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
  );

  return {
    agent: toAgentView(agent),
    ...payload,
    fiveElementScores,
    mainAttributes,
    detailedAttributes: deriveDetailedAttributes(mainAttributes),
  };
}
