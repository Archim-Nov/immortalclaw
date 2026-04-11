import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Herb Cart Surplus", titleCn: "药车余货", description: "一辆满载灵药的板车在颠簸中颤了一下，几捆扎得不牢的药材滚落路旁。等车队走远了才发现，拾起来一看，品相倒还过得去。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "status", title: "Field Shrine Breeze", titleCn: "田祠清风", description: "路过一座简朴的田间小祠，祠前挂着几缕褪色的经幡。驻足片刻，一阵清风从稻田上掠来，浮躁的心绪不知不觉间沉静了许多。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "story", title: "Creek Ferry Rumor", titleCn: "溪渡闲话", description: "溪边等渡船的时候，几个摆渡人正靠着竹篙闲聊。听了一会儿，零零碎碎地拼出了几条关于附近兽道和安全路线的消息。", effects: { reputationChange: 1 } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Gatherer's Basket", titleCn: "采户遗篮", description: "田埂尽头搁着一只竹编采药篮，里面还剩几株品相不错的灵草。看样子是哪位药农走得急落下的，左右无人，便收入囊中。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Greenway Breathing", titleCn: "青道调息", description: "穿过一段两侧种满灵药的平坦官道，草木的清香伴着微风沁入肺腑。脚步不紧不慢，呼吸自然与行路的节奏合上，修炼在不经意间推进了一小步。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Ridge Path Footing", titleCn: "埂路练步", description: "窄窄的田埂路只容一人通过，脚下是新翻的水田。走了一段之后发现注意力不知不觉高度集中，步法比在平地上练了半天还稳。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Novice Beast Detour", titleCn: "幼兽拦路", description: "药田边蹿出一头毛色杂乱的幼兽，大概是被灵药的气味引来的。它虽不算强，但扑上来时仍免不了一番搏斗，好在从它身上搜出些灵石。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Novice Escort Route", titleCn: "护行新路", description: "几名结伴而行的新手护卫主动搭话，说前面有条小路比官道安全，还在路口做了标记。虽是萍水相逢，这份善意倒也令人感念。", effects: { spiritStones: 12, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Cangmu Supply Pickup", titleCn: "苍木接货", description: "苍木宗的一名杂役正为搬运药材发愁——人手不够，期限又紧。帮了他一程后，对方爽快地付了灵石，还提了一嘴宗门最近在收什么药。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Village Herb Purchase", titleCn: "村口收药", description: "村口一位精明的药贩正在挑拣散修们送来的灵药。攀谈几句后，他指了指远处的几座山坡，说那里的药材品质不错，值得去碰碰运气。", effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildQingzhouTravelEventPack() {
  return buildStateEventPack("qingzhou", ROWS, "travel");
}
