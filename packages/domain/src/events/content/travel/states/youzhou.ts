import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Snowmarker Cache", titleCn: "雪标藏包", description: "雪地里一根不起眼的标杆旁边，积雪下埋着一个小包裹。是边防巡逻队留下的应急补给，灵石和几包药粉保存得还算完好。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Watchtower Message", titleCn: "哨楼传讯", description: "远处的哨楼上升起一缕特殊的狼烟，旁边的旅客说这是最新的路况信号。看懂了烟色和方向的含义后，大致判断出前方哪段路能走、哪段不行。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Coldwind Focus", titleCn: "朔风醒念", description: "北方的寒风如刀刃般刮过面颊，冻得人直缩脖子。但正是这种刺骨的冷意把脑子里多余的杂念全部驱散了，意识反而变得前所未有地清醒。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Ice Track Find", titleCn: "冰辙遗物", description: "结冰的车辙旁散落着些零碎物件，看样子是某辆货车在冰路上颠翻时遗落的。捡了几枚灵石和一小包冻硬的药材，聊胜于无。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Border March", titleCn: "边行磨身", description: "沿着边境线走了很长一段，脚下是硬冻的土地，头顶是灰蒙蒙的天。虽然又冷又单调，但这种高强度的长途行军确实在不知不觉中磨练了体魄和意志。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Frostbite Control", titleCn: "寒息护脉", description: "气温低到了灵力都快凝滞的地步，不得不加大对经脉的灵气输送才能维持正常的行动。这种被动的灵力消耗反而起到了疏通经脉的效果。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Snow Wolf Skirmish", titleCn: "雪狼扑路", description: "几头灰毛雪狼从雪堆后面包抄过来，为首的那只体型比普通狼大了一圈。一番搏斗后将它们驱散，但灵力也消耗了不少。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Patrol Camp Fire", titleCn: "边营借火", description: "路过一处边防哨营时，巡逻队正围着篝火烤手。在他们那儿暖了暖身子，顺便打听到了前方几段路的最新情况。", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Hunter's Pack Trade", titleCn: "猎包换货", description: "一个边境猎户背着一大包皮货和妖兽碎片，正愁着没人收。帮他搬了一程后以低于市价的价格拿了些灵材，双方都觉得合算。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Beacon Shift Whisper", titleCn: "烽换旁话", description: "换班的烽火台守卫三三两两地走过，低声聊着最近的动向。有人说东边那条路今晚会封，有人说西边来了批来历不明的人。消息真假参半，但总比两眼一抹黑强。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildYouzhouTravelEventPack() {
  return buildStateEventPack("youzhou", ROWS, "travel");
}
