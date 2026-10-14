import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Posted Reward Ledger",
    titleCn: "官署赏榜",
    description: "官署的赏榜上有一笔很小的赏，人不多。你按榜上的手续领了，数目和写的一样。",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Archive Margin Note",
    titleCn: "档册旁注",
    description: "档册边上有人用小字写了一句怎么把气息走匀。你照着做了一遍，只推进了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Hall of Discipline",
    titleCn: "清律定神",
    description: "中州的厅里人来人往，却都按线走。你在廊上站了一会儿，呼吸跟着慢下来。",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Patrol Drill",
    titleCn: "巡城操演",
    description: "城门外的人在操演，口令一声一声的。你在场边把同一套步子走完，进境很少。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Fugitive Sweep",
    titleCn: "缉逃交手",
    description: "缉逃的人从你身边追过去，你被挤进了巷子，免不了挨一下。事情过去以后，地上有十几枚灵石。",
    baseWeight: 0.95,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Courier Route Rehearsal",
    titleCn: "驿路演练",
    description: "驿站缺一个人把路引送到下一站。你按他们说的时辰送到，脚钱不多。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Sect Liaison Desk",
    titleCn: "接引案牍",
    description: "天衡宗的接引处让你把一叠已经核对过的纸送到侧门。纸不重，送到就有一点灵石。",
    baseWeight: 1.15,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Witness Statement",
    titleCn: "证词取舍",
    description: "官署的人暗示你，证词里改一个名字，后面的事就好办。被改的是一个没什么靠山的散修。",
    effects: {},
    moralityChoice: {
      title: "中州的证词",
      prompt: "他们要你把证词改得对那个散修不利。你是按看见的说，还是改掉那一句？",
      expiresInTicks: 6,
      options: [
        {
          id: "truth",
          label: "按看见的说",
          summary: "证词没有改，那条好走的路也就没有了。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "favor",
          label: "改掉那一句",
          summary: "名字改了，灵石随后就到。",
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
    title: "Inspection Talisman",
    titleCn: "巡检凭符",
    description: "一张盖了印的巡检符让你通过前面两道关，不必再被拦下来问。符的时效很短。",
    baseWeight: 1.1,
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildZhongzhouEventPack() {
  return buildStateEventPack("zhongzhou", ROWS);
}
