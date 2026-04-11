import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Ferry Toll Spill", titleCn: "渡口漏银", description: "渡口拥挤不堪，几个旅客争着上船时挤翻了一箱行李。混乱中掉落的灵石和碎银被踩进了泥里，等人群散去后拾了些回来。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "River Lantern Drift", titleCn: "河灯流讯", description: "入夜后河面上飘来一串河灯，灯罩上写着些歪歪扭扭的字。看了几盏，大部分是祈福的话，但夹在中间的一两盏倒像是在暗传什么消息。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Canal Mist", titleCn: "运河水雾", description: "清晨的运河上升起一层薄雾，水汽中夹杂着丝丝灵气。走在岸边，雾气沁入毛孔，闷热的身体逐渐凉爽下来，气血运转也顺畅了不少。", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Dock Ledger Loss", titleCn: "埠头散账", description: "码头记账的伙计走得匆忙，把一笔零散的运费落在了柜台上。等了一盏茶的工夫也没人来取，便揣了走——这种事在漾州码头并不稀奇。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Wet Deck Footing", titleCn: "湿板练步", description: "船板湿滑，每一步都要用灵力稳住脚底。在甲板上走了大半天，虽然累得够呛，但下船时明显感觉对灵力的精细控制又进了一步。", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Towpath Pace", titleCn: "纤路匀息", description: "沿着纤夫走的岸边小路跟了一程，他们拉纤时那种均匀沉稳的呼吸节奏颇有讲究。不知不觉间模仿着调整了自己的步伐，修炼居然有了微小的突破。", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "River Bandit Skirmish", titleCn: "河匪试截", description: "一条小船从芦苇丛里窜了出来，船上几个河匪举着兵器喝令停船。看清你的修为后倒也没多纠缠，但免不了一番推搡，还是磕碰了几下。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Canal Guild Marker", titleCn: "漕路牌记", description: "漕帮的跑腿在船头挂了块木牌，上面画着几个只有内行人才看得懂的符号。是标注顺流方向的暗号，跟着走果然省了不少力气。", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Broker's Shortcut", titleCn: "牙行近路", description: "一个牙行的中间人正好有条已经付过路费的航线空着一个位子。搭上去不但省了船资，沿途还听到了些关于灵材行情的有用消息。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Night Ferry Notice", titleCn: "夜渡牌示", description: "夜渡码头的告示板上贴着一张新告示，提醒近来某几个泊位附近频繁出没可疑人物。来往的船客纷纷议论，给夜行增添了一分紧张气氛。", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildYangzhouTravelEventPack() {
  return buildStateEventPack("yangzhou", ROWS, "travel");
}
