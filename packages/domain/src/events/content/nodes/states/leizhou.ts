import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "thunder-glass",
    semanticType: "fortune",
    resultType: "resource",
    title: "Thunder Glass",
    description: "A thunder-fused seam leaves behind sharp salvage and cleanly tradeable shards.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "storm-pocket",
    semanticType: "fortune",
    resultType: "status",
    title: "Storm Pocket",
    description: "A still eye in the storm-charged chamber jolts your circulation back to life.",
    effects: {
      statusEffects: [{ effectId: "qi-surge", ticks: 2 }],
    },
  },
  {
    slot: "charged-step",
    semanticType: "training",
    resultType: "progression",
    title: "Charged Step",
    description: "Each careful step through a struck corridor teaches efficient control under pressure.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "rod-strike",
    semanticType: "training",
    resultType: "combat",
    title: "Rod Strike",
    description: "A live conductor arc snaps across the hall and forces an ugly scramble through it.",
    baseWeight: 0.85,
    effects: {
      qi: -11,
      spiritualPower: -8,
      spiritStones: 18,
    },
  },
  {
    slot: "patrol-sigil",
    semanticType: "human",
    resultType: "resource",
    title: "Patrol Sigil",
    description: "A storm patrol cache was left behind with a little reward and one intact ward.",
    effects: {
      spiritStones: 20,
      itemRewards: [{ itemId: "ward-talisman", count: 1 }],
    },
  },
  {
    slot: "rain-shelter",
    semanticType: "human",
    resultType: "story",
    title: "Rain Shelter",
    description: "Shelter marks on the wall show where previous teams survived the worst surges.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildLeizhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
