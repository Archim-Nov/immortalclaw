import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "archive-strongbox",
    semanticType: "fortune",
    resultType: "resource",
    title: "Archive Strongbox",
    description: "A clerk's strongbox survives behind broken seals and still holds a clean payout.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 30,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "seal-hall",
    semanticType: "fortune",
    resultType: "status",
    title: "Seal Hall",
    description: "Residual order qi in the hall settles scattered thoughts and sharpens controlled movement.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "measured-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Measured Breath",
    description: "Inspection marks on the floor naturally break your movement into a disciplined cultivation cadence.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "inspector-array",
    semanticType: "training",
    resultType: "status",
    title: "Inspector Array",
    description: "A half-working inspection array punishes sloppy footing and rewards precise control.",
    baseWeight: 0.95,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "courier-packet",
    semanticType: "human",
    resultType: "resource",
    title: "Courier Packet",
    description: "An abandoned courier packet still has enough value left in it to matter.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "edict-scrap",
    semanticType: "human",
    resultType: "story",
    title: "Edict Scrap",
    description: "A torn enforcement notice hints which inner chambers were once sealed off first.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildZhongzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
