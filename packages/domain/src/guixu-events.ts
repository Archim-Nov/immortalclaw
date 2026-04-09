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
  "guixu-spirit-nexus-echo": {
    eventId: "guixu-spirit-nexus-echo",
    title: "Spirit Nexus Echo",
    content: "The nexus resonates with your dao, channeling concentrated spiritual energy through ancient ley lines.",
    summary: "attuned to the Spirit Nexus echo",
    severity: "medium",
    tags: ["guixu", "endgame", "nexus"],
    spiritStoneReward: 150,
    realmProgressReward: 15,
    rewards: { "ancient-artifact": 1 },
  },
  "guixu-void-corridor-trial": {
    eventId: "guixu-void-corridor-trial",
    title: "Void Corridor Trial",
    content: "The void corridor tests your resolve with a gauntlet of spatial distortions. Only the strong-willed pass unscathed.",
    summary: "survived the Void Corridor trial",
    severity: "high",
    tags: ["guixu", "endgame", "guardian", "shared-progress", "trial"],
    realmProgressReward: 30,
    rewards: { "legendary-artifact": 1, "ancient-artifact": 2 },
  },
  "guixu-origin-heart-awakening": {
    eventId: "guixu-origin-heart-awakening",
    title: "Origin Heart Awakening",
    content: "At the deepest layer of Guixu, the Origin Heart pulses with primordial energy. Your dao resonates with the source of all cultivation.",
    summary: "awakened the Guixu Origin Heart",
    severity: "high",
    tags: ["guixu", "endgame", "guardian", "shared-progress", "origin", "finale"],
    spiritStoneReward: 300,
    realmProgressReward: 50,
    rewards: { "legendary-artifact": 2 },
  },
};

export function getGuixuEventDefinition(eventId: string): GuixuEventDefinition | null {
  return GUIXU_EVENT_POOL[eventId] ?? null;
}
