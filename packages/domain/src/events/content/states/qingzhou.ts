import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Qinglan Spirit Herb",
    titleCn: "青岚灵草",
    description: "青岚城外的药坡一层层叠上去，坡脚常有人漏下几株还沾土的叶子。捡起来并不起眼，拿到镇口也只够换一小把灵石。",
    baseWeight: 1.15,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Old Cultivator Stele",
    titleCn: "古修残碑",
    description: "坡道边倒着半块旧碑，字只剩三行。你对着残句把气息走了一遍，丹田里多了一点很稳的热。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Pinewind Spring",
    titleCn: "松风洗尘",
    description: "松林下面有一眼不深的泉。掬水洗脸的时候，路上的尘沉下去，接下来这一程会好走些。",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Creekside Breathing",
    titleCn: "溪畔吐纳",
    description: "溪边的石头被水磨得很平。你把呼吸放慢，跟着水声走了几个周天，进境不多，但是干净的。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Low-Tier Beast Trail",
    titleCn: "幼阶妖踪",
    description: "药径上窜出一头毛色发灰的小兽。把它逼开以后，爪缝里掉出十几枚灵石。",
    baseWeight: 0.85,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Springwater Gathering",
    titleCn: "灵泉汲露",
    description: "泉眼旁边的石槽里积着一层薄露。你按老办法收了一小瓶，回头只够换几枚灵石。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Cangmu Messenger",
    titleCn: "苍木传讯",
    description: "苍木谷的传讯弟子在路口等人，手里一封不重的信。送到百草镇的收药棚，棚里会给灵石，也不会问你的来路。",
    baseWeight: 1.05,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Hidden Herb Keeper",
    titleCn: "山中药叟",
    description: "山里的药叟说，有一块别人还没找到的药地。他可以把路告诉你，条件是你去把其他采药的人引开。",
    effects: {},
    moralityChoice: {
      title: "青州药叟",
      prompt: "药叟答应告诉你一块别人没找到的药地，条件是你去把其他采药的人引开。你怎么答？",
      expiresInTicks: 6,
      options: [
        {
          id: "share",
          label: "把路公开",
          summary: "不把人引开，坡上的路仍谁都能走。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "hoard",
          label: "按他说的把人引开",
          summary: "别人被引开以后，那块地里的东西归你。",
          moralityDelta: -3,
          effectBundle: {
            spiritStones: 35,
          },
        },
      ] as const,
    },
  },
  {
    slot: "h-03",
    semanticType: "human",
    resultType: "status",
    title: "Medicinal Plot Purchase",
    titleCn: "药圃收购",
    description: "药圃的人看见你筐里的叶子干净，当场就收了，还指了指西坡，说那边今天还没被人踩乱。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildQingzhouEventPack() {
  return buildStateEventPack("qingzhou", ROWS);
}
