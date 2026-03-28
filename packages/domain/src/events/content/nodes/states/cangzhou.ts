import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "reef-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Reef Coffer",
    description: "A reef-anchored coffer still holds ore and payment chips under a crust of salt.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "salt-lantern",
    semanticType: "fortune",
    resultType: "status",
    title: "Salt Lantern",
    description: "A brine lantern burns with a steady blue flame that helps you keep a defensive rhythm.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "tide-draw",
    semanticType: "training",
    resultType: "progression",
    title: "Tide Draw",
    description: "Pulling against the pressure of the chamber teaches clean force and efficient release.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "anchor-pull",
    semanticType: "training",
    resultType: "combat",
    title: "Anchor Pull",
    description: "A hanging chain whips loose and turns the next chamber into a rough physical scramble.",
    baseWeight: 0.85,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
  },
  {
    slot: "diver-chalk",
    semanticType: "human",
    resultType: "resource",
    title: "Diver Chalk",
    description: "Diver chalk marks lead to a small recovery stash and a little negotiable value.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "harbor-slate",
    semanticType: "human",
    resultType: "story",
    title: "Harbor Slate",
    description: "A weathered harbor slate lists which flooded side chambers locals now avoid entirely.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildCangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
