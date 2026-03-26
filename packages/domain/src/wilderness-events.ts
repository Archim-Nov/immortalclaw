import type { ItemId } from "./model.js";

export interface WildernessEventDefinition {
  eventId: string;
  title: string;
  content: string;
  summary: string;
  severity: "medium" | "high";
  tags: string[];
  qiDamage?: number;
  spiritualDamage?: number;
  injuryTicks?: number;
  forcedRetreat?: boolean;
  spiritStoneReward?: number;
  rewards?: Partial<Record<ItemId, number>>;
}

export const WILDERNESS_EVENT_POOL: Record<string, WildernessEventDefinition> = {
  "wilderness-extreme-storm": {
    eventId: "wilderness-extreme-storm",
    title: "Extreme Storm",
    content: "A violent storm tears through the threshold route and burns through your reserves.",
    summary: "survived an extreme storm",
    severity: "high",
    tags: ["wilderness", "hazard", "storm"],
    qiDamage: 12,
    spiritualDamage: 10,
    injuryTicks: 2,
  },
  "wilderness-ancient-guardian": {
    eventId: "wilderness-ancient-guardian",
    title: "Ancient Guardian",
    content: "A buried guardian wakes in the dust and leaves behind a relic after the clash.",
    summary: "defeated an ancient guardian",
    severity: "high",
    tags: ["wilderness", "guardian", "encounter"],
    qiDamage: 8,
    spiritualDamage: 10,
    injuryTicks: 1,
    rewards: {
      "ancient-artifact": 1,
      "beast-core": 1,
    },
  },
  "wilderness-lost-cache": {
    eventId: "wilderness-lost-cache",
    title: "Lost Cache",
    content: "A half-buried expedition cache still holds usable supplies.",
    summary: "recovered a lost cache",
    severity: "medium",
    tags: ["wilderness", "cache", "reward"],
    spiritStoneReward: 180,
    rewards: {
      "spirit-ore": 2,
      "ruin-fragment": 1,
    },
  },
};

export function getWildernessEventDefinition(eventId: string): WildernessEventDefinition | null {
  return WILDERNESS_EVENT_POOL[eventId] ?? null;
}
