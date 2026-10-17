import type {
  Cultivator,
  FactionWar,
  GuixuNode,
  GuixuProgress,
  ItemId,
  Location,
  NeutralSect,
  ProjectedPersistedWorldState,
  PersistedStateDefinition,
  PersistedWorldState,
  Sect,
  StateDefinition,
  StatusEffect,
  WildernessLayer,
  WorldState,
} from "./model.js";
import {
  BASE_QUEST_TEMPLATES,
  HIGH_RISK_QUEST_TEMPLATES,
  NODE_META,
  SECT_QUEST_TEMPLATES,
  STATE_IDS,
  type LocationId,
  type BaseNodeType,
  type StateId,
} from "./constants.js";
import { createEventPools } from "./events.js";
import {
  getGeographyStateIds,
  getNeutralSectsByState,
  getStateMetaMap,
  resolveGeographyRegistry,
  type GeographyRegistryDefinition,
  type GeographyRegistryOverrides,
  validateGeographyRegistry,
} from "./geography-registry.js";
import { createEmptyFiveElementGrowth, createEmptyMainAttributeGrowth } from "./attributes.js";
import { ITEM_CATALOG, ITEM_IDS } from "./items/catalog.js";
import { seedQuestBoards } from "./quest.js";
import { buildFullTopology, toLocationId, toSectOutpostLocationId } from "./topology.js";

const sects: Record<string, Sect> = {};
const QUEST_TEMPLATE_TYPE_BY_ID = new Map(
  [...BASE_QUEST_TEMPLATES, ...HIGH_RISK_QUEST_TEMPLATES, ...SECT_QUEST_TEMPLATES].map((template) => [template.id, template.type]),
);

function backfillQuestType(templateId?: string, fallbackId?: string): string {
  if (templateId && QUEST_TEMPLATE_TYPE_BY_ID.has(templateId)) {
    return QUEST_TEMPLATE_TYPE_BY_ID.get(templateId)!;
  }
  if (fallbackId) {
    const guessedTemplateId = fallbackId.split(":").at(-1);
    if (guessedTemplateId && QUEST_TEMPLATE_TYPE_BY_ID.has(guessedTemplateId)) {
      return QUEST_TEMPLATE_TYPE_BY_ID.get(guessedTemplateId)!;
    }
  }
  return "quest";
}

function buildNeutralSects(geographyRegistry: GeographyRegistryDefinition): Record<string, NeutralSect> {
  const neutralSects: Record<string, NeutralSect> = {};
  const neutralSectsByState = getNeutralSectsByState(geographyRegistry);

  for (const stateId of getGeographyStateIds(geographyRegistry)) {
    const definition = neutralSectsByState[stateId];
    if (!definition) {
      continue;
    }
    neutralSects[definition.id] = {
      id: definition.id,
      name: definition.name,
      alignment: "中立",
      stateId: stateId as NeutralSect["stateId"],
      headquarters: toSectOutpostLocationId(stateId as StateId, definition.id),
      description: definition.description,
      rewardMultiplier: definition.rewardMultiplier,
      joinable: true,
      competitive: false,
      memberIds: [],
    };
  }

  return neutralSects;
}

function buildLocationDescription(
  stateName: string,
  risk: string,
  nodeType: BaseNodeType,
): string {

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
  stateId: string,
  organizationId: string,
  organizationName: string,
  organizationType: "player-sect" | "neutral-sect",
  geographyRegistry: GeographyRegistryDefinition,
): Location {
  const stateMeta = getStateMetaMap(geographyRegistry);
  const id = toSectOutpostLocationId(stateId as StateId, organizationId);

  return {
    id,
    stateId: stateId as Location["stateId"],
    nodeType: "sect-outpost",
    name: `${organizationName}据点`,
    kind: "safe",
    risk: stateMeta[stateId]!.risk,
    description: `Dedicated outpost for ${organizationName} in ${stateMeta[stateId]!.name}.`,
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
        materialBand: "cloud-heart-grass",
      };
    case "dungeon-b":
      return {
        grade: "乙",
        maxRank: 9,
        minRealm: "筑基" as Cultivator["realm"],
        dangerBase: 2,
        rewardBand: "mid",
        materialBand: "mystic-jade-stone",
      };
    case "dungeon-a":
      return {
        grade: "甲",
        maxRank: 9,
        minRealm: "金丹" as Cultivator["realm"],
        dangerBase: 3,
        rewardBand: "high",
        materialBand: "golden-spirit-flower",
      };
    default:
      return null;
  }
}

function buildAllLocations(
  playerSects: Record<string, Sect>,
  neutralSects: Record<string, NeutralSect>,
  geographyRegistry: GeographyRegistryDefinition,
): Record<string, Location> {
  const locations: Record<string, Location> = {};
  const stateMeta = getStateMetaMap(geographyRegistry);

  for (const [stateId, definition] of Object.entries(geographyRegistry)) {
    for (const locationDefinition of definition.locations) {
      const nodeType = locationDefinition.nodeType;
      const id: LocationId = toLocationId(stateId as StateId, nodeType);
      locations[id] = {
        id,
        stateId: stateId as Location["stateId"],
        nodeType,
        name: locationDefinition.name ?? `${stateMeta[stateId]!.name}${NODE_META[nodeType].suffix}`,
        kind: NODE_META[nodeType].kind,
        risk: stateMeta[stateId]!.risk,
        description: buildLocationDescription(stateMeta[stateId]!.name, stateMeta[stateId]!.risk, nodeType),
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
      geographyRegistry,
    );
    locations[outpost.id] = outpost;
  }

  for (const neutralSect of Object.values(neutralSects)) {
    const outpost = buildOrganizationOutpostLocation(
      neutralSect.stateId,
      neutralSect.id,
      neutralSect.name,
      "neutral-sect",
      geographyRegistry,
    );
    locations[outpost.id] = outpost;
  }

  return locations;
}

function buildAllStates(
  locations: Record<string, Location>,
  geographyRegistry: GeographyRegistryDefinition,
): Record<string, StateDefinition> {
  const states: Record<string, StateDefinition> = {};
  const stateMeta = getStateMetaMap(geographyRegistry);

  for (const stateId of getGeographyStateIds(geographyRegistry)) {
    states[stateId] = {
      id: stateId,
      name: stateMeta[stateId]!.name,
      risk: stateMeta[stateId]!.risk,
      locationIds: Object.values(locations)
        .filter((location) => location.stateId === stateId)
        .map((location) => location.id),
    };
  }

  return states;
}

function buildPersistedStates(
  geographyRegistry: GeographyRegistryDefinition,
): Record<string, PersistedStateDefinition> {
  const stateMeta = getStateMetaMap(geographyRegistry);

  return Object.fromEntries(
    getGeographyStateIds(geographyRegistry).map((stateId) => [
      stateId,
      {
        id: stateId,
        name: stateMeta[stateId]!.name,
        risk: stateMeta[stateId]!.risk,
      },
    ]),
  );
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

function withDefaultGrowthFields(
  cultivator: Omit<Cultivator, "mainAttributeGrowth" | "fiveElementGrowth" | "mainAttributePercentageBonus">,
): Cultivator {
  return {
    ...cultivator,
    mainAttributeGrowth: createEmptyMainAttributeGrowth(),
    fiveElementGrowth: createEmptyFiveElementGrowth(),
    mainAttributePercentageBonus: 0,
  };
}

const cultivators: Record<string, Cultivator> = {
  "yun-zhong-he": withDefaultGrowthFields({
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
      stateId: "qingzhou",
      description: "青岚城外的简朴洞府，竹林掩映间时闻鸟鸣。",
    },
    residences: [{
      id: "residence-yun-zhong-he",
      locationId: "qingzhou:main-city",
      level: 1,
      name: "云隐小筑",
      stateId: "qingzhou",
      description: "青岚城外的简朴洞府，竹林掩映间时闻鸟鸣。",
    }],
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
    pendingSceneChoiceId: null,
    pendingPvpChallengeId: null,
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
    // Combat Loadout System
    equippedWeaponLoadoutId: "starter-sword" as any as import("./model.js").WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-metal-edge" as any as import("./model.js").SpellLoadoutId,
    unlockedWeaponLoadoutIds: ["starter-sword" as any as import("./model.js").WeaponLoadoutId],
    unlockedSpellLoadoutIds: ["starter-metal-edge" as any as import("./model.js").SpellLoadoutId],
    productionQueue: [],
    pendingGifts: [],
    lastGiftTick: -1,
    guixuCompletedNodeIds: [],
  }),
};

export const BAHUANG_EXPEDITIONS = {
  "eight-wastes-threshold": {
    entryLocationIds: ["qingzhou:dungeon-a"] as const,
    entryRequirement: {
      minRealm: "绛戝熀" as Cultivator["realm"],
      minRealmLevel: 5,
      minWildernessAttunement: 60,
      minContribution: 180,
      entryTicket: "eight-wastes-pass" as const,
      entryWindowCycle: 720,
      entryWindowDuration: 120,
    },
    expedition: {
      maxDepth: 8,
      maxPressure: 18,
      pressurePerTick: 2,
      pressureMitigationPerTalisman: 2,
      rationCostPerTick: 1,
      injuryTicksOnRetreat: 3,
    },
    retreatCost: {
      spiritStoneLoss: 50,
      progressLoss: 1,
    },
    rewardTable: {
      spiritStones: { min: 30, max: 90 },
      realmProgress: { min: 2, max: 8 },
      rareItemDropRate: 35,
      guaranteedItems: ["beast-core"] as const,
      rareItems: ["ancient-artifact"] as const,
      deepRunItems: ["bahuang-spirit-essence"] as const,
      deepRunMinDepth: 5,
      deepRunDropRate: 20,
      legendaryItems: ["legendary-artifact"] as const,
      legendaryMinDepth: 7,
      legendaryDropRate: 15,
      completionBonus: {
        spiritStones: 200,
        realmProgress: 10,
        guaranteedItems: ["ancient-artifact"] as const,
      },
    },
  },
} as const;

export const EIGHT_WASTES_CONTENT = BAHUANG_EXPEDITIONS["eight-wastes-threshold"];

const WILDERNESS_LAYERS: Record<string, WildernessLayer> = {
  "starter-wilderness-tier-1": {
    layerId: "starter-wilderness-tier-1",
    name: "荒原·灵材散落带",
    type: "wilderness-expansion",
    tier: 1,
    status: "active",
    locationIds: [
      "qingzhou:wilderness",
      "yangzhou:wilderness",
      "zhongzhou:wilderness",
      "shuzhou:wilderness",
      "youzhou:wilderness",
      "liangzhou:wilderness",
      "leizhou:wilderness",
      "cangzhou:wilderness",
      "wanzhou:wilderness",
    ],
    entryRequirement: {
      minRealm: "炼气" as any,
    },
    survivalPressure: {
      maxSurvivalTicks: 8,
      qiDamagePerTick: 8,
      spiritualDamagePerTick: 4,
      injuryTicksOnRetreat: 2,
    },
    retreatCost: {
      spiritStoneLoss: 0,
      progressLoss: 0,
      itemLoss: {},
    },
    rewardTable: [],
    eventPool: ["wilderness-calm-foraging", "wilderness-beast-trace", "wilderness-spirit-vein-fragment"],
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
  "guixu-spirit-nexus": {
    nodeId: "guixu-spirit-nexus",
    name: "Guixu Spirit Nexus",
    tier: "core",
    unlockRequirement: {
      wildernessProgress: 4,
      minRealm: "閲戜腹" as GuixuNode["unlockRequirement"]["minRealm"],
      uniqueKey: "spirit-nexus",
    },
    nodeType: "exploration",
    sharedProgress: false,
    anchorLocationId: "qingzhou:dungeon-a",
    explorationDurationTicks: 3,
    eventPool: ["guixu-spirit-nexus-echo"],
  },
  "guixu-void-corridor": {
    nodeId: "guixu-void-corridor",
    name: "Guixu Void Corridor",
    tier: "deep",
    unlockRequirement: {
      wildernessProgress: 6,
      minRealm: "閲戜腹" as GuixuNode["unlockRequirement"]["minRealm"],
      uniqueKey: "void-corridor",
    },
    nodeType: "guardian",
    sharedProgress: true,
    anchorLocationId: "qingzhou:dungeon-a",
    explorationDurationTicks: 3,
    eventPool: ["guixu-void-corridor-trial"],
  },
  "guixu-origin-heart": {
    nodeId: "guixu-origin-heart",
    name: "Guixu Origin Heart",
    tier: "deep",
    unlockRequirement: {
      wildernessProgress: 8,
      minRealm: "閲戜腹" as GuixuNode["unlockRequirement"]["minRealm"],
      uniqueKey: "origin-heart",
    },
    nodeType: "guardian",
    sharedProgress: true,
    anchorLocationId: "qingzhou:dungeon-a",
    explorationDurationTicks: 4,
    eventPool: ["guixu-origin-heart-awakening"],
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

interface CreateSeedWorldOptions {
  geographyRegistry?: GeographyRegistryOverrides;
}

export function createSeedWorld(options: CreateSeedWorldOptions = {}): WorldState {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  validateGeographyRegistry(geographyRegistry);
  const seededSects = structuredClone(sects);
  const neutralSects = buildNeutralSects(geographyRegistry);
  const locations = buildAllLocations(seededSects, neutralSects, geographyRegistry);
  const world: WorldState = {
    version: 10,
    tick: 0,
    updatedAt: new Date().toISOString(),
    cultivators: structuredClone(cultivators),
    agentBindings: {},
    sects: seededSects,
    neutralSects,
    locations,
    states: buildAllStates(locations, geographyRegistry),
    topology: buildFullTopology(locations, { geographyRegistry }),
    eventPools: createEventPools(locations, { geographyRegistry }),
    questBoards: {},
    pendingSectApplications: {},
    pendingMoralityChoices: {},
    pendingSceneChoices: {},
    pendingPvpChallenges: {},
    sectReapplyCooldowns: {},
    wildernessLayers: structuredClone(WILDERNESS_LAYERS),
    wildernessProgress: {},
    dungeonExpeditions: {},
    dungeonExpeditionReports: {},
    regionalRuns: {},
    bahuangProgress: {},
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
    nextSceneChoiceSequence: 1,
    nextPvpChallengeSequence: 1,
    nextSectCooldownSequence: 1,
    nextDaoCompanionProposalSequence: 1,
    nextPartyInvitationSequence: 1,
    nextPartySequence: 1,
    nextCommissionSequence: 1,
    socialLinks: {},
    daoCompanionProposals: {},
    partyInvitations: {},
    parties: {},
    commissions: {},
  };
  seedQuestBoards(world);
  return world;
}

export function toPersistedWorldState(world: WorldState): ProjectedPersistedWorldState {
  const persisted = structuredClone(world) as PersistedWorldState & {
    topology?: unknown;
    eventPools?: unknown;
  };

  delete persisted.topology;
  delete persisted.eventPools;
  persisted.states = Object.fromEntries(
    Object.entries(world.states).map(([stateId, state]) => [
      stateId,
      {
        id: state.id,
        name: state.name,
        risk: state.risk,
      },
    ]),
  );

  return persisted as ProjectedPersistedWorldState;
}

export function hydrateWorldState(
  world: PersistedWorldState | WorldState,
  options: CreateSeedWorldOptions = {},
): WorldState {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  validateGeographyRegistry(geographyRegistry);

  const hydrated = structuredClone(world) as WorldState;
  hydrated.states = buildAllStates(hydrated.locations, geographyRegistry);
  hydrated.topology = buildFullTopology(hydrated.locations, { geographyRegistry });
  hydrated.eventPools = createEventPools(hydrated.locations, { geographyRegistry });
  hydrated.regionalRuns ??= {};
  hydrated.pendingSceneChoices ??= {};
  if (typeof hydrated.nextSceneChoiceSequence !== "number") {
    hydrated.nextSceneChoiceSequence = 1;
  }

  // Migrate old cultivators: backfill missing combat loadout fields
  for (const cultivator of Object.values(hydrated.cultivators)) {
    if (!cultivator.equippedWeaponLoadoutId) {
      cultivator.equippedWeaponLoadoutId = "starter-sword" as any;
    }
    if (!cultivator.equippedSpellLoadoutId) {
      cultivator.equippedSpellLoadoutId = "starter-metal-edge" as any;
    }
    if (!cultivator.unlockedWeaponLoadoutIds || cultivator.unlockedWeaponLoadoutIds.length === 0) {
      cultivator.unlockedWeaponLoadoutIds = [cultivator.equippedWeaponLoadoutId!];
    }
    if (!cultivator.unlockedSpellLoadoutIds || cultivator.unlockedSpellLoadoutIds.length === 0) {
      cultivator.unlockedSpellLoadoutIds = [cultivator.equippedSpellLoadoutId!];
    }
    // Backfill residences array and residence fields for pre-multi-residence worlds
    if (!cultivator.residences || cultivator.residences.length === 0) {
      const r = cultivator.residence;
      const stateId = r?.locationId?.split(":")[0] ?? "qingzhou";
      const backfilledResidence = {
        id: r?.id ?? `residence-${cultivator.id}-${stateId}`,
        locationId: r?.locationId ?? `${stateId}:main-city`,
        level: 1 as const,
        name: r?.name ?? "\u6d1e\u5e9c",
        stateId: (r as any)?.stateId ?? stateId,
        description: (r as any)?.description ?? "",
      };
      cultivator.residence = backfilledResidence;
      cultivator.residences = [backfilledResidence];
    }
    // Backfill stateId/description on existing residence if missing
    if (cultivator.residence && !(cultivator.residence as any).stateId) {
      const stateId = cultivator.residence.locationId?.split(":")[0] ?? "qingzhou";
      (cultivator.residence as any).stateId = stateId;
      (cultivator.residence as any).description = (cultivator.residence as any).description ?? "";
    }
    const fillResidenceSink = (residence: { grandeur?: number; fixtures?: unknown } | null | undefined) => {
      if (!residence) return;
      if (typeof residence.grandeur !== "number") residence.grandeur = 1;
      if (!residence.fixtures) residence.fixtures = [];
    };
    fillResidenceSink(cultivator.residence);
    for (const residence of cultivator.residences ?? []) fillResidenceSink(residence);

    for (const itemId of [
      "core-nourish-dew",
      "nascent-nourish-sand",
      "spirit-nourish-dust",
      "void-nourish-mist",
      "unity-nourish-dew",
      "mahayana-nourish-ash",
      "void-grain-sand",
      "empty-silk",
      "rift-boundary-stone",
      "void-altar-seal",
      "void-imprint-dew",
      "shattered-array-banner",
      "twin-soul-ash",
      "joined-dao-jade",
      "heaven-man-thread",
      "unity-rite-slip",
      "twin-lamp-oil",
      "heaven-man-token",
      "kalpa-pillar-shard",
      "great-vehicle-ash",
      "wind-feather",
      "heaven-pillar-core",
      "kalpa-platform-dust",
      "wind-crossing-sail",
    ] as const) {
      if (cultivator.inventory[itemId] === undefined) cultivator.inventory[itemId] = 0;
    }
    cultivator.activeQuests = (cultivator.activeQuests ?? []).map((quest, index) => ({
      ...quest,
      type: quest.type ?? backfillQuestType(quest.templateId, quest.instanceId ?? quest.id),
      boardIndex: Number.isInteger(quest.boardIndex) ? quest.boardIndex : index,
    }));
  }

  for (const board of Object.values(hydrated.questBoards ?? {})) {
    board.quests = (board.quests ?? []).map((quest, index) => ({
      ...quest,
      type: quest.type ?? backfillQuestType(quest.templateId, quest.id),
      boardIndex: Number.isInteger(quest.boardIndex) ? quest.boardIndex : index,
    }));
  }

  return hydrated;
}

export function createSeedPersistedWorld(options: CreateSeedWorldOptions = {}): ProjectedPersistedWorldState {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  validateGeographyRegistry(geographyRegistry);

  const persisted = toPersistedWorldState(createSeedWorld(options));
  persisted.states = buildPersistedStates(geographyRegistry);
  return persisted;
}
