import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "silt-cache",
    semanticType: "fortune",
    resultType: "resource",
    title: "Silt Cache",
    description: "A silt-packed stash near a drowned chamber still yields ore and loose payment slips.",
    baseWeight: 1.1,
    effects: {
      spiritStones: 26,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "lantern-wash",
    semanticType: "fortune",
    resultType: "status",
    title: "Lantern Wash",
    description: "Reflected canal light ripples through the hall and kicks your circulation back into rhythm.",
    effects: {
      statusEffects: [{ effectId: "qi-surge", ticks: 2 }],
    },
  },
  {
    slot: "towpath-stance",
    semanticType: "training",
    resultType: "progression",
    title: "Towpath Stance",
    description: "A long pulling corridor rewards steady legwork and disciplined breathing.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "slick-pier",
    semanticType: "training",
    resultType: "combat",
    title: "Slick Pier",
    description: "Water-slick stone turns a routine advance into a short, bruising scuffle with the local hazard.",
    baseWeight: 0.85,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
  },
  {
    slot: "smuggler-drop",
    semanticType: "human",
    resultType: "resource",
    title: "Smuggler Drop",
    description: "A hidden handoff point was abandoned in a hurry and leaves something useful behind.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "ward-talisman", count: 1 }],
    },
  },
  {
    slot: "ferry-notice",
    semanticType: "human",
    resultType: "story",
    title: "Ferry Notice",
    description: "A soaked notice board lists which tunnel branches are drawing the wrong kind of traffic tonight.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildYangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
