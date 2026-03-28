import type {
  Cultivator,
  FactionWar,
  GuixuNode,
  GuixuProgress,
  ItemId,
  Location,
  NeutralSect,
  Sect,
  StateDefinition,
  StatusEffect,
  WildernessLayer,
  WorldState,
} from "./model.js";
import {
  BASE_NODE_TYPES,
  NEUTRAL_SECTS_BY_STATE,
  NODE_META,
  SETTLEMENT_DISPLAY_NAMES,
  STATE_IDS,
  STATE_META,
  type LocationId,
  type BaseNodeType,
  type NamedSettlementNodeType,
  type StateId,
} from "./constants.js";
import { createEventPools } from "./events.js";
import { ITEM_CATALOG, ITEM_IDS } from "./items/catalog.js";
import { seedQuestBoards } from "./quest.js";
import { buildFullTopology, toLocationId, toSectOutpostLocationId } from "./topology.js";

const sects: Record<string, Sect> = {};

function buildNeutralSects(): Record<string, NeutralSect> {
  const neutralSects: Record<string, NeutralSect> = {};

  for (const stateId of STATE_IDS) {
    const definition = NEUTRAL_SECTS_BY_STATE[stateId];
    if (!definition) {
      continue;
    }
    neutralSects[definition.id] = {
      id: definition.id,
      name: definition.name,
      alignment: "中立",
      stateId,
      headquarters: toSectOutpostLocationId(stateId, definition.id),
      description: definition.description,
      rewardMultiplier: definition.rewardMultiplier,
      joinable: true,
      competitive: false,
      memberIds: [],
    };
  }

  return neutralSects;
}

function buildLocationDescription(stateId: StateId, nodeType: BaseNodeType): string {
  const stateName = STATE_META[stateId].name;
  const risk = STATE_META[stateId].risk;

  switch (nodeType) {
    case "main-city":
      return `${stateName}主城灵脉汇聚，商旅与修士往来频繁，整体风险为${risk}。`;
    case "sub-town-east":
      return `${stateName}东镇临近官道，适合补给与接取日常委托，整体风险为${risk}。`;
    case "sub-town-west":
      return `${stateName}西镇坊市活跃，常有散修交易与消息流通，整体风险为${risk}。`;
    case "sub-town-south":
      return `${stateName}南镇靠近农灵田与驿路，适合修整与结伴出行，整体风险为${risk}。`;
    case "wilderness":
      return `${stateName}荒野灵气驳杂，资源与妖踪并存，探索时需留意${risk}级风险。`;
    case "dungeon-c":
      return `${stateName}丙级秘境适合初阶历练，可得机缘但仍有${risk}级隐患。`;
    case "dungeon-b":
      return `${stateName}乙级秘境阵势复杂，常伴守关异兽，风险随州势提升至${risk}。`;
    case "dungeon-a":
      return `${stateName}甲级秘境禁制森严，机缘与杀机并重，建议结队应对${risk}级威胁。`;
    default:
      return `${stateName}地界灵机流转，修行与历练并行，整体风险为${risk}。`;
  }
}

function buildOrganizationOutpostLocation(
  stateId: StateId,
  organizationId: string,
  organizationName: string,
  organizationType: "player-sect" | "neutral-sect",
): Location {
  const id = toSectOutpostLocationId(stateId, organizationId);

  return {
    id,
    stateId,
    nodeType: "sect-outpost",
    name: `${organizationName}据点`,
    kind: "safe",
    risk: STATE_META[stateId].risk,
    description: `Dedicated outpost for ${organizationName} in ${STATE_META[stateId].name}.`,
    organizationId,
    organizationType,
  };
}

function dungeonMetadataForNodeType(nodeType: BaseNodeType): Location["dungeon"] {
  switch (nodeType) {
    case "dungeon-c":
      return {
        grade: "丙",
        maxRank: 9,
        minRealm: "炼气" as Cultivator["realm"],
        dangerBase: 1,
        rewardBand: "low",
        materialBand: "qi-common",
      };
    case "dungeon-b":
      return {
        grade: "乙",
        maxRank: 9,
        minRealm: "筑基" as Cultivator["realm"],
        dangerBase: 2,
        rewardBand: "mid",
        materialBand: "foundation-common",
      };
    case "dungeon-a":
      return {
        grade: "甲",
        maxRank: 9,
        minRealm: "金丹" as Cultivator["realm"],
        dangerBase: 3,
        rewardBand: "high",
        materialBand: "core-common",
      };
    default:
      return null;
  }
}

function buildAllLocations(
  playerSects: Record<string, Sect>,
  neutralSects: Record<string, NeutralSect>,
): Record<string, Location> {
  const locations: Record<string, Location> = {};

  for (const stateId of STATE_IDS) {
    for (const nodeType of BASE_NODE_TYPES) {
      const id: LocationId = toLocationId(stateId, nodeType);
      const settlementName = SETTLEMENT_DISPLAY_NAMES[stateId][
        nodeType as NamedSettlementNodeType
      ];
      locations[id] = {
        id,
        stateId,
        nodeType,
        name: settlementName ?? `${STATE_META[stateId].name}${NODE_META[nodeType].suffix}`,
        kind: NODE_META[nodeType].kind,
        risk: STATE_META[stateId].risk,
        description: buildLocationDescription(stateId, nodeType),
        dungeon: dungeonMetadataForNodeType(nodeType),
      };
    }
  }

  for (const sect of Object.values(playerSects)) {
    const outpost = buildOrganizationOutpostLocation(
      sect.stateId,
      sect.id,
      sect.name,
      "player-sect",
    );
    locations[outpost.id] = outpost;
  }

  for (const neutralSect of Object.values(neutralSects)) {
    const outpost = buildOrganizationOutpostLocation(
      neutralSect.stateId,
      neutralSect.id,
      neutralSect.name,
      "neutral-sect",
    );
    locations[outpost.id] = outpost;
  }

  return locations;
}

function buildAllStates(locations: Record<string, Location>): Record<string, StateDefinition> {
  const states: Record<string, StateDefinition> = {};

  for (const stateId of STATE_IDS) {
    states[stateId] = {
      id: stateId,
      name: STATE_META[stateId].name,
      risk: STATE_META[stateId].risk,
      locationIds: Object.values(locations)
        .filter((location) => location.stateId === stateId)
        .map((location) => location.id),
    };
  }

  return states;
}

export function createEmptyInventory(): Record<ItemId, number> {
  return Object.fromEntries(ITEM_IDS.map((itemId) => [itemId, 0])) as Record<ItemId, number>;
}

export function createFactionReputation(
  overrides: Partial<Record<string, number>> = {},
): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [factionId, value] of Object.entries(overrides)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      normalized[factionId] = value;
    }
  }
  return normalized;
}

export function createStateReputation(
  overrides: Partial<Cultivator["stateReputation"]> = {},
): Cultivator["stateReputation"] {
  return Object.fromEntries(
    STATE_IDS.map((stateId) => {
      const value = overrides[stateId];
      return [stateId, typeof value === "number" && Number.isFinite(value) ? value : 0];
    }),
  ) as Cultivator["stateReputation"];
}

export function createDungeonProgress(
  overrides: Partial<Record<keyof Cultivator["dungeonProgress"], number>> = {},
): Cultivator["dungeonProgress"] {
  return {
    丙: { highestClearedRank: Math.max(0, Math.min(9, Math.floor(overrides["丙"] ?? 0))) },
    乙: { highestClearedRank: Math.max(0, Math.min(9, Math.floor(overrides["乙"] ?? 0))) },
    甲: { highestClearedRank: Math.max(0, Math.min(9, Math.floor(overrides["甲"] ?? 0))) },
  };
}

function createStatusEffects(...effects: StatusEffect[]): StatusEffect[] {
  return effects;
}

const cultivators: Record<string, Cultivator> = {
  "yun-zhong-he": {
    id: "yun-zhong-he",
    name: "云中鹤",
    genderPresentation: "male",
    pronouns: "他/他的",
    origin: "云州散修",
    temperament: "谨慎",
    createdByAgentId: null,
    realm: "炼气" as Cultivator["realm"],
    realmLevel: 3,
    realmProgress: 42,
    locationId: "qingzhou:main-city",
    residence: {
      id: "residence-yun-zhong-he",
      locationId: "qingzhou:main-city",
      level: 1,
      name: "云隐小筑",
    },
    spiritStones: 900,
    qi: 92,
    maxQi: 100,
    spiritualPower: 68,
    maxSpiritualPower: 100,
    stateReputation: createStateReputation({ qingzhou: 34 }),
    factionReputation: createFactionReputation(),
    lifespan: 180,
    age: 23,
    sectId: null,
    neutralSectId: null,
    sectTitle: null,
    moralityScore: 0,
    pendingSectApplicationId: null,
    pendingMoralityChoiceId: null,
    totalContribution: 0,
    neutralContribution: 0,
    contributionReachedAt: 0,
    activeQuests: [],
    completedBaseQuests: 0,
    techniques: ["紫霄吐纳诀", "清风步"],
    inventory: {
      ...createEmptyInventory(),
      "healing-pill": 1,
      "qi-pill": 1,
      "spirit-ore": 1,
    },
    statusEffects: createStatusEffects(),
    breakthroughRecords: [],
    dungeonProgress: createDungeonProgress(),
    activeJobId: null,
    injuryTicksRemaining: 0,
    registrationRecord: null,
  },
};

const WILDERNESS_LAYERS: Record<string, WildernessLayer> = {
  "eight-wastes-threshold": {
    layerId: "eight-wastes-threshold",
    name: "Eight Wastes Threshold",
    type: "wilderness-expansion",
    tier: 1,
    status: "active",
    locationIds: ["qingzhou:dungeon-a"],
    entryRequirement: {
      minRealm: "绛戝熀" as WildernessLayer["entryRequirement"]["minRealm"],
      minContribution: 180,
      entryTicket: "eight-wastes-pass",
    },
    survivalPressure: {
      maxSurvivalTicks: 3,
      qiDamagePerTick: 8,
      spiritualDamagePerTick: 6,
      injuryTicksOnRetreat: 3,
    },
    retreatCost: {
      spiritStoneLoss: 50,
      progressLoss: 1,
      itemLoss: {},
    },
    rewardTable: [
      { itemId: "ancient-artifact", dropRate: 40 },
      { itemId: "beast-core", dropRate: 100 },
    ],
    eventPool: ["wilderness-ancient-guardian"],
  },
};

const GUIXU_NODES: Record<string, GuixuNode> = {
  "guixu-threshold-gate": {
    nodeId: "guixu-threshold-gate",
    name: "Guixu Threshold Gate",
    tier: "entry",
    unlockRequirement: {
      wildernessProgress: 2,
      minRealm: "绛戝熀" as GuixuNode["unlockRequirement"]["minRealm"],
      uniqueKey: "threshold-gate",
    },
    nodeType: "exploration",
    sharedProgress: false,
    anchorLocationId: "qingzhou:dungeon-a",
    explorationDurationTicks: 2,
    eventPool: ["guixu-threshold-vision"],
  },
  "guixu-ancient-seal": {
    nodeId: "guixu-ancient-seal",
    name: "Guixu Ancient Seal",
    tier: "core",
    unlockRequirement: {
      wildernessProgress: 2,
      minRealm: "閲戜腹" as GuixuNode["unlockRequirement"]["minRealm"],
      uniqueKey: "ancient-seal",
    },
    nodeType: "guardian",
    sharedProgress: true,
    anchorLocationId: "qingzhou:dungeon-a",
    explorationDurationTicks: 2,
    eventPool: ["guixu-ancient-seal"],
  },
};

const FACTION_WARS: Record<string, FactionWar> = {
  "war-qingzhou-frontier": {
    warId: "war-qingzhou-frontier",
    stateId: "qingzhou",
    factions: ["righteous", "demonic"],
    startTick: 0,
    endTick: 240,
    objectives: [
      {
        objectiveId: "war-qingzhou-supply-line",
        type: "capture-node",
        progress: {
          righteous: 0,
          demonic: 0,
        },
        target: 180,
        completed: false,
      },
      {
        objectiveId: "war-qingzhou-seal-raid",
        type: "defeat-boss",
        progress: {
          righteous: 0,
          demonic: 0,
        },
        target: 120,
        completed: false,
      },
    ],
    rewards: {
      winnerReward: {
        spiritStones: 600,
        contribution: 120,
      },
      participationReward: {
        spiritStones: 180,
        reputation: 12,
      },
    },
  },
};

function createGuixuProgress(): GuixuProgress {
  return {
    wildernessAttunement: {},
    personalUnlockedNodeIds: {},
    sharedUnlockedNodeIds: [],
    lastResolvedEventIds: {},
  };
}

export function createSeedWorld(): WorldState {
  const seededSects = structuredClone(sects);
  const neutralSects = buildNeutralSects();
  const locations = buildAllLocations(seededSects, neutralSects);
  const world: WorldState = {
    version: 10,
    tick: 0,
    updatedAt: new Date().toISOString(),
    cultivators: structuredClone(cultivators),
    agentBindings: {},
    sects: seededSects,
    neutralSects,
    locations,
    states: buildAllStates(locations),
    topology: buildFullTopology(locations),
    eventPools: createEventPools(locations),
    questBoards: {},
    pendingSectApplications: {},
    pendingMoralityChoices: {},
    sectReapplyCooldowns: {},
    wildernessLayers: structuredClone(WILDERNESS_LAYERS),
    wildernessProgress: {},
    dungeonExpeditions: {},
    dungeonExpeditionReports: {},
    guixuNodes: structuredClone(GUIXU_NODES),
    guixuProgress: createGuixuProgress(),
    factionWars: structuredClone(FACTION_WARS),
    itemDefinitions: structuredClone(ITEM_CATALOG),
    jobs: {},
    daoLogs: [
      {
        id: "log-1",
        cultivatorId: "yun-zhong-he",
        tick: 0,
        title: "初入尘世",
        content: "下山三日，灵石未丰，道心未稳，必须先把资源循环跑起来。",
        tags: ["seed", "intro"],
      },
    ],
    messages: [
      {
        id: "msg-1",
        cultivatorId: "yun-zhong-he",
        tick: 0,
        from: "青州驿报",
        subject: "据点近况",
        content: "青州主城与苍木谷据点近日补录协力修士，想走稳修路线者可前往问讯。",
      },
    ],
    worldEvents: [],
    combatLogs: [],
    nextCultivatorSequence: 2,
    nextJobSequence: 1,
    nextLogSequence: 2,
    nextMessageSequence: 2,
    nextEventSequence: 1,
    nextCombatSequence: 1,
    nextSectApplicationSequence: 1,
    nextMoralityChoiceSequence: 1,
    nextSectCooldownSequence: 1,
  };
  seedQuestBoards(world);
  return world;
}
