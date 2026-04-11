import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Backroad Bargain", titleCn: "偏路捡利", description: "万州的小巷里从来不缺意外之财。一桩路边交易出了岔子，卖家摔门而去，留在摊上的几枚灵石和零碎物件便宜了路过的你。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Alley Notice", titleCn: "巷口小报", description: "巷口墙上贴着一张手写的小报，内容不知道是谁漏出来的。上面列了几条最近出事的路段和几个被通缉的名字，读完后对周围的局势多了几分了解。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Teahouse Ease", titleCn: "茶棚歇气", description: "拐进一家嘈杂的茶棚要了碗粗茶。周围吵得很，但坐了一会儿之后反而觉得心神安定了不少——大概是太久没在热闹地方歇过脚了。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Pawn Parcel", titleCn: "当铺漏包", description: "当铺伙计往外送东西时掉了个小包在路边，等了一阵也没人来找。打开一看是几枚品相普通的灵石和一块不知做什么用的玉牌。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Crowd Weave", titleCn: "穿巷练步", description: "万州的街巷永远挤满了人，在人群中快步穿行本身就是一种考验。左闪右避间身法越来越灵活，等出了闹市区，竟觉得脚步轻盈了不少。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Rooftop Pace", titleCn: "屋脊轻身", description: "为了抄近路翻上了低矮的屋顶，沿着瓦脊跑了一段。脚下是滑溜溜的瓦片，稍有不慎就会摔下去，但跑完之后感官确实敏锐了许多。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Rogue Probe", titleCn: "邪修试脚", description: "巷子深处一个游荡的散修拦住去路，上下打量了几眼后出手试探。看得出他并非真心想打，只是在判断你够不够格走这条路。几招之后他便闪身让开了。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Escort Favor", titleCn: "镖路人情", description: "一个老镖师认出了你，说早年有过一面之缘。二话不说便把你编进了他的护送队列，走了一段有人罩着的安全路。", effects: { spiritStones: 12, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Runner's Message", titleCn: "跑单传话", description: "一个信差急着赶往下一站，但手里还有个顺路的单子没人送。见你正好往那个方向走，便把信和酬劳一块塞了过来。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Teahouse Debt Rumor", titleCn: "茶肆债闻", description: "茶肆角落里两个人压低声音聊着最近的债务纠纷，说是某家势力欠了钱还不上，闹得手下人都开始在路上讨生活了。这种事一多，路就不太平了。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildWanzhouTravelEventPack() {
  return buildStateEventPack("wanzhou", ROWS, "travel");
}
