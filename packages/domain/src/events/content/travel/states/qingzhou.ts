import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Herb Cart Surplus", titleCn: "药车余货", description: "A Qingzhou herb cart sheds part of its load onto the roadside and nobody notices before you do.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "status", title: "Field Shrine Breeze", titleCn: "田祠清风", description: "A quiet roadside shrine steadies your breath before the road bends away again.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Creek Ferry Rumor", titleCn: "溪渡闲话", description: "Boatmen gossip about safer routes and low-tier beast trails while waiting for the next crossing.", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Gatherer's Basket", titleCn: "采户遗篮", description: "A dropped gathering basket leaves behind enough useful stock to be worth taking.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Greenway Breathing", titleCn: "青道调息", description: "A calm road through fields and medicine plots lets you keep a smooth travel rhythm.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Ridge Path Footing", titleCn: "埂路练步", description: "Narrow raised paths force careful steps and sharper balance.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Novice Beast Detour", titleCn: "幼兽拦路", description: "A weak beast strays too close to the herb road and turns travel into a brief skirmish.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Novice Escort Route", titleCn: "护行新路", description: "A novice escort team shares its safer roadside markers before the roads split.", effects: { spiritStones: 12, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Cangmu Supply Pickup", titleCn: "苍木接货", description: "A steady sect supply hand pays for help carrying medicine stock the last stretch.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Village Herb Purchase", titleCn: "村口收药", description: "A roadside buyer points out which slopes are worth returning to after this trip.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildQingzhouTravelEventPack() {
  return buildStateEventPack("qingzhou", ROWS, "travel");
}
