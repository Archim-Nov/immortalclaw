import type {
  Cultivator,
  FactionId,
  ItemDefinition,
  ItemId,
  Sect,
  StatusEffect,
  WorldState,
  Zone,
} from "./model.js";

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

const zones: Record<Zone["id"], Zone> = {
  "mortal-town": {
    id: "mortal-town",
    name: "凡人城镇",
    kind: "safe",
    description: "适合接凡间委托、补给和积累初期声望。",
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
  },
};

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
): Record<FactionId, number> {
  return {
    townsfolk: 0,
    "market-guild": 0,
    "qing-yun-sect": 0,
    "rogue-cultivators": 0,
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
    locationId: "mortal-town",
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
  },
};

export { ITEM_DEFINITIONS };

export function createSeedWorld(): WorldState {
  return {
    version: 3,
    tick: 0,
    updatedAt: new Date().toISOString(),
    cultivators: structuredClone(cultivators),
    agentBindings: {},
    sects: structuredClone(sects),
    zones: structuredClone(zones),
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
}
