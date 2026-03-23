import type { AgentCredentialResetResult, AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface AgentCredentialResetResponse {
  ok: true;
  agentId: string;
  credential: string;
  message: string;
}

export interface AgentCredentialRepository {
  resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult>;
}

export async function resetAuthenticatedAgentCredential(options: {
  auth: AgentCredentialRepository;
  agent: AgentProfileRecord;
  currentCredential: string;
}): Promise<AgentCredentialResetResponse> {
  const { auth, agent, currentCredential } = options;
  const payload = await auth.resetAgentCredential(agent.agentId, currentCredential);
  return {
    ok: true,
    agentId: payload.agentId,
    credential: payload.credential,
    message: "Agent credential reset successfully. Save the new credential now.",
  };
}
