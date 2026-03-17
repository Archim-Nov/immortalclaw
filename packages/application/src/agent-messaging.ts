import type {
  AgentMessagesResponse,
  AgentSendMessageRequest,
  AgentSendMessageResponse,
} from "../../contracts/src/runtime-api.js";
import { getMessages, sendDirectMessage } from "../../domain/src/runtime.js";
import type { WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { createApplicationError } from "./errors.js";

export interface AgentMessagingRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
}

async function resolveMessageRecipientCultivatorId(options: {
  repository: AgentMessagingRepository;
  request: AgentSendMessageRequest;
}): Promise<string> {
  const { repository, request } = options;
  const directCultivatorId = request.toCultivatorId?.trim();

  if (directCultivatorId) {
    return directCultivatorId;
  }

  const targetAgentId = request.toAgentId?.trim();
  if (!targetAgentId) {
    throw createApplicationError(400, "Body must include toAgentId or toCultivatorId.");
  }

  const targetAgent = (await repository.listAgentProfiles()).find((agent) => agent.agentId === targetAgentId);
  if (!targetAgent) {
    throw createApplicationError(404, `Agent not found: ${targetAgentId}`);
  }

  const selectedCultivatorId = targetAgent.selectedCultivatorId?.trim();
  if (!selectedCultivatorId) {
    throw createApplicationError(409, `Agent has no selected cultivator: ${targetAgentId}`);
  }

  const world = await repository.readWorld();
  if (!world.cultivators[selectedCultivatorId]) {
    throw createApplicationError(409, `Agent target is stale or missing from the world: ${targetAgentId}`);
  }

  return selectedCultivatorId;
}

export async function listAuthenticatedAgentMessages(options: {
  repository: Pick<AgentMessagingRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<AgentMessagesResponse> {
  const { repository, agent } = options;
  return getMessages(await repository.readWorld(), agent.selectedCultivatorId);
}

export async function sendAuthenticatedAgentMessage(options: {
  repository: AgentMessagingRepository;
  agent: AgentProfileRecord;
  request: AgentSendMessageRequest;
}): Promise<AgentSendMessageResponse> {
  const { repository, agent, request } = options;
  const targetCultivatorId = await resolveMessageRecipientCultivatorId({ repository, request });
  const subject = request.subject?.trim() || "Private Telepathy";
  const message = await repository.transactWorld((world) =>
    sendDirectMessage(world, agent.selectedCultivatorId, targetCultivatorId, agent.name, subject, request.content),
  );

  return {
    ok: true,
    message,
  };
}
