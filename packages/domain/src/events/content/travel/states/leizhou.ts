import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Storm Lull Window", titleCn: "雷歇空档", description: "A rare quiet gap between storms leaves you time to gather what the last strike exposed.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "resource", title: "Charged Glass Fragment", titleCn: "雷玻残片", description: "A heat-fused shard lies beside the road where lightning hit too close last night.", effects: { spiritStones: 22 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Thunder Banner Warning", titleCn: "雷旗警示", description: "A warning banner flaps hard enough to tell you which road is already failing.", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "status", title: "Rainbreak Trace", titleCn: "雨断生机", description: "A brief break in the storm lets your breathing catch up before the sky closes again.", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Lightning Dodge Pace", titleCn: "避电疾步", description: "Moving between charged ground and safe stone leaves your senses fully awake.", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Static Channeling", titleCn: "引霆磨脉", description: "Keeping your meridians stable in storm country counts as honest progress.", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Shocked Beast Crossing", titleCn: "雷兽横冲", description: "A beast maddened by static breaks across the road and forces a sharp response.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Warning Banner Road", titleCn: "警旗导路", description: "A thunder-watch patrol marks out the least dangerous stretch before the sky turns again.", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Patrol Ration Share", titleCn: "巡营分粮", description: "A patrol quartermaster pays out extra for help moving storm-season ration stock.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Shrine Bell Omen", titleCn: "雷祠铃讯", description: "A bell from a roadside shrine rings at the wrong moment and every veteran looks up.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildLeizhouTravelEventPack() {
  return buildStateEventPack("leizhou", ROWS, "travel");
}
