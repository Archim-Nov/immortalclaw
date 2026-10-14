import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Frostroot Cache",
    titleCn: "霜根藏芽",
    description: "冻土里扒出几截霜根，并不稀罕。拿到镇口，也只换到一小把灵石。",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Beacon Tower Carving",
    titleCn: "烽台刻痕",
    description: "旧烽台上的刻痕告诉你风从哪边来。你照着把气息收紧，只推进了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Coldwind Tempering",
    titleCn: "朔风醒神",
    description: "朔风刮在脸上，杂念停不下来也得停。你低下头走完这一段，人比刚才清醒。",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "insight", ticks: 3 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Border March",
    titleCn: "边行磨身",
    description: "沿边境走了很长一段，脚下是硬土。进境不多，是一步一步走出来的。",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Snowfield Hunt",
    titleCn: "雪原猎踪",
    description: "雪地上的兽折返回来，你没有追远，只把它逼开。地上留下十几枚灵石。",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Fur Curing Rack",
    titleCn: "寒皮收割",
    description: "你帮着把冻硬的皮子翻开晾上。主人给了很少的灵石，皮子仍是他的。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Watchpost Rotation",
    titleCn: "边哨换防",
    description: "边哨的人让你把一袋干粮送到下一座棚，不要在风里停留。送到就有一点灵石。",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Refugee Detour",
    titleCn: "边民求路",
    description: "一户边民问你哪边能避开巡逻。他们没有别的东西，只有路上剩下的一点灵石。",
    effects: {},
    moralityChoice: {
      title: "幽州的边民",
      prompt: "这户人要一条能到棚子的路。你是指给他们，还是先收他们剩下的灵石？",
      expiresInTicks: 6,
      options: [
        {
          id: "guide",
          label: "把路指给他们",
          summary: "你多走了一段，把他们送到看得见棚火的地方。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "charge",
          label: "先收灵石",
          summary: "灵石你收下了，路只说了一半。",
          moralityDelta: -3,
          effectBundle: {
            spiritStones: 35,
          },
        },
      ] as const,
    },
  },
  {
    slot: "h-03",
    semanticType: "human",
    resultType: "status",
    title: "Watchfire Shelter",
    titleCn: "烽火歇营",
    description: "烽火旁的棚子让你烤到手指能弯，又给了一小块干粮。棚仍是他们的。",
    baseWeight: 1.1,
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildYouzhouEventPack() {
  return buildStateEventPack("youzhou", ROWS);
}
