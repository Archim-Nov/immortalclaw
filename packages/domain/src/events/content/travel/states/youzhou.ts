import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Snowmarker Cache", titleCn: "雪标藏包", description: "A supply cache tucked beside a snow marker survives because most travelers never see it.", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Watchtower Message", titleCn: "哨楼传讯", description: "A brief message passed from tower to tower carries fresh route warnings.", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Coldwind Focus", titleCn: "朔风醒念", description: "A hard frontier wind cuts away hesitation and leaves your senses sharper.", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Ice Track Find", titleCn: "冰辙遗物", description: "Someone lost a small but valuable kit while forcing a cart over frozen ground.", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Border March", titleCn: "边行磨身", description: "Long border marches teach endurance through cold and repetition.", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Frostbite Control", titleCn: "寒息护脉", description: "Careful breath control keeps the cold from taking too much out of you.", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Snow Wolf Skirmish", titleCn: "雪狼扑路", description: "A hungry beast pack tests the edge of the route and your reaction speed.", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Patrol Camp Fire", titleCn: "边营借火", description: "A border patrol shares heat and route news before the weather closes again.", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Hunter's Pack Trade", titleCn: "猎包换货", description: "A frontier hunter trades spare cold-weather stock for quick route help.", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Beacon Shift Whisper", titleCn: "烽换旁话", description: "Changing watch crews quietly note which roads will stay open through the night.", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildYouzhouTravelEventPack() {
  return buildStateEventPack("youzhou", ROWS, "travel");
}
