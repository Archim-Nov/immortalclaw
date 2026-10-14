import type { EventTemplate } from "../../../events.js";
import { deriveSignalType } from "../../../events.js";

type ExplorationGlobalRow =
  Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm" | "signalType">
  & { readonly minRealm?: EventTemplate["minRealm"] };

function withSignal(row: ExplorationGlobalRow): ExplorationGlobalRow & { signalType: EventTemplate["signalType"] } {
  return { ...row, signalType: deriveSignalType(row.resultType, row.effects) };
}

export function createExplorationGlobalFlavorRows(): readonly (ExplorationGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    withSignal({
      id: "g-fl-01",
      semanticType: "human",
      resultType: "story",
      name: "Pot Mender at the Corner",
      nameCn: "街口的补锅声",
      description: "街口有人坐在小板凳上补一口裂锅，锤一下，停一下，听锅沿还响不响。你从他身边过的时候，他只抬头看了你的鞋，没有问你要不要修东西。",
      baseWeight: 1,
      effects: {},
    }),
    withSignal({
      id: "g-fl-02",
      semanticType: "fortune",
      resultType: "resource",
      name: "Peppers on the Wall",
      nameCn: "墙根晒着的辣椒",
      description: "墙根的绳子上晒着一串辣椒，最底下两只已经干得能响。主人不在院里。你只摘了落到地上的那一只，换到的灵石很少。",
      baseWeight: 1,
      effects: { spiritStones: 8 },
    }),
    withSignal({
      id: "g-fl-03",
      semanticType: "training",
      resultType: "status",
      name: "Washing at the Well Curb",
      nameCn: "有人在井台洗脸",
      description: "井台上有人用木盆洗脸，洗完把水泼到菜地里，又把盆扣好。你在旁边把脸上的土也擦了，呼吸比进这条巷之前慢一点。",
      baseWeight: 1,
      effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] },
    }),
    withSignal({
      id: "g-fl-04",
      semanticType: "fortune",
      resultType: "story",
      name: "Kite in the Branches",
      nameCn: "挂在树枝上的纸鸢",
      description: "一棵矮树的枝杈上挂着一只断了线的纸鸢，纸上画的是条鱼。树下没有小孩，也没有人来够。风一过，纸鸢就轻轻撞一下树干。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "g-fl-05",
      semanticType: "human",
      resultType: "resource",
      name: "Charcoal Seller under the Arch",
      nameCn: "桥洞里歇着的卖炭人",
      description: "卖炭的人把扁担横在桥洞里，说这一担今天不进城了。他让你帮他把散掉的几块炭踢回筐里，然后给了很少的灵石。",
      baseWeight: 1,
      effects: { spiritStones: 8, reputationChange: 1 },
    }),
    withSignal({
      id: "g-fl-06",
      semanticType: "fortune",
      resultType: "story",
      name: "Cat by the Incense",
      nameCn: "蹲在香炉边的猫",
      description: "小祠的香炉是冷的，一只猫蹲在炉沿上，尾巴垂进灰里。你停了一会儿，猫没有让开，也没有叫。香还是没人点。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "g-fl-07",
      semanticType: "human",
      resultType: "story",
      name: "Fresh Whitewashed Wall",
      nameCn: "新刷的白墙",
      description: "巷子里有一截墙刚刚刷白，刷墙的人把刷子搁在桶上，说今天先干到这里。墙上还没有人写字，白灰沾到了路过的袖口上。",
      baseWeight: 0.95,
      effects: { reputationChange: 1 },
    }),
    withSignal({
      id: "g-fl-08",
      semanticType: "human",
      resultType: "story",
      name: "Game under the Tree",
      nameCn: "树下的一盘棋",
      description: "两个老人在树下下棋，棋盘是一块旧石板。他们下得很慢，旁边的茶已经凉了。你看完一手就走，他们没有请你落子。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "g-fl-09",
      semanticType: "training",
      resultType: "status",
      name: "Smith Pausing for Water",
      nameCn: "铁匠停锤喝水",
      description: "铁匠把锤子放下，喝了半勺水，又把炉门掩上。你在铺外站到心跳跟他的锤声分开，再走的时候耳朵还热着。",
      baseWeight: 1,
      effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] },
    }),
    withSignal({
      id: "g-fl-10",
      semanticType: "fortune",
      resultType: "story",
      name: "Mended Fence",
      nameCn: "新补过的菜园篱笆",
      description: "菜园的篱笆新补了一截，补的竹子还是绿的。园里的人在浇一垄葱，没有抬头。缺口已经不在了，你从原来的路上走过去。",
      baseWeight: 0.95,
      effects: {},
    }),
    withSignal({
      id: "g-fl-11",
      semanticType: "human",
      resultType: "resource",
      name: "Washing an Inkstone",
      nameCn: "河边洗砚的人",
      description: "有人蹲在河边洗一方砚，墨花在水里散开就没了。他洗完把砚在石头上磕干，说边上一小块碎墨你可以拿走，他自己不要了。",
      baseWeight: 1,
      effects: { spiritStones: 10, reputationChange: 1 },
    }),
    withSignal({
      id: "g-fl-12",
      semanticType: "fortune",
      resultType: "story",
      name: "First Lamp of the Night Market",
      nameCn: "夜市点起的第一盏灯",
      description: "夜市还没人坐满，最里面的摊先点了一盏灯。灯油不旺，只够照见摊上的碗。你从灯下过，掌柜正在数筷子，没有招呼你。",
      baseWeight: 0.95,
      effects: {},
    }),
  ];
}
