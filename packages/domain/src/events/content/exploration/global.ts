import type { EventTemplate } from "../../../events.js";
import { deriveSignalType } from "../../../events.js";

import { createExplorationSceneRows } from "../scene-choices.js";
import { createExplorationGlobalFlavorRows } from "./global-flavor.js";
import { createExplorationGlobalMoreRows } from "./global-more.js";

export type ExplorationGlobalRow =
  Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm" | "signalType">
  & { readonly minRealm?: EventTemplate["minRealm"] };

function withSignal(row: ExplorationGlobalRow): ExplorationGlobalRow & { signalType: EventTemplate["signalType"] } {
  return { ...row, signalType: deriveSignalType(row.resultType, row.effects) };
}

export function createExplorationGlobalRows(): readonly (ExplorationGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    ...createExplorationGlobalBaseRows(),
    ...createExplorationGlobalMoreRows(),
    ...createExplorationGlobalFlavorRows(),
    ...createExplorationSceneRows(),
  ];
}

function createExplorationGlobalBaseRows(): readonly (ExplorationGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    withSignal({ id: "g-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Spirit Herb", nameCn: "路边灵草", description: "路旁一丛低矮的灵草藏在碎石堆后面，叶片泛着微弱的荧光。虽是下品药材，摘下来塞进储物袋倒也能换几枚灵石。", baseWeight: 0.7, effects: { spiritStones: 40 } }),
    withSignal({ id: "g-f-02", semanticType: "fortune", resultType: "resource", name: "Abandoned Pouch", nameCn: "废弃储物袋", description: "树根缝隙里夹着一只破旧的储物袋，袋口的禁制已经失效。打开一看，里面还残存着几十枚灵石和一些碎杂之物。", baseWeight: 0.7, effects: { spiritStones: 60 } }),
    withSignal({ id: "g-f-03", semanticType: "fortune", resultType: "progression", name: "Broken Stele Insight", nameCn: "残碑感悟", description: "半截石碑歪倒在苔藓中，上面刻着几行繁体铭文。细看之下似乎是某位前辈留下的道法心得，虽然残缺不全，但仍引发了片刻的体悟。", baseWeight: 0.7, effects: { realmProgress: 3, itemRewards: [{ itemId: "cloud-heart-grass", count: 1 }] } }),
    withSignal({ id: "g-f-04", semanticType: "fortune", resultType: "status", name: "Spirit Spring", nameCn: "灵泉洗尘", description: "山脚下一汪清泉从石缝中渗出，水面浮着淡淡的灵气雾霭。掬一捧洗了洗脸，混浊的意识登时清醒不少，心绪也平静下来。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 3 }] } }),
    withSignal({ id: "g-f-05", semanticType: "fortune", resultType: "story", name: "Crane Crossing", nameCn: "路遇仙鹤", description: "头顶忽然投下一片阴影，抬头望去，一只白鹤正盘旋着掠过树梢。它绕了两圈后向东飞去，像是某种无言的指引。", baseWeight: 0.7, effects: {} }),
    withSignal({ id: "g-t-01", semanticType: "training", resultType: "progression", name: "Solo Practice", nameCn: "独自参悟", description: "找了一处背风的岩坳盘膝而坐，按照功法运转了几个周天。这次格外顺畅，收功时能感觉到灵力比之前厚实了一丝。", baseWeight: 0.7, effects: { realmProgress: 2, itemRewards: [{ itemId: "moon-dew-flower", count: 1 }] } }),
    withSignal({ id: "g-t-02", semanticType: "training", resultType: "status", name: "Walking Breath", nameCn: "行走练气", description: "一边走路一边调息，呼吸的节奏渐渐与脚步合拍。走了约莫半个时辰后，丹田处涌起一股暖流，气息变得绵长而有力。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } }),
    withSignal({ id: "g-t-03", semanticType: "training", resultType: "resource", name: "Foraging Drill", nameCn: "采药锻炼", description: "沿途注意到不少常见灵药的踪迹，顺手采了一些。虽然品级不高，但积少成多，在坊市里多少能换些灵石。", baseWeight: 0.7, effects: { spiritStones: 25 } }),
    withSignal({ id: "g-t-04", semanticType: "training", resultType: "combat", name: "Wild Beast", nameCn: "野兽遭遇", description: "灌木丛中窜出一头灰毛野兽，张牙舞爪地扑了上来。虽然不是什么强劲的妖物，但仓促近身也免不了一番纠缠，好在最后还搜出了些灵石。", baseWeight: 0.7, effects: { qi: -8, spiritStones: 20 } }),
    withSignal({ id: "g-t-05", semanticType: "training", resultType: "story", name: "Senior's Hint", nameCn: "路遇前辈", description: "一位衣着朴素的老者从对面走来，经过时忽然停步说了句意味深长的话。等你回头想追问，那人已经走远了。话虽简短，却在脑海里久久回荡。", baseWeight: 0.7, effects: { reputationChange: 1 } }),
    {
      ...withSignal({
        id: "g-h-01",
        semanticType: "human",
        resultType: "resource",
        name: "Rogue Request",
        nameCn: "散修求助",
        description: "路边一位散修狼狈地拦住你，说他刚被人劫了灵石，身上还剩些许但不敢独行。你需要决定是护送他一程，还是趁火打劫。",
        baseWeight: 0.7,
        effects: {},
      }),
      moralityChoice: {
        title: "散修求助",
        prompt: "路边这个散修刚被劫过，身上还剩一点灵石，又不敢一个人走。你是护送他一程，还是把剩下的也拿走？",
        expiresInTicks: 6,
        options: [
          {
            id: "escort",
            label: "护送一程",
            summary: "把他送到下一个有人的地方，只收他硬塞过来的一点谢礼。",
            moralityDelta: 3,
            effectBundle: {
              reputationChange: 1,
              spiritStones: 20,
            },
          },
          {
            id: "extort",
            label: "把灵石拿走",
            summary: "趁他不敢声张，把袋子里剩下的灵石收下，然后离开。",
            moralityDelta: -3,
            effectBundle: {
              spiritStones: 50,
            },
          },
        ] as const,
      },
    },
    withSignal({ id: "g-h-02", semanticType: "human", resultType: "status", name: "Old Acquaintance", nameCn: "路遇故人", description: "人群中看见一张熟悉的脸，原来是早年在坊市里打过交道的修士。寒暄几句后彼此鼓了鼓劲，心底多了几分底气。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } }),
    withSignal({ id: "g-h-03", semanticType: "human", resultType: "story", name: "Teahouse Rumor", nameCn: "茶摊消息", description: "路边茶摊上三两修士正低声聊着最近的风声。你要了一碗粗茶坐在旁边听了会儿，零星拼凑出一些关于附近势力变动的情报。", baseWeight: 0.7, effects: {} }),
    {
      ...withSignal({
        id: "g-h-04",
        semanticType: "human",
        resultType: "combat",
        name: "Road Ambush",
        nameCn: "遭遇劫道",
        description: "前方传来打斗声，一支商队正遭到伏击。匪徒人数不多但下手狠辣，商队的护卫已经倒了两个。你可以选择帮忙还是趁乱捞一把。",
        baseWeight: 0.7,
        effects: {},
      }),
      moralityChoice: {
        title: "路遇劫道",
        prompt: "前面的商队正在挨打，护卫已经倒了两个。你是上去把场面稳住，还是趁乱从车上摸东西？",
        expiresInTicks: 6,
        options: [
          {
            id: "defend",
            label: "帮商队稳住",
            summary: "耗一点灵力把劫道的人赶开，商队会记住你。",
            moralityDelta: 5,
            effectBundle: {
              qi: -6,
              reputationChange: 2,
            },
          },
          {
            id: "plunder",
            label: "趁乱拿走货物",
            summary: "谁也顾不上你的时候，从翻倒的箱子里拿走一包灵石。",
            moralityDelta: -5,
            effectBundle: {
              spiritStones: 70,
              qi: -4,
            },
          },
        ] as const,
      },
    },
    withSignal({ id: "g-h-05", semanticType: "human", resultType: "resource", name: "Merchant Cooperation", nameCn: "商旅互助", description: "一支商队正缺人护卫，见你修为还算过得去便开口相邀。帮他们看了一段路后收到了灵石报酬，双方都觉得划算。", baseWeight: 0.7, effects: { spiritStones: 50 } }),
  ];
}
