import {
  computeEffectiveFiveElementScores,
  computeEffectiveMainAttributes,
  deriveDetailedAttributes,
  deriveMainAttributes,
  extractFiveElementScores,
} from "../../domain/src/attributes.js";
import { statusOf } from "../../domain/src/runtime.js";
import { repairCultivatorRealm } from "../../domain/src/realms.js";
import type { CultivatorStateView, WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import type { AuthClient } from "../../persistence/src/auth-client.js";
import { toAgentView } from "./agent-onboarding.js";

export interface PublicAgentDirectoryWorldRepository {
  readWorld(): Promise<WorldState>;
}

export interface PublicAgentDirectoryAuthClient extends Pick<AuthClient, "listAgentProfiles"> {}

export interface PublicAgentStateWorldRepository {
  readWorld(): Promise<WorldState>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
}

export interface PublicAgentStateAuthClient extends Pick<AuthClient, "getAgentProfile"> {}

const REALM_PHASES = ["前期", "中期", "后期"] as const;

function realmPhaseOfLevel(realmLevel: number) {
  const normalizedLevel = Math.max(1, Math.floor(realmLevel));
  return REALM_PHASES[(normalizedLevel - 1) % REALM_PHASES.length]!;
}

function locationNameOf(world: WorldState, locationId: string): string {
  return world.locations[locationId]?.name ?? locationId;
}

function buildDirectoryEntry(agent: AgentProfileRecord, world: WorldState) {
  const cultivator = world.cultivators[agent.selectedCultivatorId];
  repairCultivatorRealm(cultivator);
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  const neutralSect = cultivator.neutralSectId ? world.neutralSects[cultivator.neutralSectId] ?? null : null;
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null;

  return {
    ...toAgentView(agent),
    cultivator: {
      id: cultivator.id,
      name: cultivator.name,
      realm: cultivator.realm,
      realmLevel: cultivator.realmLevel,
      realmPhase: realmPhaseOfLevel(cultivator.realmLevel),
      realmProgress: cultivator.realmProgress,
      status: statusOf(cultivator),
      location: locationNameOf(world, cultivator.locationId),
      spiritualPower: cultivator.spiritualPower,
      sect: sect?.name ?? neutralSect?.name ?? null,
      currentAction: job?.actionId ?? null,
    },
  };
}

export async function buildPublicAgentDirectory(options: {
  world: PublicAgentDirectoryWorldRepository;
  auth: PublicAgentDirectoryAuthClient;
}) {
  const { world, auth } = options;
  const [snapshot, agentProfiles] = await Promise.all([world.readWorld(), auth.listAgentProfiles()]);
  return {
    agents: agentProfiles
      .filter((agent) => Boolean(snapshot.cultivators[agent.selectedCultivatorId]))
      .map((agent) => buildDirectoryEntry(agent, snapshot)),
  };
}

export async function buildPublicAgentState(options: {
  world: PublicAgentStateWorldRepository;
  auth: PublicAgentStateAuthClient;
  agentId: string;
}) {
  const { world, auth, agentId } = options;
  const agent = await auth.getAgentProfile(agentId);

  if (!agent || !agent.selectedCultivatorId) {
    return null;
  }

  const [cultivatorState, snapshot] = await Promise.all([
    world.getCultivatorState(agent.selectedCultivatorId),
    world.readWorld(),
  ]);
  const cultivator = snapshot.cultivators[agent.selectedCultivatorId];

  if (!cultivator) {
    return null;
  }

  const baselineMainAttributes = deriveMainAttributes(cultivator.registrationRecord ?? null);
  const mainAttributes = computeEffectiveMainAttributes(
    baselineMainAttributes,
    cultivator.mainAttributeGrowth ?? { gengu: 0, tipu: 0, lingyuan: 0, shenshi: 0, wuxing: 0, daoxin: 0, shenfa: 0, bingpo: 0 },
    cultivator.mainAttributePercentageBonus ?? 0,
  );
  const baselineFiveElements = extractFiveElementScores(cultivator.registrationRecord ?? null);
  const fiveElementScores = computeEffectiveFiveElementScores(
    baselineFiveElements,
    cultivator.fiveElementGrowth ?? { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
  );

  return {
    agent: toAgentView(agent),
    ...cultivatorState,
    fiveElementScores,
    mainAttributes,
    detailedAttributes: deriveDetailedAttributes(mainAttributes),
  };
}
