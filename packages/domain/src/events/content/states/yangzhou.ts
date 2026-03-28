import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Tide Pearl Drift",
    titleCn: "潮珠漂岸",
    description: "A tide-swept bank leaves behind water-touched valuables from the river trade.",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Canal Marker Script",
    titleCn: "河渠碑记",
    description: "Ancient canal marks hide neat logistical wisdom useful to cultivation pacing.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "River Mist Tailwind",
    titleCn: "江雾顺风",
    description: "A wet tailwind carries you forward and keeps your qi circulation lively.",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "qi-surge", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Boatline Footwork",
    titleCn: "桨路步法",
    description: "Keeping balance on slick planks sharpens your body control.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Reedbank Waterfiend",
    titleCn: "芦汀水妖",
    description: "A river fiend bursts from the reeds and spoils an otherwise smooth route.",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Dockside Salvage",
    titleCn: "码头打捞",
    description: "A salvage crew lets you work for a share of the recovered goods.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Guild Ledger Errand",
    titleCn: "商会跑单",
    description: "A trade guild pays for quick, accurate delivery between crowded river piers.",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Smuggler Ferry",
    titleCn: "夜渡私船",
    description: "A hidden ferry offers an easy crossing if you ignore what else it carries.",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "Yangzhou Smuggler Ferry",
      prompt: "The ferryman offers you a cut if you keep quiet about the cargo. What do you do?",
      expiresInTicks: 6,
      options: [
        {
          id: "report",
          label: "Report the ferry",
          summary: "Protect the route and stay on the guilds' good side.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "ride",
          label: "Take the deal",
          summary: "Use the hidden crossing and pocket your share.",
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
    title: "Canal Procurement",
    titleCn: "河埠采买",
    description: "Busy buyers pass you the next profitable rumor as part of a quick deal.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildYangzhouEventPack() {
  return buildStateEventPack("yangzhou", ROWS);
}
