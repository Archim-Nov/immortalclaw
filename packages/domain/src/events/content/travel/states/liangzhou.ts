import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Caravan Sweepings", titleCn: "商队余捡", description: "一支赶路的商队在仓促拔营时丢下了几包杂物。等他们走远后翻了翻，里面除了干粮碎渣，竟还夹着几枚灵石和一小瓶辟尘散。", effects: { spiritStones: 26 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Oasis Glint", titleCn: "绿洲浮影", description: "远处沙丘背后隐约透出一片绿意，走近才发现是个小绿洲。几个歇脚的行商正在议论前方的水井哪口还能用、哪条路最近又塌了方。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Drywind Reserve", titleCn: "燥风蓄息", description: "一阵干燥炙热的风迎面扑来，灵力不由自主地收缩凝聚。等风头过去后，体内的灵气反而比之前紧实了几分，像是被烤干了水分。", effects: { statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Salt Route Cache", titleCn: "盐路藏包", description: "老盐道的路标旁有个不起眼的石堆，拨开几块石头，下面藏着一个油布包。看样子是跑盐路的人留的应急储备，里面的灵石和药粉还能用。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "status", title: "Dunewind Endurance", titleCn: "风沙耐行", description: "沙尘打在脸上生疼，每一步都像在跟大漠较劲。但咬牙扛过了最猛的一阵风后，感觉对环境的适应力提升了不少，连呼吸都顺畅了。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-02", semanticType: "training", resultType: "progression", title: "Sandstep Progression", titleCn: "沙步磨劲", description: "松软的沙地让每一步都比平地费力数倍，走着走着却发现脚下的发力方式在无意间改变了，变得更加省力精准。这大概就是所谓的苦中有得。", effects: { realmProgress: 2 } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Scorpion Track", titleCn: "沙蝎拦踪", description: "沙地里突然翻出一只体型不小的蝎形妖虫，两只钳子张开就夹了过来。在流沙中站稳身形本就不易，好在几招之后总算将它制住了。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Water Seller's Tip", titleCn: "卖水人的路话", description: "路边一个卖水的老汉递过一碗凉水，顺嘴提了一句：前面那个岔路口右边走比较稳当，左边最近不太平。简单几句话，或许能省下不少麻烦。", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Quartermaster Weighing", titleCn: "辎官称货", description: "边关辎重官正在为一批物资过秤，人手不足忙得焦头烂额。搭了把手帮他称完了最后几筐，对方二话不说便付了酬劳。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Caravan Bell Warning", titleCn: "驼铃警讯", description: "暮色中远处传来一串急促的驼铃声，节奏跟平时不一样。经验丰富的行商说，那是示警的铃声，意味着前方那条路今晚最好别走。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildLiangzhouTravelEventPack() {
  return buildStateEventPack("liangzhou", ROWS, "travel");
}
