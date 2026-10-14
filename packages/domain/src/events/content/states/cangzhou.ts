import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Tidal Spirit Sand",
    titleCn: "潮汐灵砂",
    description: "潮水改道以后，岸上露出一小片灵砂。你只收了能捧住的一把，换到的灵石很少。",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Reef Stele Fragment",
    titleCn: "礁碑残字",
    description: "礁石上的残字被盐糊住。你擦开以后读到半句，照着把气息走慢了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Sea Breeze Clarity",
    titleCn: "海风澄心",
    description: "海上的风把衣袖吹干。你在埠头站了一会儿，心里比刚才清楚。",
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Deck Balance Drill",
    titleCn: "甲板稳步",
    description: "甲板在晃。你站完这一程没有扶栏，进境很少，脚是自己的。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Reef Beast Surge",
    titleCn: "暗礁妖袭",
    description: "浪里窜出一头不大的礁兽，在人反应过来之前撞了你一下。它退回水里，岸上留下十几枚灵石。",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Wreck Salvage",
    titleCn: "沉船打捞",
    description: "你从破船里拉出一只小匣。匣里没有值钱的东西，只有几枚灵石。",
    baseWeight: 1.1,
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Harbor Factor's Request",
    titleCn: "港埠信牌",
    description: "港埠的人让你把一枚封好的牌送到对面库房。牌没有打开，送到就有一点灵石。",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Ruins Diver's Claim",
    titleCn: "遗迹分润",
    description: "潜水的人想把礁里的东西私下分掉，不进撼海堡的账。",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "沧州的这一网",
      prompt: "潜水的人要把这一网私下分给你。你是补进港账，还是现在把那一份拿走？",
      expiresInTicks: 6,
      options: [
        {
          id: "report",
          label: "补进港账",
          summary: "账上有了这一网，你只拿了记账的那一点。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "split",
          label: "拿走那一份",
          summary: "你的那一份离开了埠头，账上仍是空的。",
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
    title: "Sea Trade Purchase Order",
    titleCn: "海贸收单",
    description: "港里收货的人当场给了灵石，又说了下一处还在问的货。数目不大。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildCangzhouEventPack() {
  return buildStateEventPack("cangzhou", ROWS);
}
