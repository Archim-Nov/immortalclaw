import { buildStateEventPack, type StateEventRow } from "../../states/template.js";

const ROWS = [
  { slot: "tr-f-01", semanticType: "fortune", resultType: "resource", title: "Mountain Spring Rest", titleCn: "山泉歇脚", description: "山路拐角处有一眼清泉从石缝间汩汩流出，在泉边歇了会儿脚。泉水冰凉，喝了几口后精神为之一振，还在泉眼附近捡到了几枚沾水的灵石。", effects: { spiritStones: 24 } },
  { slot: "tr-f-02", semanticType: "fortune", resultType: "story", title: "Cliff Prayer Ribbon", titleCn: "崖祠彩绦", description: "悬崖边的小祠上系满了各色经幡和祈愿绦带，在山风中飘摇不止。经幡上写着些过路修士留下的心愿和忠告，翻看了几条，多少有些参考价值。", effects: { reputationChange: 1 } },
  { slot: "tr-f-03", semanticType: "fortune", resultType: "status", title: "Mossy Steps Clarity", titleCn: "青苔醒心", description: "山间石阶上铺满了翠绿的青苔，空气潮湿而清凉。走在阴凉的石路上，一路赶路积攒的烦热慢慢消退，思绪重新变得清晰。", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  { slot: "tr-f-04", semanticType: "fortune", resultType: "resource", title: "Hidden Herb Footpath", titleCn: "偏径药迹", description: "在一条人迹罕至的山间小径上发现了几株生长得极好的药草。这种地方采药人很少来，药材品相明显比坊市里卖的要好。", effects: { spiritStones: 22 } },
  { slot: "tr-t-01", semanticType: "training", resultType: "progression", title: "Rope Bridge Balance", titleCn: "索桥稳步", description: "一座悬在深谷之上的索桥在风中晃荡不停，每走一步桥身就颤几下。提心吊胆地走到对岸后，发现身体的平衡感和对灵气的控制力都精进了不少。", effects: { realmProgress: 2 } },
  { slot: "tr-t-02", semanticType: "training", resultType: "status", title: "Ridge Breath", titleCn: "岭风调息", description: "山脊上的风又冷又急，每一口气都像刀片划过喉咙。不得不压缩呼吸频率、精细控制气息，走了一段后反而觉得肺腑间比平时通透。", effects: { statusEffects: [{ effectId: "insight", ticks: 2 }] } },
  { slot: "tr-t-03", semanticType: "training", resultType: "combat", title: "Vine Ambush", titleCn: "藤影突袭", description: "茂密的藤蔓间忽然窜出一个黑影，速度快得几乎来不及反应。在湿滑的山路上连退了几步才稳住身形，好在对方似乎也不想恋战。", effects: { qi: -8, spiritStones: 16 } },
  { slot: "tr-h-01", semanticType: "human", resultType: "status", title: "Guide's Knot Sign", titleCn: "引路结记", description: "路边的树枝上系着几种不同打法的绳结，是本地向导留给熟客的路标。辨认出其中的含义后，顺利避开了一段最难走的回头弯路。", effects: { spiritStones: 12, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  { slot: "tr-h-02", semanticType: "human", resultType: "resource", title: "Pack Mule Swap", titleCn: "驮队搭载", description: "一支运药材的驮队还有空位，赶驮人见你顺路便招呼上来搭个脚。帮他们看了一段路后拿了些灵石，也省了自己一段爬坡的力气。", effects: { spiritStones: 26, reputationChange: 1 } },
  { slot: "tr-h-03", semanticType: "human", resultType: "story", title: "Ropeway Hermit", titleCn: "索道隐修", description: "高处索道旁坐着一位沉默寡言的隐修，看上去在此处住了很久。问路时他淡淡地说了句：那条山路最近太安静了，不正常。言外之意不难理解。", effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
] as const satisfies readonly StateEventRow[];

export function buildShuzhouTravelEventPack() {
  return buildStateEventPack("shuzhou", ROWS, "travel");
}
