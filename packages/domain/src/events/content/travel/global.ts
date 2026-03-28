import type { EventTemplate } from "../../../events.js";

export type TravelGlobalRow = Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm">;

export function createTravelGlobalRows(): readonly TravelGlobalRow[] {
  return [
    { id: "tr-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Pickup", nameCn: "路边捡漏", description: "A minor find while moving.", baseWeight: 1, effects: { spiritStones: 20 } },
    { id: "tr-f-02", semanticType: "fortune", resultType: "status", name: "Tailwind", nameCn: "顺风赶路", description: "Momentum keeps your qi flow smooth.", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { id: "tr-f-03", semanticType: "fortune", resultType: "story", name: "Fellow Traveler", nameCn: "路遇同行", description: "A brief exchange updates local rumor maps.", baseWeight: 1, effects: { reputationChange: 1 } },
    { id: "tr-t-01", semanticType: "training", resultType: "progression", name: "Walking Insight", nameCn: "行路参悟", description: "Breath pacing yields incremental progress.", baseWeight: 1, effects: { realmProgress: 1, itemRewards: [{ itemId: "qi-common", count: 1 }] } },
    { id: "tr-t-02", semanticType: "training", resultType: "status", name: "Load Bearing", nameCn: "负重行走", description: "Sustained pace strengthens spiritual channels.", baseWeight: 1, effects: { spiritualPower: 8 } },
    { id: "tr-t-03", semanticType: "training", resultType: "combat", name: "Road Beast", nameCn: "路遇妖兽", description: "A brief clash interrupts travel.", baseWeight: 1, effects: { qi: -8, spiritStones: 16 } },
    { id: "tr-h-01", semanticType: "human", resultType: "resource", name: "Passing Merchant", nameCn: "过路商人", description: "Trade intel translates into a small gain.", baseWeight: 1, effects: { spiritStones: 25 } },
    { id: "tr-h-02", semanticType: "human", resultType: "story", name: "Roadside Notice", nameCn: "路边告示", description: "A posted notice hints at regional flux.", baseWeight: 1, effects: {} },
    { id: "tr-h-03", semanticType: "human", resultType: "combat", name: "Bandit Blockade", nameCn: "山匪截路", description: "Bandits force a rough pass-through.", baseWeight: 1, effects: { qi: -10, spiritStones: 24 } },
  ];
}
