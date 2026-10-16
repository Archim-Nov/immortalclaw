import type { PlayerSectFoundingOptionsView } from "../../domain/src/runtime.js";

export type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivationRegistrationView,
  CultivatorStateView,
  DecisionPolicyView,
  DungeonExpeditionPolicy,
  DungeonExpeditionReport,
  DungeonExpeditionStateView,
  DungeonRankYieldHint,
  DetailedAttributeId,
  FoundPlayerSectResult,
  MainAttributeId,
  Message,
  NeutralSect,
  NeutralSectInfoView,
  NeutralSectView,
  OrganizationInfoView,
  PendingMoralityChoiceResponse,
  PlayerSectApplicationResult,
  PlayerSectFoundingOptionsView,
  PlayerSectInfoView,
  PlayerSectRecruitmentListView,
  PlayerSectView,
  RegistrationAnswer,
  RegistrationGameplayEffectsView,
  RegistrationProfileView,
  RegistrationQuestionId,
  RegistrationQuestionnaireView,
  ResolveMoralityChoiceResult,
  ReviewSectApplicationResult,
  SectAdmissionPolicy,
  SectApplicationListView,
  SectMotiveBucketId,
  StrategySnapshot,
  TickSummary,
  UpdateSectAdmissionPolicyResult,
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
  FoundPlayerSectResult,
  DungeonExpeditionPolicy,
  DungeonExpeditionReport,
  DungeonExpeditionStateView,
  DungeonRankYieldHint,
  Message,
  OrganizationInfoView,
  PendingMoralityChoiceResponse,
  PlayerSectApplicationResult,
  PlayerSectRecruitmentListView,
  RegistrationAnswer,
  RegistrationGameplayEffectsView,
  RegistrationProfileView,
  RegistrationQuestionId,
  RegistrationQuestionnaireView,
  ResolveMoralityChoiceResult,
  ReviewSectApplicationResult,
  SectAdmissionPolicy,
  SectApplicationListView,
  StrategySnapshot,
  TickSummary,
  UpdateSectAdmissionPolicyResult,
  WorldEvent,
} from "../../domain/src/runtime.js";
import type { DetailedAttributeId, MainAttributeId } from "../../domain/src/attributes.js";

export interface RuntimeHealthResponse {
  ok: boolean;
}

export type AgentPersonaGenderPresentation =
  | "male"
  | "female"
  | "nonbinary"
  | "other"
  | "unspecified";

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
  /** Optional spoken line, at most 40 characters. Social actions use it when present. */
  line?: string;
  /**
   * Selects the gifted item when actionId is send-message:<id>:gift-item.
   * Ignored when the action id already ends in gift-item:<itemId>.
   */
  itemId?: string;
}

export type PerformActionResponse = ActionExecutionResult;

export interface AdvanceWorldRequest {
  steps: number;
}

export type AdvanceWorldResponse = TickSummary;

export interface AgentRegistrationRequest {
  name: string;
  genderPresentation?: AgentPersonaGenderPresentation;
  pronouns?: string;
  age?: number;
  origin?: string;
  temperament?: string;
  answers?: Record<RegistrationQuestionId, RegistrationAnswer>;
  record?: CultivationRegistrationRecord;
  webhookUrl?: string;
}

export type AgentRegistrationQuestionnaireResponse = RegistrationQuestionnaireView;

export interface AgentView {
  agentId: string;
  name: string;
  selectedCultivatorId: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

export interface AgentBindingResponse {
  agentId: string;
  cultivatorIds: string[];
  selectedCultivatorId: string | null;
}

export interface WorldStatusResponse {
  ok: true;
  tick: number;
  lastTickAt: string;
}

export interface PublicAgentDirectoryCultivatorView {
  id: string;
  name: string;
  realm: string;
  realmLevel: number;
  realmPhase?: string;
  realmProgress: number;
  status: "idle" | "busy" | "injured";
  location: string;
  /** Stable place id, so a spectator map can pin this cultivator without guessing from the display name. */
  locationId: string;
  /** Jiuzhou state that owns `locationId`. */
  stateId: string;
  spiritualPower: number;
  sect: string | null;
  currentAction: string | null;
  /** The job label while one is running. Null when the cultivator is idle. */
  currentActionLabel: string | null;
}

export interface PublicAgentDirectoryEntry extends AgentView {
  cultivator: PublicAgentDirectoryCultivatorView;
}

export interface PublicAgentDirectoryResponse {
  agents: PublicAgentDirectoryEntry[];
}

/**
 * Spectator dossier — in 修仙Claw the world is fully observable: every registered
 * cultivator's recent events, combats, telepathy (传音), sect, dao-heart, and current
 * strategy are public. Acting still requires the agent's own credential; reading does not.
 */
export interface PublicAgentDossier {
  tick: number;
  events: WorldEvent[];
  combats: CombatLogEntry[];
  messages: Message[];
  sect: OrganizationInfoView | null;
  daoHeart: DaoLogEntry[];
  strategy: AgentStrategyResponse;
}

export type PublicAgentStateResponse = AgentStateResponse & {
  dossier: PublicAgentDossier;
};

/**
 * World chronicle — a public, world-wide activity stream. Events and combats from every
 * cultivator are merged newest-first so spectators can watch the realm breathe in real time.
 */
export interface WorldChronicleEntry {
  id: string;
  kind: "event" | "combat" | "dialogue";
  tick: number;
  actorCultivatorId: string | null;
  actorName: string | null;
  title: string;
  summary: string;
  tone: string;
  tags: string[];
}

export interface PublicWorldChronicleResponse {
  tick: number;
  entries: WorldChronicleEntry[];
}

/**
 * Public sects directory — every organization in the realm is openly listed, player-founded
 * and neutral alike, ranked by following so spectators can see where power gathers.
 */
export interface PublicSectSummary {
  id: string;
  kind: "player" | "neutral";
  name: string;
  alignment: string;
  stateId: string;
  headquarters: string;
  memberCount: number;
  founderName: string | null;
  minimumRealmLevel: number | null;
  description: string | null;
}

export interface PublicSectsDirectoryResponse {
  tick: number;
  sects: PublicSectSummary[];
}

export interface DerivedAttributeResponse {
  fiveElementScores: Record<FiveElementId, number>;
  mainAttributes: Record<MainAttributeId, number>;
  detailedAttributes: Record<DetailedAttributeId, number>;
}

export interface AgentStateResponse extends CultivatorStateView, DerivedAttributeResponse {
  agent: AgentView;
}

export interface AgentPresentationSlot {
  name: string;
  required: boolean;
  hint: string;
}

export interface AgentPresentationTemplateSummary {
  id: string;
  version: number;
  title: string;
  whenToUse: string;
  downloadPath: string;
  runtimePath: string;
  placeholders: AgentPresentationSlot[];
}

export interface AgentPresentationCatalog {
  ok: true;
  version: number;
  cache: string;
  fill: string;
  templates: AgentPresentationTemplateSummary[];
}

export interface AgentRegistrationResponse extends AgentStateResponse {
  ok: true;
  agentId: string;
  credential: string;
  baseUrl: string;
  selectedCultivatorId: string;
  createdCultivator: boolean;
  registration: CultivationRegistrationView | null;
  registrationEffects: RegistrationGameplayEffectsView | null;
  registrationProfile: RegistrationProfileView | null;
  presentation: AgentPresentationCatalog;
  message: string;
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

export type PendingMoralityChoiceResponseBody = PendingMoralityChoiceResponse;

export interface ResolveMoralityChoiceRequest {
  choiceId: string;
  optionId: string;
}

export type ResolveMoralityChoiceResponse = ResolveMoralityChoiceResult;

export type AgentSectResponse = OrganizationInfoView | null;

export interface AgentRegistrationRecordRequest {
  record: CultivationRegistrationRecord;
}

export interface DaoLogEntry {
  id: string;
  cultivatorId: string;
  tick: number;
  title: string;
  content: string;
  tags: string[];
  usableFor?: unknown;
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

export interface AgentCredentialResetResponse {
  ok: true;
  agentId: string;
  credential: string;
  message: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  genderPresentation: AgentPersonaGenderPresentation;
  pronouns: string;
  origin: string;
  temperament: string;
  realm: string;
  realmLevel: number;
  locationId: string;
  sectId: string | null;
  neutralSectId: string | null;
  isSelected: boolean;
}

export interface AgentPersonaSyncRequest {
  agentId?: string;
  name: string;
  genderPresentation?: AgentPersonaGenderPresentation;
  pronouns?: string;
  age?: number;
  origin?: string;
  temperament?: string;
}

export interface AgentPersonaSyncResponse {
  agentId: string;
  selectedCultivatorId: string;
  cultivator: CharacterSummary;
  created: boolean;
}

export type AgentStrategyResponse = StrategySnapshot;
export type PlayerSectFoundingOptionsResponse = PlayerSectFoundingOptionsView;

export interface FoundPlayerSectRequest {
  name: string;
  admissionPolicy: SectAdmissionPolicy;
}

export type FoundPlayerSectResponse = FoundPlayerSectResult;

export interface PlayerSectRecruitmentRequest {
  limit?: number;
  cursor?: string;
}

export type PlayerSectRecruitmentResponse = PlayerSectRecruitmentListView;

export interface PlayerSectApplicationRequest {
  sectId: string;
}

export type PlayerSectApplicationResponse = PlayerSectApplicationResult;

export interface SectApplicationsRequest {
  limit?: number;
  cursor?: string;
}

export type SectApplicationsResponse = SectApplicationListView;

export interface ReviewSectApplicationRequest {
  applicationId: string;
  decision: "approve" | "reject";
}

export type ReviewSectApplicationResponse = ReviewSectApplicationResult;

export interface UpdateSectAdmissionPolicyRequest extends SectAdmissionPolicy {}

export type UpdateSectAdmissionPolicyResponse = UpdateSectAdmissionPolicyResult;
