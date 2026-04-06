import type {
  ProductionRecipe,
  QuestTemplate,
  RegistrationCultivationMotiveId,
  SectMotiveBucketId,
  SectTitleSlot,
} from "./model.js";
import { LOADOUT_SOURCE_RECIPES } from "./loadout-sourcing.js";
import {
  GEOGRAPHY_REGISTRY,
  getCrossStateEdges,
  getNeutralSectsByState,
  getSettlementDisplayNames,
  getStarterStates,
  getStateMetaMap,
} from "./geography-registry.js";

// ---- Core risk levels ----
export type RiskLevel = "safe" | "low" | "medium" | "high";

// ---- State IDs ----
export type StateId = keyof typeof GEOGRAPHY_REGISTRY & string;
export const STATE_IDS = Object.keys(GEOGRAPHY_REGISTRY) as StateId[];
export const STARTER_STATES = getStarterStates(GEOGRAPHY_REGISTRY) as StateId[];

// ---- Node Types ----
export const BASE_NODE_TYPES = [
  "main-city",
  "sub-town-east",
  "sub-town-west",
  "sub-town-south",
  "wilderness",
  "dungeon-c",
  "dungeon-b",
  "dungeon-a",
] as const;
export type BaseNodeType = (typeof BASE_NODE_TYPES)[number];

export const NODE_TYPES = [...BASE_NODE_TYPES, "sect-outpost"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

// ---- LocationId ----
export type BaseLocationId = `${StateId}:${BaseNodeType}`;
export type SectOutpostLocationId = `${StateId}:sect-outpost:${string}`;
export type LocationId = BaseLocationId | SectOutpostLocationId;

export type NamedSettlementNodeType =
  | "main-city"
  | "sub-town-east"
  | "sub-town-west"
  | "sub-town-south";

// ---- State Metadata ----
export const STATE_META = getStateMetaMap(GEOGRAPHY_REGISTRY) as Record<
  StateId,
  { name: string; risk: RiskLevel }
>;

// ---- Node Metadata ----
export const NODE_META: Record<
  BaseNodeType,
  { suffix: string; kind: "safe" | "resource" | "adventure"; riskModifier: number }
> = {
  "main-city": { suffix: "主城", kind: "safe", riskModifier: 0 },
  "sub-town-east": { suffix: "东镇", kind: "safe", riskModifier: 0 },
  "sub-town-west": { suffix: "西镇", kind: "safe", riskModifier: 0 },
  "sub-town-south": { suffix: "南镇", kind: "safe", riskModifier: 0 },
  wilderness: { suffix: "荒野", kind: "resource", riskModifier: 1 },
  "dungeon-c": { suffix: "丙级秘境", kind: "adventure", riskModifier: 1 },
  "dungeon-b": { suffix: "乙级秘境", kind: "adventure", riskModifier: 2 },
  "dungeon-a": { suffix: "甲级秘境", kind: "adventure", riskModifier: 3 },
};

export const SETTLEMENT_DISPLAY_NAMES = getSettlementDisplayNames(GEOGRAPHY_REGISTRY) as Record<
  StateId,
  Record<NamedSettlementNodeType, string>
>;

export const NEUTRAL_SECTS_BY_STATE = getNeutralSectsByState(GEOGRAPHY_REGISTRY) as Record<
  StateId,
  {
    id: string;
    name: string;
    description: string;
    rewardMultiplier: number;
  }
>;

// ---- Intra-state travel durations (ticks) ----
export const INTRA_STATE_TRAVEL: Record<string, number> = {
  "main-city|sub-town-east": 1,
  "main-city|sub-town-west": 1,
  "main-city|sub-town-south": 1,
  "main-city|wilderness": 2,
  "main-city|dungeon-c": 2,
  "main-city|dungeon-b": 2,
  "main-city|dungeon-a": 3,
  "sub-town-east|wilderness": 2,
  "sub-town-south|wilderness": 2,
};

// ---- Cross-state edges: [stateA, stateB, ticks] ----
export const CROSS_STATE_EDGES = getCrossStateEdges(GEOGRAPHY_REGISTRY) as ReadonlyArray<
  readonly [StateId, StateId, number]
>;

// ---- Default action durations ----
export const DEFAULT_ACTION_DURATIONS: Record<string, number> = {
  meditate: 2,
  heal: 2,
  cultivate: 3,
  "residence-meditate": 4,
  "residence-breakthrough": 4,
  "residence-heal": 2,
  "residence-recover-qi": 1,
  "residence-produce": 2,
  "residence-socialize": 1,
  "take-mortal-task": 2,
  "mine-spirit-stones": 3,
  "search-fortune": 3,
  "start-dungeon-expedition": 30,
  "take-sect-errand": 2,
  "take-neutral-duty": 2,
  "sect-task-resource-tribute": 1,
  "sect-task-sect-liaison": 2,
  "sect-task-sect-expedition": 3,
  "sect-task-patrol-suppress": 3,
  "sect-task": 2,
  "hunt-mine-beast": 3,
  "challenge-guardian": 3,
  "survey-wilderness": 2,
  "pvp-duel": 1,
  "recover-qi": 1,
  "produce-item": 2,
  socialize: 1,
};

const LEGACY_PRODUCTION_RECIPES: readonly ProductionRecipe[] = [
  {
    id: "recipe-healing-pill",
    outputItemId: "healing-pill",
    outputCount: 1,
    inputMaterials: [
      { itemId: "beast-core", count: 1 },
      { itemId: "spirit-ore", count: 1 },
    ],
    spiritStoneCost: 30,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-qi-pill",
    outputItemId: "qi-pill",
    outputCount: 1,
    inputMaterials: [{ itemId: "spirit-ore", count: 2 }],
    spiritStoneCost: 25,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-ward-talisman",
    outputItemId: "ward-talisman",
    outputCount: 1,
    inputMaterials: [{ itemId: "ruin-fragment", count: 1 }],
    spiritStoneCost: 40,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-qi-stage-1-special",
    outputItemId: "qi-stage-1-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "qi-common", count: 1 }],
    spiritStoneCost: 80,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-qi-stage-2-special",
    outputItemId: "qi-stage-2-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "qi-common", count: 1 }],
    spiritStoneCost: 120,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-qi-major-special",
    outputItemId: "qi-major-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "qi-common", count: 1 }],
    spiritStoneCost: 180,
    durationTicks: 3,
    enabledInLive: true,
  },
  {
    id: "recipe-foundation-stage-1-special",
    outputItemId: "foundation-stage-1-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "foundation-common", count: 1 }],
    spiritStoneCost: 80,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-foundation-stage-2-special",
    outputItemId: "foundation-stage-2-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "foundation-common", count: 1 }],
    spiritStoneCost: 120,
    durationTicks: 2,
    enabledInLive: true,
  },
  {
    id: "recipe-foundation-major-special",
    outputItemId: "foundation-major-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "foundation-common", count: 1 }],
    spiritStoneCost: 260,
    durationTicks: 3,
    enabledInLive: true,
  },
  {
    id: "recipe-core-stage-1-special",
    outputItemId: "core-stage-1-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "core-common", count: 1 }],
    spiritStoneCost: 220,
    durationTicks: 3,
    enabledInLive: true,
  },
  {
    id: "recipe-core-stage-2-special",
    outputItemId: "core-stage-2-special",
    outputCount: 1,
    inputMaterials: [{ itemId: "core-common", count: 1 }],
    spiritStoneCost: 300,
    durationTicks: 3,
    enabledInLive: true,
  },
];

export const RESIDENCE_PRODUCTION_RECIPES: readonly ProductionRecipe[] = [
  ...LEGACY_PRODUCTION_RECIPES,
  ...LOADOUT_SOURCE_RECIPES,
];

export const QUEST_BOARD_REFRESH_INTERVAL = 12;
export const SECT_TITLE_UPDATE_INTERVAL = 2880;
export const MAX_ACTIVE_BASE_QUESTS = 2;
export const MAX_ACTIVE_SECT_QUESTS = 1;
export const PLAYER_SECT_FOUNDING_STONE_COST = 8000;
export const PLAYER_SECT_FOUNDING_REPUTATION_COST = 120;
export const PLAYER_SECT_APPLICATION_TTL = 600;
export const PLAYER_SECT_POLICY_UPDATE_COOLDOWN = 600;
export const PLAYER_SECT_PAGE_LIMIT = 50;
export const PLAYER_SECT_NAME_MIN_LENGTH = 2;
export const PLAYER_SECT_NAME_MAX_LENGTH = 16;
export const PLAYER_SECT_MOTIVE_BUCKETS: Record<
  SectMotiveBucketId,
  readonly RegistrationCultivationMotiveId[]
> = {
  "longevity-order": ["seek-longevity", "honor-the-clan"],
  "dao-truth": ["prove-the-great-dao", "seek-truth"],
  "guard-world": ["protect-the-beloved", "serve-the-world"],
  "strife-defiance": ["avenge-old-grudges", "compete-for-supremacy", "defy-fate"],
  "freedom-wander": ["seek-freedom"],
};
export const PLAYER_SECT_MOTIVE_BUCKET_LABELS: Record<SectMotiveBucketId, string> = {
  "longevity-order": "longevity / clan",
  "dao-truth": "dao / truth",
  "guard-world": "protect / serve",
  "strife-defiance": "vengeance / supremacy",
  "freedom-wander": "freedom / wander",
};

export const QUEST_BOARD_SLOTS_BY_NODE_TYPE: Partial<Record<NodeType, number>> = {
  "main-city": 5,
  "sub-town-east": 3,
  "sub-town-west": 3,
  "sub-town-south": 3,
  "sect-outpost": 0,
};

export const BASE_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "tpl-gathering",
    type: "gathering",
    category: "base",
    name: "Gathering Commission",
    nameCn: "采集委托",
    description: "Collect requested materials outside town.",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: { spiritStones: { min: 90, max: 130 }, reputation: 5, contribution: 0 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 90,
  },
  {
    id: "tpl-delivery",
    type: "delivery",
    category: "base",
    name: "Delivery Run",
    nameCn: "跑腿递送",
    description: "Deliver messages and goods between nearby nodes.",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: { spiritStones: { min: 80, max: 120 }, reputation: 3, contribution: 0 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 95,
  },
  {
    id: "tpl-market-work",
    type: "market-work",
    category: "base",
    name: "Market Work",
    nameCn: "坊市打工",
    description: "Stable market work with guaranteed payout.",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["sect-outpost"],
    reward: { spiritStones: { min: 100, max: 140 }, reputation: 2, contribution: 0 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 100,
  },
  {
    id: "tpl-bounty-low",
    type: "bounty-low",
    category: "base",
    name: "Low-Tier Bounty",
    nameCn: "除魔悬赏（低阶）",
    description: "Handle a low-tier hostile target.",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: { spiritStones: { min: 120, max: 180 }, reputation: 8, contribution: 0 },
    failurePenalty: { injuryTicks: 2, spiritStoneLoss: 20 },
    successRate: 80,
  },
  {
    id: "tpl-investigation",
    type: "investigation",
    category: "base",
    name: "Investigation",
    nameCn: "调查寻访",
    description: "Collect clues and confirm abnormalities.",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city", "sub-town-east", "sub-town-west", "sub-town-south"],
    reward: { spiritStones: { min: 90, max: 140 }, reputation: 6, contribution: 0 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 85,
  },
];

export const HIGH_RISK_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "tpl-state-elite",
    type: "state-elite",
    category: "high-risk",
    name: "State Elite Mission",
    nameCn: "州内精英任务",
    description: "Handle high-pressure abnormal threats.",
    durationTicks: 4,
    minReadiness: "ready",
    sourceNodeTypes: ["sect-outpost"],
    reward: { spiritStones: { min: 180, max: 260 }, reputation: 15, contribution: 0 },
    failurePenalty: { injuryTicks: 4, spiritStoneLoss: 40 },
    successRate: 65,
  },
  {
    id: "tpl-dungeon-challenge",
    type: "dungeon-challenge",
    category: "high-risk",
    name: "Dungeon Challenge",
    nameCn: "副本挑战",
    description: "A dangerous dungeon trial tied to local rumors.",
    durationTicks: 4,
    minReadiness: "ready",
    sourceNodeTypes: ["sect-outpost"],
    reward: { spiritStones: { min: 190, max: 280 }, reputation: 16, contribution: 0 },
    failurePenalty: { injuryTicks: 4, spiritStoneLoss: 50 },
    successRate: 60,
  },
  {
    id: "tpl-strong-event-quest",
    type: "strong-event-quest",
    category: "high-risk",
    name: "Strong Event Lead",
    nameCn: "强事件线索",
    description: "Follow a dangerous event chain and resolve it.",
    durationTicks: 4,
    minReadiness: "ready",
    sourceNodeTypes: ["sect-outpost"],
    reward: { spiritStones: { min: 170, max: 250 }, reputation: 14, contribution: 0 },
    failurePenalty: { injuryTicks: 3, spiritStoneLoss: 35 },
    successRate: 70,
  },
];

export const SECT_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "tpl-resource-tribute",
    type: "resource-tribute",
    category: "sect",
    name: "Resource Tribute",
    nameCn: "资源上缴",
    description: "Deliver requested resources to the sect.",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["main-city"],
    reward: { spiritStones: { min: 120, max: 180 }, reputation: 4, contribution: 60 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 95,
  },
  {
    id: "tpl-sect-delivery",
    type: "sect-delivery",
    category: "sect",
    name: "Sect Courier",
    nameCn: "宗门联络",
    description: "Carry sect messages and goods safely.",
    durationTicks: 2,
    minReadiness: "poor",
    sourceNodeTypes: ["main-city"],
    reward: { spiritStones: { min: 130, max: 190 }, reputation: 5, contribution: 70 },
    failurePenalty: { injuryTicks: 0, spiritStoneLoss: 0 },
    successRate: 92,
  },
  {
    id: "tpl-sect-exploration",
    type: "sect-exploration",
    category: "sect",
    name: "Sect Exploration",
    nameCn: "宗门游历",
    description: "Explore assigned routes and submit findings.",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city"],
    reward: { spiritStones: { min: 150, max: 220 }, reputation: 7, contribution: 85 },
    failurePenalty: { injuryTicks: 1, spiritStoneLoss: 20 },
    successRate: 82,
  },
  {
    id: "tpl-patrol-suppress",
    type: "patrol-suppress",
    category: "sect",
    name: "Patrol and Suppress",
    nameCn: "巡查镇压",
    description: "Suppress local disturbances around sect routes.",
    durationTicks: 3,
    minReadiness: "stable",
    sourceNodeTypes: ["main-city"],
    reward: { spiritStones: { min: 160, max: 230 }, reputation: 8, contribution: 100 },
    failurePenalty: { injuryTicks: 2, spiritStoneLoss: 30 },
    successRate: 78,
  },
];

export const ALL_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  ...BASE_QUEST_TEMPLATES,
  ...HIGH_RISK_QUEST_TEMPLATES,
  ...SECT_QUEST_TEMPLATES,
];

export const SECT_TITLE_SLOTS: readonly SectTitleSlot[] = [
  { title: "外门", threshold: 0, maxSlots: Number.POSITIVE_INFINITY },
  { title: "内门", threshold: 200, maxSlots: 32 },
  { title: "精英", threshold: 600, maxSlots: 16 },
  { title: "长老", threshold: 1500, maxSlots: 4 },
  { title: "宗主", threshold: Number.POSITIVE_INFINITY, maxSlots: 1 },
];
