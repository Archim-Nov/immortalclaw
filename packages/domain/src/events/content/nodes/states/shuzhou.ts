import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "cliff-niche",
    semanticType: "fortune",
    resultType: "resource",
    title: "Cliff Niche",
    description: "A hidden cliffside niche stores ore and salvage that better-equipped teams missed.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 26,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "cedar-mist",
    semanticType: "fortune",
    resultType: "status",
    title: "Cedar Mist",
    description: "Cool cedar-laced mist from a fissure eases your breathing despite the pressure of the ruins.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "switchback-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Switchback Breath",
    description: "Repeated angled climbs turn your route through the chamber into a practical training cycle.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "hanging-plank",
    semanticType: "training",
    resultType: "combat",
    title: "Hanging Plank",
    description: "A hanging crossing starts to give way and forces a fast, ugly exchange to get through safely.",
    baseWeight: 0.85,
    effects: {
      qi: -10,
      spiritStones: 18,
    },
  },
  {
    slot: "guide-cairn",
    semanticType: "human",
    resultType: "resource",
    title: "Guide Cairn",
    description: "Small stacked guide stones hide a surveyor's stash beneath them.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "shrine-bell",
    semanticType: "human",
    resultType: "story",
    title: "Shrine Bell",
    description: "A bell note from a forgotten shrine chamber reveals where the wind moves cleanest through the ruin.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildShuzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
