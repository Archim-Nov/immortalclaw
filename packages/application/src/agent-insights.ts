import type { AgentEventsResponse, AgentStrategyResponse, AgentTribulationResponse } from "../../contracts/src/runtime-api.js";
import {
  getDaoLogs,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
  getTribulationPreview,
} from "../../domain/src/runtime.js";
import type { CultivationRegistrationRecord, WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { toAgentView } from "./agent-onboarding.js";

export interface AgentInsightsRepository {
  readWorld(): Promise<WorldState>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}

export async function buildAuthenticatedAgentEvents(options: {
  repository: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
  sinceTick?: number;
}): Promise<AgentEventsResponse> {
  const { repository, agent, sinceTick } = options;
  const world = await repository.readWorld();
  const events = getRecentWorldEvents(world, agent.selectedCultivatorId, 50).filter((event) =>
    sinceTick === undefined ? true : event.tick >= sinceTick,
  );
  const combats = world.combatLogs
    .filter((entry) => entry.cultivatorId === agent.selectedCultivatorId)
    .filter((entry) => (sinceTick === undefined ? true : entry.tick >= sinceTick))
    .slice(0, 20);

  return {
    agent: toAgentView(agent),
    tick: world.tick,
    events,
    combats,
  };
}

export async function readAuthenticatedAgentStrategy(options: {
  repository: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<AgentStrategyResponse> {
  const { repository, agent } = options;
  return getStrategySnapshot(await repository.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentTribulation(options: {
  repository: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<AgentTribulationResponse> {
  const { repository, agent } = options;
  return getTribulationPreview(await repository.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentSectInfo(options: {
  repository: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<ReturnType<typeof getSectInfo>> {
  const { repository, agent } = options;
  return getSectInfo(await repository.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentDaoLogs(options: {
  repository: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<ReturnType<typeof getDaoLogs>> {
  const { repository, agent } = options;
  return getDaoLogs(await repository.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentRegistration(options: {
  repository: Pick<AgentInsightsRepository, "getCultivationRegistration">;
  agent: AgentProfileRecord;
}): Promise<CultivationRegistrationRecord | null> {
  const { repository, agent } = options;
  return repository.getCultivationRegistration(agent.selectedCultivatorId);
}
