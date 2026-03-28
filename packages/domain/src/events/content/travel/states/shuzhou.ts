import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Mountain Spring Rest", titleCn: "山泉歇脚", description: "A hidden spring along the mountain path yields a little value and a cleaner route forward.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Cliff Prayer Ribbon", titleCn: "崖祠彩绦", description: "Prayer ribbons and passing offerings leave a trail of rumors along the cliff road.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Mossy Steps Clarity", titleCn: "青苔醒心", description: "Cool shaded steps clear away travel heat and sharpen your breath.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Hidden Herb Footpath", titleCn: "偏径药迹", description: "A tucked-away herb footpath offers a small but worthwhile pickup.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Rope Bridge Balance", titleCn: "索桥稳步", description: "Every careful step over a mountain rope bridge becomes controlled training.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Ridge Breath", titleCn: "岭风调息", description: "Short, cold breaths on the ridge line force sharper control.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Vine Ambush", titleCn: "藤影突袭", description: "Something hidden in the vine line turns a quiet mountain road into a quick clash.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Guide's Knot Sign", titleCn: "引路结记", description: "A local guide leaves a coded knot marker that helps you avoid the worst switchbacks.", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Pack Mule Swap", titleCn: "驮队搭载", description: "A herb caravan lets you ride a stretch in exchange for a steady hand.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Ropeway Hermit", titleCn: "索道隐修", description: "A hermit on the high ropeway points out which mountain roads are too quiet for comfort.", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildShuzhouTravelEventPack() {
  return buildStateEventPack("shuzhou", ROWS, "travel");
}
