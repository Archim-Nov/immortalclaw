import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivatorStateView,
  PersistedWorldState,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  CreateCultivatorInput,
  CultivationRegistrationRecord,
  GenderPresentation,
} from "../../domain/src/model.js";

export interface TickRunRecord {
  tick: number;
  advancedTicks: number;
  recordedAt: string;
  trigger: "manual" | "scheduled";
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
  // Implementations persist canonical persisted state but expose hydrated runtime worlds to callers.
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  getWorldMetadata(): Promise<{ tick: number; updatedAt: string }>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId, line?: string, itemId?: string): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}

export type PersistedWorldSnapshot = PersistedWorldState;
