import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
} from "./world-repository.js";

export interface AuthClient {
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
  getAgentProfile(agentId: string): Promise<AgentProfileRecord | null>;
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
  authenticateAgent(credential: string): Promise<AgentProfileRecord | null>;
  issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult>;
  resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult>;
  touchAgent(agentId: string): Promise<void>;
}
