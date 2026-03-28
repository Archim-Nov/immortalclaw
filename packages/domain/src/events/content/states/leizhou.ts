import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Fallen Thunder Shard",
    titleCn: "坠雷碎片",
    description: "A fresh shard left by a thunder strike still hums with saleable energy.",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Storm-Riven Glyph",
    titleCn: "雷蚀纹印",
    description: "A charred glyph left after a storm offers unstable but valuable insight.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Skyfire Baptism",
    titleCn: "霆火淬神",
    description: "Residual thunderfire drives your circulation into a short violent peak.",
    baseWeight: 1.15,
    effects: { statusEffects: [{ effectId: "qi-surge", ticks: 3 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Stormstep Practice",
    titleCn: "逐电脚力",
    description: "Timing your movement between bursts of static trains both nerve and body.",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Thunderfiend Spark",
    titleCn: "雷煞迸发",
    description: "An unstable fiend core flashes alive and forces an abrupt collision.",
    baseWeight: 1.1,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Conductive Sand Harvest",
    titleCn: "引雷砂采",
    description: "Collecting storm-touched sand pays well if you can work quickly.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Jingxiao Warning",
    titleCn: "惊霄示警",
    description: "A warning patrol pays for help keeping civilians away from the next anomaly.",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Seal or Chase",
    titleCn: "异象追索",
    description: "A patrol wants the anomaly sealed, but its exposed core is tempting and close.",
    effects: {},
    moralityChoice: {
      title: "Leizhou Anomaly Core",
      prompt: "A thunder anomaly cracks open in front of you. Do you help seal it or rush the core for yourself?",
      expiresInTicks: 6,
      options: [
        {
          id: "seal",
          label: "Help seal it",
          summary: "Reduce the danger and earn the patrol's trust.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "chase",
          label: "Rush the core",
          summary: "Take the dangerous gain before the field closes.",
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
    description: "A warded storm shelter grants both pay and a brief buffer against the next strike.",
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
