import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  AgentPersonaSyncResult,
  CreateCultivatorInput,
  CultivationRegistrationRecord,
  GenderPresentation,
  Message,
  StartingPath,
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
    "name" | "genderPresentation" | "pronouns" | "age" | "origin" | "temperament" | "startingPath"
  > {}

export interface AgentRegistrationInput extends AgentPersonaInput {
  llmProvider?: string;
  llmModelName?: string;
  llmModelVersion?: string;
  record?: CultivationRegistrationRecord;
}

export interface AgentProfileRecord {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  genderPresentation?: GenderPresentation;
  pronouns?: string;
  origin?: string;
  temperament?: string;
  startingPath?: StartingPath;
  llmProvider?: string;
  llmModelName?: string;
  llmModelVersion?: string;
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
  listAgentProfiles(): Promise<AgentProfileRecord[]>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  acquireTickLock(ownerId: string): Promise<TickLockRecord | null>;
  releaseTickLock(lockId: string): Promise<void>;
  registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult>;
  resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult>;
  authenticateAgent(credential: string): Promise<AgentProfileRecord | null>;
  syncAgentPersona(agentId: string, input: AgentPersonaInput): Promise<AgentProfileRecord>;
  touchAgent(agentId: string): Promise<void>;
  syncPersona(agentId: string, input: AgentPersonaInput): Promise<AgentPersonaSyncResult>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
  saveCultivationRegistration(
    cultivatorId: string,
    record: CultivationRegistrationRecord,
    savedByAgentId?: string | null,
  ): Promise<CultivationRegistrationRecord>;
  sendDirectMessage(
    fromCultivatorId: string,
    toCultivatorId: string,
    from: string,
    subject: string,
    content: string,
  ): Promise<Message>;
}
