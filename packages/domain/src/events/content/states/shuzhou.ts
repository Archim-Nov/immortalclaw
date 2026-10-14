import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Cliffside Herb Shelf",
    titleCn: "峭壁灵药",
    description: "峭壁的石缝里长着一小丛药。你只摘了够得着的几枝，下山以后换到的灵石并不多。",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Woodgrain Rune Fragment",
    titleCn: "木纹残刻",
    description: "老木上的纹路被刻过几刀。你对着那几刀把气息放慢，进境只有一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Mist Hollow Stillness",
    titleCn: "雾谷澄心",
    description: "雾谷里外面的声音听不清。你站到雾薄一点再走，心里比进谷时静。",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Ridge Path Focus",
    titleCn: "栈道凝息",
    description: "窄栈上不能大步。你把呼吸和落脚对上，走到宽处时进境很少，脚是稳的。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Vine Python Clash",
    titleCn: "藤蟒突袭",
    description: "林子边上一条藤蟒扫过来，你退了两步才站稳。把它逼开以后，地上有十几枚灵石。",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Spiritwood Pruning",
    titleCn: "灵木采枝",
    description: "一棵老灵木需要剪掉枯枝。你剪完，主人给了很少的灵石，枝子他自己留下。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Poyun Scout",
    titleCn: "破云巡山",
    description: "破云门的巡山人要你告诉他哪一段栈道松了。你说了，他按规矩给了几枚灵石。",
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Mountain Guide's Shortcut",
    titleCn: "山径引路",
    description: "向导说有一条快路，会从村民的药坡上穿过去。慢路绕开那些坡，要多走一截。",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "蜀州的两条路",
      prompt: "快路会踏坏村民的药坡，慢路不会。你走哪一条？",
      expiresInTicks: 6,
      options: [
        {
          id: "detour",
          label: "走不踩药坡的路",
          summary: "你晚到一步，坡上的药还在。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "cut-through",
          label: "从药坡上穿过去",
          summary: "你先到了，坡上被踩过的那一截不归你管。",
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
    title: "Herbalist Exchange",
    titleCn: "药农换购",
    description: "山里的药户换走你手里的普通叶子，又让你在他的棚里坐了一会儿。灵石不多，气倒平了。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "spirit-saturated", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildShuzhouEventPack() {
  return buildStateEventPack("shuzhou", ROWS);
}
