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
  ];
}
