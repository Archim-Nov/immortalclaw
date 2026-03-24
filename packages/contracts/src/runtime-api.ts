export type {
  DetailedAttributeId,
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivationRegistrationView,
  CultivatorStateView,
  DecisionPolicyView,
  Message,
  MainAttributeId,
  RegistrationAnswer,
  RegistrationProfileView,
  RegistrationQuestionId,
  RegistrationQuestionnaireView,
  RegistrationGameplayEffectsView,
  StrategySnapshot,
  TickSummary,
} from "../../domain/src/runtime.js";

import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CombatLogEntry,
  CultivationRegistrationRecord,
  CultivationRegistrationView,
  CultivatorStateView,
  DecisionPolicyView,
  FiveElementId,
  Message,
  RegistrationAnswer,
  RegistrationProfileView,
  RegistrationQuestionId,
  RegistrationQuestionnaireView,
  RegistrationGameplayEffectsView,
  StrategySnapshot,
  TickSummary,
  WorldEvent,
} from "../../domain/src/runtime.js";
import type { DetailedAttributeId, MainAttributeId } from "../../domain/src/attributes.js";
import type { AgentRegistrationInput } from "../../persistence/src/world-repository.js";

export interface RuntimeHealthResponse {
  ok: boolean;
}

export interface CultivatorStateRequest {
  cultivatorId: string;
}

export type CultivatorStateResponse = CultivatorStateView;

export interface CultivatorActionsRequest {
  cultivatorId: string;
}

export interface CultivatorActionsResponse {
  cultivatorId: string;
  actions: AvailableAction[];
}

export interface PerformActionRequest {
  cultivatorId: string;
  actionId: ActionId;
}

export type PerformActionResponse = ActionExecutionResult;

export interface AdvanceWorldRequest {
  steps: number;
}

export type AdvanceWorldResponse = TickSummary;

export interface AgentRegistrationRequest extends Omit<AgentRegistrationInput, "record"> {
  answers?: Record<RegistrationQuestionId, RegistrationAnswer>;
  record?: CultivationRegistrationRecord;
  webhookUrl?: string;
}

export type AgentRegistrationQuestionnaireResponse = RegistrationQuestionnaireView;

export interface AgentRegistrationResponse {
  ok: true;
  agentId: string;
  credential: string;
  baseUrl: string;
  selectedCultivatorId: string;
  createdCultivator: boolean;
  registration: CultivationRegistrationView | null;
  registrationEffects: RegistrationGameplayEffectsView | null;
  registrationProfile: RegistrationProfileView | null;
  message: string;
}

export interface AgentView {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface DerivedAttributeResponse {
  fiveElementScores: Record<FiveElementId, number>;
  mainAttributes: Record<MainAttributeId, number>;
  detailedAttributes: Record<DetailedAttributeId, number>;
}

export interface AgentStateResponse extends CultivatorStateView, DerivedAttributeResponse {
  agent: AgentView;
}

export interface AgentActionsResponse {
  agent: AgentView;
  cultivatorId: string;
  actions: AvailableAction[];
}

export type AgentMessagesResponse = Message[];

export interface AgentSendMessageRequest {
  toAgentId?: string;
  toCultivatorId?: string;
  subject?: string;
  content: string;
}

export interface AgentSendMessageResponse {
  ok: true;
  message: Message;
}

export interface AgentEventsResponse {
  agent: AgentView;
  tick: number;
  events: WorldEvent[];
  combats: CombatLogEntry[];
}

export interface AgentRegistrationRecordRequest {
  record: CultivationRegistrationRecord;
}

export interface WebhookWakePayload {
  event: "tick" | "message";
  tick: number;
  reason: string;
}

export interface AgentWebhookBindResponse {
  ok: true;
  webhookUrl: string;
  webhookSecret: string;
}

export type AgentStrategyResponse = StrategySnapshot;
