import { syncCultivatorFromPersona } from "../../domain/src/engine.js";
import type { AgentPersonaSyncResult, WorldState } from "../../domain/src/runtime.js";
import type {
  AgentPersonaInput,
  AgentProfileRecord,
  AgentProfileWriteInput,
} from "../../persistence/src/world-repository.js";

export interface AgentPersonaWorkflowRepository {
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  getAgentProfile(agentId: string): Promise<AgentProfileRecord | null>;
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
}

export interface SyncAgentPersonaWorkflowOptions {
  repository: AgentPersonaWorkflowRepository;
  agentId: string;
  input: AgentPersonaInput;
}

function mergeProfileInput(agentId: string, existing: AgentProfileRecord, input: AgentPersonaInput, selectedCultivatorId: string) {
  return {
    agentId,
    name: input.name.trim(),
    selectedCultivatorId,
    genderPresentation: input.genderPresentation ?? existing.genderPresentation,
    pronouns: input.pronouns?.trim() ?? existing.pronouns,
    origin: input.origin?.trim() ?? existing.origin,
    temperament: input.temperament?.trim() ?? existing.temperament,
    lastSeenAt: existing.lastSeenAt,
  } satisfies AgentProfileWriteInput;
}

export async function syncAgentPersonaWorkflow(
  options: SyncAgentPersonaWorkflowOptions,
): Promise<AgentPersonaSyncResult> {
  const { repository, input } = options;
  const agentId = options.agentId.trim();
  if (!agentId) {
    throw new Error("agentId is required.");
  }

  const sync = await repository.transactWorld((world) =>
    syncCultivatorFromPersona(world, {
      agentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
    }),
  );

  const existingProfile = await repository.getAgentProfile(agentId);
  if (existingProfile) {
    await repository.saveAgentProfile(
      mergeProfileInput(agentId, existingProfile, input, sync.selectedCultivatorId),
    );
  }

  return sync;
}
