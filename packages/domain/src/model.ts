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
export type PartyRoleId = "dps" | "breaker" | "guard" | "support" | "control";
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

export type PartyWakeKind = "tend-wound" | "loot-contention" | "treasure-split" | "floor-bond";

export interface PartyWakeVote {
  cultivatorId: string;
  optionId: string;
}

/** A paired memory kept until the shared run ends, then written on both digests. */
export interface PartyExpeditionMoment {
  kind: "favor" | "crack" | "memory";
  actorId: string;
  otherId: string;
  /** What the other person can say, in the 上回你… shape. */
  pairedLine: string;
  /** What the actor's side records. */
  actorLine: string;
  witnessLine?: string;
  witnessIds?: string[];
  reason?: string;
}

export interface WakeNode {
  nodeId: string;
  context: string;
  options: WakeNodeOption[];
  defaultOptionId: string;
  timeoutTicks: number;
  /** Which mid-run scene this wake came from. Absent on older saves and on a party wake. */
  sceneKind?: string;
  /** Set when this wake is asking the whole party. Absent on a solo mid-run wake. */
  partyKind?: PartyWakeKind;
  /** The wounded companion, when this wake is about a wound. */
  subjectId?: string;
  /** Used when a party wake times out without a clear vote. */
  safeOptionId?: string;
  /** Votes already cast. Absent until someone answers. */
  votes?: PartyWakeVote[];
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

export interface SceneChoiceOption {
  id: string;
  label: string;
  summary: string;
  effectBundle: EventEffect;
}

export type SceneChoiceOptionList =
  | readonly [SceneChoiceOption, SceneChoiceOption, SceneChoiceOption]
  | readonly [SceneChoiceOption, SceneChoiceOption, SceneChoiceOption, SceneChoiceOption];

export interface SceneChoiceTemplate {
  title: string;
  prompt: string;
  expiresInTicks: number;
  options: SceneChoiceOptionList;
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
  sceneChoice?: SceneChoiceTemplate;
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

export interface ResidenceFixture {
  id: string;
  tier: number;
}

export interface Residence {
  id: string;
  locationId: import("./constants.js").LocationId;
  level: 1;
  name: string;
  stateId: string;
  description: string;
  /** 1 is 草庐 or 石室. Higher steps never stop. Omitted on old saves means 1. */
  grandeur?: number;
  /** A granted cave reads as 草庐. A purchased cave reads as 石室 until it is rebuilt. */
  origin?: "starter" | "bought";
  fixtures?: ResidenceFixture[];
  /** Last tick each guest was hosted. */
  hostTicks?: Record<string, number>;
  /** Local reputation this cave has already paid out. Clearing furniture does not refund it. */
  reputationClaimed?: number;
  /** One 甲 relic set on the table. The bag still holds the item. Absent when the table is clear. */
  displayedRelic?: {
    itemId: ItemId;
    name: string;
    arcLine: string;
  };
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
    /** Chinese board name. Older saves omit it and the board template is used instead. */
    nameCn?: string;
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

export type SectPostId = "outer-chore" | "inner-cultivate" | "steward" | "elder" | "master-seat";

export type SectChainId = "transmit" | "patrol" | "guard-vein" | "recruit-chore" | "escort" | "council";

export type SpiritVeinKind = "herb-field" | "mine" | "spirit-vein" | "border-camp";

export type SpiritVeinBand = "qi" | "foundation" | "core" | "nascent" | "spirit";

export interface SpiritVeinYield {
  itemId: ItemId;
  count: number;
}

/** A herb field, mine, spirit vein, or neighbor-held border camp anchored to a location that already exists. */
export interface SpiritVeinNode {
  id: string;
  stateId: string;
  locationId: string;
  kind: SpiritVeinKind;
  band: SpiritVeinBand;
  name: string;
  ownerKind: "player" | "neutral" | "none";
  ownerId: string | null;
  pouch: SpiritVeinYield[];
  lastYieldTick: number;
  raidLockUntilTick: number;
  /**
   * Set when a raid is fought. The defending sect keeps this even if nobody
   * was standing on the node. Absent on veins that have not been raided.
   */
  borderGrievance?: {
    aggrievedKind: "player" | "neutral";
    aggrievedId: string;
    aggrievedName: string;
    attackerKind: "player" | "neutral";
    attackerId: string;
    attackerName: string;
    raiderId: string;
    sinceTick: number;
    counterAtTick: number;
    /** True once the one counter sighting has been written, or the raid failed. */
    countered: boolean;
  };
}

export interface SectLifePostView {
  id: SectPostId;
  name: string;
  duty: string;
  benefit: string;
  requirement: string;
  slotsUsed: number;
  slotsMax: number;
  held: boolean;
  canTake: boolean;
  actionId: string | null;
}

export interface SectLifeView {
  sectId: string;
  sectName: string;
  post: SectLifePostView | null;
  posts: readonly SectLifePostView[];
  tier: number;
  tierName: string;
  merit: number;
  veinCount: number;
  nextRequirement: string;
  daily: string;
  veins: readonly {
    id: string;
    name: string;
    kind: SpiritVeinKind;
    band: SpiritVeinBand;
    locationId: string;
    locationName: string;
    ownerName: string;
    yours: boolean;
    stock: number;
    materials: string;
    gatherActionId: string | null;
  }[];
  chains: readonly { id: SectChainId; name: string; actionId: string; summary: string }[];
  raids: readonly { veinId: string; name: string; actionId: string; summary: string }[];
  /** Feuds left by a raid. Empty until this sect raids or is raided. */
  borderFeuds: readonly {
    veinId: string;
    veinName: string;
    rivalName: string;
    line: string;
    counterAtTick: number;
  }[];
}

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
  // 元婴 generic materials
  | "infant-fire-lotus"
  | "nascent-jade"
  | "soul-lamp-wick"
  // 化神 generic materials
  | "divine-thought-crystal"
  | "heaven-soul-silk"
  | "divine-pattern-stone"
  // High-realm meditation materials. Not spent on breakthrough.
  | "core-nourish-dew"
  | "nascent-nourish-sand"
  | "spirit-nourish-dust"
  | "danxia-page-scrap"
  | "danxia-kiln-ash"
  | "danxia-pattern-flake"
  | "infant-page-scrap"
  | "infant-kiln-ash"
  | "infant-pattern-flake"
  | "rift-page-scrap"
  | "rift-kiln-ash"
  | "rift-pattern-flake"
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
  | "nurture-nascent-dew"
  | "anchor-nascent-sand"
  | "shatter-nascent-lotus"
  | "divine-embryo-dew"
  | "divine-transformation-seal"
  | "eight-wastes-pass"
  | "bahuang-spirit-essence"
  | "ancient-artifact"
  | "legendary-artifact"
  // State and roadside dungeons. Not sold. Meditation or one craft spends them.
  | "qinglan-dew-core"
  | "tide-bell-shard"
  | "cloud-plank-fiber"
  | "old-tea-pattern"
  | "balance-stone-chip"
  | "frost-hunt-bone"
  | "scorched-thunder-core"
  | "salt-pattern-crystal"
  | "sand-seal-page"
  | "wanderer-slip"
  | "merchant-ledger"
  | "vigil-ash";

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
  | "core-rite:steady"
  | "core-rite:press"
  | "infant-fire-temper"
  | "refine-nascent"
  | "begin-soul-vigil"
  | "face-tribulation"
  | "begin-divine-step"
  | "hold-divine-platform"
  | "residence-heal"
  | "residence-recover-qi"
  | "residence-produce"
  | "residence-socialize"
  | "take-mortal-task"
  | "mine-spirit-stones"
  | `search-fortune:rank-${DungeonRank}`
  | "take-sect-errand"
  | "band-errand:weapon"
  | "band-errand:manual"
  | "take-neutral-duty"
  | "post-duty"
  | `sect-chain:${string}`
  | `gather-vein:${string}`
  | `declare-raid:${string}`
  | `sect-task:${string}`
  | "hunt-mine-beast"
  | `challenge-guardian:rank-${DungeonRank}`
  | "survey-wilderness"
  | `enter-regional:${string}`
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
  /** Survived ticks when the last 见闻 was written. Absent on older runs. */
  lastSightingAt?: number;
}

export interface DungeonYieldEstimate {
  min: number;
  max: number;
}

export interface DungeonRankYieldHint {
  rank: DungeonRank;
  primaryMaterial: ItemId;
  /** Catalog name for primaryMaterial. The id stays for scripts. */
  primaryMaterialName?: string;
  estimatedExpeditionYieldByPolicy: Record<DungeonExpeditionPolicy, DungeonYieldEstimate>;
  notableSecondaryDrops: ItemId[];
  /** Same drops as notableSecondaryDrops, with the catalog name beside each id. */
  notableSecondaryDropCards?: Array<{ itemId: ItemId; itemName: string }>;
  /** Named place. 甲级 has a mystery, 乙级 has one per band, and 丙级 ranks 7–9 have 旧驿石廊. Earlier 丙级 omits it. */
  mysteryName?: string;
  mysteryLine?: string;
  entryMinLevel?: number;
  /** Story relic a finished 甲 run can leave. Absent on 丙级 and 乙级. */
  relicLine?: string;
}

export interface GearPath {
  kind: "秘境" | "配方" | "宗门" | "任务" | "破境" | "坊市";
  line: string;
  actionId: string | null;
}

export interface CombatSkillView {
  id: string;
  name: string;
  role: PartyRoleId;
  roleLabel: string;
  channel: AttackChannel;
  spiritCost: number;
  qiCost: number;
  cooldown: number;
  target: "enemy" | "all-enemies" | "ally" | "self" | "all-allies";
  power: number;
  summary: string;
  /** weapon is a 兵器招. root is a 灵根法术. Omitted by older view fixtures. */
  pool?: "weapon" | "root";
  poolLabel?: "兵器" | "法术";
  /** favored follows the cultivator's leaning. off fights it. neutral is 均衡. */
  aptitude?: "favored" | "off" | "neutral";
  aptitudeLabel?: "顺手" | "别扭" | "平常";
  /** 入门 through 化神. Omitted on the old shared techniques. */
  manualRank?: string;
}

export interface CombatNextUnlock {
  id: string;
  name: string;
  channel: AttackChannel;
  kind: "兵器" | "法术";
  manualRank: string;
  realm: string;
  blockedBy: "境界" | "熟练" | "兵器" | "功法";
  need: string;
  seek: string;
}

export interface CombatNextGear {
  id: string;
  name: string;
  tier: number;
  realm: string;
  manualRank: string;
  reachable: boolean;
  shopPrice: number;
  sectPrice: number;
  contributionGate: number;
  seek: string;
  /** False for 大圆满 and 化神. The shop price stays as a reference and the buy action is absent. */
  soldAtShop?: boolean;
  /** How to actually get this tier. Present once the gear view is built. */
  paths?: GearPath[];
}

export interface DungeonCombatHighlight {
  round: number;
  actorName: string;
  roleLabel: string;
  skillName: string;
  targetName: string;
  result: "hit" | "miss" | "crit" | "guard" | "heal" | "ward" | "flee" | "drain";
  note: string;
  /** Set when this beat is a real 兵器 or 法术, not a step back or an empty beat. */
  skillPoolLabel?: "兵器" | "法术";
}

export interface DungeonCombatSummary {
  enemyName: string;
  outcome: "win" | "loss" | "withdraw" | "draw";
  rounds: number;
  party: Array<{ name: string; roleLabel: string; skills: string[] }>;
  beats: string[];
  highlights: DungeonCombatHighlight[];
  /** Present when this fight left a wound someone can rest, dose, or tend. */
  wound?: string;
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
  /** Compact fight logs from guardian steps. Missing on expeditions saved before turn combat. */
  combatRounds?: DungeonCombatSummary[];
  /** Spoken clauses heard on this shared run. Absent on older expeditions. */
  heardLines?: string[];
  /** Wound-tending clauses from this shared run. Absent on older expeditions. */
  tendedLines?: string[];
  /** Wake scene kinds already shown on this run. Absent on older expeditions. */
  usedWakeScenes?: string[];
  /** Beats appended so far, including ones dropped from the kept list. */
  beatsSeen?: number;
  /** Beats already folded into a 见闻. */
  beatsTold?: number;
  /** How many new beats to gather before the next 见闻. Two, three, or four. */
  nextSightingGap?: number;
  /** Latest reusable win line. The same sentence is copied onto the fight. */
  carriedLine?: string;
  /** Party social wakes already opened on this run. Absent on older expeditions. */
  partyWakeKinds?: PartyWakeKind[];
  /** Favors, cracks, and shared lines waiting for the exit digest. Absent on older expeditions. */
  partyMoments?: PartyExpeditionMoment[];
}

export interface JiaRelicNote {
  itemId: ItemId;
  name: string;
  mysteryId: "danxia" | "infant-pool" | "divine-rift";
  mysteryName: string;
  kind: "page" | "ash" | "flake";
  rank: number;
  arcLine: string;
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
    itemName?: string;
    count: number;
  };
  secondaryDrops: Partial<Record<ItemId, number>>;
  /** Same counts as secondaryDrops, with a catalog name an agent can show. */
  secondaryDropCards?: Array<{ itemId: ItemId; itemName: string; count: number }>;
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
  /** Guardian fights from this run, newest last, at most three. */
  combatRounds?: DungeonCombatSummary[];
  /** Set on a companion's copy of someone else's run. The leader's own report omits this. */
  sharedLeaderId?: string;
  /** Display name for sharedLeaderId. */
  sharedLeaderName?: string;
  /** Story relic from a finished 甲 run. Absent on 丙, 乙, and unfinished runs. */
  relic?: JiaRelicNote;
}

/** One state dungeon or one of the shorter shared caves. */
export interface RegionalDungeonReport {
  dungeonId: string;
  name: string;
  outcome: "cleared" | "failed" | "withdrew" | "sat";
  line: string;
  signatureName: string | null;
  stones: number;
  endedAtTick: number;
  combatRounds?: DungeonCombatSummary[];
  /** Set on a companion's copy. The item stayed with the leader. */
  sharedLeaderId?: string;
  sharedLeaderName?: string;
}

export interface RegionalRunState {
  leaderId: string;
  dungeonId: string;
  jobId: string;
  companionIds: string[];
  startedAtTick: number;
  deadlineTick: number;
  sightingWritten: boolean;
  phase: "choice" | "vigil" | "resolved";
  votes: Record<string, string>;
  summary: string;
  report: RegionalDungeonReport | null;
  /** Side room already answered. Absent on runs saved before interior rooms. */
  interiorResolved?: boolean;
  /** Votes on the side room, separate from the signature choice. */
  interiorVotes?: Record<string, string>;
  /** Farther room already answered. Absent on runs saved before that room. */
  deeperResolved?: boolean;
  /** Votes on the farther room, separate from the side room and the signature choice. */
  deeperVotes?: Record<string, string>;
}

export interface RegionalPlaceView {
  id: string;
  name: string;
  stateName: string;
  band: string;
  minRealm: number;
  mechanic: string;
  advice: string;
  signatureName: string;
  signatureUse: string;
  bossName: string;
  bossMove: string;
  open: boolean;
  lockReason: string | null;
  cooldownUntilTick: number | null;
  opensAtTick: number | null;
  actionId: string | null;
  party: boolean;
}

export interface RegionalDungeonsView {
  advice: string;
  places: RegionalPlaceView[];
  active: {
    dungeonId: string;
    name: string;
    leaderId: string;
    leaderName: string;
    phase: "choice" | "vigil";
    stepLine: string;
    safeOptionId: string | null;
    awaitingNames: string[];
    options: Array<{ optionId: string; label: string; description: string }>;
    /** Side room still open beside the signature choice. Absent once it is answered. */
    interior: {
      prompt: string;
      safeOptionId: string;
      options: Array<{ optionId: string; label: string; description: string }>;
    } | null;
    /** Farther room, still open. Same shape as the side room, tallied apart from it. */
    deeper: {
      prompt: string;
      safeOptionId: string;
      options: Array<{ optionId: string; label: string; description: string }>;
    } | null;
  } | null;
  lastReport: RegionalDungeonReport | null;
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

export type BondArc = "点头之交" | "好友" | "知己";
export type GrudgeArc = "嫌隙" | "宿怨";
export type FavorKind = "fetch-herb" | "escort-gate" | "guard-breakthrough" | "deliver-gift";
export type FavorStatus = "offered" | "accepted" | "fulfilled" | "declined" | "failed";
export type GossipKind = "win" | "feud" | "bond" | "favor-failed";
export type MoodId = "steady" | "lifted" | "sore" | "warm" | "stung" | "echoing";
export type MoodCause = "win" | "wound" | "loss" | "gift" | "rejection" | "spoken" | "breakthrough" | "bond" | "settled";

export interface CultivatorMood {
  id: MoodId;
  label: string;
  sentence: string;
  sinceTick: number;
  cause: MoodCause;
}

export type LifeEventKind = "growth" | "fight" | "relationship" | "mood" | "quote";
export type LifeTopic = "favor" | "note" | "gossip" | "sect" | "bond" | "repay" | "reunite";

export interface LifeEvent {
  tick: number;
  kind: LifeEventKind;
  text: string;
  speakerName?: string;
  line?: string;
  topic?: LifeTopic;
  names?: string[];
}

export interface CultivatorDigest {
  windowTicks: number;
  windowHours: number;
  fromTick: number;
  toTick: number;
  mood: CultivatorMood;
  growth: string[];
  fights: string[];
  relationships: string[];
  quotes: readonly { speakerName: string; line: string; tick: number }[];
  summary: string;
  /** Present while a dungeon wake is waiting for a choice. */
  priorities?: string[];
  /** Present from 金丹后期 on, including at 化神后期. Omitted earlier. */
  nextStep?: string;
}

export interface PersonalFavor {
  id: string;
  kind: FavorKind;
  fromId: string;
  toId: string;
  thirdId?: string;
  itemId?: ItemId;
  status: FavorStatus;
  createdAtTick: number;
  deadlineTick: number;
  locationId: string;
  line?: string;
}

export interface NoteReply {
  fromId: string;
  fromName: string;
  line: string;
  tick: number;
}

export interface PersonalNote {
  id: string;
  fromId: string;
  toId: string | null;
  locationId: string;
  line: string;
  tick: number;
  seenTick?: number;
  replies?: NoteReply[];
}

export interface GossipItem {
  id: string;
  tick: number;
  locationId: string;
  aboutIds: string[];
  kind: GossipKind;
  text: string;
  shortLine: string;
}

export interface HeardGossip {
  id: string;
  tick: number;
  text: string;
  shortLine: string;
  kind: GossipKind;
  mentioned?: boolean;
}

export interface SectNotice {
  id: string;
  sectKey: string;
  authorId: string;
  authorName: string;
  tick: number;
  text: string;
  replies?: NoteReply[];
}

export interface FavorView {
  id: string;
  kind: FavorKind;
  status: "offered" | "accepted";
  role: "incoming" | "outgoing" | "doing";
  otherId: string;
  otherName: string;
  thirdId?: string;
  thirdName?: string;
  summary: string;
  deadlineTick: number;
  acceptActionId?: string;
  declineActionId?: string;
  fulfillActionId?: string;
  abandonActionId?: string;
}

export interface PendingNoteView {
  id: string;
  fromId: string;
  fromName: string;
  line: string;
  tick: number;
  placeName: string;
  readActionId: string;
  replyActionId: string;
}

export interface SpotNoteView {
  id: string;
  fromId: string;
  fromName: string;
  line: string;
  tick: number;
  replyActionId: string;
}

export interface SectNoticeView {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  tick: number;
  replyActionId?: string;
}

export interface GossipView {
  id: string;
  kind: GossipKind;
  text: string;
  shortLine: string;
  tick: number;
}

export interface OwedFavorView {
  id: string;
  otherId: string;
  otherName: string;
  direction: "they-owe" | "you-owe";
  reason: string;
  tick: number;
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
    /** Set while the fork is still waiting. */
    decisionLine: string;
    options: WakeNodeOption[];
    /** Present when the pending wake is a party social choice. */
    partyKind?: PartyWakeKind;
    safeOptionId?: string;
    subjectId?: string;
    subjectName?: string;
    votedIds?: string[];
    awaitingNames?: string[];
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
  /** Depth of the last 见闻. Absent on older expeditions. */
  lastSightingDepth?: number;
  /** Depths to walk before the next 见闻. Two, three, or four. */
  nextSightingGap?: number;
}

export interface WildRouteView {
  kind: "wilderness" | "bahuang";
  placeName: string;
  advice: string;
  mysteryLine: string;
  statusLabel: string;
  enemyLabel: string;
  followerLabel: string;
}

export interface BahuangExpeditionStateView {
  status: BahuangExpeditionProgress["status"];
  depth: number;
  supplies: BahuangExpeditionProgress["supplies"];
  pressure: number;
  strategy: RunStrategy;
  pendingWakeNode: WakeNode | null;
  rewards: BahuangExpeditionProgress["rewards"];
  /** The band this depth is walking. Absent on older view fixtures. */
  placeName?: string;
  advice?: string;
  mysteryLine?: string;
  statusLabel?: string;
  enemyLabel?: string;
  followerLabel?: string;
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
  | `choose-event:${string}`
  | `unlock-loadout:${string}`
  | "buy-healing-pill"
  | "buy-qi-pill"
  | "buy-ward-talisman"
  | "buy-eight-wastes-pass"
  | "buy-current-breakthrough-material"
  | "buy-next-weapon"
  | "buy-next-manual"
  | "exchange-sect-weapon"
  | "exchange-sect-manual"
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
  | `await-pvp-challenge:${string}`
  | `chat-up:${string}`
  | `voice-transmit:${string}`
  | `propose-dao-companion:${string}`
  | `accept-dao-companion:${string}`
  | `reject-dao-companion:${string}`
  | `party-invite:${string}`
  | `accept-party:${string}`
  | `reject-party:${string}`
  | "disband-party"
  | `party-kick:${string}`
  | `party-rotate:${string}`
  | `queue-party-reserve:${string}`
  | "leave-party-reserve"
  | "leave-shared-expedition"
  | `tend-wound:${string}`
  | `set-party-role:${PartyRoleId}`
  | `equip-skill-slot:${string}`
  | "clear-skill-loadout"
  | "seal-soul-vigil"
  | "seal-divine-step"
  | "cycle-social-page"
  | `buy-residence:${string}`
  | "upgrade-residence"
  | `place-fixture:${string}`
  | `clear-fixture:${string}`
  | `host-guest:${string}`
  | `display-relic:${string}`
  | "clear-displayed-relic"
  | `send-message:${string}:${MessageTemplateKind}`
  | `send-message:${string}:gift-item:${string}`
  | "read-messages"
  | `say:${string}`
  | `reply-line:${string}`
  | `spar-teach:${string}`
  | `share-resource:${string}`
  | `grudge-challenge:${string}`
  | `accept-gift:${string}`
  | `reject-gift:${string}`
  | `accept-gift-batch:${string}`
  | `reject-gift-batch:${string}`
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
  | `ask-favor:${string}:fetch-herb`
  | `ask-favor:${string}:escort-gate`
  | `ask-favor:${string}:guard-breakthrough`
  | `ask-favor:${string}:deliver-gift:${string}`
  | `accept-favor:${string}`
  | `decline-favor:${string}`
  | `fulfill-favor:${string}`
  | `abandon-favor:${string}`
  | `leave-note:${string}`
  | `read-note:${string}`
  | `reply-note:${string}`
  | "leave-spot-note"
  | `reply-spot-note:${string}`
  | "post-sect-notice"
  | `reply-sect-notice:${string}`
  | `join-sect-task:${string}`
  | `take-post:${string}`
  | "resign-post"
  | `refuse-gift:${string}`
  | `guide-junior:${string}`
  | `mention-gossip:${string}:${string}`
  | `wait-for:${string}`
  | `dungeon-wake-decision:${string}`
  | "dungeon-gate-locked"
  | `sect-scene:${string}`
  | `bahuang-wake-decision:${string}`
  | `regional-choice:${string}`
  | "leave-regional";

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
  /** Sect-wide merit from duties, chains, and raids. Absent on older saves. */
  sectMerit?: number;
  /** World tick when this sect last raided. Absent until the first raid. */
  lastRaidTick?: number;
  /** Elder council votes inside the current window. Absent until the first council. */
  councilVotes?: number;
  councilUntilTick?: number;
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
  /** Sect-wide merit from duties, chains, and raids. Absent on older saves. */
  sectMerit?: number;
  /** World tick when this sect last raided. Absent until the first raid. */
  lastRaidTick?: number;
  /** Elder council votes inside the current window. Absent until the first council. */
  councilVotes?: number;
  councilUntilTick?: number;
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

export type BreakthroughMethodId =
  | "residence"
  | "core-rite"
  | "infant-fire"
  | "nascent-refine"
  | "soul-vigil"
  | "tribulation"
  | "divine-pattern"
  | "divine-vigil";

export interface BreakthroughRiteState {
  method: "soul-vigil" | "divine-pattern";
  stage: "open";
  untilTick: number;
}

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
  /** Duty post inside the current sect. Absent until the cultivator takes one. */
  sectPost?: SectPostId | null;
  moralityScore: number;
  pendingSectApplicationId: string | null;
  pendingMoralityChoiceId: string | null;
  /** Set while a 3–4 option road scene is waiting. Absent on older saves. */
  pendingSceneChoiceId?: string | null;
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
  /** Tick when a state dungeon can be entered again. Absent on older saves. */
  regionalCooldowns?: Record<string, number>;
  /** Latest state-dungeon result. Absent until one finishes. */
  regionalReport?: RegionalDungeonReport;
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
  /** Latest feeling. Absent until something shifts it. */
  mood?: CultivatorMood;
  /** Short log the digest reads. Absent on older saves. */
  lifeLog?: LifeEvent[];
  actionFatigue?: {
    key: string;
    count: number;
    lastTick: number;
  };
  lastSectApplicationTick?: number;
  /** Help requests waiting on this cultivator. Absent on older saves. */
  pendingHelpRequests?: PendingHelpRequest[];
  /** Gossip this cultivator has heard nearby. Absent on older saves. */
  heardGossip?: HeardGossip[];
  /** Last tick of a social action, keyed so the same ask cannot be spammed. */
  socialCooldowns?: Record<string, number>;
  /** World tick when the next 宗门兵器功法差事 can start. Absent until one has been run. */
  bandErrandReadyTick?: number;
  /** Set when someone stands watch for a breakthrough. Absent until then. */
  breakthroughWatch?: { guardId: string; guardName: string; untilTick: number };
  /** Open soul-lamp or divine-pattern step. Absent until the first step finishes, and on older saves. */
  breakthroughRite?: BreakthroughRiteState;
  /** Set while this cultivator is waiting for a party mate or favor partner to arrive. */
  waitingFor?: { targetId: string; sinceTick: number; placeId: string };
  /** Sect diary chain, 0–2 while climbing, reset after the elder notice. */
  sectDiaryStep?: number;
  /** Chosen party role, kept only while the loadout can still stand there. */
  preferredPartyRole?: PartyRoleId;
  /** Up to three skill ids this cultivator wants to cast. Empty means the whole legal list. */
  preferredSkillIds?: string[];
  /** Uses of a skill. The power bonus stays under five percent. */
  skillProficiency?: Record<string, number>;
  /** Small role practice. It adds at most a few points of hit. */
  roleExperience?: Partial<Record<PartyRoleId, number>>;
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
    breakthroughCompanionId?: string;
    breakthroughMethod?: BreakthroughMethodId;
    breakthroughPress?: boolean;
    activeQuestId?: string;
    wildernessLayerId?: string;
    wildernessEventId?: string;
    dungeonGrade?: DungeonGrade;
    dungeonRank?: DungeonRank;
    dungeonExpeditionPolicy?: DungeonExpeditionPolicy;
    dungeonExpeditionTargetRank?: DungeonRank;
    dungeonExpeditionStepIndex?: number;
    dungeonExpeditionNextResolutionTick?: number;
    /** How many event-pool side choices this expedition has already offered. */
    dungeonSideChoicesQueued?: number;
    /** Set while a mid-run dungeon choice is waiting. Cleared when it is answered or times out. */
    dungeonWake?: {
      context: string;
      defaultOptionId: string;
      options: Array<{ optionId: string; label: string }>;
    };
    /** Set while a sect duty or chain is waiting on a Chinese choice. Cleared when it is answered or times out. */
    sectScene?: {
      sceneId: string;
      context: string;
      defaultOptionId: string;
      deadlineTick: number;
      mateId?: string;
      foeId?: string;
      options: Array<{ optionId: string; label: string; description: string; line: string }>;
    };
    /** The sentence chosen during the pause, kept so the finished duty can quote it. */
    sectSceneLine?: string;
    guixuNodeId?: string;
    guixuEventId?: string;
    dualTaskId?: string;
    dualPartnerId?: string;
    dualRole?: "initiator" | "partner";
    travelFlavorEventCount?: number;
    /** Set once a wilderness road has left its 见闻. */
    wildSighting?: boolean;
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
  /** The words actually spoken, when this message carries a line. */
  spokenLine?: string;
  /** Set once this spoken line has been answered, so a later reply cannot pick it up. */
  spokenAnswered?: boolean;
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

export interface PendingSceneChoice {
  id: string;
  cultivatorId: string;
  eventId: string;
  createdAtTick: number;
  expiresAtTick: number;
  title: string;
  prompt: string;
  options: SceneChoiceOption[];
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
/** 兵器偏, 法术偏, or 均衡. Derived from body, root, and what is equipped. */
export type CombatLeaningId = "weapon" | "spell" | "balanced";
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
  /** Readable city-duel beats. Absent on older combat jobs. */
  duelReport?: string;
  /** Named skill fight from a city duel. Absent on older combat jobs. */
  duelSummary?: DungeonCombatSummary;
  /** Set when a city duel times out with both sides still standing close. */
  duelDraw?: boolean;
  /** Skill ids cast in a city duel, keyed by cultivator id. */
  duelPractice?: Record<string, string[]>;
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
  /** Chinese reading of `outcome` for agents. The machine value stays `victory` or `defeat`. */
  outcomeLabel?: "胜" | "负";
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
  /** Named skill fights. A city duel stores the one shared summary on both sides. */
  combatRounds?: DungeonCombatSummary[];
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
  grandeur?: number;
  tierName?: string;
  glance?: string;
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

export interface RealmPathView {
  stage: RealmStage;
  phase: RealmPhase;
  level: number;
  nextStage: RealmStage | null;
  nextLevel: number | null;
  category: "minor" | "major" | null;
  where: string;
  risk: string;
  outcome: string;
  catalogTier: string | null;
  goals: string[];
  /** Which breakthrough method this tier uses. Omitted by older view fixtures. */
  method?: BreakthroughMethodId | null;
  methodName?: string | null;
  /** Complete sentences: where, with whom, and in what order. */
  sequence?: string[];
  /** High-realm materials and places. Omitted before 金丹. */
  resources?: string[];
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
  /** How this tier breaks through. Omitted by older view fixtures. */
  method?: BreakthroughMethodId;
  methodName?: string;
  sequence?: string[];
  help?: string;
  rite?: { method: "soul-vigil" | "divine-pattern"; untilTick: number } | null;
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
  /** Plain Chinese reminder for this entrance. */
  advice: string;
  lockReason: string | null;
}

export interface PlayerSectView {
  id: string;
  name: string;
  /** 中立 is a joined neutral outpost. Player sects stay 正道 or 魔道. */
  alignment: SectAlignment | "中立";
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
    /** Same place as location, as the id scripts already use elsewhere. */
    locationId: string;
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
    /** Auto role from weapon, spell, and spirit root. Omitted by older view fixtures. */
    partyRole?: {
      id: PartyRoleId;
      label: string;
    };
    /** Skills this loadout and spirit root can actually cast. Omitted by older view fixtures. */
    availableSkills?: CombatSkillView[];
    /** Roles this weapon, spell, and spirit root can stand. Omitted by older view fixtures. */
    legalPartyRoles?: Array<{ id: PartyRoleId; label: string }>;
    /** The role the agent chose. Null until they choose. */
    preferredPartyRole?: { id: PartyRoleId; label: string } | null;
    /** Skill ids kept in the three ready slots. Empty means every legal skill. */
    equippedSkillIds?: string[];
    /** Skills that will actually be cast, after the role and the ready slots. */
    equippedSkills?: CombatSkillView[];
    /** Skill id to practice points. */
    skillProficiency?: Record<string, number>;
    /** Role id to practice points. */
    roleExperience?: Partial<Record<PartyRoleId, number>>;
    /** 兵器偏, 法术偏, or 均衡. Omitted by older view fixtures. */
    combatLeaning?: {
      id: CombatLeaningId;
      label: string;
      reason: string;
      roleHint: string;
    };
    /** Weapon-family and other 兵器 skills this loadout can cast. */
    weaponSkills?: CombatSkillView[];
    /** 灵根 and 法术 skills this root and spell can cast. */
    rootSkills?: CombatSkillView[];
    /** Soft note about mixing the three slots against the leaning. */
    loadoutGuidance?: string;
    /** The next techniques this weapon, root, and realm have not opened yet. */
    nextUnlocks?: CombatNextUnlock[];
    /** Next weapon of the type in hand. Null when that type has nothing left. */
    nextWeapon?: CombatNextGear | null;
    /** Next manual of the spell in hand. Null when that branch has nothing left. */
    nextManual?: CombatNextGear | null;
  };
  sect: PlayerSectView | null;
  neutralSect: NeutralSectView | null;
  /** Posts, tier, veins, and today's sect work. Omitted when this cultivator has no sect. */
  sectLife?: SectLifeView;
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
  /** Current feeling. Omitted by older view fixtures. */
  mood?: CultivatorMood;
  /** Last six ticks, twelve hours, in sentences an agent can report. Omitted by older view fixtures. */
  digest?: CultivatorDigest;
  /** Open personal favors this cultivator asked, was asked, or accepted. Omitted when empty. */
  favors?: FavorView[];
  /** Notes left for this cultivator while they were away. Omitted when empty. */
  pendingNotes?: PendingNoteView[];
  /** Notes pinned at this spot by someone else. Omitted when empty. */
  spotNotes?: SpotNoteView[];
  /** Recent notices on the shared sect board. Omitted when this cultivator has no sect, or the board is empty. */
  sectBoard?: SectNoticeView[];
  /** Gossip heard from nearby cultivators. Omitted when empty. */
  gossip?: GossipView[];
  /** Favors still owed, with a short reason an agent can quote. Omitted when empty. */
  owedFavors?: OwedFavorView[];
  /** Unanswered spoken lines. Omitted by older view fixtures. */
  pendingDialogue?: Array<{
    fromId: string;
    fromName: string;
    line: string;
    tick: number;
    replyActionId: string;
  }>;
  registration: CultivationRegistrationView | null;
  registrationEffects: RegistrationGameplayEffectsView | null;
  registrationProfile: RegistrationProfileView | null;
  breakthrough: BreakthroughStateView | null;
  /** Where the next realm is, what it costs, and what it opens. */
  realmPath: RealmPathView;
  dungeon: DungeonStateView | null;
  dungeonExpedition: DungeonExpeditionStateView;
  /** State dungeons and the shorter shared caves visible from here. */
  regionalDungeons?: RegionalDungeonsView;
  bahuang: BahuangExpeditionStateView | null;
  wilderness: {
    layerId: string;
    layerName: string;
    ticksSurvived: number;
    remainingSurvivalTicks: number;
    status: "active" | "withdrawn";
    placeName?: string;
    advice?: string;
    mysteryLine?: string;
    statusLabel?: string;
    enemyLabel?: string;
    followerLabel?: string;
  } | null;
  /** The wilderness road or 八荒 band an agent can read before and during the trip. Omitted by older view fixtures. */
  wildRoute?: WildRouteView | null;
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
    grandeur: number;
    tierName: string;
    slotCount: number;
    usedSlots: number;
    prestige: number;
    glance: string;
    benefitLine: string;
    fixtures: readonly {
      id: string;
      name: string;
      tier: number;
      tierName: string;
      cosmetic: boolean;
      line: string;
    }[];
    /** Set when a 甲 relic is on the table. The bag still holds it. */
    displayedRelic?: {
      itemId: ItemId;
      name: string;
      arcLine: string;
      line: string;
    };
    nextUpgrade: {
      actionId: "upgrade-residence";
      nextGrandeur: number;
      tierName: string;
      price: number;
      slotCount: number;
      line: string;
    };
    /** Present on the cave you are standing in. */
    offers?: readonly {
      actionId: string;
      fixtureId: string;
      name: string;
      nextTier: number;
      tierName: string;
      price: number;
      cosmetic: boolean;
      line: string;
    }[];
  }[];
  /** Other people's caves in this city. Omitted when nobody else has one here. */
  nearbyHomes?: readonly {
    ownerId: string;
    ownerName: string;
    residenceName: string;
    grandeur: number;
    tierName: string;
    glance: string;
    /** Set when that cave has a 甲 relic on the table. */
    displayedRelic?: {
      name: string;
      arcLine: string;
    };
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
    bondArc?: BondArc | null;
    grudgeArc?: GrudgeArc | null;
    grudge?: number;
    arcLine?: string | null;
    rival: boolean;
    favorBalance: number;
    placeLine: string;
    /** Set when this person owns a cave in the city you are standing in. */
    homeLine?: string;
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
    /** The one person waiting to rotate in. Absent when nobody is queued. */
    reserve?: { cultivatorId: string; name: string } | null;
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
    /** Fights so far on the leader's run. The finished copy lives on lastReport.combatRounds. */
    combatRounds?: DungeonCombatSummary[];
    /** Present while the shared run is waiting on a party social choice. */
    partyWake?: {
      kind: PartyWakeKind;
      context: string;
      subjectId?: string;
      subjectName?: string;
      safeOptionId: string;
      defaultOptionId: string;
      votedIds: string[];
      awaitingNames: string[];
      options: WakeNodeOption[];
    } | null;
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
  pendingSceneChoices?: Record<string, PendingSceneChoice>;
  nextSceneChoiceSequence?: number;
  pendingPvpChallenges: Record<string, PendingPvpChallenge>;
  sectReapplyCooldowns: Record<string, SectReapplyCooldown>;
  wildernessLayers: Record<string, WildernessLayer>;
  wildernessProgress: Record<string, WildernessProgress>;
  dungeonExpeditions: Record<string, DungeonExpeditionProgress>;
  dungeonExpeditionReports: Record<string, DungeonExpeditionReport>;
  /** State-dungeon runs in progress, keyed by the leader. Absent on older saves. */
  regionalRuns?: Record<string, RegionalRunState>;
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
  /** Personal favors between cultivators. Absent on older saves. */
  personalFavors?: Record<string, PersonalFavor>;
  nextPersonalFavorSequence?: number;
  /** Notes left for a person, or pinned at a spot. Absent on older saves. */
  personalNotes?: Record<string, PersonalNote>;
  nextPersonalNoteSequence?: number;
  /** Recent gossip items. Absent on older saves. */
  gossip?: GossipItem[];
  nextGossipSequence?: number;
  /** Sect hall notice boards, keyed by sect. Absent on older saves. */
  sectBoards?: Record<string, SectNotice[]>;
  /** Herb fields, mines, and spirit veins. Absent on worlds saved before sect life. */
  spiritVeins?: Record<string, SpiritVeinNode>;
  nextSectNoticeSequence?: number;
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
