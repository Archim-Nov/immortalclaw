import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Relay Post Courtesy", titleCn: "驿站余酬", description: "A clean handoff at a Zhongzhou relay post leaves behind a practical gratuity.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "status", title: "Registry Windfall", titleCn: "官道顺气", description: "A clean official road lets your breath stay even longer than expected.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Market Bulletin", titleCn: "市榜新闻", description: "A fresh public bulletin reframes who is moving where across Zhongzhou.", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Waystation Parcel", titleCn: "驿亭遗包", description: "A parcel left at the wrong waystation turns into an easy gain for a quick traveler.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Stamped Courier Run", titleCn: "驿路疾行", description: "Trying to match the pace of official couriers improves your control in motion.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Banner Drill", titleCn: "旗路操演", description: "Maintaining posture under constant supervision leaves your senses tighter and cleaner.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Causeway Pursuit", titleCn: "长堤追缉", description: "A pursuit spills onto the causeway and drags you through a short but sharp clash.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Checkpoint Token", titleCn: "路检凭牌", description: "A traveling inspector's token buys you brief order and protection on the road ahead.", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Clerk Exchange", titleCn: "书吏换班", description: "A tired clerk pays for help moving sealed packets to the next relay line.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Patrol Roster Rumor", titleCn: "巡名旁闻", description: "A copied patrol roster reveals which routes will be watched too closely tonight.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildZhongzhouTravelEventPack() {
  return buildStateEventPack("zhongzhou", ROWS, "travel");
}
