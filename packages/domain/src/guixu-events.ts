import type { ItemId, WorldEvent } from "./model.js";

export interface GuixuEventDefinition {
  eventId: string;
  title: string;
  content: string;
  summary: string;
  severity: WorldEvent["severity"];
  tags: string[];
  spiritStoneReward?: number;
  realmProgressReward?: number;
  rewards?: Partial<Record<ItemId, number>>;
}

export const GUIXU_EVENT_POOL: Record<string, GuixuEventDefinition> = {
  "guixu-threshold-vision": {
    eventId: "guixu-threshold-vision",
    title: "Guixu Threshold Vision",
    content: "A fragmented vision from the threshold sharpens the path ahead.",
    summary: "stabilized a Guixu threshold vision",
    severity: "medium",
    tags: ["guixu", "endgame", "vision"],
    spiritStoneReward: 90,
    realmProgressReward: 12,
    rewards: { "ancient-artifact": 1 },
  },
  "guixu-abyssal-cache": {
    eventId: "guixu-abyssal-cache",
    title: "Guixu Abyssal Cache",
    content: "A sealed cache drifts out of the Guixu current with relic fragments still intact.",
    summary: "opened an abyssal cache",
    severity: "medium",
    tags: ["guixu", "endgame", "cache"],
    spiritStoneReward: 120,
    rewards: { "ancient-artifact": 1, "ruin-fragment": 1 },
  },
  "guixu-ancient-seal": {
    eventId: "guixu-ancient-seal",
    title: "Guixu Ancient Seal",
    content: "The ancient seal answers the expedition and releases an endgame relic.",
    summary: "breached the Guixu ancient seal",
    severity: "high",
    tags: ["guixu", "endgame", "guardian", "shared-progress"],
    realmProgressReward: 24,
    rewards: { "legendary-artifact": 1 },
  },
};

export function getGuixuEventDefinition(eventId: string): GuixuEventDefinition | null {
  return GUIXU_EVENT_POOL[eventId] ?? null;
}
