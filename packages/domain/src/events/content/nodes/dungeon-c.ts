import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonCEventPack(location: Location): EventTemplate[] {
  return [
    buildNodeEvent(location, {
      idSuffix: "cracked-cache",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Cracked Cache",
      description: `A cracked cache in ${location.name} still holds fragments and loose stones.`,
      baseWeight: 1.4,
      effects: {
        spiritStones: 40,
        itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "breath-pocket",
      semanticType: "training",
      resultType: "progression",
      nameSuffix: "Breath Pocket",
      description: `A calm pocket of qi in ${location.name} lets you refine one short cycle.`,
      baseWeight: 1.1,
      effects: {
        realmProgress: 6,
        statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "camp-remains",
      semanticType: "human",
      resultType: "status",
      nameSuffix: "Camp Remains",
      description: `The remains of a prior scouting camp leave behind route notes and one intact charm.`,
      baseWeight: 0.9,
      effects: {
        itemRewards: [{ itemId: "ward-talisman", count: 1 }],
        statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
      },
    }),
  ];
}
