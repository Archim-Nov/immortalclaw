import {
  deriveDetailedAttributes,
  deriveMainAttributes,
  extractFiveElementScores,
} from "../../domain/src/attributes.js";
import type { CultivatorStateView, WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { toAgentView } from "./agent-onboarding.js";

export interface PublicAgentDirectoryRepository {
  readWorld(): Promise<WorldState>;
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
}

export interface PublicAgentStateRepository {
  readWorld(): Promise<WorldState>;
  getAgentProfile(agentId: string): Promise<AgentProfileRecord | null>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
}

function locationNameOf(world: WorldState, locationId: string): string {
  return (
    world.locations[locationId]?.name ??
    world.zones[locationId as keyof typeof world.zones]?.name ??
    locationId
  );
}

function buildDirectoryEntry(agent: AgentProfileRecord, world: WorldState) {
  const cultivator = world.cultivators[agent.selectedCultivatorId];
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null;

  return {
    ...toAgentView(agent),
    cultivator: {
      id: cultivator.id,
      name: cultivator.name,
      realm: cultivator.realm,
      realmLevel: cultivator.realmLevel,
      realmProgress: cultivator.realmProgress,
      status: cultivator.status,
      location: locationNameOf(world, cultivator.locationId),
      spiritualPower: cultivator.spiritualPower,
      sect: sect?.name ?? null,
      currentAction: job?.actionId ?? null,
    },
  };
}

export async function buildPublicAgentDirectory(options: { repository: PublicAgentDirectoryRepository }) {
  const { repository } = options;
  const [world, agentProfiles] = await Promise.all([repository.readWorld(), repository.listAgentProfiles()]);
  return {
    agents: agentProfiles
      .filter((agent) => Boolean(world.cultivators[agent.selectedCultivatorId]))
      .map((agent) => buildDirectoryEntry(agent, world)),
  };
}

export async function buildPublicAgentState(options: {
  repository: PublicAgentStateRepository;
  agentId: string;
}) {
  const { repository, agentId } = options;
  const agent = await repository.getAgentProfile(agentId);

  if (!agent || !agent.selectedCultivatorId) {
    return null;
  }

  const [cultivatorState, world] = await Promise.all([
    repository.getCultivatorState(agent.selectedCultivatorId),
    repository.readWorld(),
  ]);
  const cultivator = world.cultivators[agent.selectedCultivatorId];

  if (!cultivator) {
    return null;
  }

  const mainAttributes = deriveMainAttributes(cultivator.registrationRecord ?? null);

  return {
    agent: toAgentView(agent),
    ...cultivatorState,
    fiveElementScores: extractFiveElementScores(cultivator.registrationRecord ?? null),
    mainAttributes,
    detailedAttributes: deriveDetailedAttributes(mainAttributes),
  };
}
