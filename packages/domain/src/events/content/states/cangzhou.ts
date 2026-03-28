import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Tidal Spirit Sand",
    titleCn: "潮汐灵砂",
    description: "A shifting shoreline exposes rare sand useful to both trade and craft.",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Reef Stele Fragment",
    titleCn: "礁碑残字",
    description: "A fragment from a reef ruin offers insight once the salt is cleaned away.",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Sea Breeze Clarity",
    titleCn: "海风澄心",
    description: "A clean wind off the sea washes away static thought and lingering strain.",
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Deck Balance Drill",
    titleCn: "甲板稳步",
    description: "A rolling deck turns simple stance work into honest training.",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Reef Beast Surge",
    titleCn: "暗礁妖袭",
    description: "A reef beast bursts from the surf before the salvage line can react.",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Wreck Salvage",
    titleCn: "沉船打捞",
    description: "A careful pull from a broken wreck leaves you with more than wet hands.",
    baseWeight: 1.1,
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Harbor Factor's Request",
    titleCn: "港埠信牌",
    description: "A harbor factor pays for reliable movement between docks, seals, and storehouses.",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Ruins Diver's Claim",
    titleCn: "遗迹分润",
    description: "A diver wants to split a relic quietly rather than report the full find to the harbor office.",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "Cangzhou Ruins Diver",
      prompt: "A diver offers you a private share from a reef ruin. Do you file the relic properly or take the hidden cut?",
      expiresInTicks: 6,
      options: [
        {
          id: "report",
          label: "File the relic",
          summary: "Keep the port ledger clean and protect the route's trust.",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "split",
          label: "Take the hidden cut",
          summary: "Accept the quiet profit and leave the office guessing.",
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
    description: "A port buyer pays fast and points you toward the next lucrative rumor chain.",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildCangzhouEventPack() {
  return buildStateEventPack("cangzhou", ROWS);
}
