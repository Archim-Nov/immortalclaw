import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Storm Lull Window", titleCn: "雷歇空档", description: "连日的雷暴终于有了短暂的间歇，天空还残留着紫色的电弧余光。趁着这个空当快步搜索了一番，找到几块被雷击暴露出来的矿石碎片。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "resource", title: "Charged Glass Fragment", titleCn: "雷玻残片", description: "路边一块被闪电击中的砂地上，凝结着一片泛着蓝光的玻璃状碎片。拾起来还有余温，这种雷熔之物在炼器坊里能换些灵石。", effects: { spiritStones: 22 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Thunder Banner Warning", titleCn: "雷旗警示", description: "驿道旁的警示旗帜被狂风吹得猎猎作响，旗面上潦草地写着几个字，标注了前方哪段路雷击最频繁。有这个提醒，至少可以绕开最危险的区域。", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "status", title: "Rainbreak Trace", titleCn: "雨断生机", description: "暴雨突然停了片刻，乌云裂开一条缝隙，阳光洒下来。趁着这难得的喘息，赶紧调整了一下混乱的气息，精神总算恢复了些许。", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Lightning Dodge Pace", titleCn: "避电疾步", description: "脚下的地面时不时泛起毛骨悚然的静电光芒，每走一步都要判断哪块石头是安全的。这种极限环境下的快速反应训练，比寻常练功有效得多。", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Static Channeling", titleCn: "引霆磨脉", description: "雷州的空气中弥漫着游离的雷灵之气，修炼者行走其间，经脉会被微弱的电流不断刺激。虽然不太舒服，但扛过去之后确实感觉通畅了一些。", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Shocked Beast Crossing", titleCn: "雷兽横冲", description: "一头被雷电激怒的妖兽从路旁冲了出来，全身噼里啪啦地放着电。仓促间只能硬接了几下再伺机反击，好在它很快就失去兴趣跑开了。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Warning Banner Road", titleCn: "警旗导路", description: "一支雷州本地的巡逻队在路口放了几面引导旗，标出了当前最安全的一段路。跟着旗帜走了一程，确实少挨了不少雷。", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Patrol Ration Share", titleCn: "巡营分粮", description: "边营的辎重官正为搬运雷季物资发愁。帮了他半天忙后，不但拿到了灵石报酬，还被塞了几个路上吃的干粮饼。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Shrine Bell Omen", titleCn: "雷祠铃讯", description: "路边雷祠里的铜铃忽然无风自鸣，声音尖锐刺耳。旁边几个老练的行路人面色一变，说这是大雷将至的前兆，赶紧加快了脚步。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildLeizhouTravelEventPack() {
  return buildStateEventPack("leizhou", ROWS, "travel");
}
