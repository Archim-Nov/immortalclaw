import type {
  Cultivator,
  FactionId,
  ItemDefinition,
  ItemId,
  Location,
  Sect,
  StateDefinition,
  StatusEffect,
  WorldState,
  Zone,
} from "./model.js";
import {
  NODE_META,
  NODE_TYPES,
  SECT_TITLE_SLOTS,
  SECT_TITLE_UPDATE_INTERVAL,
  STATE_IDS,
  STATE_META,
  type LocationId,
  type NodeType,
  type StateId,
} from "./constants.js";
import { createEventPools } from "./events.js";
import { seedQuestBoards } from "./quest.js";
import { buildFullTopology, toLocationId } from "./topology.js";

const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  "healing-pill": {
    id: "healing-pill",
    name: "疗伤丹",
    category: "consumable",
    description: "快速恢复气血，适合战后和采矿受伤时使用。",
    baseValue: 100,
  },
  "qi-pill": {
    id: "qi-pill",
    name: "回气丹",
    category: "consumable",
    description: "补回灵力，适合闭关和战斗前后周转。",
    baseValue: 60,
  },
  "ward-talisman": {
    id: "ward-talisman",
    name: "镇煞符",
    category: "talisman",
    description: "短时间降低战斗与天劫风险。",
    baseValue: 180,
  },
  "spirit-ore": {
    id: "spirit-ore",
    name: "灵矿原石",
    category: "material",
    description: "矿洞常见材料，可在坊市出售。",
    baseValue: 115,
  },
  "ruin-fragment": {
    id: "ruin-fragment",
    name: "残碑碎片",
    category: "material",
    description: "遗迹里掉落的碎片，可出售，也可能蕴含感悟。",
    baseValue: 145,
  },
  "beast-core": {
    id: "beast-core",
    name: "妖核",
    category: "material",
    description: "战胜妖兽后掉落的核心材料。",
    baseValue: 210,
  },
  "sword-manual": {
    id: "sword-manual",
    name: "剑诀手本",
    category: "manual",
    description: "记载基础剑诀，研读后可提升修炼与战斗表现。",
    baseValue: 260,
  },
  "alchemy-manual": {
    id: "alchemy-manual",
    name: "丹道手本",
    category: "manual",
    description: "记载火候和灵草辨识，研读后偏向恢复与悟道。",
    baseValue: 250,
  },
  "array-manual": {
    id: "array-manual",
    name: "阵纹手本",
    category: "manual",
    description: "记载基础阵纹和护体法门，研读后偏向防护。",
    baseValue: 255,
  },
};

const zones: Record<string, Zone> = {
  "mortal-town": {
    id: "mortal-town",
    name: "凡人城镇",
    kind: "safe",
    description: "适合接凡间委托、补给和积累初期声望。",
  },
  "qingzhou:main-city": {
    id: "mortal-town",
    name: "青州主城",
    kind: "safe",
    description: "青州主城灵脉汇聚，兼具补给、委托与初期修行功能。",
  },
  market: {
    id: "market",
    name: "修士坊市",
    kind: "safe",
    description: "可以买药、卖材料，也会刷新黑市相关消息。",
  },
  "sect-gate": {
    id: "sect-gate",
    name: "青云宗山门",
    kind: "safe",
    description: "加入宗门、接宗门差事、参加山门切磋的区域。",
  },
  "spirit-mine": {
    id: "spirit-mine",
    name: "灵石矿洞",
    kind: "resource",
    description: "稳定产出灵石和矿材，但也会遇到矿脉妖兽。",
  },
  "mystic-ruins": {
    id: "mystic-ruins",
    name: "秘境遗迹",
    kind: "adventure",
    description: "机缘、残碑和危险并存，适合博收益。",
  },
  "healing-sanctuary": {
    id: "healing-sanctuary",
    name: "疗伤圣地",
    kind: "safe",
    description: "恢复伤势、准备天劫和整理状态的稳妥区域。",
  },
};

const sects: Record<string, Sect> = {
  "qing-yun-sect": {
    id: "qing-yun-sect",
    name: "青云宗",
    type: "剑修" as Sect["type"],
    treasury: 86000,
    memberIds: [],
    spiritVeins: ["青岚支脉"],
    headquarters: "qingzhou:main-city",
    titleSlots: SECT_TITLE_SLOTS.map((slot) => ({ ...slot })),
    titleUpdateInterval: SECT_TITLE_UPDATE_INTERVAL,
    lastTitleUpdateTick: 0,
  },
  "dan-xia-sect": {
    id: "dan-xia-sect",
    name: "丹霞宗",
    type: "丹修" as Sect["type"],
    treasury: 72000,
    memberIds: [],
    spiritVeins: ["丹霞灵脉"],
    headquarters: "yangzhou:main-city",
    titleSlots: SECT_TITLE_SLOTS.map((slot) => ({ ...slot })),
    titleUpdateInterval: SECT_TITLE_UPDATE_INTERVAL,
    lastTitleUpdateTick: 0,
  },
  "tian-ji-sect": {
    id: "tian-ji-sect",
    name: "天机阁",
    type: "阵修" as Sect["type"],
    treasury: 64000,
    memberIds: [],
    spiritVeins: ["天机灵脉"],
    headquarters: "zhongzhou:main-city",
    titleSlots: SECT_TITLE_SLOTS.map((slot) => ({ ...slot })),
    titleUpdateInterval: SECT_TITLE_UPDATE_INTERVAL,
    lastTitleUpdateTick: 0,
  },
};

type ExtendedFactionReputation = Record<FactionId, number> &
  Record<"dan-xia-sect" | "tian-ji-sect", number>;

function buildLocationDescription(stateId: StateId, nodeType: NodeType): string {
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

function buildAllLocations(): Record<string, Location> {
  const locations: Record<string, Location> = {};

  for (const stateId of STATE_IDS) {
    for (const nodeType of NODE_TYPES) {
      const id: LocationId = toLocationId(stateId, nodeType);
      locations[id] = {
        id,
        stateId,
        nodeType,
        name: `${STATE_META[stateId].name}${NODE_META[nodeType].suffix}`,
        kind: NODE_META[nodeType].kind,
        risk: STATE_META[stateId].risk,
        description: buildLocationDescription(stateId, nodeType),
      };
    }
  }

  return locations;
}

function buildAllStates(): Record<string, StateDefinition> {
  const states: Record<string, StateDefinition> = {};

  for (const stateId of STATE_IDS) {
    states[stateId] = {
      id: stateId,
      name: STATE_META[stateId].name,
      risk: STATE_META[stateId].risk,
      locationIds: NODE_TYPES.map((nodeType) => toLocationId(stateId, nodeType)),
    };
  }

  return states;
}

export function createEmptyInventory(): Record<ItemId, number> {
  return {
    "healing-pill": 0,
    "qi-pill": 0,
    "ward-talisman": 0,
    "spirit-ore": 0,
    "ruin-fragment": 0,
    "beast-core": 0,
    "sword-manual": 0,
    "alchemy-manual": 0,
    "array-manual": 0,
  };
}

export function createFactionReputation(
  overrides: Partial<Record<FactionId, number>> = {},
): ExtendedFactionReputation {
  return {
    townsfolk: 0,
    "market-guild": 0,
    "qing-yun-sect": 0,
    "rogue-cultivators": 0,
    "dan-xia-sect": 0,
    "tian-ji-sect": 0,
    ...overrides,
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
    startingPath: "sword",
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
    karma: 12,
    reputation: 34,
    factionReputation: createFactionReputation({
      townsfolk: 16,
      "market-guild": 10,
      "qing-yun-sect": 6,
      "rogue-cultivators": -2,
    }),
    lifespan: 180,
    age: 23,
    sectId: null,
    sectTitle: null,
    totalContribution: 0,
    contributionReachedAt: 0,
    activeQuests: [],
    completedBaseQuests: 0,
    techniques: ["紫霄吐纳诀", "清风步"],
    inventory: {
      ...createEmptyInventory(),
      "healing-pill": 1,
      "qi-pill": 1,
      "spirit-ore": 1,
      "sword-manual": 1,
    },
    statusEffects: createStatusEffects(),
    activeJobId: null,
    injuryTicksRemaining: 0,
    nextTribulationTick: 100,
    registrationRecord: null,
  },
};

export { ITEM_DEFINITIONS };

export function createSeedWorld(): WorldState {
  const locations = buildAllLocations();
  const world: WorldState = {
    version: 3,
    tick: 0,
    updatedAt: new Date().toISOString(),
    cultivators: structuredClone(cultivators),
    agentBindings: {},
    sects: structuredClone(sects),
    zones: structuredClone(zones),
    locations,
    states: buildAllStates(),
    topology: buildFullTopology(),
    eventPools: createEventPools(locations),
    questBoards: {},
    itemDefinitions: structuredClone(ITEM_DEFINITIONS),
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
        from: "青云宗外门执事",
        subject: "山门收徒告示",
        content: "青云宗近日开山收徒，炼气后期修士可前往山门试录。",
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
  };
  seedQuestBoards(world);
  return world;
}
