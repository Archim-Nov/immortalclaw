import type { EventTemplate } from "../events.js";

import { createTravelGlobalRows } from "./content/travel/global.js";

export function buildTravelPool(): EventTemplate[] {
  return createTravelGlobalRows().map((event) => ({
    ...event,
    layer: "global-common",
    source: "travel",
    stateId: null,
    nodeType: null,
    minRealm: event.minRealm ?? null,
  }));
}
