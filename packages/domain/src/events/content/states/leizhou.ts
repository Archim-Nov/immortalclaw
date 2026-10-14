import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Fallen Thunder Shard",
    titleCn: "坠雷碎片",
    description: "雷刚停，地上有一块还热的碎渣。它不值钱，旁边震出来的灵石可以换一点路费。",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Storm-Riven Glyph",
    titleCn: "雷蚀纹印",
    description: "被雷打过的石面上留着半个纹。你对着它把气息走了一遍，只推进了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Skyfire Baptism",
    titleCn: "霆火淬神",
    description: "空气里还残留着雷火。你没有往里闯，只在边上站到那股劲过去，气息被带得发紧又松开。",
    baseWeight: 1.15,
    effects: { statusEffects: [{ effectId: "qi-surge", ticks: 3 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Stormstep Practice",
    titleCn: "逐电脚力",
    description: "你在两声静电之间挪了一步。挪对了，进境很少，脚没有被打到。",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Thunderfiend Spark",
    titleCn: "雷煞迸发",
    description: "一块不稳的煞核突然亮了一下，逼得你侧身。亮过以后，地上有十几枚灵石。",
    baseWeight: 1.1,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Conductive Sand Harvest",
    titleCn: "引雷砂采",
    description: "你在雨停的空档里收了一小把被雷打过的沙。收得不多，换到的灵石也不多。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Jingxiao Warning",
    titleCn: "惊霄示警",
    description: "惊霄宫的人让你帮着把闲人拦在这一段外面。拦完，他给了很少的灵石。",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Seal or Chase",
    titleCn: "异象追索",
    description: "异象裂开一条缝，巡查的人要把它封上。缝里的东西离你很近。",
    effects: {},
    moralityChoice: {
      title: "雷州的裂缝",
      prompt: "雷异象在你面前裂开。你是帮着封上，还是先伸手去取缝里的东西？",
      expiresInTicks: 6,
      options: [
        {
          id: "seal",
          label: "帮着封上",
          summary: "缝合上了，你没有拿到里面的东西。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "chase",
          label: "先取缝里的东西",
          summary: "你拿到一点灵石，缝还没有封上。",
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
    title: "Shelter Under Banner",
    titleCn: "避雷符棚",
    description: "避雷棚让你站到下一声过去，又给了几枚灵石。棚里的位子仍归他们的人。",
    baseWeight: 1.1,
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildLeizhouEventPack() {
  return buildStateEventPack("leizhou", ROWS);
}
