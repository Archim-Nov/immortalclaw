import {
  getGeographyStateIds,
  resolveGeographyRegistry,
  type GeographyRegistryOverrides,
} from "../geography-registry.js";
import type { EventPools, EventTemplate } from "../events.js";
import type { Location } from "../model.js";

import { buildGlobalCommonPool } from "./catalog-global.js";
import { buildNodeSpecificEvents } from "./catalog-node.js";
import { buildStateSpecificEvents } from "./catalog-state.js";
import { buildTravelPool } from "./catalog-travel.js";
import { buildTravelStateSpecificEvents } from "./catalog-travel-state.js";

interface EventPoolOptions {
  geographyRegistry?: GeographyRegistryOverrides;
}

export function createEventPools(
  locations: Record<string, Location>,
  options: EventPoolOptions = {},
): EventPools {
  const geographyRegistry = resolveGeographyRegistry(options.geographyRegistry);
  const stateSpecific: Record<string, readonly EventTemplate[]> = {};
  const travelStateSpecific: Record<string, readonly EventTemplate[]> = {};
  for (const stateId of getGeographyStateIds(geographyRegistry)) {
    stateSpecific[stateId] = buildStateSpecificEvents(stateId);
    travelStateSpecific[stateId] = buildTravelStateSpecificEvents(stateId);
  }

  return {
    globalCommon: buildGlobalCommonPool(),
    stateSpecific: stateSpecific as EventPools["stateSpecific"],
    travelStateSpecific: travelStateSpecific as EventPools["travelStateSpecific"],
    nodeSpecific: buildNodeSpecificEvents(locations),
    travelPool: buildTravelPool(),
  };
}
