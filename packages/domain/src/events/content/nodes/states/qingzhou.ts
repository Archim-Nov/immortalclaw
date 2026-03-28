import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "herb-lockbox",
    semanticType: "fortune",
    resultType: "resource",
    title: "Herb Lockbox",
    description: "A medicine lockbox survives in the ruin and still holds exchangeable stock.",
    baseWeight: 1.1,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "moss-spring",
    semanticType: "fortune",
    resultType: "status",
    title: "Moss Spring",
    description: "A moss-lined seep of qi cools the body and steadies breathing for the next corridor.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "terrace-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Terrace Breath",
    description: "Old pacing grooves from herb tenders turn one careful lap into usable cultivation progress.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "root-ward",
    semanticType: "training",
    resultType: "status",
    title: "Root Ward",
    description: "A wooden ward still channels enough stabilizing qi to guard your next push inward.",
    baseWeight: 0.95,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "sect-pannier",
    semanticType: "human",
    resultType: "resource",
    title: "Sect Pannier",
    description: "A dropped pannier from an old Qingzhou survey team still contains tradeable salvage.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "gatherer-slate",
    semanticType: "human",
    resultType: "story",
    title: "Gatherer Slate",
    description: "Gatherer marks on a slate panel point out which side passages tend to pay off cleanly.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildQingzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
