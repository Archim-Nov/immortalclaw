import {
  applyToPlayerSect,
  foundPlayerSect,
  getPlayerSectFoundingOptions,
  listRecruitablePlayerSects,
  listSectApplications,
  reviewSectApplication,
  updateSectAdmissionPolicy,
  type FoundPlayerSectResult,
  type PlayerSectApplicationResult,
  type PlayerSectFoundingOptionsView,
  type PlayerSectRecruitmentListView,
  type ReviewSectApplicationResult,
  type SectAdmissionPolicy,
  type SectApplicationListView,
  type UpdateSectAdmissionPolicyResult,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface PlayerSectRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
}

export async function listAuthenticatedPlayerSectRecruitment(options: {
  world: Pick<PlayerSectRepository, "readWorld">;
  agent: AgentProfileRecord;
  limit?: number;
  cursor?: string;
}): Promise<PlayerSectRecruitmentListView> {
  const { world, agent, limit, cursor } = options;
  return listRecruitablePlayerSects(await world.readWorld(), agent.selectedCultivatorId, { limit, cursor });
}

export async function readAuthenticatedPlayerSectFoundingOptions(options: {
  world: Pick<PlayerSectRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<PlayerSectFoundingOptionsView> {
  const { world, agent } = options;
  return getPlayerSectFoundingOptions(await world.readWorld(), agent.selectedCultivatorId);
}

export async function foundAuthenticatedPlayerSect(options: {
  world: Pick<PlayerSectRepository, "transactWorld">;
  agent: AgentProfileRecord;
  input: {
    name: string;
    admissionPolicy: SectAdmissionPolicy;
  };
}): Promise<FoundPlayerSectResult> {
  const { world, agent, input } = options;
  return world.transactWorld((draftWorld) => foundPlayerSect(draftWorld, agent.selectedCultivatorId, input));
}

export async function applyAuthenticatedPlayerSectApplication(options: {
  world: Pick<PlayerSectRepository, "transactWorld">;
  agent: AgentProfileRecord;
  sectId: string;
}): Promise<PlayerSectApplicationResult> {
  const { world, agent, sectId } = options;
  return world.transactWorld((draftWorld) => applyToPlayerSect(draftWorld, agent.selectedCultivatorId, { sectId }));
}

export async function listAuthenticatedSectApplications(options: {
  world: Pick<PlayerSectRepository, "readWorld">;
  agent: AgentProfileRecord;
  limit?: number;
  cursor?: string;
}): Promise<SectApplicationListView> {
  const { world, agent, limit, cursor } = options;
  return listSectApplications(await world.readWorld(), agent.selectedCultivatorId, { limit, cursor });
}

export async function reviewAuthenticatedSectApplication(options: {
  world: Pick<PlayerSectRepository, "transactWorld">;
  agent: AgentProfileRecord;
  applicationId: string;
  decision: "approve" | "reject";
}): Promise<ReviewSectApplicationResult> {
  const { world, agent, applicationId, decision } = options;
  return world.transactWorld((draftWorld) =>
    reviewSectApplication(draftWorld, agent.selectedCultivatorId, { applicationId, decision }));
}

export async function updateAuthenticatedSectAdmissionPolicy(options: {
  world: Pick<PlayerSectRepository, "transactWorld">;
  agent: AgentProfileRecord;
  policy: SectAdmissionPolicy;
}): Promise<UpdateSectAdmissionPolicyResult> {
  const { world, agent, policy } = options;
  return world.transactWorld((draftWorld) =>
    updateSectAdmissionPolicy(draftWorld, agent.selectedCultivatorId, policy));
}
