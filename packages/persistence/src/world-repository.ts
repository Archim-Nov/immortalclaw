import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  CreateCultivatorInput,
  CultivationRegistrationRecord,
  GenderPresentation,
  Message,
} from "../../domain/src/model.js";

export interface TickRunRecord {
  tick: number;
  advancedTicks: number;
  recordedAt: string;
  trigger: "manual" | "scheduled";
}

export interface TickLockRecord {
  lockId: string;
  ownerId: string;
  acquiredAt: string;
}

export interface AgentPersonaInput
  extends Pick<
    CreateCultivatorInput,
    "name" | "genderPresentation" | "pronouns" | "age" | "origin" | "temperament"
  > {}

export interface AgentRegistrationInput extends AgentPersonaInput {
  record?: CultivationRegistrationRecord;
  webhookUrl?: string;
}

export interface AgentProfileWriteInput extends AgentPersonaInput {
  agentId: string;
  selectedCultivatorId: string;
  lastSeenAt?: string | null;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface AgentProfileRecord {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  genderPresentation?: GenderPresentation;
  pronouns?: string;
  origin?: string;
  temperament?: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AgentRegistrationResult extends AgentProfileRecord {
  credential: string;
  createdCultivator: boolean;
}

export interface AgentCredentialResetResult {
  agentId: string;
  credential: string;
}

export interface WorldRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
  getAgentProfile(agentId: string): Promise<AgentProfileRecord | null>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  acquireTickLock(ownerId: string): Promise<TickLockRecord | null>;
  releaseTickLock(lockId: string): Promise<void>;
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
  issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult>;
  /** @deprecated Prefer application-owned registration workflows plus transactWorld/saveAgentProfile/issueAgentCredential. */
  registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult>;
  resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult>;
  authenticateAgent(credential: string): Promise<AgentProfileRecord | null>;
  touchAgent(agentId: string): Promise<void>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
  /** @deprecated Prefer transactWorld plus domain saveCultivationRegistration from application workflows. */
  saveCultivationRegistration(
    cultivatorId: string,
    record: CultivationRegistrationRecord,
    savedByAgentId?: string | null,
  ): Promise<CultivationRegistrationRecord>;
  /** @deprecated Prefer transactWorld plus domain sendDirectMessage from application workflows. */
  sendDirectMessage(
    fromCultivatorId: string,
    toCultivatorId: string,
    from: string,
    subject: string,
    content: string,
  ): Promise<Message>;
}
