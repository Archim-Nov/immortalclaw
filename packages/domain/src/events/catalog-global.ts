import type { EventTemplate } from "../events.js";

export function buildGlobalCommonPool(): EventTemplate[] {
  const rows: Array<Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm">> = [
    { id: "g-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Spirit Herb", nameCn: "路边灵草", description: "A low-grade herb patch adds value to your satchel.", baseWeight: 1, effects: { spiritStones: 40 } },
    { id: "g-f-02", semanticType: "fortune", resultType: "resource", name: "Abandoned Pouch", nameCn: "废弃储物袋", description: "A weathered pouch still holds a few stones.", baseWeight: 1, effects: { spiritStones: 60 } },
    { id: "g-f-03", semanticType: "fortune", resultType: "progression", name: "Broken Stele Insight", nameCn: "残碑感悟", description: "A fragmentary carving stirs a brief realization.", baseWeight: 1, effects: { realmProgress: 3 } },
    { id: "g-f-04", semanticType: "fortune", resultType: "status", name: "Spirit Spring", nameCn: "灵泉浸泡", description: "A hidden spring calms the breath and mind.", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 3 }] } },
    { id: "g-f-05", semanticType: "fortune", resultType: "story", name: "Crane Crossing", nameCn: "路遇仙鹤", description: "A crane circles overhead and leaves an omen.", baseWeight: 1, effects: { karmaChange: 1 } },
    { id: "g-t-01", semanticType: "training", resultType: "progression", name: "Solo Practice", nameCn: "独自参悟", description: "A clean cycle yields practical progress.", baseWeight: 1, effects: { realmProgress: 2 } },
    { id: "g-t-02", semanticType: "training", resultType: "status", name: "Walking Breath", nameCn: "行走练气", description: "Breath control while moving triggers a short surge.", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { id: "g-t-03", semanticType: "training", resultType: "resource", name: "Foraging Drill", nameCn: "采药锻炼", description: "The route doubles as a gathering session.", baseWeight: 1, effects: { spiritStones: 25 } },
    { id: "g-t-04", semanticType: "training", resultType: "combat", name: "Wild Beast", nameCn: "野兽遭遇", description: "A minor beast tests your footing.", baseWeight: 1, effects: { qi: -8, spiritStones: 20 } },
    { id: "g-t-05", semanticType: "training", resultType: "story", name: "Senior's Hint", nameCn: "路遇前辈", description: "A passing senior leaves one cryptic sentence.", baseWeight: 1, effects: { reputationChange: 1 } },
    { id: "g-h-01", semanticType: "human", resultType: "resource", name: "Rogue Request", nameCn: "散修求助", description: "Helping another rogue cultivator pays modestly.", baseWeight: 1, effects: { spiritStones: 30, reputationChange: 1 } },
    { id: "g-h-02", semanticType: "human", resultType: "status", name: "Old Acquaintance", nameCn: "路遇故人", description: "A familiar face boosts your confidence.", baseWeight: 1, effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
    { id: "g-h-03", semanticType: "human", resultType: "story", name: "Teahouse Rumor", nameCn: "茶摊消息", description: "A rumor reframes local movement and risk.", baseWeight: 1, effects: { karmaChange: 1 } },
    { id: "g-h-04", semanticType: "human", resultType: "combat", name: "Road Ambush", nameCn: "遭遇劫道", description: "Bandits force a short clash on the road.", baseWeight: 1, effects: { qi: -10, spiritStones: 25 } },
    { id: "g-h-05", semanticType: "human", resultType: "resource", name: "Merchant Cooperation", nameCn: "商旅互助", description: "A caravan shares route pay for escort help.", baseWeight: 1, effects: { spiritStones: 50 } },
  ];

  return rows.map((event) => ({
    ...event,
    layer: "global-common",
    source: "exploration",
    stateId: null,
    nodeType: null,
    minRealm: null,
  }));
}
