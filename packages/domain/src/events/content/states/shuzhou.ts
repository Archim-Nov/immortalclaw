import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Cliffside Herb Shelf",
    titleCn: "峭壁灵药",
    description: "A risky cliff ledge hides concentrated herbs prized across mountain markets.",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Woodgrain Rune Fragment",
    titleCn: "木纹残刻",
    description: "Ancient carvings cut into old timber reveal a patient route of refinement.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Mist Hollow Stillness",
    titleCn: "雾谷澄心",
    description: "A mist-laden hollow muffles the world and lets your mind settle fully.",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Ridge Path Focus",
    titleCn: "栈道凝息",
    description: "Careful breathing on narrow paths turns balance into practical growth.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Vine Python Clash",
    titleCn: "藤蟒突袭",
    description: "A mountain predator lashes out from the tree line and tests your footing.",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Spiritwood Pruning",
    titleCn: "灵木采枝",
    description: "Pruning old spiritwood grants usable material and a feel for mountain rhythms.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Poyun Scout",
    titleCn: "破云巡山",
    description: "A mountain scout pays for route reports and quiet cooperation.",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Mountain Guide's Shortcut",
    titleCn: "山径引路",
    description: "A local guide offers a hidden path that would cut across villagers' herb slopes.",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "Shuzhou Mountain Shortcut",
      prompt: "You can save time by using the hidden path, but it will ruin nearby herb terraces. What do you choose?",
      expiresInTicks: 6,
      options: [
        {
          id: "detour",
          label: "Protect the terraces",
          summary: "Take the longer route and keep the local livelihood intact.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "cut-through",
          label: "Take the shortcut",
          summary: "Claim the mountain's advantage before someone else does.",
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
    title: "Herbalist Exchange",
    titleCn: "药农换购",
    description: "A mountain herbalist trades stock and leaves you briefly saturated with clean spirit.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildShuzhouEventPack() {
  return buildStateEventPack("shuzhou", ROWS);
}
