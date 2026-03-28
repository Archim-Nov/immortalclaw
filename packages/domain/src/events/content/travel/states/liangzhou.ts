import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Caravan Sweepings", titleCn: "商队余捡", description: "A hard-run caravan leaves small but real value behind whenever it breaks camp in haste.", effects: { spiritStones: 26 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Oasis Glint", titleCn: "绿洲浮影", description: "A brief oasis stop fills the route with rumors of safer wells and worse roads.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Drywind Reserve", titleCn: "燥风蓄息", description: "A hard desert wind forces tighter control and leaves your spirit more compact.", effects: { statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Salt Route Cache", titleCn: "盐路藏包", description: "A hidden salt-route stash gives just enough profit to matter on a long march.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Dunewind Endurance", titleCn: "风沙耐行", description: "Holding your pace through dust and glare turns pure hardship into usable training.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Sandstep Progression", titleCn: "沙步磨劲", description: "Walking loose dunes teaches economy of motion if you survive the repetition.", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Scorpion Track", titleCn: "沙蝎拦踪", description: "A desert predator mistakes your shadow for a meal and learns otherwise.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Water Seller's Tip", titleCn: "卖水人的路话", description: "A roadwise water seller points you toward the safer side of the caravan line.", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Quartermaster Weighing", titleCn: "辎官称货", description: "A frontier quartermaster pays you to help settle one more load before dusk.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Caravan Bell Warning", titleCn: "驼铃警讯", description: "The pattern of bells on the evening wind tells experienced travelers which line to avoid.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildLiangzhouTravelEventPack() {
  return buildStateEventPack("liangzhou", ROWS, "travel");
}
