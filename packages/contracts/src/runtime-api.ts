export type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivatorStateView,
  StrategySnapshot,
  TickSummary,
  TribulationPreview,
} from "../../domain/src/runtime.js";

import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivatorStateView,
  StrategySnapshot,
  TickSummary,
  TribulationPreview,
} from "../../domain/src/runtime.js";
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

export interface AgentRegistrationRequest extends AgentRegistrationInput {}

export interface AgentRegistrationResponse {
  ok: true;
  agentId: string;
  apiKey: string;
  baseUrl: string;
  selectedCultivatorId: string;
  createdCultivator: boolean;
  message: string;
}

export interface AgentView {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  llmProvider: string | null;
  llmModelName: string | null;
  llmModelVersion: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AgentStateResponse extends CultivatorStateView {
  agent: AgentView;
}

export interface AgentActionsResponse {
  agent: AgentView;
  cultivatorId: string;
  actions: AvailableAction[];
}

export type AgentMessagesResponse = unknown[];

export interface AgentEventsResponse {
  agent: AgentView;
  tick: number;
  events: unknown[];
  combats: unknown[];
}

export interface AgentRegistrationRecordRequest {
  record: CultivationRegistrationRecord;
}

export type AgentStrategyResponse = StrategySnapshot;
export type AgentTribulationResponse = TribulationPreview;
