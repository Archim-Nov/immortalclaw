import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "pawned-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Pawned Coffer",
    description: "A hastily hidden coffer from an older trade dispute still holds convertible salvage.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "bargain-incense",
    semanticType: "fortune",
    resultType: "status",
    title: "Bargain Incense",
    description: "Lingering incense from a deal room clears the head just enough to steady your judgment.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "market-step",
    semanticType: "training",
    resultType: "progression",
    title: "Market Step",
    description: "A cramped maze of chambers rewards quick route reading and efficient movement.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "alley-pressure",
    semanticType: "training",
    resultType: "combat",
    title: "Alley Pressure",
    description: "The ruin narrows like a back-alley trap and forces a short, ugly collision with danger.",
    baseWeight: 0.85,
    effects: {
      qi: -8,
      spiritStones: 20,
    },
  },
  {
    slot: "broker-token",
    semanticType: "human",
    resultType: "resource",
    title: "Broker Token",
    description: "A broker token left in a side room still pays for itself once carried out.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "rumor-chalk",
    semanticType: "human",
    resultType: "story",
    title: "Rumor Chalk",
    description: "Rumor chalk on the wall hints which doors were profitable and which doors ate people whole.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildWanzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
