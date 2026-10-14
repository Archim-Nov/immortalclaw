import { buildStateEventPack, type StateEventRow } from "./template.js";

const ROWS = [
  {
    slot: "f-01",
    semanticType: "fortune",
    resultType: "resource",
    title: "Tide Pearl Drift",
    titleCn: "潮珠漂岸",
    description: "潮水退下去以后，河岸上留下几枚被水泡发暗的灵石，是过船的人没捞起来的。",
    baseWeight: 1.1,
    effects: { spiritStones: 45 },
  },
  {
    slot: "f-02",
    semanticType: "fortune",
    resultType: "progression",
    title: "Canal Marker Script",
    titleCn: "河渠碑记",
    description: "河渠边的旧碑记着水位和船程。你对着那些数字把呼吸放慢，只推进了一点。",
    effects: { realmProgress: 4 },
  },
  {
    slot: "f-03",
    semanticType: "fortune",
    resultType: "status",
    title: "River Mist Tailwind",
    titleCn: "江雾顺风",
    description: "江面上的风贴着走，衣袖是湿的，气息却比在干路上顺。",
    baseWeight: 1.1,
    effects: { statusEffects: [{ effectId: "qi-surge", ticks: 4 }] },
  },
  {
    slot: "t-01",
    semanticType: "training",
    resultType: "progression",
    title: "Boatline Footwork",
    titleCn: "桨路步法",
    description: "湿船板上不好站。你走完这一段没有滑倒，脚下的稳比进境更明显，进境仍有一点。",
    effects: { realmProgress: 3 },
  },
  {
    slot: "t-02",
    semanticType: "training",
    resultType: "combat",
    title: "Reedbank Waterfiend",
    titleCn: "芦汀水妖",
    description: "芦苇里窜出一头不大的水兽，把你的路挡了一下。把它逼开以后，岸边留下十几枚灵石。",
    effects: { qi: -9, spiritStones: 20 },
  },
  {
    slot: "t-03",
    semanticType: "training",
    resultType: "resource",
    title: "Dockside Salvage",
    titleCn: "码头打捞",
    description: "码头的人在打捞一只翻了的箱子，让你帮着拉绳。拉上来的东西不多，分给你的灵石也不多。",
    effects: { spiritStones: 35 },
  },
  {
    slot: "h-01",
    semanticType: "human",
    resultType: "resource",
    title: "Guild Ledger Errand",
    titleCn: "商会跑单",
    description: "商会的人把一封短签交给你，只要送到下一个拥挤的埠头。送到以后，脚钱按说好的给。",
    baseWeight: 1.1,
    effects: { spiritStones: 35, reputationChange: 1 },
  },
  {
    slot: "h-02",
    semanticType: "human",
    resultType: "story",
    title: "Smuggler Ferry",
    titleCn: "夜渡私船",
    description: "夜里有一条不挂牌的船，船夫说你可以搭，只要不问舱里另外那几口箱子。",
    baseWeight: 1.05,
    effects: {},
    moralityChoice: {
      title: "扬州夜渡",
      prompt: "船夫说，你若不问舱里的箱子，就给你一份。你是把这条船报出去，还是收下这份？",
      expiresInTicks: 6,
      options: [
        {
          id: "report",
          label: "把这条船报出去",
          summary: "船还在，货没有进你的袋子，埠头的人知道了这件事。",
          moralityDelta: 3,
          effectBundle: {
            reputationChange: 1,
          },
        },
        {
          id: "ride",
          label: "收下这份",
          summary: "你过了河，那份灵石也在袋里，箱子仍没有人问。",
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
    title: "Canal Procurement",
    titleCn: "河埠采买",
    description: "河埠收货的人收了你手里的东西，又指了指下一家还在收的铺子。灵石不多，下一处你记住了。",
    effects: {
      spiritStones: 30,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly StateEventRow[];

export function buildYangzhouEventPack() {
  return buildStateEventPack("yangzhou", ROWS);
}
