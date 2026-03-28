import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Red Sand Ore Vein",
    titleCn: "赤沙矿脉",
    description: "Wind-scoured rock in Liangzhou reveals ore worth fighting over.",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Buried Caravan Tablet",
    titleCn: "埋沙商碑",
    description: "A half-buried route tablet teaches the patience needed for long desert travel.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Dry Well Essence",
    titleCn: "枯井凝息",
    description: "A hidden desert well restores a short burst of usable spiritual density.",
    effects: { statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Dustroad Endurance",
    titleCn: "戈路熬炼",
    description: "Only repeated marches under a hard sun teach this kind of body control.",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Scorpion Beast Nest",
    titleCn: "沙蝎袭营",
    description: "A nest hidden under hot sand erupts into a quick, punishing fight.",
    baseWeight: 1.05,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Scrap Ore Picking",
    titleCn: "荒垒捡矿",
    description: "Even exhausted mining camps leave enough scrap for careful hands.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Supply Tallier",
    titleCn: "军驿点料",
    description: "A frontier supply yard pays you to keep ledgers and stock moving.",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Water Ration Choice",
    titleCn: "水袋取舍",
    description: "A caravan runs short and one hidden waterskin could change who makes it through.",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "Liangzhou Water Ration",
      prompt: "The convoy is short on water. Do you share your reserve or keep your own margin?",
      expiresInTicks: 6,
      options: [
        {
          id: "share",
          label: "Share the ration",
          summary: "Keep the group moving even if it costs your own comfort.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "stash",
          label: "Hide the waterskin",
          summary: "Preserve your safety and let the weaker hands take the loss.",
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
    description: "A guarded ore convoy brings pay and a short window of safer travel.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildLiangzhouEventPack() {
  return buildStateEventPack("liangzhou", ROWS);
}
