import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildWildernessEventPack(location: Location): EventTemplate[] {
  return [
    buildNodeEvent(location, {
      idSuffix: "ore-seam",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Ore Seam",
      description: `A mineral seam breaks open near ${location.name}.`,
      baseWeight: 1.2,
      effects: {
        spiritStones: 28,
        itemRewards: [{ itemId: "spirit-ore", count: 1 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "spirit-herb-pocket",
      semanticType: "training",
      resultType: "resource",
      nameSuffix: "Spirit Herb Pocket",
      description: `A dense herb pocket near ${location.name} yields stable stock useful for foundation breakthroughs.`,
      baseWeight: 0.85,
      minRealm: "筑基",
      effects: {
        spiritStones: 36,
        itemRewards: [{ itemId: "foundation-common", count: 1 }],
      },
    }),
  ];
}
