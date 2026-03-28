import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Ferry Toll Spill", titleCn: "渡口漏银", description: "A chaotic ferry landing leaves a little silver and spirit-stone value behind.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "River Lantern Drift", titleCn: "河灯流讯", description: "Floating lanterns and boat chatter carry fresh trade rumors down the canal line.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Canal Mist", titleCn: "运河水雾", description: "A wet morning mist cools your body and keeps your circulation lively.", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Dock Ledger Loss", titleCn: "埠头散账", description: "A hurried porter leaves part of a dockside payout unclaimed for too long.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Wet Deck Footing", titleCn: "湿板练步", description: "Keeping your footing on slick river planks turns travel into training.", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Towpath Pace", titleCn: "纤路匀息", description: "Matching the rhythm of tow crews becomes a practical breathing drill.", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "River Bandit Skirmish", titleCn: "河匪试截", description: "A small river gang mistakes you for an easier mark than you are.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Canal Guild Marker", titleCn: "漕路牌记", description: "A canal guild runner marks the cleaner route ahead and waves you through.", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Broker's Shortcut", titleCn: "牙行近路", description: "A route broker folds you into an already-paid shipment path for a small cut.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Night Ferry Notice", titleCn: "夜渡牌示", description: "A quiet ferry notice warns which piers are drawing the wrong kind of attention tonight.", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildYangzhouTravelEventPack() {
  return buildStateEventPack("yangzhou", ROWS, "travel");
}
