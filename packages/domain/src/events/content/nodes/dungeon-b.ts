import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonBEventPack(location: Location): EventTemplate[] {
  return [
    buildNodeEvent(location, {
      idSuffix: "sealed-side-room",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Sealed Side Room",
      description: `A half-sealed side room in ${location.name} hides a sharper haul than the outer halls.`,
      baseWeight: 1.2,
      effects: {
        spiritStones: 60,
        itemRewards: [
          { itemId: "ruin-fragment", count: 1 },
          { itemId: "ward-talisman", count: 1 },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "killing-intent",
      semanticType: "training",
      resultType: "status",
      nameSuffix: "Killing Intent Corridor",
      description: `Residual killing intent in ${location.name} cuts into your breath but sharpens your senses.`,
      baseWeight: 1,
      effects: {
        qi: -10,
        spiritualPower: -6,
        statusEffects: [{ effectId: "insight", ticks: 3 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "expedition-remains",
      semanticType: "human",
      resultType: "resource",
      nameSuffix: "Expedition Remains",
      description: `A lost expedition in ${location.name} leaves salvage worth keeping.`,
      baseWeight: 0.9,
      effects: {
        spiritStones: 35,
        itemRewards: [
          { itemId: "ruin-fragment", count: 1 },
          { itemId: "spirit-ore", count: 1 },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "collapsed-gauntlet",
      semanticType: "training",
      resultType: "combat",
      nameSuffix: "Collapsed Gauntlet",
      description: `A trapped stretch of ${location.name} turns a careful search into a bruising clash.`,
      baseWeight: 0.7,
      effects: {
        qi: -12,
        injuryTicksRemaining: 2,
        itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
      },
    }),
  ];
}
