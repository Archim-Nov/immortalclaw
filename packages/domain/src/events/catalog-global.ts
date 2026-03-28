import type { EventTemplate } from "../events.js";

import { createExplorationGlobalRows } from "./content/exploration/global.js";

export function buildGlobalCommonPool(): EventTemplate[] {
  return createExplorationGlobalRows().map((event) => ({
    ...event,
    layer: "global-common",
    source: "exploration",
    stateId: null,
    nodeType: null,
    minRealm: event.minRealm ?? null,
  }));
}
