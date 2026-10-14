import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Red Sand Ore Vein",
    titleCn: "赤沙矿脉",
    description: "风把石面吹开一条缝，里面只有一小块矿和几枚灵石，不够让人动手抢。",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Buried Caravan Tablet",
    titleCn: "埋沙商碑",
    description: "半埋在沙里的路碑只露出一行字。你把沙拨开读完，气息比赶路时慢了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Dry Well Essence",
    titleCn: "枯井凝息",
    description: "一口看着枯了的井，下去仍有一点湿气。你在井沿坐了一会儿，再走时没那么燥。",
    effects: { statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Dustroad Endurance",
    titleCn: "戈路熬炼",
    description: "太阳底下这一段没有影子。你走完才停，进境比喝到的那口水更清楚。",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Scorpion Beast Nest",
    titleCn: "沙蝎袭营",
    description: "烫沙下面窜出几只沙蝎，你退开时小腿被扫到。蝎子走了，沙里留下十几枚灵石。",
    baseWeight: 1.05,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Scrap Ore Picking",
    titleCn: "荒垒捡矿",
    description: "废弃的矿棚里只剩别人不要的碎渣。你拣了一小把，换到的灵石很少。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Supply Tallier",
    titleCn: "军驿点料",
    description: "军驿的人让你把点过的料数抄到下一页。抄完，他从公账里给了几枚灵石。",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Water Ration Choice",
    titleCn: "水袋取舍",
    description: "车队的水不够了。你自己还有一袋，押车的人还不知道。",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "凉州的水",
      prompt: "车队的水不够，你手里还有一袋。你是分下去，还是自己留着？",
      expiresInTicks: 6,
      options: [
        {
          id: "share",
          label: "把水分下去",
          summary: "你自己只剩底，车还在往前走。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "stash",
          label: "把水囊藏起来",
          summary: "水还在你袋里，后面的人没有分到。",
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
    title: "Ore Convoy Contract",
    titleCn: "矿队雇约",
    description: "矿队让你跟在车尾走到下一根旗杆。这一段有人看着，灵石按说好的给。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildLiangzhouEventPack() {
  return buildStateEventPack("liangzhou", ROWS);
}
