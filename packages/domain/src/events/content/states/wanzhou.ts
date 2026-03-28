import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Favor Returned",
    titleCn: "人情回礼",
    description: "In Wanzhou, an old favor often comes back as practical coin or goods.",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Pawnshop Secret Ledger",
    titleCn: "当铺密账",
    description: "A backroom ledger teaches you how people move value when the law looks elsewhere.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Teahouse Ease",
    titleCn: "茶棚歇气",
    description: "A noisy teahouse somehow leaves your thoughts smoother than before.",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Backstreet Spar",
    titleCn: "巷战磨手",
    description: "A rough street exchange teaches compact movement and quick judgment.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Rogue Cultivator Probe",
    titleCn: "邪修试探",
    description: "A wandering rogue tests your line and backs off only after a brief clash.",
    baseWeight: 1.05,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Market Sweep",
    titleCn: "坊市捡漏",
    description: "A crowded market teaches you what to watch and what others miss.",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Old Contact's Message",
    titleCn: "旧识传话",
    description: "A familiar face pays well for a favor that only someone trusted can carry.",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Debt Collector's Choice",
    titleCn: "债账取舍",
    description: "A debtor begs for time and offers a quieter target if you let today's payment slide.",
    baseWeight: 1.1,
    effects: {},
    moralityChoice: {
      title: "Wanzhou Debt Choice",
      prompt: "A debtor offers a tempting lead if you stop pressing the old account. Do you ease off or strip what value remains now?",
      expiresInTicks: 6,
      options: [
        {
          id: "delay",
          label: "Give them time",
          summary: "Preserve the relationship and keep your name workable.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "collect",
          label: "Collect by force",
          summary: "Take immediate profit and let the bridges burn.",
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
    title: "Escort Handshake",
    titleCn: "镖路搭手",
    description: "A quick escort arrangement leaves you paid and briefly better protected.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildWanzhouEventPack() {
  return buildStateEventPack("wanzhou", ROWS);
}
