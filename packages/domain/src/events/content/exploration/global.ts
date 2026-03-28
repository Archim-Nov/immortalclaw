import type { EventTemplate } from "../../../events.js";

export type ExplorationGlobalRow = Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType">;

export function createExplorationGlobalRows(): readonly ExplorationGlobalRow[] {
  return [
    { id: "g-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Spirit Herb", nameCn: "路边灵草", description: "A low-grade herb patch adds value to your satchel.", baseWeight: 1, effects: { spiritStones: 40 } },
    { id: "g-f-02", semanticType: "fortune", resultType: "resource", name: "Abandoned Pouch", nameCn: "废弃储物袋", description: "A weathered pouch still holds a few stones.", baseWeight: 1, effects: { spiritStones: 60 } },
    { id: "g-f-03", semanticType: "fortune", resultType: "progression", name: "Broken Stele Insight", nameCn: "残碑感悟", description: "A fragmentary carving stirs a brief realization.", baseWeight: 1, effects: { realmProgress: 3, itemRewards: [{ itemId: "qi-common", count: 1 }] } },
    { id: "g-f-04", semanticType: "fortune", resultType: "status", name: "Spirit Spring", nameCn: "灵泉洗尘", description: "A hidden spring calms the breath and mind.", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 3 }] } },
    { id: "g-f-05", semanticType: "fortune", resultType: "story", name: "Crane Crossing", nameCn: "路遇仙鹤", description: "A crane circles overhead and leaves an omen.", baseWeight: 1, effects: {} },
    { id: "g-t-01", semanticType: "training", resultType: "progression", name: "Solo Practice", nameCn: "独自参悟", description: "A clean cycle yields practical progress.", baseWeight: 1, effects: { realmProgress: 2, itemRewards: [{ itemId: "qi-common", count: 1 }] } },
    { id: "g-t-02", semanticType: "training", resultType: "status", name: "Walking Breath", nameCn: "行走练气", description: "Breath control while moving triggers a short surge.", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { id: "g-t-03", semanticType: "training", resultType: "resource", name: "Foraging Drill", nameCn: "采药锻炼", description: "The route doubles as a gathering session.", baseWeight: 1, effects: { spiritStones: 25 } },
    { id: "g-t-04", semanticType: "training", resultType: "combat", name: "Wild Beast", nameCn: "野兽遭遇", description: "A minor beast tests your footing.", baseWeight: 1, effects: { qi: -8, spiritStones: 20 } },
    { id: "g-t-05", semanticType: "training", resultType: "story", name: "Senior's Hint", nameCn: "路遇前辈", description: "A passing senior leaves one cryptic sentence.", baseWeight: 1, effects: { reputationChange: 1 } },
    {
      id: "g-h-01",
      semanticType: "human",
      resultType: "resource",
      name: "Rogue Request",
      nameCn: "散修求助",
      description: "A stranded traveler asks whether you will help openly or take advantage of the chaos.",
      baseWeight: 1,
      effects: {},
      moralityChoice: {
        title: "Rogue Request",
        prompt: "A stranded traveler has spirit stones but no protection. Decide how you respond.",
        expiresInTicks: 6,
        options: [
          {
            id: "escort",
            label: "Escort the traveler",
            summary: "Protect the route and accept only a token thanks.",
            moralityDelta: 3,
            effectBundle: {
              reputationChange: 1,
              spiritStones: 20,
            },
          },
          {
            id: "extort",
            label: "Extort the traveler",
            summary: "Take the easy stones and leave before anyone can object.",
            moralityDelta: -3,
            effectBundle: {
              spiritStones: 50,
            },
          },
        ] as const,
      },
    },
    { id: "g-h-02", semanticType: "human", resultType: "status", name: "Old Acquaintance", nameCn: "路遇故人", description: "A familiar face boosts your confidence.", baseWeight: 1, effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
    { id: "g-h-03", semanticType: "human", resultType: "story", name: "Teahouse Rumor", nameCn: "茶摊消息", description: "A rumor reframes local movement and risk.", baseWeight: 1, effects: {} },
    {
      id: "g-h-04",
      semanticType: "human",
      resultType: "combat",
      name: "Road Ambush",
      nameCn: "遭遇劫道",
      description: "Bandits hit a caravan and force a split-second decision.",
      baseWeight: 1,
      effects: {},
      moralityChoice: {
        title: "Road Ambush",
        prompt: "A caravan is under attack. Do you hold the line or loot the confusion?",
        expiresInTicks: 6,
        options: [
          {
            id: "defend",
            label: "Defend the caravan",
            summary: "Spend effort to stabilize the scene and earn trust.",
            moralityDelta: 5,
            effectBundle: {
              qi: -6,
              reputationChange: 2,
            },
          },
          {
            id: "plunder",
            label: "Plunder the wreckage",
            summary: "Grab what you can while everyone is distracted.",
            moralityDelta: -5,
            effectBundle: {
              spiritStones: 70,
              qi: -4,
            },
          },
        ] as const,
      },
    },
    { id: "g-h-05", semanticType: "human", resultType: "resource", name: "Merchant Cooperation", nameCn: "商旅互助", description: "A caravan shares route pay for escort help.", baseWeight: 1, effects: { spiritStones: 50 } },
  ];
}
