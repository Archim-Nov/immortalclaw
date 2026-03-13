export type RealmStage = "炼气" | "筑基" | "金丹";
export type GenderPresentation = "male" | "female" | "nonbinary" | "other" | "unspecified";
export type StartingPath = "sword" | "alchemy" | "array" | "wanderer";
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
export type RegistrationSpiritRootKindId = "single-root" | "dual-root";

export type ZoneId =
  | "mortal-town"
  | "market"
  | "sect-gate"
  | "spirit-mine"
  | "mystic-ruins"
  | "healing-sanctuary";

export type ItemId =
  | "healing-pill"
  | "qi-pill"
  | "ward-talisman"
  | "spirit-ore"
  | "ruin-fragment"
  | "beast-core"
  | "sword-manual"
  | "alchemy-manual"
  | "array-manual";

export type ItemCategory = "consumable" | "talisman" | "material" | "manual";

export type FactionId =
  | "townsfolk"
  | "market-guild"
  | "qing-yun-sect"
  | "rogue-cultivators";

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
  | "travel-town"
  | "travel-market"
  | "travel-sect-gate"
  | "travel-spirit-mine"
  | "travel-mystic-ruins"
  | "travel-healing-sanctuary"
  | "meditate"
  | "heal"
  | "cultivate"
  | "take-mortal-task"
  | "mine-spirit-stones"
  | "search-fortune"
  | "take-sect-errand"
  | "hunt-mine-beast"
  | "challenge-guardian";

export type ImmediateActionId =
  | "buy-healing-pill"
  | "buy-qi-pill"
  | "buy-ward-talisman"
  | "use-healing-pill"
  | "use-qi-pill"
  | "use-ward-talisman"
  | "sell-spirit-ore"
  | "sell-ruin-fragment"
  | "sell-beast-core"
  | "study-sword-manual"
  | "study-alchemy-manual"
  | "study-array-manual"
  | "join-sect";

export type ActionId = TimedActionId | ImmediateActionId;

export interface Zone {
  id: ZoneId;
  name: string;
  kind: "safe" | "resource" | "adventure";
  description: string;
}

export interface Sect {
  id: string;
  name: string;
  type: "剑修" | "丹修" | "阵修";
  treasury: number;
  memberIds: string[];
  spiritVeins: string[];
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  description: string;
  baseValue: number;
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
  startingPath: StartingPath;
  createdByAgentId: string | null;
  realm: RealmStage;
  realmLevel: number;
  realmProgress: number;
  locationId: ZoneId;
  spiritStones: number;
  qi: number;
  maxQi: number;
  spiritualPower: number;
  maxSpiritualPower: number;
  karma: number;
  reputation: number;
  factionReputation: Record<FactionId, number>;
  lifespan: number;
  age: number;
  sectId: string | null;
  techniques: string[];
  inventory: Record<ItemId, number>;
  statusEffects: StatusEffect[];
  activeJobId: string | null;
  injuryTicksRemaining: number;
  nextTribulationTick: number;
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
  zoneId: ZoneId;
  title: string;
  content: string;
  severity: "low" | "medium" | "high";
  tags: string[];
}

export interface CombatLogEntry {
  id: string;
  tick: number;
  cultivatorId: string;
  zoneId: ZoneId;
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
  startingPath: StartingPath;
  realm: RealmStage;
  realmLevel: number;
  locationId: ZoneId;
  sectId: string | null;
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
  startingPath?: StartingPath;
}

export interface TribulationPreview {
  nextTribulationTick: number;
  tribulationType: string;
  difficulty: number;
  isWarned: boolean;
  preparationTime: number;
  supportScore: number;
}

export interface AvailableAction {
  actionId: ActionId;
  label: string;
  description: string;
  durationTicks: number;
  kind: "timed" | "immediate";
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
  tribulations: Array<{
    cultivatorId: string;
    success: boolean;
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
}

export interface FactionStandingView {
  factionId: FactionId;
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
    karma: number;
    reputation: number;
    lifespan: number;
    age: number;
    genderPresentation: GenderPresentation;
    pronouns: string;
    origin: string;
    temperament: string;
    startingPath: StartingPath;
  };
  cultivation: {
    mainTechnique: string;
    techniques: string[];
  };
  sect: {
    id: string;
    name: string;
    role: string;
    treasury: number;
    memberCount: number;
  } | null;
  tribulation: TribulationPreview;
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
}

export interface WorldState {
  version: number;
  tick: number;
  updatedAt: string;
  cultivators: Record<string, Cultivator>;
  agentBindings: Record<string, AgentBinding>;
  sects: Record<string, Sect>;
  zones: Record<ZoneId, Zone>;
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
}
