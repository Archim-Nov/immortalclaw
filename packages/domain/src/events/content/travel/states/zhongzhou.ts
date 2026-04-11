import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Relay Post Courtesy", titleCn: "驿站余酬", description: "路过一处中州官驿时，驿丞说有批小件货物需要顺路带到下一站。活不重，酬劳却还算丰厚，带到之后收了灵石便继续赶路。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "status", title: "Registry Windfall", titleCn: "官道顺气", description: "中州的官道修葺一新，路面平整宽阔，两旁还种了些聚灵的矮树。走在这样的路上，呼吸格外顺畅，气息运转也不知不觉间平稳了许多。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Market Bulletin", titleCn: "市榜新闻", description: "驿道旁的布告栏上贴满了新发的告示，有坊市行情、有悬赏通缉、还有几张关于修士集会的通知。扫了一遍后，对中州近期的风向有了大致的了解。", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Waystation Parcel", titleCn: "驿亭遗包", description: "驿亭的长凳下塞着一个被遗忘的小包裹，问了驿丞，说已经过了认领期限。拆开来里面是几枚灵石和一份过期的路引文书。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Stamped Courier Run", titleCn: "驿路疾行", description: "试着跟了一段官驿快马的速度赶路，虽然跟不了太久，但那种全力冲刺的节奏把灵力运转挤压到了极限，收获比慢悠悠走一天都大。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Banner Drill", titleCn: "旗路操演", description: "路过一处官兵操练场，旗帜招展，口令声此起彼伏。在这种严整的氛围中走过，不自觉地挺直了腰板、收紧了心神。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Causeway Pursuit", titleCn: "长堤追缉", description: "长堤上忽然冲过来一群追逐逃犯的官差，混乱中你被卷了进去。虽然不是冲你来的，但挡在路上免不了被推搡几下，花了些灵力才脱身。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Checkpoint Token", titleCn: "路检凭牌", description: "一位路过的巡检官见你面善，随手给了块通行令牌，说拿着这个走前面那几个关卡会省事不少。果然一路畅通，没有被拦下盘问。", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Clerk Exchange", titleCn: "书吏换班", description: "驿站的书吏正在换班，一堆密封好的公文袋需要送到隔壁驿站。帮着跑了一趟腿，对方从公账里支了些灵石作为跑腿费。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Patrol Roster Rumor", titleCn: "巡名旁闻", description: "茶摊上有人把一份抄来的巡逻排班表摊在桌上，旁边几个精明的商人正在分析今晚哪段路会被巡逻队盯得最紧。偷听了几句，记下了大概的时间和路段。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildZhongzhouTravelEventPack() {
  return buildStateEventPack("zhongzhou", ROWS, "travel");
}
