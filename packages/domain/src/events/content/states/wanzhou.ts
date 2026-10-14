import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Favor Returned",
    titleCn: "人情回礼",
    description: "有人把上次的事折成几枚灵石放在你的茶钱下面，人没有露面。",
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Pawnshop Secret Ledger",
    titleCn: "当铺密账",
    description: "当铺后间的账页写着谁的东西还在赎回期内。你看懂了一页，气息没有因此乱。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "Teahouse Ease",
    titleCn: "茶棚歇气",
    description: "茶棚里很吵。你坐到一碗茶喝完，心跳反而比进门时慢。",
    baseWeight: 1.05,
    effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Backstreet Spar",
    titleCn: "巷战磨手",
    description: "巷子里两个人过手，你从边上走过去，没有被带进去。步子因此更短，进境只有一点。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Rogue Cultivator Probe",
    titleCn: "邪修试探",
    description: "一个散修在巷口试了你两下，确认你不是来讨债的就让开。地上掉了十几枚灵石。",
    baseWeight: 1.05,
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Market Sweep",
    titleCn: "坊市捡漏",
    description: "坊市里人挤人。你在收摊前看见一处没人要的找零，数目很小。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Old Contact's Message",
    titleCn: "旧识传话",
    description: "一个认得你的人让你把一句短话带到茶桥，不要拆开看。带到以后，他给了几枚灵石。",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Debt Collector's Choice",
    titleCn: "债账取舍",
    description: "欠账的人求你再宽一天，又指了另一个更好拿的人。今天这份他还拿得出来。",
    baseWeight: 1.1,
    effects: {},
    moralityChoice: {
      title: "宛州的欠账",
      prompt: "欠账的人求你再宽一天。你是把今天这份缓一缓，还是现在就把他身上剩下的拿齐？",
      expiresInTicks: 6,
      options: [
        {
          id: "delay",
          label: "再宽一天",
          summary: "今天这份没有收齐，这个人下次还见得着你。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "collect",
          label: "现在拿齐",
          summary: "灵石齐了，这个人不会再把话带到你面前。",
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
    title: "Escort Handshake",
    titleCn: "镖路搭手",
    description: "镖队让你跟到下一个巷口。这一段有人看着，灵石按说好的给。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildWanzhouEventPack() {
  return buildStateEventPack("wanzhou", ROWS);
}
