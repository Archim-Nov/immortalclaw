import type { EventTemplate } from "../events.js";
import type { Location } from "../model.js";

import { buildDungeonStateOverlayEvents } from "./catalog-node-state.js";
import { buildDungeonAEventPack } from "./content/nodes/dungeon-a.js";
import { buildDungeonBEventPack } from "./content/nodes/dungeon-b.js";
import { buildDungeonCEventPack } from "./content/nodes/dungeon-c.js";
import { buildWildernessEventPack } from "./content/nodes/wilderness.js";
import { buildWildernessStateOverlay } from "./content/nodes/wilderness-states.js";

function buildSharedNodeEventPack(location: Location): EventTemplate[] {
  switch (location.nodeType) {
    case "wilderness":
      return [...buildWildernessEventPack(location), ...buildWildernessStateOverlay(location)];
    case "dungeon-c":
      return buildDungeonCEventPack(location);
    case "dungeon-b":
      return buildDungeonBEventPack(location);
    case "dungeon-a":
      return buildDungeonAEventPack(location);
    default:
      return [];
  }
}

function buildNodeEventPack(location: Location): EventTemplate[] {
  const sharedPack = buildSharedNodeEventPack(location);
  if (
    location.nodeType === "dungeon-c"
    || location.nodeType === "dungeon-b"
    || location.nodeType === "dungeon-a"
  ) {
    return [...sharedPack, ...buildDungeonStateOverlayEvents(location)];
  }

  return sharedPack;
}

export function buildNodeSpecificEvents(locations: Record<string, Location>): Record<string, EventTemplate[]> {
  const nodeSpecific: Record<string, EventTemplate[]> = {};
  for (const [locationId, location] of Object.entries(locations)) {
    if (
      location.nodeType !== "wilderness" &&
      location.nodeType !== "dungeon-c" &&
      location.nodeType !== "dungeon-b" &&
      location.nodeType !== "dungeon-a"
    ) {
      continue;
    }

    nodeSpecific[locationId] = buildNodeEventPack(location);
  }
  return nodeSpecific;
}
