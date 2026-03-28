import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Frostroot Cache",
    titleCn: "霜根藏芽",
    description: "Cold-soaked roots from the frontier fetch a solid price among hardy cultivators.",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Beacon Tower Carving",
    titleCn: "烽台刻痕",
    description: "Marks left by old border sentries reveal a sharp, practical way to focus.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Coldwind Tempering",
    titleCn: "朔风醒神",
    description: "A cutting frontier wind strips away hesitation and leaves you more alert.",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "insight", ticks: 3 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Border March",
    titleCn: "边行磨身",
    description: "Long border marches teach endurance through cold and repetition.",
    baseWeight: 1.1,
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Snowfield Hunt",
    titleCn: "雪原猎踪",
    description: "A frontier hunt turns live when prey doubles back on the hunter.",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Fur Curing Rack",
    titleCn: "寒皮收割",
    description: "Helping prepare cold-weather hides earns you practical frontier pay.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Watchpost Rotation",
    titleCn: "边哨换防",
    description: "A frozen watchpost pays those who can carry orders and supplies without complaint.",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Refugee Detour",
    titleCn: "边民求路",
    description: "Displaced locals ask for a safer path through the frontier before patrols find them.",
    effects: {},
    moralityChoice: {
      title: "Youzhou Refugee Detour",
      prompt: "A frightened family begs for the hidden route to shelter. Do you help quietly or turn the need into leverage?",
      expiresInTicks: 6,
      options: [
        {
          id: "guide",
          label: "Show the safe route",
          summary: "Spend your own margin to keep them alive.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "charge",
          label: "Charge a toll",
          summary: "Take what you can from desperate travelers.",
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
    description: "A patrol shelter shares heat, warding, and enough food for one more push.",
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
