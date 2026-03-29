import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "pawned-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Pawned Coffer",
    titleCn: "典当旧匣",
    description: "A hastily hidden coffer from an older trade dispute still holds convertible salvage.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "favor-cache",
    semanticType: "fortune",
    resultType: "resource",
    title: "Favor Cache",
    titleCn: "人情暗仓",
    description: "Someone's old favor-payment cache was never picked up and still carries useful hard value.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "bargain-incense",
    semanticType: "fortune",
    resultType: "status",
    title: "Bargain Incense",
    titleCn: "议价残香",
    description: "Lingering incense from a deal room clears the head just enough to steady your judgment.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "counting-lamp",
    semanticType: "fortune",
    resultType: "status",
    title: "Counting Lamp",
    titleCn: "账灯照心",
    description: "A still-burning counting lamp sharpens your instinct for which corridor is worth the risk.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "secret-ledger",
    semanticType: "fortune",
    resultType: "progression",
    title: "Secret Ledger",
    titleCn: "暗账残页",
    description: "A hidden ledger teaches how value moves under pressure, and the insight maps cleanly onto your breath.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "broker-map",
    semanticType: "fortune",
    resultType: "progression",
    title: "Broker Map",
    titleCn: "牙路图签",
    description: "A broker's route map reveals how to cut waste from motion without ever looking rushed.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "market-step",
    semanticType: "training",
    resultType: "progression",
    title: "Market Step",
    titleCn: "坊巷快步",
    description: "A cramped maze of chambers rewards quick route reading and efficient movement.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "backroom-turn",
    semanticType: "training",
    resultType: "progression",
    title: "Backroom Turn",
    titleCn: "后堂折身",
    description: "Short pivots around cramped storage walls train compact force and clean directional change.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "alley-pressure",
    semanticType: "training",
    resultType: "combat",
    title: "Alley Pressure",
    titleCn: "窄巷逼斗",
    description: "The ruin narrows like a back-alley trap and forces a short, ugly collision with danger.",
    baseWeight: 0.85,
    effects: {
      qi: -8,
      spiritStones: 20,
    },
  },
  {
    slot: "rogue-feint",
    semanticType: "training",
    resultType: "combat",
    title: "Rogue Feint",
    titleCn: "散修探手",
    description: "A hidden watcher presses too close and the misunderstanding turns into a quick, mean exchange.",
    baseWeight: 0.84,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
  },
  {
    slot: "silent-breath",
    semanticType: "training",
    resultType: "status",
    title: "Silent Breath",
    titleCn: "敛息藏锋",
    description: "A quiet counting exercise from some older runner keeps your presence low and your movements cleaner.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "debtward-mark",
    semanticType: "training",
    resultType: "status",
    title: "Debtward Mark",
    titleCn: "债印护势",
    description: "A threat mark on the wall doubles as a warning system, buying you one brief window of safer footing.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "broker-token",
    semanticType: "human",
    resultType: "resource",
    title: "Broker Token",
    titleCn: "牙牌余利",
    description: "A broker token left in a side room still pays for itself once carried out.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "runner-note",
    semanticType: "human",
    resultType: "resource",
    title: "Runner Note",
    titleCn: "跑单遗帖",
    description: "A courier's payment note was dropped under a loose flagstone and still converts without much trouble.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "escort-pact",
    semanticType: "human",
    resultType: "status",
    title: "Escort Pact",
    titleCn: "镖约余印",
    description: "A sealed escort pact outlines which inner chambers once had enough muscle to stay orderly.",
    effects: {
      spiritStones: 16,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "debt-ink",
    semanticType: "human",
    resultType: "status",
    title: "Debt Ink",
    titleCn: "债墨留痕",
    description: "Debt tallies scratched into the plaster sharpen your sense for hidden leverage and profitable exits.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "rumor-chalk",
    semanticType: "human",
    resultType: "story",
    title: "Rumor Chalk",
    titleCn: "流言粉记",
    description: "Rumor chalk on the wall hints which doors were profitable and which doors ate people whole.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "back-alley-toast",
    semanticType: "human",
    resultType: "story",
    title: "Back Alley Toast",
    titleCn: "巷酒旧话",
    description: "A half-finished toast between old accomplices still frames the ruin as a map of favors rather than stone.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildWanzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
