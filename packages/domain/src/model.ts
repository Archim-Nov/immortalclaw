export type RealmStage = "炼气" | "筑基" | "金丹";
export type GenderPresentation = "male" | "female" | "nonbinary" | "other" | "unspecified";
export type FiveElementId = "metal" | "wood" | "water" | "fire" | "earth";
export type RegistrationQuestionId =
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "Q5"
  | "Q6"
  | "Q7"
  | "Q8"
  | "Q9"
  | "Q10"
  | "Q11"
  | "Q12"
  | "Q13"
  | "Q14"
  | "Q15"
  | "Q16"
  | "Q17"
  | "Q18";
export type RegistrationAnswer = "A" | "B" | "C" | "D";
export type RegistrationConfidenceLevel = "high" | "medium" | "low";
export type RegistrationLocale = "zh-CN" | "en";
export type RegistrationQuestionCategory = "core-temperament" | "behavior-aspect" | "cultivation-motive";
export type RegistrationTemperamentId =
  | "shou_jie"
  | "duan_feng"
  | "fu_sheng"
  | "xiang_rong"
  | "qian_yuan"
  | "guan_lan"
  | "chi_xin"
  | "zheng_sheng"
  | "zhen_yue"
  | "shou_cheng";
export type RegistrationBehaviorAspectId =
  | "metal"
  | "wood"
  | "water"
  | "fire"
  | "earth"
  | "metal-wood"
  | "metal-water"
  | "metal-fire"
  | "metal-earth"
  | "wood-water"
  | "wood-fire"
  | "wood-earth"
  | "water-fire"
  | "water-earth"
  | "fire-earth";
export type RegistrationCultivationMotiveId =
  | "seek-longevity"
  | "prove-the-great-dao"
  | "seek-truth"
  | "protect-the-beloved"
  | "serve-the-world"
  | "avenge-old-grudges"
  | "compete-for-supremacy"
  | "honor-the-clan"
  | "defy-fate"
  | "seek-freedom";
export type SectMotiveBucketId =
  | "longevity-order"
  | "dao-truth"
  | "guard-world"
  | "strife-defiance"
  | "freedom-wander";
export type RegistrationSpiritRootKindId = "single-root" | "dual-root";

// ---- New location system types (P1 migration) ----
// Core types are defined in constants.ts - re-exported here for convenience
export type { BaseNodeType, StateId, NodeType, LocationId, RiskLevel } from "./constants.js";

export type SectAlignment = "正道" | "魔道";
export type OrganizationAlignment = SectAlignment | "中立";
export type MoralityAlignment = SectAlignment;

export interface Location {
  id: import("./constants.js").LocationId;
  stateId: import("./constants.js").StateId;
  nodeType: import("./constants.js").NodeType;
  name: string;
  kind: "safe" | "resource" | "adventure";
  risk: import("./constants.js").RiskLevel;
  description: string;
  organizationId?: string | null;
  organizationType?: "player-sect" | "neutral-sect" | null;
}

export interface StateDefinition {
  id: string;
  name: string;
  risk: string;
  locationIds: string[];
}

export interface TopologyEdge {
  from: string;
  to: string;
  ticks: number;
}

export interface TopologyGraph {
  edges: TopologyEdge[];
  distanceMatrix: Map<string, number>;
}

export interface EventEffect {
  spiritStones?: number;
  qi?: number;
  spiritualPower?: number;
  realmProgress?: number;
  injuryTicksRemaining?: number;
  injuryTicksDelta?: number;
  itemRewards?: ReadonlyArray<{ itemId: ItemId; count: number }>;
  statusEffects?: ReadonlyArray<{ effectId: StatusEffectId; ticks: number }>;
  reputationChange?: number;
}

export interface MoralityChoiceOption {
  id: string;
  label: string;
  summary: string;
  moralityDelta: number;
  effectBundle: EventEffect;
}

export interface MoralityChoiceTemplate {
  title: string;
  prompt: string;
  expiresInTicks: number;
  options: readonly [MoralityChoiceOption, MoralityChoiceOption];
}

export interface EventTemplate {
  id: string;
  layer: "global-common" | "state-specific" | "node-specific" | "special-overlay";
  source: "exploration" | "travel";
  semanticType: "fortune" | "training" | "human";
  resultType: "resource" | "progression" | "status" | "combat" | "story";
  name: string;
  nameCn: string;
  description: string;
  baseWeight: number;
  stateId: import("./constants.js").StateId | null;
  nodeType: import("./constants.js").NodeType | null;
  minRealm: RealmStage | null;
  effects: EventEffect;
  moralityChoice?: MoralityChoiceTemplate;
}

export interface EventPools {
  globalCommon: readonly EventTemplate[];
  stateSpecific: Readonly<Record<import("./constants.js").StateId, readonly EventTemplate[]>>;
  travelStateSpecific: Readonly<Record<import("./constants.js").StateId, readonly EventTemplate[]>>;
  nodeSpecific: Readonly<Record<string, readonly EventTemplate[]>>;
  travelPool: readonly EventTemplate[];
}

export interface Residence {
  id: string;
  locationId: import("./constants.js").LocationId;
  level: 1;
  name: string;
}

export type QuestCategory = "base" | "sect" | "high-risk";
export type QuestReadiness = "poor" | "stable" | "ready" | "advantaged";
export type ReadinessLevel = QuestReadiness;
export type RecoveryState = "healthy" | "wounded" | "injured" | "depleted";
export type ActivityContext =
  | "stationed"
  | "traveling"
  | "retreating"
  | "recovering"
  | "tasking"
  | "exploring"
  | "sect-duty"
  | "encounter-resolving";

export interface DaoPotential {
  readonly score: number;
  readonly tier: "novice" | "apprentice" | "adept" | "expert" | "master" | "grandmaster";
  readonly breakdown: {
    readonly realmBase: number;
    readonly attributeAverage: number;
    readonly detailedAttributeModifier: number;
    readonly readinessModifier: number;
    readonly statusModifier: number;
  };
}

export interface DerivedStateView {
  readonly readiness: ReadinessLevel;
  readonly recoveryState: RecoveryState;
  readonly activityContext: ActivityContext;
  readonly daoPotential: DaoPotential;
}

export type OnboardingStage =
  | "registered"
  | "first-action"
  | "first-travel"
  | "first-quest"
  | "first-residence-cultivation"
  | "first-breakthrough"
  | "completed";

export type DecisionPriority =
  | "owner-command"
  | "safety"
  | "runtime-guidance"
  | "onboarding"
  | "free-exploration";

export interface DecisionPolicyView {
  readonly tutorialMode: "optional";
  readonly tutorialRequired: false;
  readonly freeExplorationAllowed: true;
  readonly priorityOrder: readonly DecisionPriority[];
  readonly summary: string;
}

export interface OnboardingProgress {
  readonly stage: OnboardingStage;
  readonly completedStages: readonly OnboardingStage[];
  readonly nextAction: ActionId | null;
  readonly hint: string;
  readonly recommendedOnly: true;
  readonly allowsFreeExploration: true;
}

export interface QuestRewardRange {
  spiritStones: { min: number; max: number };
  reputation: number;
  contribution: number;
}

export interface QuestPenalty {
  injuryTicks: number;
  spiritStoneLoss: number;
}

export interface QuestTemplate {
  id: string;
  type: string;
  category: QuestCategory;
  name: string;
  nameCn: string;
  description: string;
  durationTicks: number;
  minReadiness: QuestReadiness;
  sourceNodeTypes: readonly import("./constants.js").NodeType[];
  reward: QuestRewardRange;
  failurePenalty: QuestPenalty;
  successRate: number;
}

export interface QuestReward {
  spiritStones: number;
  reputation: number;
  contribution: number;
}

export interface QuestInstance {
  id: string;
  templateId: string;
  category: QuestCategory;
  locationId: string;
  name: string;
  nameCn: string;
  description: string;
  durationTicks: number;
  reward: QuestReward;
  failurePenalty: QuestPenalty;
  successRate: number;
  generatedAtTick: number;
  expiresAtTick: number;
}

export interface ActiveQuest {
  id: string;
  instanceId: string;
  templateId: string;
  category: QuestCategory;
  name: string;
  description: string;
  durationTicks: number;
  reward: QuestReward;
  failurePenalty: QuestPenalty;
  successRate: number;
  acceptedAtTick: number;
  status: "accepted" | "in-progress";
}

export interface QuestBoard {
  locationId: string;
  slots: number;
  quests: QuestInstance[];
  lastRefreshedTick: number;
}

export type SectTitle = "外门" | "内门" | "精英" | "长老" | "宗主";

export interface SectTitleSlot {
  title: SectTitle;
  threshold: number;
  maxSlots: number;
}

export interface SectAdmissionPolicy {
  minimumRealmLevel: number;
  allowedMotiveBuckets: SectMotiveBucketId[];
}

export interface SectApplication {
  id: string;
  sectId: string;
  cultivatorId: string;
  appliedAtTick: number;
  expiresAtTick: number;
}

export interface SectReapplyCooldown {
  id: string;
  sectId: string;
  cultivatorId: string;
  rejectedAtTick: number;
  expiresAtTick: number;
}

export type ItemId =
  | "healing-pill"
  | "qi-pill"
  | "ward-talisman"
  | "spirit-ore"
  | "ruin-fragment"
  | "beast-core"
  | "qi-common"
  | "foundation-common"
  | "core-common"
  | "qi-stage-1-special"
  | "qi-stage-2-special"
  | "qi-major-special"
  | "foundation-stage-1-special"
  | "foundation-stage-2-special"
  | "foundation-major-special"
  | "core-stage-1-special"
  | "core-stage-2-special"
  | "eight-wastes-pass"
  | "ancient-artifact"
  | "legendary-artifact";

export type ItemCategory = "consumable" | "talisman" | "material" | "manual";

export type FactionId = string;
export type StateReputation = Record<import("./constants.js").StateId, number>;

export type StatusEffectId =
  | "wounded"
  | "poisoned"
  | "clear-mind"
  | "qi-surge"
  | "fortune-marked"
  | "warded"
  | "deviation"
  | "insight"
  | "spirit-saturated";

export type TimedActionId =
  | `travel-to:${string}`
  | `execute-quest:${string}`
  | `explore-guixu:${string}`
  | "meditate"
  | "heal"
  | "cultivate"
  | "residence-meditate"
  | "residence-breakthrough"
  | "residence-heal"
  | "residence-recover-qi"
  | "residence-produce"
  | "residence-socialize"
  | "take-mortal-task"
  | "mine-spirit-stones"
  | "search-fortune"
  | "take-sect-errand"
  | "take-neutral-duty"
  | "hunt-mine-beast"
  | "challenge-guardian"
  | "survey-wilderness"
  | `residence-produce:${string}`
  | `residence-heal:${"use-pill" | "no-pill"}`
  | `residence-recover-qi:${"use-pill" | "no-pill"}`;

export type ResidenceActionId =
  | "residence-meditate"
  | "residence-breakthrough"
  | "residence-heal"
  | "residence-recover-qi"
  | "residence-produce"
  | "residence-socialize";

export interface ProductionRecipe {
  id: string;
  outputItemId: ItemId;
  outputCount: number;
  inputMaterials: ReadonlyArray<{ itemId: ItemId; count: number }>;
  spiritStoneCost: number;
  durationTicks: number;
}

export interface WildernessReward {
  itemId: ItemId;
  dropRate: number;
}

export interface WildernessLayer {
  layerId: string;
  name: string;
  type: "wilderness-expansion";
  tier: 1 | 2 | 3;
  status: "active" | "prototype";
  locationIds: string[];
  entryRequirement: {
    minRealm: RealmStage;
    minContribution?: number;
    entryTicket?: ItemId;
  };
  survivalPressure: {
    maxSurvivalTicks: number;
    qiDamagePerTick: number;
    spiritualDamagePerTick: number;
    injuryTicksOnRetreat: number;
  };
  retreatCost: {
    spiritStoneLoss: number;
    progressLoss: number;
    itemLoss: Partial<Record<ItemId, number>>;
  };
  rewardTable: WildernessReward[];
  eventPool: string[];
}

export interface WildernessProgress {
  cultivatorId: string;
  layerId: string;
  enteredAtTick: number;
  ticksSurvived: number;
  remainingSurvivalTicks: number;
  status: "active" | "withdrawn";
  lastEventId: string | null;
}

export type GuixuTier = "entry" | "mid" | "deep" | "core";
export type GuixuNodeType = "exploration" | "guardian" | "resource" | "sanctuary";

export interface GuixuNode {
  nodeId: string;
  name: string;
  tier: GuixuTier;
  unlockRequirement: {
    wildernessProgress: number;
    minRealm: RealmStage;
    uniqueKey?: string;
  };
  nodeType: GuixuNodeType;
  sharedProgress: boolean;
  anchorLocationId: string;
  explorationDurationTicks: number;
  eventPool: string[];
}

export interface GuixuProgress {
  wildernessAttunement: Record<string, number>;
  personalUnlockedNodeIds: Record<string, string[]>;
  sharedUnlockedNodeIds: string[];
  lastResolvedEventIds: Record<string, string | null>;
}

export type WarFaction = "righteous" | "demonic";

export interface WarObjective {
  objectiveId: string;
  type: "capture-node" | "defeat-boss" | "collect-resource";
  progress: Record<WarFaction, number>;
  target: number;
  completed: boolean;
}

export interface FactionWar {
  warId: string;
  stateId: string;
  factions: [WarFaction, WarFaction];
  startTick: number;
  endTick: number;
  objectives: WarObjective[];
  rewards: {
    winnerReward: {
      spiritStones: number;
      contribution: number;
    };
    participationReward: {
      spiritStones: number;
      reputation: number;
    };
  };
}

export interface SectBonus {
  type: "damage" | "defense" | "production" | "resource";
  value: number;
  appliesTo: "all-members";
}

export interface SectLevel {
  sectId: string;
  level: number;
  experience: number;
  nextLevelExp: number;
  bonuses: SectBonus[];
}

export type ImmediateActionId =
  | `accept-quest:${string}`
  | `enter-wilderness:${string}`
  | `unlock-guixu:${string}`
  | `join-neutral-sect:${string}`
  | "open-player-sect-recruitment"
  | "review-player-sect-applications"
  | "resolve-morality-event-choice"
  | "buy-healing-pill"
  | "buy-qi-pill"
  | "buy-ward-talisman"
  | "use-healing-pill"
  | "use-qi-pill"
  | "use-ward-talisman"
  | "sell-spirit-ore"
  | "sell-ruin-fragment"
  | "sell-beast-core"
  | "join-sect"
  | "leave-neutral-sect"
  | "withdraw-from-wilderness";

export type ActionId = TimedActionId | ImmediateActionId;

export type ItemTradeScope = "settlement" | "none";
export type ItemUseKind = "consume" | "study" | "ticket" | "material";
export type ItemActionOperation = "buy" | "sell" | "use" | "study";

export interface ItemTradeDefinition {
  buyBasePrice: number | null;
  sellBasePrice: number | null;
  tradableAt: ItemTradeScope;
}

export interface ItemUseDefinition {
  kind: ItemUseKind;
  actionId: ActionId | null;
  consumesOnUse: boolean;
  effectSummary: string | null;
  effectBundle: EventEffect | null;
  grantsTechnique: string | null;
  ticketTargets: string[] | null;
}

export interface ActionItemBinding {
  itemId: ItemId;
  operation: ItemActionOperation;
}

export interface ActionCostSummary {
  spiritStones?: number;
  itemConsumes?: Array<{ itemId: ItemId; count: number }>;
}

export interface ActionEffectSummary {
  spiritStones?: number;
  qi?: number;
  spiritualPower?: number;
  realmProgress?: number;
  injuryTicksDelta?: number;
  statusEffectIds?: StatusEffectId[];
  techniques?: string[];
}

export interface Sect {
  id: string;
  name: string;
  alignment: SectAlignment;
  stateId: import("./constants.js").StateId;
  founderCultivatorId: string;
  treasury: number;
  memberIds: string[];
  spiritVeins: string[];
  headquarters: string;
  titleSlots: SectTitleSlot[];
  titleUpdateInterval: number;
  lastTitleUpdateTick: number;
  admissionPolicy: SectAdmissionPolicy;
  admissionPolicyUpdatedAtTick: number;
}

export interface NeutralSect {
  id: string;
  name: string;
  alignment: "中立";
  stateId: import("./constants.js").StateId;
  headquarters: import("./constants.js").LocationId;
  description: string;
  rewardMultiplier: number;
  joinable: true;
  competitive: false;
  memberIds: string[];
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  baseValue: number;
  tags: string[];
  trade: ItemTradeDefinition;
  use: ItemUseDefinition;
}

export type BreakthroughCategory = "minor" | "major";
export type BreakthroughOutcome = "success" | "failure";

export interface BreakthroughRateModifier {
  source: string;
  delta: number;
}

export interface BreakthroughRecord {
  tick: number;
  fromRealm: RealmStage;
  fromLevel: number;
  toRealm: RealmStage;
  toLevel: number;
  category: BreakthroughCategory;
  outcome: BreakthroughOutcome;
  consumedItems: Array<{ itemId: ItemId; count: number }>;
  successRate?: number;
  rateBreakdown?: BreakthroughRateModifier[];
}

export interface StatusEffect {
  id: StatusEffectId;
  name: string;
  description: string;
  source: string;
  remainingTicks: number;
  intensity: number;
}

export interface Cultivator {
  id: string;
  name: string;
  genderPresentation: GenderPresentation;
  pronouns: string;
  origin: string;
  temperament: string;
  createdByAgentId: string | null;
  realm: RealmStage;
  realmLevel: number;
  realmProgress: number;
  locationId: string;
  residence: Residence;
  spiritStones: number;
  qi: number;
  maxQi: number;
  spiritualPower: number;
  maxSpiritualPower: number;
  stateReputation: StateReputation;
  factionReputation: Record<string, number>;
  lifespan: number;
  age: number;
  sectId: string | null;
  neutralSectId: string | null;
  sectTitle: SectTitle | null;
  moralityScore: number;
  pendingSectApplicationId: string | null;
  pendingMoralityChoiceId: string | null;
  totalContribution: number;
  neutralContribution: number;
  contributionReachedAt: number;
  activeQuests: ActiveQuest[];
  completedBaseQuests: number;
  techniques: string[];
  inventory: Record<ItemId, number>;
  statusEffects: StatusEffect[];
  breakthroughRecords: BreakthroughRecord[];
  activeJobId: string | null;
  injuryTicksRemaining: number;
  registrationRecord: CultivationRegistrationRecord | null;
}

export interface CultivationRegistrationResult {
  label_locale?: RegistrationLocale;
  core_temperament_id?: RegistrationTemperamentId;
  core_temperament: string;
  secondary_temperament_id?: RegistrationTemperamentId;
  secondary_temperament: string;
  behavior_aspect_id?: RegistrationBehaviorAspectId;
  behavior_aspect: string;
  cultivation_motive_id?: RegistrationCultivationMotiveId;
  cultivation_motive: string;
  five_element_scores: Record<FiveElementId, number>;
  spirit_root_kind_id?: RegistrationSpiritRootKindId;
  spirit_root_result: string;
  confidence: {
    core: RegistrationConfidenceLevel;
    behavior: RegistrationConfidenceLevel;
    motive: RegistrationConfidenceLevel;
    overall: RegistrationConfidenceLevel;
  };
}

export interface CultivationRegistrationRecord {
  record_type: "registration_record";
  questionnaire_version: string;
  answers: Record<RegistrationQuestionId, RegistrationAnswer>;
  result: CultivationRegistrationResult;
  summary: string;
  saved_at?: string;
  cultivator_id?: string;
  agent_id?: string | null;
}

export interface CultivationRegistrationView {
  saved_at: string | null;
  label_locale: RegistrationLocale;
  core_temperament_id: RegistrationTemperamentId;
  core_temperament: string;
  secondary_temperament_id: RegistrationTemperamentId;
  secondary_temperament: string;
  behavior_aspect_id: RegistrationBehaviorAspectId;
  behavior_aspect: string;
  cultivation_motive_id: RegistrationCultivationMotiveId;
  cultivation_motive: string;
  spirit_root_kind_id: RegistrationSpiritRootKindId;
  spirit_root_result: string;
  overall_confidence: RegistrationConfidenceLevel;
}

export interface RegistrationQuestionOptionView {
  id: RegistrationAnswer;
  label: string;
}

export interface RegistrationQuestionView {
  id: RegistrationQuestionId;
  category: RegistrationQuestionCategory;
  prompt: string;
  options: RegistrationQuestionOptionView[];
}

export interface RegistrationQuestionnaireView {
  version: string;
  locale: RegistrationLocale;
  questions: RegistrationQuestionView[];
}

export interface RegistrationDominantElementView {
  id: FiveElementId;
  label: string;
  score: number;
}

export interface RegistrationGameplayModifierView {
  source: "core-temperament" | "behavior-aspect" | "cultivation-motive" | "spirit-root";
  title: string;
  summary: string;
}

export interface RegistrationProfileView {
  summary: string;
  coreTemperament: {
    id: RegistrationTemperamentId;
    label: string;
    confidence: RegistrationConfidenceLevel;
  };
  secondaryTemperament: {
    id: RegistrationTemperamentId;
    label: string;
  };
  behaviorAspect: {
    id: RegistrationBehaviorAspectId;
    label: string;
    confidence: RegistrationConfidenceLevel;
  };
  cultivationMotive: {
    id: RegistrationCultivationMotiveId;
    label: string;
    confidence: RegistrationConfidenceLevel;
  };
  spiritRoot: {
    kindId: RegistrationSpiritRootKindId;
    label: string;
  };
  fiveElementScores: Record<FiveElementId, number>;
  dominantElements: RegistrationDominantElementView[];
  confidence: {
    core: RegistrationConfidenceLevel;
    behavior: RegistrationConfidenceLevel;
    motive: RegistrationConfidenceLevel;
    overall: RegistrationConfidenceLevel;
  };
}

export interface RegistrationGameplayEffectsView {
  dominantElements: RegistrationDominantElementView[];
  modifiers: RegistrationGameplayModifierView[];
}

export interface ActionJob {
  id: string;
  cultivatorId: string;
  actionId: TimedActionId;
  label: string;
  remainingTicks: number;
  totalTicks: number;
  meta?: {
    residenceRecipeId?: string;
    residenceMeditateFallback?: boolean;
    residenceHealUsePill?: boolean;
    residenceRecoverQiUsePill?: boolean;
    breakthroughCategory?: BreakthroughCategory;
    breakthroughTargetRealm?: RealmStage;
    breakthroughTargetLevel?: number;
    breakthroughCommonItemId?: ItemId;
    breakthroughCommonCount?: number;
    breakthroughSpecialItemId?: ItemId;
    breakthroughSpecialCount?: number;
    breakthroughSuccessRate?: number;
    breakthroughRateBreakdown?: BreakthroughRateModifier[];
    activeQuestId?: string;
    wildernessLayerId?: string;
    wildernessEventId?: string;
    guixuNodeId?: string;
    guixuEventId?: string;
  };
}

export interface DaoLogEntry {
  id: string;
  cultivatorId: string;
  tick: number;
  title: string;
  content: string;
  tags: string[];
}

export interface Message {
  id: string;
  cultivatorId: string;
  tick: number;
  from: string;
  fromCultivatorId?: string | null;
  toCultivatorId?: string | null;
  subject: string;
  content: string;
}

export interface WorldEvent {
  id: string;
  tick: number;
  cultivatorId: string | null;
  locationId: string;
  title: string;
  content: string;
  severity: "low" | "medium" | "high";
  tags: string[];
}

export interface PendingMoralityChoice {
  id: string;
  cultivatorId: string;
  createdAtTick: number;
  expiresAtTick: number;
  title: string;
  prompt: string;
  options: [MoralityChoiceOption, MoralityChoiceOption];
}

export interface PendingMoralityChoiceView {
  choiceId: string;
  title: string;
  prompt: string;
  createdAtTick: number;
  expiresAtTick: number;
  options: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
}

export interface CombatLogEntry {
  id: string;
  tick: number;
  cultivatorId: string;
  locationId: string;
  encounterId: "mine-beast" | "ruins-guardian";
  enemyName: string;
  outcome: "victory" | "defeat";
  damageTaken: number;
  spiritualPowerSpent: number;
  loot: Partial<Record<ItemId, number>>;
  summary: string;
}

export interface AgentBinding {
  agentId: string;
  cultivatorIds: string[];
  selectedCultivatorId: string | null;
}

export interface AgentPersonaSyncResult {
  agentId: string;
  selectedCultivatorId: string;
  cultivator: CharacterSummary;
  created: boolean;
}

export interface CharacterSummary {
  id: string;
  name: string;
  genderPresentation: GenderPresentation;
  pronouns: string;
  origin: string;
  temperament: string;
  realm: RealmStage;
  realmLevel: number;
  locationId: string;
  sectId: string | null;
  neutralSectId: string | null;
  isSelected: boolean;
}

export interface CreateCultivatorInput {
  agentId?: string | null;
  name: string;
  genderPresentation?: GenderPresentation;
  pronouns?: string;
  age?: number;
  origin?: string;
  temperament?: string;
}

export interface AvailableAction {
  actionId: ActionId;
  label: string;
  description: string;
  durationTicks: number;
  kind: "timed" | "immediate";
  itemBinding?: ActionItemBinding;
  costs?: ActionCostSummary;
  effects?: ActionEffectSummary;
}

export interface ActionExecutionResult {
  tick: number;
  cultivatorId: string;
  actionId: ActionId;
  accepted: boolean;
  summary: string;
  job?: ActionJob;
}

export interface TickSummary {
  tick: number;
  advancedTicks: number;
  completedJobs: Array<{
    cultivatorId: string;
    actionId: TimedActionId;
    summary: string;
  }>;
  triggeredEvents: WorldEvent[];
}

export interface InventoryEntryView {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  count: number;
  baseValue: number;
  tags: string[];
  trade: ItemTradeDefinition;
  use: ItemUseDefinition;
  availableActionIds: ActionId[];
}

export interface FactionStandingView {
  factionId: string;
  name: string;
  value: number;
  standing: "hostile" | "cold" | "neutral" | "trusted" | "favored";
}

export interface StatusEffectView {
  id: StatusEffectId;
  name: string;
  description: string;
  remainingTicks: number;
  source: string;
}

export interface BreakthroughRequirementView {
  itemId: ItemId;
  count: number;
  owned: number;
}

export interface BreakthroughMissingItemView {
  itemId: ItemId;
  required: number;
  owned: number;
  missing: number;
}

export interface BreakthroughStateView {
  targetRealm: RealmStage;
  targetLevel: number;
  category: BreakthroughCategory;
  readyByProgress: boolean;
  readyByMaterials: boolean;
  requiresResidence: boolean;
  commonRequirement: BreakthroughRequirementView;
  specialRequirement: BreakthroughRequirementView;
  missingItems: BreakthroughMissingItemView[];
  majorSuccessRate: number | null;
  rateBreakdown: BreakthroughRateModifier[];
  recommendedAction: ActionId | null;
}

export interface PlayerSectView {
  id: string;
  name: string;
  alignment: SectAlignment;
  role: string;
  treasury: number;
  memberCount: number;
  level?: number;
  bonuses?: SectBonus[];
  activeWarId?: string | null;
  warObjectives?: WarObjective[];
}

export interface NeutralSectView {
  id: string;
  name: string;
  alignment: "中立";
  stateId: import("./constants.js").StateId;
  headquarters: import("./constants.js").LocationId;
  role: "member";
  memberCount: number;
  neutralContribution: number;
  rewardMultiplier: number;
  competitive: false;
}

export interface PlayerSectInfoView {
  organizationType: "player";
  id: string;
  name: string;
  alignment: Sect["alignment"];
  stateId: Sect["stateId"];
  founderCultivatorId: Sect["founderCultivatorId"];
  treasury: number;
  memberCount: number;
  spiritVeins: string[];
  headquarters: string;
  role: SectTitle;
  totalContribution: number;
  lastTitleUpdateTick: number;
  admissionPolicy: SectAdmissionPolicy;
  admissionPolicyUpdatedAtTick: number;
  level?: number;
  bonuses?: SectBonus[];
  activeWarId?: string | null;
  warObjectives?: WarObjective[];
  competitive: true;
}

export interface NeutralSectInfoView {
  organizationType: "neutral";
  id: string;
  name: string;
  alignment: "中立";
  stateId: import("./constants.js").StateId;
  headquarters: import("./constants.js").LocationId;
  description: string;
  role: "member";
  memberCount: number;
  neutralContribution: number;
  rewardMultiplier: number;
  competitive: false;
}

export type OrganizationInfoView = PlayerSectInfoView | NeutralSectInfoView;

export interface PlayerSectRecruitmentView {
  sectId: string;
  name: string;
  stateId: Sect["stateId"];
  alignment: Sect["alignment"];
  headquartersLocationId: string;
  memberCount: number;
  minimumRealmLevel: number;
  allowedMotiveBuckets: SectMotiveBucketId[];
}

export interface PlayerSectRecruitmentListView {
  cultivatorId: string;
  sects: PlayerSectRecruitmentView[];
  nextCursor: string | null;
}

export interface PendingMoralityChoiceResponse {
  tick: number;
  cultivatorId: string;
  choice: PendingMoralityChoiceView | null;
}

export interface SectApplicationView {
  applicationId: string;
  sectId: string;
  cultivatorId: string;
  applicantName: string;
  applicantRealmLevel: number;
  applicantMotiveBucket: SectMotiveBucketId | null;
  appliedAtTick: number;
  expiresAtTick: number;
}

export interface SectApplicationListView {
  cultivatorId: string;
  sectId: string;
  applications: SectApplicationView[];
  nextCursor: string | null;
}

export interface FoundPlayerSectResult {
  tick: number;
  cultivatorId: string;
  sectId: string;
  headquartersLocationId: string;
  summary: string;
}

export interface PlayerSectApplicationResult {
  tick: number;
  cultivatorId: string;
  applicationId: string;
  sectId: string;
  summary: string;
}

export interface ReviewSectApplicationResult {
  tick: number;
  cultivatorId: string;
  applicationId: string;
  sectId: string;
  decision: "approve" | "reject";
  summary: string;
}

export interface ResolveMoralityChoiceResult {
  tick: number;
  cultivatorId: string;
  choiceId: string;
  optionId: string;
  moralityScore: number;
  moralityAlignment: MoralityAlignment;
  summary: string;
}

export interface UpdateSectAdmissionPolicyResult {
  tick: number;
  cultivatorId: string;
  sectId: string;
  summary: string;
}

export interface CultivatorStateView {
  tick: number;
  cultivator: {
    id: string;
    name: string;
    realm: RealmStage;
    realmLevel: number;
    realmProgress: number;
    status: "idle" | "busy" | "injured";
    location: string;
    spiritStones: number;
    qi: number;
    maxQi: number;
    spiritualPower: number;
    maxSpiritualPower: number;
    reputation: number;
    lifespan: number;
      age: number;
      genderPresentation: GenderPresentation;
      pronouns: string;
      origin: string;
      temperament: string;
      moralityScore: number;
      moralityAlignment: MoralityAlignment;
    };
  cultivation: {
    mainTechnique: string;
    techniques: string[];
  };
  sect: PlayerSectView | null;
  neutralSect: NeutralSectView | null;
  inventory: Record<ItemId, number>;
  inventoryDetails: InventoryEntryView[];
  currentJob: ActionJob | null;
  nearbyOpportunities: string[];
  statusEffects: StatusEffectView[];
  factionReputation: FactionStandingView[];
  recentEvents: WorldEvent[];
  recentCombats: CombatLogEntry[];
  registration: CultivationRegistrationView | null;
  registrationEffects: RegistrationGameplayEffectsView | null;
  breakthrough: BreakthroughStateView | null;
  wilderness: {
    layerId: string;
    layerName: string;
    ticksSurvived: number;
    remainingSurvivalTicks: number;
    status: "active" | "withdrawn";
  } | null;
  guixu: {
    wildernessAttunement: number;
    unlockedNodeIds: string[];
    sharedUnlockedNodeIds: string[];
    availableNodeIds: string[];
  } | null;
  derivedState: DerivedStateView;
  onboarding: OnboardingProgress;
  decisionPolicy: DecisionPolicyView;
  agentGuidance: {
    warnings: string[];
    priorities: string[];
    suggestedActions: ActionId[];
  };
}

export interface StrategySnapshot {
  tick: number;
  cultivatorId: string;
  riskLevel: "low" | "medium" | "high";
  shortTermGoal: string;
  longTermGoal: string;
  recommendedSequence: ActionId[];
  reason: string;
  decisionPolicy: DecisionPolicyView;
}

export interface WorldState {
  version: number;
  tick: number;
  updatedAt: string;
  cultivators: Record<string, Cultivator>;
  agentBindings: Record<string, AgentBinding>;
  sects: Record<string, Sect>;
  neutralSects: Record<string, NeutralSect>;
  locations: Record<string, Location>;
  states: Record<string, StateDefinition>;
  topology: TopologyGraph;
  eventPools: EventPools;
  questBoards: Record<string, QuestBoard>;
  pendingSectApplications: Record<string, SectApplication>;
  pendingMoralityChoices: Record<string, PendingMoralityChoice>;
  sectReapplyCooldowns: Record<string, SectReapplyCooldown>;
  wildernessLayers: Record<string, WildernessLayer>;
  wildernessProgress: Record<string, WildernessProgress>;
  guixuNodes: Record<string, GuixuNode>;
  guixuProgress: GuixuProgress;
  factionWars: Record<string, FactionWar>;
  itemDefinitions: Record<ItemId, ItemDefinition>;
  jobs: Record<string, ActionJob>;
  daoLogs: DaoLogEntry[];
  messages: Message[];
  worldEvents: WorldEvent[];
  combatLogs: CombatLogEntry[];
  nextCultivatorSequence: number;
  nextJobSequence: number;
  nextLogSequence: number;
  nextMessageSequence: number;
  nextEventSequence: number;
  nextCombatSequence: number;
  nextSectApplicationSequence: number;
  nextMoralityChoiceSequence: number;
  nextSectCooldownSequence: number;
}
