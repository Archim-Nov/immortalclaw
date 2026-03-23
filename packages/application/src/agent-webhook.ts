import type { AgentWebhookBindResponse } from "../../contracts/src/runtime-api.js";
import type { AgentProfileRecord, AgentProfileWriteInput } from "../../persistence/src/world-repository.js";
import { createApplicationError } from "./errors.js";

export interface AgentWebhookRepository {
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
}

export async function updateAgentWebhookUrl(options: {
  repository: AgentWebhookRepository;
  agent: AgentProfileRecord;
  webhookUrl: string;
  allowInsecure?: boolean;
}): Promise<AgentWebhookBindResponse> {
  const { repository, agent, webhookUrl, allowInsecure = false } = options;
  const trimmedUrl = webhookUrl.trim();

  if (trimmedUrl.length === 0) {
    throw createApplicationError(400, "webhookUrl must be provided.");
  }

  if (trimmedUrl.length > 2048) {
    throw createApplicationError(400, "webhookUrl must be at most 2048 characters.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw createApplicationError(400, "webhookUrl must be a valid URL.");
  }

  if (!allowInsecure && parsedUrl.protocol !== "https:") {
    throw createApplicationError(400, "webhookUrl must use HTTPS.");
  }

  const webhookSecret = `whsec_${crypto.randomUUID()}`;
  await repository.saveAgentProfile({
    agentId: agent.agentId,
    name: agent.name,
    selectedCultivatorId: agent.selectedCultivatorId,
    genderPresentation: agent.genderPresentation,
    pronouns: agent.pronouns,
    origin: agent.origin,
    temperament: agent.temperament,
    lastSeenAt: agent.lastSeenAt,
    webhookUrl: trimmedUrl,
    webhookSecret,
  });

  return {
    ok: true,
    webhookUrl: trimmedUrl,
    webhookSecret,
  };
}
