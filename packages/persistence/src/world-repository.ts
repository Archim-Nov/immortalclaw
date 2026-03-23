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
}

export interface AgentProfileWriteInput extends AgentPersonaInput {
  agentId: string;
  selectedCultivatorId: string;
  lastSeenAt?: string | null;
}

export interface AgentProfileRecord {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  genderPresentation?: GenderPresentation;
  pronouns?: string;
  origin?: string;
  temperament?: string;
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
  getWorldMetadata(): Promise<{ tick: number; updatedAt: string }>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult>;
  advanceWorld(steps: number, trigger?: TickRunRecord["trigger"]): Promise<TickSummary>;
  getLatestTickRun(): Promise<TickRunRecord | null>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}
