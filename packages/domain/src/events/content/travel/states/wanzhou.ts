import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Backroad Bargain", titleCn: "偏路捡利", description: "A Wanzhou backroad deal goes half-wrong for someone else and half-right for you.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Alley Notice", titleCn: "巷口小报", description: "A handwritten alley notice says more than it should about which routes have gone bad.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Teahouse Ease", titleCn: "茶棚歇气", description: "A quick stop in a noisy teahouse leaves your mind oddly steadier.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Pawn Parcel", titleCn: "当铺漏包", description: "A pawn courier drops a side parcel and never notices before you do.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Crowd Weave", titleCn: "穿巷练步", description: "Threading through packed streets and side roads sharpens movement under pressure.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Rooftop Pace", titleCn: "屋脊轻身", description: "A quick stretch over low roofs and walls leaves your senses sharper.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Rogue Probe", titleCn: "邪修试脚", description: "A wandering rogue cultivator tests whether you belong on this road at all.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Escort Favor", titleCn: "镖路人情", description: "Someone remembers an old favor and folds you into a better-guarded route for one leg.", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Runner's Message", titleCn: "跑单传话", description: "A fast runner pays for a quiet relay that only a traveler already moving can handle.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Teahouse Debt Rumor", titleCn: "茶肆债闻", description: "A debt rumor from the teahouse tells you which road is about to turn violent.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildWanzhouTravelEventPack() {
  return buildStateEventPack("wanzhou", ROWS, "travel");
}
