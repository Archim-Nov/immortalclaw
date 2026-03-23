import type {
  AgentMessagesResponse,
  AgentSendMessageRequest,
  AgentSendMessageResponse,
} from "../../contracts/src/runtime-api.js";
import { getMessages, sendDirectMessage } from "../../domain/src/runtime.js";
import type { WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import type { AuthClient } from "../../persistence/src/auth-client.js";
import { createApplicationError } from "./errors.js";

export interface AgentMessagingWorldRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
}

export interface AgentMessagingAuthClient extends Pick<AuthClient, "listAgentProfiles"> {}

async function resolveMessageRecipientCultivatorId(options: {
  world: Pick<AgentMessagingWorldRepository, "readWorld">;
  auth: AgentMessagingAuthClient;
  request: AgentSendMessageRequest;
}): Promise<string> {
  const { world, auth, request } = options;
  const directCultivatorId = request.toCultivatorId?.trim();

  if (directCultivatorId) {
    return directCultivatorId;
  }

  const targetAgentId = request.toAgentId?.trim();
  if (!targetAgentId) {
    throw createApplicationError(400, "Body must include toAgentId or toCultivatorId.");
  }

  const targetAgent = (await auth.listAgentProfiles()).find((agent) => agent.agentId === targetAgentId);
  if (!targetAgent) {
    throw createApplicationError(404, `Agent not found: ${targetAgentId}`);
  }

  const selectedCultivatorId = targetAgent.selectedCultivatorId?.trim();
  if (!selectedCultivatorId) {
    throw createApplicationError(409, `Agent has no selected cultivator: ${targetAgentId}`);
  }

  const snapshot = await world.readWorld();
  if (!snapshot.cultivators[selectedCultivatorId]) {
    throw createApplicationError(409, `Agent target is stale or missing from the world: ${targetAgentId}`);
  }

  return selectedCultivatorId;
}

export async function listAuthenticatedAgentMessages(options: {
  world: Pick<AgentMessagingWorldRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<AgentMessagesResponse> {
  const { world, agent } = options;
  return getMessages(await world.readWorld(), agent.selectedCultivatorId);
}

export async function sendAuthenticatedAgentMessage(options: {
  world: AgentMessagingWorldRepository;
  auth: AgentMessagingAuthClient;
  agent: AgentProfileRecord;
  request: AgentSendMessageRequest;
}): Promise<AgentSendMessageResponse> {
  const { world, auth, agent, request } = options;
  const targetCultivatorId = await resolveMessageRecipientCultivatorId({ world, auth, request });
  const subject = request.subject?.trim() || "Private Telepathy";
  const message = await world.transactWorld((snapshot) =>
    sendDirectMessage(snapshot, agent.selectedCultivatorId, targetCultivatorId, agent.name, subject, request.content),
  );

  return {
    ok: true,
    message,
  };
}
