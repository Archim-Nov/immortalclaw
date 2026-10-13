export type RealmStage = "炼气" | "筑基" | "金丹" | "元婴" | "化神";
export type RealmPhase = "前期" | "中期" | "后期";
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
export type LocalizedText = Record<RegistrationLocale, string>;
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

export type DungeonGrade = "丙" | "乙" | "甲";
export type DungeonRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type DungeonExpeditionPolicy = "conservative" | "balanced" | "aggressive";
export type RunStrategy = {
  posture: "conservative" | "balanced" | "aggressive";
  bias: "reward-first" | "survival-first";
  pushPreference: "push" | "retreat" | "neutral";
};

export interface WakeNodeOption {
  optionId: string;
  label: string;
  description: string;
}

export interface WakeNode {
  nodeId: string;
  context: string;
  options: WakeNodeOption[];
  defaultOptionId: string;
  timeoutTicks: number;
}

export interface DungeonLocationMetadata {
  grade: DungeonGrade;
  maxRank: DungeonRank;
  minRealm: RealmStage;
  dangerBase: number;
  rewardBand: "low" | "mid" | "high";
  materialBand: ItemId;
}

export interface Location {
  id: import("./constants.js").LocationId;
  stateId: import("./constants.js").StateId;
  nodeType: import("./constants.js").NodeType;
  name: string;
  kind: "safe" | "resource" | "adventure";
  risk: import("./constants.js").RiskLevel;
  description: string;
  dungeon?: DungeonLocationMetadata | null;
  organizationId?: string | null;
  organizationType?: "player-sect" | "neutral-sect" | null;
}

export interface PersistedStateDefinition {
  id: string;
  name: string;
  risk: string;
}

export interface StateDefinition extends PersistedStateDefinition {
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
  signalType: "flavor" | "decision";
  name: string;
  nameCn: string;
  description: string;
  baseWeight: number;
  stateId: import("./constants.js").StateId | null;
  nodeType: import("./constants.js").NodeType | null;
  minRealm: RealmStage | null;
  dungeonGrade?: DungeonGrade | null;
  minDungeonRank?: DungeonRank | null;
  maxDungeonRank?: DungeonRank | null;
  effects: EventEffect;
  moralityChoice?: MoralityChoiceTemplate;
  encounterBuildId?: import("./encounters/catalog.js").EncounterBuildId | null;
  combatMode?: "light" | "full" | null;
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
  stateId: string;
  description: string;
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
  readonly recommendedActions: readonly ActionId[];
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

export type QuestActionPhase = "accept" | "execute";
export type AcceptQuestActionId = `quest:accept:${string}:${number}`;
export type ExecuteQuestActionId = `quest:execute:${string}:${number}`;
export type QuestActionId = AcceptQuestActionId | ExecuteQuestActionId;

export interface QuestInstance {
  id: string;
  templateId: string;
  type: string;
  category: QuestCategory;
  locationId: string;
  boardIndex: number;
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
  type: string;
  category: QuestCategory;
  boardIndex: number;
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

export type LegacyItemId =
  | "healing-pill"
  | "qi-pill"
  | "ward-talisman"
  | "spirit-ore"
  | "ruin-fragment"
  | "beast-core"
  // 练气 generic materials
  | "cloud-heart-grass"
  | "moon-dew-flower"
  | "clear-zhi-leaf"
  | "spirit-brook-bamboo"
  | "pure-heart-orchid"
  | "mist-vine"
  // 筑基 generic materials
  | "mystic-jade-stone"
  | "jade-marrow-sand"
  | "purple-palace-earth"
  | "cold-moon-crystal"
  | "still-cloud-wood"
  | "tranquil-bamboo"
  // 金丹 generic materials
  | "golden-spirit-flower"
  | "purple-celestial-leaf"
  | "star-fall-sand"
  | "moon-glory-jade"
  | "clear-mystic-wood"
  | "chaos-moss"
  // Breakthrough special materials (1 per stage)
  | "condensed-qi-dew"
  | "azure-stone-marrow"
  | "meridian-lotus-essence"
  | "foundation-spirit-amber"
  | "wind-control-crystal"
  | "nine-turn-core-sand"
  | "flowing-aurora-core"
  | "dragon-radiance-crystal"
  | "nine-turn-golden-marrow"
  | "eight-wastes-pass"
  | "bahuang-spirit-essence"
  | "ancient-artifact"
  | "legendary-artifact";

export type WeaponMaterialItemId = `weapon-material-${string}`;
export type WeaponUnlockItemId = `weapon-item-${string}`;
export type SpellFragmentItemId = `spell-fragment-${string}`;
export type SpellManualItemId = `spell-manual-${string}`;
export type GeneratedItemId = WeaponMaterialItemId | WeaponUnlockItemId | SpellFragmentItemId | SpellManualItemId;

export type ItemId = LegacyItemId | GeneratedItemId;

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
  | ExecuteQuestActionId
  | `explore-guixu:${string}`
  | `enter-bahuang:${string}`
  | `enter-dungeon:rank-${DungeonRank}:${RunStrategy["posture"]}`
  | `start-dungeon-expedition:rank-${DungeonRank}:${DungeonExpeditionPolicy}`
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
  | `search-fortune:rank-${DungeonRank}`
  | "take-sect-errand"
  | "take-neutral-duty"
  | `sect-task:${string}`
  | "hunt-mine-beast"
  | `challenge-guardian:rank-${DungeonRank}`
  | "survey-wilderness"
  | "dual-survey-wilderness"
  | "dual-cultivate"
  | "pvp-duel"
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
  enabledInLive: boolean;
}

export const PRODUCTION_QUEUE_MAX_LENGTH = 3;

export type MessageTemplateKind =
  | "greet"
  | "share-info"
  | "request-help"
  | "gift-item"
  | "rendezvous-at-gate"
  | "ready-to-enter"
  | "wait";

export interface PendingHelpRequest {
  readonly id: string;
  readonly fromCultivatorId: string;
  readonly tick: number;
}

export type BoardNoteKind = "journey" | "favor" | "rival" | "sect";

export interface LocationBoardNote {
  readonly authorId: string;
  readonly authorName: string;
  readonly tick: number;
  readonly text: string;
  readonly kind?: BoardNoteKind;
}

export interface PendingGift {
  readonly messageId: string;
  readonly fromCultivatorId: string;
  readonly itemId: ItemId;
  readonly count: number;
  readonly tick: number;
}

export type CommissionType = "gather" | "deliver";

export interface Commission {
  readonly id: string;
  readonly posterId: string;
  readonly locationId: string;
  readonly type: CommissionType;
  readonly targetItemId: ItemId;
  readonly targetCount: number;
  readonly rewardSpiritStones: number;
  readonly acceptedById: string | null;
  readonly createdAtTick: number;
  readonly completedAtTick: number | null;
}

export interface ProductionQueueEntry {
  slot: number;
  recipeId: string;
  outputItemId: ItemId;
  outputCount: number;
  consumedMaterials: ReadonlyArray<{ itemId: ItemId; count: number }>;
  consumedSpiritStones: number;
  ticksRemaining: number;
  totalTicks: number;
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

export interface DungeonYieldEstimate {
  min: number;
  max: number;
}

export interface DungeonRankYieldHint {
  rank: DungeonRank;
  primaryMaterial: ItemId;
  estimatedExpeditionYieldByPolicy: Record<DungeonExpeditionPolicy, DungeonYieldEstimate>;
  notableSecondaryDrops: ItemId[];
}

export interface DungeonExpeditionProgress {
  cultivatorId: string;
  jobId: string;
  locationId: string;
  grade: DungeonGrade;
  targetRank: DungeonRank;
  policy: DungeonExpeditionPolicy;
  strategy: RunStrategy;
  startedAtTick: number;
  stepIndex: number;
  maxSteps: number;
  nextResolutionTick: number;
  searchSteps: number;
  guardianSteps: number;
  primaryMaterialCount: number;
  secondaryDrops: Partial<Record<ItemId, number>>;
  spiritStoneGain: number;
  realmProgressGain: number;
  unlockedNextRank: boolean;
  lastResolvedAction: "search" | "guardian" | null;
  flavorEventTitles: string[];
  /** Diary beats gathered during the run. Missing on expeditions saved before deepen v1. */
  beats?: DungeonBeat[];
  qiSpent?: number;
  spiritualPowerSpent?: number;
  injuryTicksGained?: number;
  /** Spirit stones dropped on a collapse. Missing on expeditions saved before deepen v2. */
  stonesLost?: number;
  wakeNodesEncountered: number;
  maxWakeNodes: number;
  pendingWakeNode: WakeNode | null;
  pendingWakeNodeDeadlineTick: number | null;
  resolvedWakeNodeCount: number;
  /** First party companion sharing this run. Absent when nobody came along. */
  companionId?: string | null;
  /** Every idle party member sharing this run, up to four beside the leader. */
  companionIds?: string[];
}

export type DungeonExpeditionOutcome = "completed" | "withdrew" | "aborted" | "catastrophic";

export interface DungeonExpeditionReport {
  cultivatorId: string;
  grade: DungeonGrade;
  targetRank: DungeonRank;
  policy: DungeonExpeditionPolicy;
  outcome: DungeonExpeditionOutcome;
  startedAtTick: number;
  endedAtTick: number;
  stepsResolved: number;
  primaryMaterial: {
    itemId: ItemId;
    count: number;
  };
  secondaryDrops: Partial<Record<ItemId, number>>;
  spiritStoneGain: number;
  realmProgressGain: number;
  unlockedNextRank: boolean;
  returnLocationId: string;
  summary: string;
  flavorEvents: string[];
  beats?: DungeonBeat[];
  qiSpent?: number;
  spiritualPowerSpent?: number;
  injuryTicksGained?: number;
  stonesLost?: number;
}

export type TravelNoteKind =
  | "find"
  | "close-call"
  | "person"
  | "injury"
  | "insight"
  | "mood"
  | "breakthrough"
  | "setback";

export interface TravelNote {
  tick: number;
  kind: TravelNoteKind;
  title: string;
  detail: string;
  locationId: string;
  mood?: string;
}

export interface DungeonBeat {
  kind: TravelNoteKind;
  title: string;
  detail: string;
  mood: string;
}

export interface DungeonExpeditionStateView {
  active: {
    grade: DungeonGrade;
    targetRank: DungeonRank;
    policy: DungeonExpeditionPolicy;
    strategy: RunStrategy;
    startedAtTick: number;
    stepsResolved: number;
    maxSteps: number;
    nextResolutionTick: number;
    remainingTicks: number;
    companionId?: string | null;
    companionName?: string | null;
    companionNames?: string[];
    /** Present when party members are sharing this run without their own jobs. */
    shareNote?: string | null;
  } | null;
  lastReport: DungeonExpeditionReport | null;
  wakeNodeHint?: {
    nodeId: string;
    context: string;
    defaultOptionId: string;
    timeoutTicks: number;
    options: WakeNodeOption[];
  } | null;
}

export interface BahuangExpeditionProgress {
  cultivatorId: string;
  status: "active" | "retreated" | "completed" | "failed";
  depth: number;
  supplies: {
    rations: number;
    talismans: number;
  };
  pressure: number;
  strategy: RunStrategy;
  encounteredWakeNodes: WakeNode[];
  pendingWakeNodeIndex: number | null;
  pendingWakeNodeDeadlineTick: number | null;
  resolvedWakeNodeCount: number;
  rewards: {
    spiritStones: number;
    items: Partial<Record<ItemId, number>>;
    realmProgress: number;
  };
}

export interface BahuangExpeditionStateView {
  status: BahuangExpeditionProgress["status"];
  depth: number;
  supplies: BahuangExpeditionProgress["supplies"];
  pressure: number;
  strategy: RunStrategy;
  pendingWakeNode: WakeNode | null;
  rewards: BahuangExpeditionProgress["rewards"];
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
  | AcceptQuestActionId
  | `enter-wilderness:${string}`
  | `unlock-guixu:${string}`
  | `join-neutral-sect:${string}`
  | `equip-weapon:${string}`
  | `equip-spell:${string}`
  | "abort-dungeon-expedition"
  | "retreat-from-bahuang"
  | "open-player-sect-founding"
  | "open-player-sect-recruitment"
  | "review-player-sect-applications"
  | "resolve-morality-event-choice"
  | `unlock-loadout:${string}`
  | "buy-healing-pill"
  | "buy-qi-pill"
  | "buy-ward-talisman"
  | "buy-eight-wastes-pass"
  | "buy-current-breakthrough-material"
  | "use-healing-pill"
  | "use-qi-pill"
  | "use-ward-talisman"
  | "sell-spirit-ore"
  | "sell-ruin-fragment"
  | "sell-beast-core"
  | "sell-ancient-artifact"
  | "sell-bahuang-spirit-essence"
  | "sell-legendary-artifact"
  | "join-sect"
  | "leave-neutral-sect"
  | "withdraw-from-wilderness"
  | `challenge-cultivator:${string}`
  | `accept-pvp-challenge:${string}`
  | `reject-pvp-challenge:${string}`
  | `chat-up:${string}`
  | `voice-transmit:${string}`
  | `propose-dao-companion:${string}`
  | `accept-dao-companion:${string}`
  | `reject-dao-companion:${string}`
  | `party-invite:${string}`
  | `accept-party:${string}`
  | `reject-party:${string}`
  | "disband-party"
  | "cycle-social-page"
  | `buy-residence:${string}`
  | `send-message:${string}:${MessageTemplateKind}`
  | "read-messages"
  | `accept-gift:${string}`
  | `reject-gift:${string}`
  | `post-commission:${CommissionType}:${string}`
  | `accept-commission:${string}`
  | `answer-help:${string}`
  | "post-board-note"
  | "post-board-note:journey"
  | "post-board-note:favor"
  | "post-board-note:rival"
  | "post-board-note:sect"
  | `call-favor:${string}`
  | `press-rival:${string}`
  | `dungeon-wake-decision:${string}`
  | `bahuang-wake-decision:${string}`;

export type ActionId = TimedActionId | ImmediateActionId;

export type ItemTradeScope = "settlement" | "market" | "none";
export type ItemUseKind = "consume" | "study" | "ticket" | "material" | "unlock-loadout";
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
  effectSummaryByLocale: LocalizedText | null;
  effectBundle: EventEffect | null;
  grantsTechnique: string | null;
  ticketTargets: string[] | null;
  grantsWeaponLoadoutId: WeaponLoadoutId | null;
  grantsSpellLoadoutId: SpellLoadoutId | null;
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
  nameByLocale: LocalizedText;
  category: ItemCategory;
  description: string;
  descriptionByLocale: LocalizedText;
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
  // ---- Breakthrough Growth ----
  grantedMainAttributeGrowth?: Record<string, number>;
  grantedFiveElementGrowth?: Record<string, number>;
  grantedPercentageBonus?: number;
}

export interface DungeonGradeProgress {
  highestClearedRank: number;
}

export type DungeonProgress = Record<DungeonGrade, DungeonGradeProgress>;

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
  residences: Residence[];
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
  pendingPvpChallengeId: string | null;
  totalContribution: number;
  neutralContribution: number;
  contributionReachedAt: number;
  activeQuests: ActiveQuest[];
  completedBaseQuests: number;
  techniques: string[];
  inventory: Record<ItemId, number>;
  statusEffects: StatusEffect[];
  breakthroughRecords: BreakthroughRecord[];
  dungeonProgress: DungeonProgress;
  activeJobId: string | null;
  injuryTicksRemaining: number;
  registrationRecord: CultivationRegistrationRecord | null;
  // ---- Combat Loadout System ----
  equippedWeaponLoadoutId: WeaponLoadoutId | null;
  equippedSpellLoadoutId: SpellLoadoutId | null;
  unlockedWeaponLoadoutIds: readonly WeaponLoadoutId[];
  unlockedSpellLoadoutIds: readonly SpellLoadoutId[];
  // ---- Production Queue ----
  productionQueue: ProductionQueueEntry[];
  // ---- Social Verbs ----
  pendingGifts: PendingGift[];
  lastGiftTick: number;
  /** Extra turns through the social-action page. Omitted by older saves. */
  socialPageOffset?: number;
  // ---- Endgame ----
  guixuCompletedNodeIds: string[];
  // ---- Breakthrough Growth ----
  mainAttributeGrowth: Record<string, number>;
  fiveElementGrowth: Record<string, number>;
  mainAttributePercentageBonus: number;
  /** Recent moments an agent can retell. Absent on cultivators saved before deepen v1. */
  travelNotes?: TravelNote[];
  actionFatigue?: {
    key: string;
    count: number;
    lastTick: number;
  };
  lastSectApplicationTick?: number;
  /** Help requests waiting on this cultivator. Absent on older saves. */
  pendingHelpRequests?: PendingHelpRequest[];
  /** Sect diary chain, 0–2 while climbing, reset after the elder notice. */
  sectDiaryStep?: number;
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
  core_temperament_description: string;
  secondary_temperament_id: RegistrationTemperamentId;
  secondary_temperament: string;
  secondary_temperament_description: string;
  behavior_aspect_id: RegistrationBehaviorAspectId;
  behavior_aspect: string;
  behavior_aspect_description: string;
  cultivation_motive_id: RegistrationCultivationMotiveId;
  cultivation_motive: string;
  cultivation_motive_description: string;
  spirit_root_kind_id: RegistrationSpiritRootKindId;
  spirit_root_result: string;
  spirit_root_description: string;
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
    categoryDescription: string;
    description: string;
    confidence: RegistrationConfidenceLevel;
  };
  secondaryTemperament: {
    id: RegistrationTemperamentId;
    label: string;
    categoryDescription: string;
    description: string;
  };
  behaviorAspect: {
    id: RegistrationBehaviorAspectId;
    label: string;
    categoryDescription: string;
    description: string;
    confidence: RegistrationConfidenceLevel;
  };
  cultivationMotive: {
    id: RegistrationCultivationMotiveId;
    label: string;
    categoryDescription: string;
    description: string;
    confidence: RegistrationConfidenceLevel;
  };
  spiritRoot: {
    kindId: RegistrationSpiritRootKindId;
    label: string;
    categoryDescription: string;
    description: string;
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
    dungeonGrade?: DungeonGrade;
    dungeonRank?: DungeonRank;
    dungeonExpeditionPolicy?: DungeonExpeditionPolicy;
    dungeonExpeditionTargetRank?: DungeonRank;
    dungeonExpeditionStepIndex?: number;
    dungeonExpeditionNextResolutionTick?: number;
    guixuNodeId?: string;
    guixuEventId?: string;
    dualTaskId?: string;
    dualPartnerId?: string;
    dualRole?: "initiator" | "partner";
    travelFlavorEventCount?: number;
  };
}

export interface RecipeReference {
  recipeId: string;
  outputItemId: ItemId;
  outputName: string;
}

export interface BreakthroughReference {
  targetLevel: number;
  targetRealm: string;
}

export interface ResourceUsageSummary {
  sellable?: { baseValue: number };
  directUse?: { kind: ItemUseKind; effectSummary: string };
  recipeInputFor?: readonly RecipeReference[];
  breakthroughMaterialFor?: readonly BreakthroughReference[];
  loadoutUnlock?: { type: "weapon" | "spell"; loadoutId: string; loadoutName: string };
}

export interface SpiritStoneUsageSummary {
  spiritStoneUsage: true;
  recipeCosts: readonly { recipeId: string; cost: number }[];
  marketBuying: boolean;
}

export interface DaoLogEntry {
  id: string;
  cultivatorId: string;
  tick: number;
  title: string;
  content: string;
  tags: string[];
  usableFor?: ResourceUsageSummary | SpiritStoneUsageSummary;
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

// ---- PVP Challenge ----
export interface PendingPvpChallenge {
  id: string;
  challengerCultivatorId: string;
  targetCultivatorId: string;
  createdAtTick: number;
  expiresAtTick: number;
  locationId: string;
}

export type PvpBattleKind = "city-duel" | "wilderness-clash";

// ---- Weapon and Combat Loadout System ----
export type WeaponFamilyId = "quick" | "heavy" | "polearm" | "flexible" | "ranged-mystic";

export type WeaponTypeId =
  | "sword" | "dual-swords" | "dagger" | "gauntlets"
  | "saber" | "greatsaber" | "axe" | "hammer"
  | "spear" | "halberd" | "staff" | "hook-sickle"
  | "whip" | "chain-blade" | "meteor-hammer" | "silk-ribbon"
  | "bow" | "crossbow" | "fan" | "umbrella";

export type SpellBranchId =
  | "metal-edge" | "metal-guard" | "metal-break"
  | "wood-growth" | "wood-bind" | "wood-bloom"
  | "water-frost" | "water-illusion" | "water-flow"
  | "fire-blaze" | "fire-smelt" | "fire-burst"
  | "earth-wall" | "earth-suppress" | "earth-vein";

export type WeaponLoadoutId = string & { readonly __brand: "WeaponLoadoutId" };
export type SpellLoadoutId = string & { readonly __brand: "SpellLoadoutId" };
export type StatusHookId = string;
export type CombatStatusId = string & { readonly __brand: "CombatStatusId" };

export type WeaponTier = 1 | 2 | 3 | 4 | 5;
export type SpellTier = 1 | 2 | 3 | 4 | 5;

export interface WeaponLoadoutDefinition {
  id: WeaponLoadoutId;
  name: string;
  weaponTypeId: WeaponTypeId;
  weaponTier?: WeaponTier;
  weaponFamilyId?: WeaponFamilyId;
  attackPowerBonus: number;
  coreSkillCategory: CombatStyle;
  coreSkillSpiritCost: number;
  basicAttackStatusHookIds: readonly StatusHookId[];
  coreSkillStatusHookIds: readonly StatusHookId[];
}

export interface SpellLoadoutDefinition {
  id: SpellLoadoutId;
  name: string;
  spellBranchId: SpellBranchId;
  spellTier?: SpellTier;
  primaryStatusId?: CombatStatusId;
  secondaryStatusId?: CombatStatusId;
  attackPowerBonus: number;
  coreSkillCategory: CombatStyle;
  coreSkillSpiritCost: number;
  basicAttackStatusHookIds: readonly StatusHookId[];
  coreSkillStatusHookIds: readonly StatusHookId[];
}

// ---- Weapon Family & Type Metadata ----
export interface WeaponFamilyDefinition {
  id: WeaponFamilyId;
  name: string;
  memberWeaponTypes: readonly WeaponTypeId[];
  bonusProfile: WeaponBonusProfile;
}

export interface WeaponBonusProfile {
  stat1: { stat: string; values: readonly [number, number, number, number, number] };
  stat2: { stat: string; values: readonly [number, number, number, number, number] };
}

export interface WeaponTypeDefinition {
  id: WeaponTypeId;
  name: string;
  weaponFamilyId: WeaponFamilyId;
  coreSkillCategory: CombatStyle;
  typeBonusProfile: WeaponBonusProfile["stat1"];
}

// ---- Combat Status System ----
export type StatusEffectKind =
  | "defense_down"
  | "initiative_down"
  | "dodge_down"
  | "dodge_up"
  | "accuracy_up"
  | "accuracy_down"
  | "crit_up"
  | "crit_down"
  | "damage_taken_down"
  | "core_skill_damage_taken_up"
  | "core_skill_damage_taken_down"
  | "fire_damage_taken_up"
  | "healing_power_up"
  | "damage_dealt_down"
  | "guard_heart_up"
  | "heal_over_time"
  | "damage_over_time"
  | "spirit_regen"
  | "next_damage_taken_down"
  | "next_core_skill_damage_taken_up"
  | "next_core_skill_damage_taken_down"
  | "next_fire_damage_taken_up"
  | "initiative_down_extra"
  | "damage_and_healing_up";

export type StatusExpiryMode = "round_decay" | "consume_on_trigger";
export type StatusTriggerWindow = "passive" | "round_end" | "on_damage_taken" | "on_core_skill_damage_taken" | "on_fire_damage_taken";
export type StatusTargetSide = "self" | "enemy";

export interface CombatStatusDefinition {
  id: CombatStatusId;
  name: string;
  description: string;
  targetSide: StatusTargetSide;
  durationRounds: number;
  stacking: "refresh";
  effectKind: StatusEffectKind;
  tierValues: readonly [number, number, number, number, number];
  expiryMode: StatusExpiryMode;
  triggerWindow: StatusTriggerWindow;
  secondaryEffects?: {
    effectKind: StatusEffectKind;
    tierValues: readonly [number, number, number, number, number];
  };
}

export interface StatusHookDefinition {
  id: StatusHookId;
  applications: readonly {
    statusId: CombatStatusId;
    targetSide: StatusTargetSide;
  }[];
}

export interface CombatStatusInstance {
  id: CombatStatusId;
  name: string;
  sourceLoadoutId: WeaponLoadoutId | SpellLoadoutId;
  sourceActionType: CombatActionType;
  remainingRounds: number;
  magnitude: number;
  secondaryMagnitude?: number;
  effectKind: StatusEffectKind;
  secondaryEffects?: { effectKind: StatusEffectKind; magnitude: number };
  expiryMode: StatusExpiryMode;
  triggerWindow: StatusTriggerWindow;
  consumed: boolean;
}

// ---- Spell Branch Metadata ----
export interface SpellBranchDefinition {
  id: SpellBranchId;
  element: "metal" | "wood" | "water" | "fire" | "earth";
  primaryStatusId: CombatStatusId;
  secondaryStatusId: CombatStatusId;
}

export type CombatStyle = "brute" | "finesse" | "tactic";
export type AttackChannel = "weapon" | "spell";
export type AttackResult = "hit" | "miss" | "crit";
export type CombatActionType = "basic_attack" | "core_skill" | "escape";

export interface CombatDamageBreakdown {
  baseDamage: number;
  styleMultiplier: number;
  triangleMultiplier: number;
  routeDamageMultiplier: number;
  critMultiplier: number;
  actionMultiplier: number;
  finalDamage: number;
}

export interface CombatActionChoice {
  actionType: CombatActionType;
  boundStyle: CombatStyle | null;
  spiritCost: number;
  preferredStyle: CombatStyle | null;
}

export interface EscapeResolution {
  attempted: boolean;
  success: boolean;
  chance: number;
}

export interface CoreSkillProfile {
  spiritCost: number;
  preferredStyle: CombatStyle | null;
  actionMultiplier: number;
}

export interface CombatRoundLog {
  round: number;
  playerInitiative: number;
  enemyInitiative: number;
  playerRoute?: CombatStyle;
  enemyRoute?: CombatStyle;
  firstActor: "player" | "enemy";
  playerAttack: {
    result: AttackResult;
    damage: CombatDamageBreakdown;
  } | null;
  enemyAttack: {
    result: AttackResult;
    damage: CombatDamageBreakdown;
  } | null;
  playerHpAfter: number;
  enemyHpAfter: number;
  playerDied: boolean;
  enemyDied: boolean;
  playerAction?: CombatActionType;
  enemyAction?: CombatActionType;
  playerBoundRoute?: CombatStyle | null;
  enemyBoundRoute?: CombatStyle | null;
  playerSpiritSpent?: number;
  enemySpiritSpent?: number;
  playerEscape?: EscapeResolution | null;
  enemyEscape?: EscapeResolution | null;
  playerActionSkipped?: boolean;
  enemyActionSkipped?: boolean;
  playerChannel?: AttackChannel;
  enemyChannel?: AttackChannel;
  // Status events for this round
  appliedStatuses?: { statusId: CombatStatusId; statusName: string; targetSide: "player" | "enemy"; sourceSide: "player" | "enemy"; magnitude: number; isRefresh: boolean }[];
  tickEvents?: { statusId: CombatStatusId; statusName: string; targetSide: "player" | "enemy"; effectKind: StatusEffectKind; value: number }[];
  consumedStatuses?: { statusId: CombatStatusId; statusName: string; targetSide: "player" | "enemy" }[];
  expiredStatuses?: { statusId: CombatStatusId; statusName: string; targetSide: "player" | "enemy" }[];
}

export interface CombatSnapshot {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  hit: number;
  dodge: number;
  crit: number;
  critDamage: number;
  guardHeart: number;
  spirit?: number;
  maxSpirit?: number;
  coreSkillSpiritCost?: number;
  coreSkillPreferredRoute?: CombatStyle | null;
  equippedLoadoutId?: WeaponLoadoutId | SpellLoadoutId | null;
  basicAttackStatusHookIds?: readonly StatusHookId[];
  coreSkillStatusHookIds?: readonly StatusHookId[];
  escapeAllowed?: boolean;
  // Per-channel attack data for per-round channel selection
  weaponAttack?: number;
  spellAttack?: number;
  weaponLoadoutId?: WeaponLoadoutId | null;
  spellLoadoutId?: SpellLoadoutId | null;
  weaponCoreSkillSpiritCost?: number;
  spellCoreSkillSpiritCost?: number;
  weaponCoreSkillPreferredRoute?: CombatStyle | null;
  spellCoreSkillPreferredRoute?: CombatStyle | null;
  // Combat status instances active on this combatant
  combatStatuses?: CombatStatusInstance[];
}

export interface CombatJobState {
  encounterTemplateId: string;
  encounterBuildId?: string;
  maxRounds: number;
  currentRound: number;
  initialPlayerSnapshot: CombatSnapshot;
  initialEnemySnapshot: CombatSnapshot;
  playerSnapshot: CombatSnapshot;
  enemySnapshot: CombatSnapshot;
  playerStyle: CombatStyle;
  enemyStylePreference: CombatStyle[];
  rounds: CombatRoundLog[];
  resolved: boolean;
  outcome: "victory" | "defeat" | null;
  playerSpirit?: number;
  playerMaxSpirit?: number;
  enemySpirit?: number;
  enemyMaxSpirit?: number;
  playerStatusEffectsBefore?: StatusEffect[];
  enemyStatusEffectsBefore?: StatusEffect[];
  retreated?: boolean;
  retreatingSide?: "player" | "enemy";
  pvpTargetCultivatorId?: string;
  pvpBattleKind?: PvpBattleKind;
}

export interface EncounterTemplate {
  id: string;
  enemyName: string;
  maxRounds: number;
  stylePreference: CombatStyle[];
  baseHp: number;
  attack: number;
  defense: number;
  speed: number;
  hit: number;
  dodge: number;
  crit: number;
  critDamage: number;
  guardHeart: number;
  escapeAllowed?: boolean;
  // Combat Loadout System — enemies also carry loadout info
  equippedWeaponLoadoutId?: string;
  equippedSpellLoadoutId?: string;
  spirit?: number;
  maxSpirit?: number;
}

export interface CombatLogEntry {
  id: string;
  tick: number;
  cultivatorId: string;
  locationId: string;
  encounterId: string;
  enemyName: string;
  outcome: "victory" | "defeat";
  damageTaken: number;
  spiritualPowerSpent: number;
  loot: Partial<Record<ItemId, number>>;
  summary: string;
  encounterTemplateId?: string;
  encounterBuildId?: string;
  pvpOpponentCultivatorId?: string;
  pvpOpponentName?: string;
  pvpBattleKind?: PvpBattleKind;
  totalRounds?: number;
  rounds?: CombatRoundLog[];
  playerSnapshot?: CombatSnapshot;
  enemySnapshot?: CombatSnapshot;
  retreated?: boolean;
  totalDamageTaken?: number;
  totalQiSpent?: number;
  totalSpiritSpent?: number;
  hpDelta?: number;
  statusChanges?: readonly { statusId: CombatStatusId | StatusEffectId; statusName: string; applied: boolean }[];
  statusEffectsRemaining?: { statusId: CombatStatusId | StatusEffectId; statusName: string }[];
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
  suboptimal?: { reason: string };
}

export interface ActionExecutionResult {
  tick: number;
  cultivatorId: string;
  actionId: ActionId;
  accepted: boolean;
  summary: string;
  job?: ActionJob;
}

export type ResidenceAmbientKind = "atmosphere" | "human-presence" | "omen";

export interface ResidenceAmbientEventView {
  id: string;
  tick: number;
  title: string;
  description: string;
  kind: ResidenceAmbientKind;
}

export interface ResidenceContextView {
  id: string;
  stateId: string;
  locationId: import("./constants.js").LocationId;
  name: string;
  description: string;
  timeSense: string;
  scene: string;
  recentAmbientEvents: readonly ResidenceAmbientEventView[];
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
  nameByLocale: LocalizedText;
  category: ItemCategory;
  description: string;
  descriptionByLocale: LocalizedText;
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

export interface BreakthroughMaterialSourceView {
  itemId: ItemId;
  channel: "market" | "task" | "wilderness" | "dungeon";
  locationHint: "safe" | "wilderness" | "dungeon-c" | "dungeon-b" | "dungeon-a";
  actionId: ActionId | null;
  note: string;
}

export interface BreakthroughStateView {
  targetRealm: RealmStage;
  targetLevel: number;
  category: BreakthroughCategory;
  readyByProgress: boolean;
  readyByMaterials: boolean;
  requiresResidence: boolean;
  genericRequirements: BreakthroughRequirementView[];
  specialRequirement: BreakthroughRequirementView;
  materialSources: BreakthroughMaterialSourceView[];
  missingItems: BreakthroughMissingItemView[];
  marketBuyable: boolean;
  majorSuccessRate: number | null;
  rateBreakdown: BreakthroughRateModifier[];
  recommendedAction: ActionId | null;
  // ---- Growth Preview ----
  previewMainAttributeGrowth: Record<string, number> | null;
  previewFiveElementGrowth: Record<string, number> | null;
  previewPercentageBonus: number | null;
}

export interface DungeonStateView {
  grade: DungeonGrade;
  minRealm: RealmStage;
  highestClearedRank: number;
  highestUnlockedRank: DungeonRank;
  availableRanks: DungeonRank[];
  frontierRank: DungeonRank;
  recommendedRank: DungeonRank;
  materialBand: ItemId;
  rankYieldHints: DungeonRankYieldHint[];
  lockReason: string | null;
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

export interface SectMotiveBucketOptionView {
  id: SectMotiveBucketId;
  label: string;
}

export type PlayerSectFoundingBlockerCode =
  | "not-in-main-city"
  | "already-in-organization"
  | "insufficient-spirit-stones"
  | "insufficient-state-reputation";

export interface PlayerSectFoundingOptionsView {
  tick: number;
  cultivatorId: string;
  currentStateId: import("./constants.js").StateId | null;
  currentMainCityLocationId: import("./constants.js").LocationId | null;
  currentLocationId: string;
  canFound: boolean;
  blockers: PlayerSectFoundingBlockerCode[];
  requirements: {
    spiritStones: {
      current: number;
      required: number;
    };
    stateReputation: {
      current: number;
      required: number;
    };
    mustBeInMainCity: true;
    mustHaveNoOrganization: true;
  };
  derivedFounding: {
    alignment: SectAlignment;
    admissionPolicy: SectAdmissionPolicy;
  };
  admissionPolicyInput: {
    minimumRealmLevel: {
      min: number;
      suggested: number;
    };
    allowedMotiveBucketOptions: SectMotiveBucketOptionView[];
  };
  nameRules: {
    minLength: number;
    maxLength: number;
    globallyUnique: true;
  };
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
  stateId: Sect["stateId"];
  alignment: Sect["alignment"];
  admissionPolicy: SectAdmissionPolicy;
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
    realmPhase: RealmPhase;
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
  combatProfile: {
    battleReadiness: string;
    attackChannel: AttackChannel;
    coreCombatStats: {
      weaponAttack: number;
      spellAttack: number;
      physicalDefense: number;
      spellDefense: number;
      speed: number;
      hit: number;
      dodge: number;
      crit: number;
      critDamage: number;
      guardHeart: number;
    };
    combatTraits: CombatStyle[];
    // ---- Combat Loadout Info ----
    equippedWeaponLoadout: {
      id: WeaponLoadoutId;
      name: string;
      weaponTypeId: WeaponTypeId;
      weaponTier?: WeaponTier;
      weaponFamilyId?: WeaponFamilyId;
      attackPowerBonus: number;
      coreSkillCategory: CombatStyle;
      coreSkillSpiritCost: number;
      basicAttackStatusHookIds: readonly StatusHookId[];
      coreSkillStatusHookIds: readonly StatusHookId[];
    } | null;
    equippedSpellLoadout: {
      id: SpellLoadoutId;
      name: string;
      spellBranchId: SpellBranchId;
      spellTier?: SpellTier;
      primaryStatusId?: CombatStatusId;
      secondaryStatusId?: CombatStatusId;
      attackPowerBonus: number;
      coreSkillCategory: CombatStyle;
      coreSkillSpiritCost: number;
      basicAttackStatusHookIds: readonly StatusHookId[];
      coreSkillStatusHookIds: readonly StatusHookId[];
    } | null;
    unlockedWeaponLoadouts: Array<{
      id: WeaponLoadoutId;
      name: string;
      weaponTypeId: WeaponTypeId;
    }>;
    unlockedSpellLoadouts: Array<{
      id: SpellLoadoutId;
      name: string;
      spellBranchId: SpellBranchId;
    }>;
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
  travelogue: {
    mood: string;
    notes: TravelNote[];
  };
  registration: CultivationRegistrationView | null;
  registrationEffects: RegistrationGameplayEffectsView | null;
  registrationProfile: RegistrationProfileView | null;
  breakthrough: BreakthroughStateView | null;
  dungeon: DungeonStateView | null;
  dungeonExpedition: DungeonExpeditionStateView;
  bahuang: BahuangExpeditionStateView | null;
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
  socialLinks: readonly import("./social.js").SocialLinkView[];
  residences: readonly {
    id: string;
    stateId: string;
    locationId: string;
    name: string;
    description: string;
    isActive: boolean;
  }[];
  activeResidence: Residence | null;
  residenceContext: ResidenceContextView | null;
  productionQueue: readonly { slot: number; recipeId: string; ticksRemaining: number }[];
  pendingGifts: readonly { messageId: string; fromCultivatorId?: string; fromName: string; itemId: ItemId; itemName?: string; count: number }[];
  localCommissions: readonly { id: string; posterName: string; type: CommissionType; targetItemId: ItemId; targetCount: number; rewardSpiritStones: number }[];
  /** Notes other cultivators left at this location. Omitted by older view fixtures. */
  localBoard?: readonly { authorName: string; tick: number; text: string; kind?: string }[];
  /** Why social buttons cover only a prefix of nearbyCultivators. Omitted by older view fixtures. */
  nearbyNote?: string;
  /** Which page of social buttons is showing. Omitted by older view fixtures. */
  socialPage?: { index: number; pageCount: number; holdTicks: number };
  /** Other cultivators at this location. Omitted by older view fixtures. Every other agent is kept; NPCs are capped. */
  nearbyCultivators?: readonly {
    cultivatorId: string;
    name: string;
    realm: string;
    realmLevel: number;
    sectName: string | null;
    idle: boolean;
    affinity: number | null;
    bondLine: string | null;
    rival: boolean;
    favorBalance: number;
    placeLine: string;
  }[];
  /** Party partner and whether a dungeon start will share the run. Omitted by older view fixtures. */
  party?: {
    partnerId: string;
    partnerName: string;
    partnerLocationId: string;
    partnerHere: boolean;
    partnerIdle: boolean;
    dungeonShareReady: boolean;
    shareNote: string;
    members?: readonly { cultivatorId: string; name: string; here: boolean; idle: boolean }[];
    /** Seats left before the party reaches five, counting the leader. */
    openSeats?: number;
    /** True when the party already holds five. */
    full?: boolean;
    /** Idle companions at this dungeon gate. */
    atGate?: readonly string[];
    /** Idle companions in this same city, not yet at a gate. */
    waitingInCity?: readonly string[];
  } | null;
  /** Set while this cultivator is the idle companion on someone else's dungeon run. */
  sharedDungeon?: {
    leaderId: string;
    leaderName: string;
    rank: number;
    grade: string;
    locationName: string;
    stayPut: boolean;
    shareNote: string;
  } | null;
  endgame: { guixuCompletedNodeIds: readonly string[]; originHeartAwakened: boolean };
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
  pendingPvpChallenges: Record<string, PendingPvpChallenge>;
  sectReapplyCooldowns: Record<string, SectReapplyCooldown>;
  wildernessLayers: Record<string, WildernessLayer>;
  wildernessProgress: Record<string, WildernessProgress>;
  dungeonExpeditions: Record<string, DungeonExpeditionProgress>;
  dungeonExpeditionReports: Record<string, DungeonExpeditionReport>;
  bahuangProgress: Record<string, BahuangExpeditionProgress>;
  guixuNodes: Record<string, GuixuNode>;
  guixuProgress: GuixuProgress;
  factionWars: Record<string, FactionWar>;
  itemDefinitions: Record<ItemId, ItemDefinition>;
  jobs: Record<string, ActionJob>;
  daoLogs: DaoLogEntry[];
  messages: Message[];
  worldEvents: WorldEvent[];
  combatLogs: CombatLogEntry[];
  socialLinks: Record<string, Record<string, import("./social.js").SocialLink>>;
  daoCompanionProposals: Record<string, import("./social.js").DaoCompanionProposal>;
  partyInvitations: Record<string, import("./social.js").PartyInvitation>;
  parties: Record<string, import("./social.js").Party>;
  commissions: Record<string, Commission>;
  /** Public notes pinned at a location. Absent on worlds saved before deepen v3. */
  locationBoards?: Record<string, LocationBoardNote[]>;
  nextCultivatorSequence: number;
  nextJobSequence: number;
  nextLogSequence: number;
  nextMessageSequence: number;
  nextEventSequence: number;
  nextCombatSequence: number;
  nextSectApplicationSequence: number;
  nextMoralityChoiceSequence: number;
  nextPvpChallengeSequence: number;
  nextSectCooldownSequence: number;
  nextDaoCompanionProposalSequence: number;
  nextPartyInvitationSequence: number;
  nextPartySequence: number;
  nextCommissionSequence: number;
}

export interface PersistedWorldState extends Omit<WorldState, "states" | "topology" | "eventPools"> {
  states: Record<string, PersistedStateDefinition>;
}

declare const projectedPersistedWorldStateBrand: unique symbol;

export type ProjectedPersistedWorldState = PersistedWorldState & {
  readonly [projectedPersistedWorldStateBrand]: true;
};
