import type { Cultivator, Sect, WorldState, Zone } from "./model.js";

const zones: Record<Zone["id"], Zone> = {
  "mortal-town": {
    id: "mortal-town",
    name: "凡人城镇",
    kind: "safe",
    description: "新手活动区，适合接取凡间事务和整顿行装。",
  },
  market: {
    id: "market",
    name: "修仙坊市",
    kind: "safe",
    description: "可以买卖丹药和材料，也是消息最灵通的地方。",
  },
  "sect-gate": {
    id: "sect-gate",
    name: "宗门山门",
    kind: "safe",
    description: "正道宗门驻地，可拜入师门。",
  },
  "spirit-mine": {
    id: "spirit-mine",
    name: "灵脉矿洞",
    kind: "resource",
    description: "灵石收益可观，但稍有不慎便会负伤。",
  },
  "mystic-ruins": {
    id: "mystic-ruins",
    name: "秘境遗迹",
    kind: "adventure",
    description: "机缘和危险共存，适合赌一把运数。",
  },
  "healing-sanctuary": {
    id: "healing-sanctuary",
    name: "疗伤圣地",
    kind: "safe",
    description: "适合疗伤、静养、为天劫做准备。",
  },
};

const sects: Record<string, Sect> = {
  "qing-yun-sect": {
    id: "qing-yun-sect",
    name: "青云宗",
    type: "剑修",
    treasury: 86000,
    memberIds: [],
    spiritVeins: ["青岚支脉"],
  },
};

const cultivators: Record<string, Cultivator> = {
  "yun-zhong-he": {
    id: "yun-zhong-he",
    name: "云中鹤",
    realm: "炼气",
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
    lifespan: 180,
    age: 23,
    sectId: null,
    techniques: ["紫霄吐纳诀", "清风步"],
    inventory: {
      "healing-pill": 1,
      "qi-pill": 1,
    },
    activeJobId: null,
    injuryTicksRemaining: 0,
    nextTribulationTick: 100,
  },
};

export function createSeedWorld(): WorldState {
  return {
    tick: 0,
    cultivators: structuredClone(cultivators),
    sects: structuredClone(sects),
    zones: structuredClone(zones),
    jobs: {},
    daoLogs: structuredClone([
      {
        id: "log-1",
        cultivatorId: "yun-zhong-he",
        tick: 0,
        title: "初入尘世",
        content: "下山已满三日，灵石未丰，道心未稳。若不能尽快积蓄资粮，此番修行怕是要被琐事拖住脚步。",
        tags: ["seed", "intro"],
      },
    ]),
    messages: structuredClone([
      {
        id: "msg-1",
        cultivatorId: "yun-zhong-he",
        tick: 0,
        from: "青云宗外门执事",
        subject: "山门收徒告示",
        content: "青云宗近日开山收徒，凡炼气后期修士皆可前来山门试录。",
      },
    ]),
    nextJobSequence: 1,
    nextLogSequence: 2,
    nextMessageSequence: 2,
  };
}
