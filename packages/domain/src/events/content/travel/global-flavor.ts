import type { EventTemplate } from "../../../events.js";
import { deriveSignalType } from "../../../events.js";

type TravelGlobalRow =
  Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm" | "signalType">
  & { readonly minRealm?: EventTemplate["minRealm"] };

function withSignal(row: TravelGlobalRow): TravelGlobalRow & { signalType: EventTemplate["signalType"] } {
  return { ...row, signalType: deriveSignalType(row.resultType, row.effects) };
}

export function createTravelGlobalFlavorRows(): readonly (TravelGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    withSignal({
      id: "tr-fl-04",
      semanticType: "fortune",
      resultType: "story",
      name: "Tea Stall Not Yet Lit",
      nameCn: "还没生火的茶摊",
      description: "路旁的茶摊把凳子摆出来了，灶却还是冷的。摊主在数茶叶，说第一锅要等后面的人到了再烧。你在凳上坐了一会儿，茶没有来。",
      baseWeight: 1,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-05",
      semanticType: "human",
      resultType: "story",
      name: "Bells out of Step",
      nameCn: "驮队里不齐的铃",
      description: "一支驮队从旁边过，铃没有摇在同一个拍子上。赶队的人回头看了一眼最边上那头，没有停。你让到路边，等尘土过去再走。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-06",
      semanticType: "training",
      resultType: "status",
      name: "Empty Wayside Pavilion",
      nameCn: "没有人的凉亭",
      description: "这座凉亭里没有人，石桌上只剩一只扣着的碗。你在亭里把鞋里的沙子倒掉，再上路时脚步轻了一点。",
      baseWeight: 1,
      effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] },
    }),
    withSignal({
      id: "tr-fl-07",
      semanticType: "human",
      resultType: "story",
      name: "Someone Driving Birds",
      nameCn: "田里赶鸟的人",
      description: "田里有人举着一根竹竿赶鸟，鸟落到邻田又被另一头的人喊走。你从田埂过的时候，两边都没有把竿子转向你。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-08",
      semanticType: "human",
      resultType: "resource",
      name: "Dog from the Ferry",
      nameCn: "跟着走了一段的渡口狗",
      description: "渡口的狗跟着你走了一段，直到前面的岔路才坐下。船家在后面喊它的名字。你把路上捡到的半块干饼丢回去，船家隔岸丢来很少的灵石。",
      baseWeight: 1,
      effects: { spiritStones: 6, reputationChange: 1 },
    }),
    withSignal({
      id: "tr-fl-09",
      semanticType: "fortune",
      resultType: "story",
      name: "Cooking Smoke on the Ridge",
      nameCn: "山腰上做饭的烟",
      description: "山腰升起一股很直的烟，颜色是做饭的白，不是示警。路边的人看了一眼就继续赶车。你也还在原来的方向上。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-10",
      semanticType: "fortune",
      resultType: "resource",
      name: "Dried Sweet Potato",
      nameCn: "石板上的红薯干",
      description: "村口的石板上晒着红薯干，最边上两片已经粘了灰。晒的人说这两片不要了，你拿去，他仍按家里的算法给了很少的灵石。",
      baseWeight: 1,
      effects: { spiritStones: 8 },
    }),
    withSignal({
      id: "tr-fl-11",
      semanticType: "training",
      resultType: "status",
      name: "Changing Straw Sandals",
      nameCn: "把草鞋换到另一只脚",
      description: "一个赶路的人坐在里程碑下，把磨破的草鞋从左脚换到右脚。你在旁边把自己的鞋带重新系紧，再走的时候脚底的疼换了个地方，气息倒齐了。",
      baseWeight: 1,
      effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] },
    }),
    withSignal({
      id: "tr-fl-12",
      semanticType: "fortune",
      resultType: "story",
      name: "Lion Missing an Ear",
      nameCn: "缺了一只耳朵的石狮",
      description: "村口的石狮缺了左边的耳朵，缺的地方被摸得很亮。看门的老人说耳朵是前年掉的，没人再配。你从狮子中间的路走过去。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-13",
      semanticType: "fortune",
      resultType: "story",
      name: "Path through the Mustard Field",
      nameCn: "油菜田里的小路",
      description: "油菜长到齐腰，田里仍留着一条只够一个人侧身的小路。你按着这条路走到田的另一头，花瓣沾在袖子上，没有人出来拦。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "tr-fl-14",
      semanticType: "human",
      resultType: "resource",
      name: "Calling the Ox",
      nameCn: "坡上喊牛的人",
      description: "坡上有人喊牛，牛在沟的另一边不应。他请你在沟这边站一会儿，免得牛再往路上来。牛回头以后，他给了很少的灵石。",
      baseWeight: 1,
      effects: { spiritStones: 8, reputationChange: 1 },
    }),
    withSignal({
      id: "tr-fl-15",
      semanticType: "human",
      resultType: "story",
      name: "Hen on the Scale",
      nameCn: "站在秤上的鸡",
      description: "驿站门口的秤上站着一只鸡，秤杆因此翘着。掌柜把鸡抱下去，秤才回到原处。你在旁边等这一下过去，没有人把你的包放上去称。",
      baseWeight: 0.95,
      effects: {},
    }),
  ];
}
