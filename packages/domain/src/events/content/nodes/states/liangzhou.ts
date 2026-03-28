import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "sand-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Sand Coffer",
    description: "A coffer buried under grit still pays out to anyone patient enough to clear it properly.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 30,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "shade-well",
    semanticType: "fortune",
    resultType: "status",
    title: "Shade Well",
    description: "A rare pocket of cool air lets you recover your pacing before the next exposed stretch.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "dune-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Dune Breath",
    description: "Wind-scored channels reward slow, efficient breathing and exact foot placement.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "grit-crossing",
    semanticType: "training",
    resultType: "combat",
    title: "Grit Crossing",
    description: "Loose stone and windblown grit turn a crossing into a draining clash of endurance.",
    baseWeight: 0.85,
    effects: {
      qi: -11,
      spiritStones: 20,
    },
  },
  {
    slot: "caravan-tally",
    semanticType: "human",
    resultType: "resource",
    title: "Caravan Tally",
    description: "A caravan quartermaster's tally cache still hides convertible value.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "quartermaster-scratch",
    semanticType: "human",
    resultType: "story",
    title: "Quartermaster Scratch",
    description: "Scratched route notes warn which inner branches tend to empty your waterskins fastest.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildLiangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
