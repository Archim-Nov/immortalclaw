import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Qinglan Spirit Herb",
    titleCn: "青岚灵草",
    description: "Terraced herb slopes outside Qingzhou yield a steady beginner-friendly haul.",
    baseWeight: 1.15,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Old Cultivator Stele",
    titleCn: "古修残碑",
    description: "A weathered training stele offers a small but clean cultivation insight.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Pinewind Spring",
    titleCn: "松风洗尘",
    description: "A clear spring under pine shade settles your breath and heart.",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Creekside Breathing",
    titleCn: "溪畔吐纳",
    description: "A quiet stream bank gives you room for one stable breathing cycle.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Low-Tier Beast Trail",
    titleCn: "幼阶妖踪",
    description: "A weak beast prowls the herb path and forces a simple clash.",
    baseWeight: 0.85,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Springwater Gathering",
    titleCn: "灵泉汲露",
    description: "Routine collection work turns into useful cultivation stock.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Cangmu Messenger",
    titleCn: "苍木传讯",
    description: "A courier tied to Qingzhou's neutral sect pays for steady hands and discretion.",
    baseWeight: 1.05,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Hidden Herb Keeper",
    titleCn: "山中药叟",
    description: "A secluded herb keeper offers rare medicine if you help him deal with other gatherers.",
    effects: {},
    moralityChoice: {
      title: "Qingzhou Herb Keeper",
      prompt: "The herb keeper offers a shortcut to a rare patch if you mislead other gatherers. How do you answer?",
      expiresInTicks: 6,
      options: [
        {
          id: "share",
          label: "Share the route",
          summary: "Keep the slope open to everyone and earn local trust.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "hoard",
          label: "Keep it secret",
          summary: "Take the hidden harvest and leave the others wandering.",
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
    title: "Medicinal Plot Purchase",
    titleCn: "药圃收购",
    description: "Local growers compete to buy your clean harvest and point you toward the next good patch.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildQingzhouEventPack() {
  return buildStateEventPack("qingzhou", ROWS);
}
