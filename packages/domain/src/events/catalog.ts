import { STATE_IDS, type StateId } from "../constants.js";
import type { EventPools, EventTemplate } from "../events.js";
import type { Location } from "../model.js";

import { buildGlobalCommonPool } from "./catalog-global.js";
import { buildNodeSpecificEvents } from "./catalog-node.js";
import { buildStateSpecificEvents } from "./catalog-state.js";
import { buildTravelPool } from "./catalog-travel.js";

export function createEventPools(locations: Record<string, Location>): EventPools {
  const stateSpecific = {} as Record<StateId, readonly EventTemplate[]>;
  for (const stateId of STATE_IDS) {
    stateSpecific[stateId] = buildStateSpecificEvents(stateId);
  }

  return {
    globalCommon: buildGlobalCommonPool(),
    stateSpecific,
    nodeSpecific: buildNodeSpecificEvents(locations),
    travelPool: buildTravelPool(),
  };
}
