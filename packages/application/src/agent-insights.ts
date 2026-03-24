import type { AgentEventsResponse, AgentStrategyResponse } from "../../contracts/src/runtime-api.js";
import {
  getDaoLogs,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
} from "../../domain/src/runtime.js";
import type { CultivationRegistrationRecord, WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { toAgentView } from "./agent-onboarding.js";

export interface AgentInsightsRepository {
  readWorld(): Promise<WorldState>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}

export async function buildAuthenticatedAgentEvents(options: {
  world: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
  sinceTick?: number;
}): Promise<AgentEventsResponse> {
  const { world, agent, sinceTick } = options;
  const snapshot = await world.readWorld();
  const events = getRecentWorldEvents(snapshot, agent.selectedCultivatorId, 50).filter((event) =>
    sinceTick === undefined ? true : event.tick >= sinceTick,
  );
  const combats = snapshot.combatLogs
    .filter((entry) => entry.cultivatorId === agent.selectedCultivatorId)
    .filter((entry) => (sinceTick === undefined ? true : entry.tick >= sinceTick))
    .slice(0, 20);

  return {
    agent: toAgentView(agent),
    tick: snapshot.tick,
    events,
    combats,
  };
}

export async function readAuthenticatedAgentStrategy(options: {
  world: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<AgentStrategyResponse> {
  const { world, agent } = options;
  return getStrategySnapshot(await world.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentSectInfo(options: {
  world: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<ReturnType<typeof getSectInfo>> {
  const { world, agent } = options;
  return getSectInfo(await world.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentDaoLogs(options: {
  world: Pick<AgentInsightsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<ReturnType<typeof getDaoLogs>> {
  const { world, agent } = options;
  return getDaoLogs(await world.readWorld(), agent.selectedCultivatorId);
}

export async function readAuthenticatedAgentRegistration(options: {
  world: Pick<AgentInsightsRepository, "getCultivationRegistration">;
  agent: AgentProfileRecord;
}): Promise<CultivationRegistrationRecord | null> {
  const { world, agent } = options;
  return world.getCultivationRegistration(agent.selectedCultivatorId);
}
