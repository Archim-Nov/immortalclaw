export type RealmStage = "炼气" | "筑基" | "金丹";

export type ZoneId =
  | "mortal-town"
  | "market"
  | "sect-gate"
  | "spirit-mine"
  | "mystic-ruins"
  | "healing-sanctuary";

export type ItemId = "healing-pill" | "qi-pill";

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
  | "search-fortune";

export type ImmediateActionId =
  | "buy-healing-pill"
  | "buy-qi-pill"
  | "use-healing-pill"
  | "use-qi-pill"
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
  type: "剑修" | "丹修" | "阵法";
  treasury: number;
  memberIds: string[];
  spiritVeins: string[];
}

export interface Cultivator {
  id: string;
  name: string;
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
  lifespan: number;
  age: number;
  sectId: string | null;
  techniques: string[];
  inventory: Record<ItemId, number>;
  activeJobId: string | null;
  injuryTicksRemaining: number;
  nextTribulationTick: number;
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
  subject: string;
  content: string;
}

export interface TribulationPreview {
  nextTribulationTick: number;
  tribulationType: string;
  difficulty: number;
  isWarned: boolean;
  preparationTime: number;
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
}

export interface WorldState {
  tick: number;
  cultivators: Record<string, Cultivator>;
  sects: Record<string, Sect>;
  zones: Record<ZoneId, Zone>;
  jobs: Record<string, ActionJob>;
  daoLogs: DaoLogEntry[];
  messages: Message[];
  nextJobSequence: number;
  nextLogSequence: number;
  nextMessageSequence: number;
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
  currentJob: ActionJob | null;
  nearbyOpportunities: string[];
}

