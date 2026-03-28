import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Tide Road Salvage", titleCn: "潮路捞余", description: "A receding tide leaves route-side salvage where land and harbor traffic overlap.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Gullsign Current", titleCn: "海鸟识流", description: "Birds circling the harbor mouth tell old hands which roads are about to flood.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Sea Wind Clarity", titleCn: "海风净息", description: "A strong sea wind strips away stale thought and road fatigue.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Drift Crate", titleCn: "漂箱余货", description: "A crate knocked loose from a dock line drifts closer than its owner ever will.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Jetty Balance", titleCn: "栈桥稳身", description: "Keeping balance on wet jetties and seawalls turns travel into measured practice.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Harbor Breath", titleCn: "港风调息", description: "The rhythm of port work teaches an efficient traveling breath.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Reef Hound Clash", titleCn: "礁犬扑袭", description: "A half-wild beast from the reefside track comes too close to the route.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Harbor Pilot Mark", titleCn: "引港记号", description: "A harbor pilot leaves you the same chalk marks used to guide paying ships and caravans.", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Dock Broker Fee", titleCn: "埠商搭单", description: "A dock broker folds your route into a paid cargo line for one convenient leg.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Reef Diver Rumor", titleCn: "礁潜旁讯", description: "Reef divers gossip about which harbor road now leads too close to the wrong relic.", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildCangzhouTravelEventPack() {
  return buildStateEventPack("cangzhou", ROWS, "travel");
}
