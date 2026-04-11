import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Tide Road Salvage", titleCn: "潮路捞余", description: "退潮后的滩涂上残留着不少被浪头冲上来的杂物。翻捡了一番，在贝壳和碎石之间找到几枚还能用的灵石和一小包药粉。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Gullsign Current", titleCn: "海鸟识流", description: "一群海鸟绕着港口低飞盘旋，老渔民说这是涨潮前的征兆。果然不多时海水便漫上了几条小路，提前绕道避开了不少麻烦。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Sea Wind Clarity", titleCn: "海风净息", description: "码头尽头猛然吹来一阵咸腥的海风，呛得人眯了眯眼。但风过之后，胸口积郁的闷气竟一扫而空，脑子也跟着清醒了不少。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Drift Crate", titleCn: "漂箱余货", description: "一只脱了缆绳的货箱在浅水区晃晃悠悠地漂着，没人来认领。趟水过去打开一看，里面还剩些灵石和几件不值钱的杂货。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Jetty Balance", titleCn: "栈桥稳身", description: "湿滑的栈桥在海浪拍打下微微晃动，每一步都得格外小心。走到对岸时发现，这段路比刻意练功还管用，身体的平衡感明显好了一截。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Harbor Breath", titleCn: "港风调息", description: "港口码头上搬货的脚夫们有种独特的呼吸节奏，一吸一放间效率极高。模仿着走了一段路，竟发现自己的行路呼吸也变得平稳有力。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Reef Hound Clash", titleCn: "礁犬扑袭", description: "礁石滩上窜出一头半野化的妖兽，毛色灰暗，眼里透着凶光。在湿滑的石面上缠斗了几个回合后将它驱退，身上溅了不少海水。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Harbor Pilot Mark", titleCn: "引港记号", description: "一位老引港人在墙角用粉笔画了几个记号，说是给熟客留的航线暗号。跟着记号走了一段，果然避开了几处拥堵和盘查。", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Dock Broker Fee", titleCn: "埠商搭单", description: "码头上一位中间商正忙着调配货运路线。见你顺路，便将你编入了一趟已付费的运输队列，省了路费不说，还搭了段顺风船。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Reef Diver Rumor", titleCn: "礁潜旁讯", description: "几个礁石潜水的采珠人凑在一起嘀咕，说最近有条近路变得不太平，好像有什么东西从海底遗迹里跑了出来。听着像是夸张，但还是多留了个心眼。", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildCangzhouTravelEventPack() {
  return buildStateEventPack("cangzhou", ROWS, "travel");
}
