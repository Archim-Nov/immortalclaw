import type { NodeType, StateId } from "../constants.js";
import type { EventTemplate } from "../events.js";
import type { Location } from "../model.js";

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

    const event: EventTemplate = {
      id: `${locationId}-node-01`,
      layer: "node-specific",
      source: "exploration",
      semanticType: location.nodeType === "wilderness" ? "fortune" : "training",
      resultType: location.nodeType === "wilderness" ? "resource" : "combat",
      name: `${location.name} Local Trigger`,
      nameCn: `${location.name}本地触发`,
      description: `A node-specific event tied to ${location.name}.`,
      baseWeight: 1,
      stateId: location.stateId as StateId,
      nodeType: location.nodeType as NodeType,
      minRealm: null,
      effects:
        location.nodeType === "wilderness"
          ? { spiritStones: 28, itemRewards: [{ itemId: "spirit-ore", count: 1 }] }
          : { qi: -12, spiritStones: 30, itemRewards: [{ itemId: "ruin-fragment", count: 1 }] },
    };

    nodeSpecific[locationId] = [event];
  }
  return nodeSpecific;
}
