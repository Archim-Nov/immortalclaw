import type { EventTemplate } from "../../../events.js";

interface OnceRow {
  readonly idSuffix: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly nameSuffix: string;
  readonly nameCnSuffix: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly effects: EventTemplate["effects"];
}

export const DUNGEON_FLAVOR_ROWS: Record<string, readonly OnceRow[]> = {
  qingzhou: [
    { idSuffix: "once-cold-stove", semanticType: "training", resultType: "status", nameSuffix: "Cold Stove", nameCnSuffix: "还没生的小炉", description: "拐角有一只小炉，炉灰是冷的。有人在炉边留了两块干柴，没有点。你在旁边把气喘匀，柴还是别人的。", baseWeight: 0.9, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "once-leaf-print", semanticType: "human", resultType: "story", nameSuffix: "Leaf Print", nameCnSuffix: "印在墙上的叶子", description: "石墙上印着一片叶子的形状，像是有人把湿叶子按上去又拿走了。旁边没有筐，也没有人解释这片印子是做什么的。", baseWeight: 0.9, effects: {} },
  ],
  yangzhou: [
    { idSuffix: "once-drip-count", semanticType: "fortune", resultType: "story", nameSuffix: "Counting Drips", nameCnSuffix: "数水滴的人", description: "廊角有人在数水滴，数到二十就停。他说这一段先记到这里，船的事不归这一层。你等他停手才过去。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-dry-hook", semanticType: "human", resultType: "resource", nameSuffix: "Dry Hook", nameCnSuffix: "晾干的钩子", description: "一只船钩挂在干处，钩上没有绳。听潮阁的人让你把它转个面，免得再滴到字上，然后给了很少的灵石。", baseWeight: 0.9, effects: { spiritStones: 6, reputationChange: 1 } },
  ],
  zhongzhou: [
    { idSuffix: "once-dust-on-the-seal", semanticType: "fortune", resultType: "story", nameSuffix: "Dust on the Seal", nameCnSuffix: "印上的灰", description: "案上的印盖着布，布上有一层灰。书吏说这枚今天不用，灰先别擦。你从案边过，布还盖着。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-stool-for-the-clerk", semanticType: "human", resultType: "status", nameSuffix: "Stool for the Clerk", nameCnSuffix: "留给书吏的凳", description: "值房门口有一张空凳，是留给还在抄写的人的。天衡宗的人让你在廊上站到他抄完一行，凳子仍空着。", baseWeight: 0.9, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  shuzhou: [
    { idSuffix: "once-vine-shadow", semanticType: "fortune", resultType: "story", nameSuffix: "Vine Shadow", nameCnSuffix: "藤的影子", description: "栈道外侧的藤在石壁上留下一条影子。破云门的人用杖比了比，说藤还没碰到板，今天不砍。影子随着他的杖动了一下。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-cup-on-the-rail", semanticType: "human", resultType: "resource", nameSuffix: "Cup on the Rail", nameCnSuffix: "栏杆上的杯", description: "栏杆上扣着一只空杯，杯底写着巡山棚的号。你把杯子扣稳，免得它掉下去，棚里后来的人给了很少的灵石。", baseWeight: 0.9, effects: { spiritStones: 6, reputationChange: 1 } },
  ],
  youzhou: [
    { idSuffix: "once-frost-on-the-latch", semanticType: "fortune", resultType: "story", nameSuffix: "Frost on the Latch", nameCnSuffix: "门闩上的霜", description: "门闩上结着薄霜，霜下的木头是干的。朔冥殿的人说这道门今天不从里面开，霜不用擦。你的手在闩上停了一下就拿开。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-ash-line", semanticType: "human", resultType: "status", nameSuffix: "Line in the Ash", nameCnSuffix: "灰里的一道", description: "火塘的灰里有人用棍子画了一道，说这道左边是这一班的，右边留给下一班。你在左边站到鞋上的雪化掉。", baseWeight: 0.9, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { idSuffix: "once-sand-on-the-seat", semanticType: "fortune", resultType: "story", nameSuffix: "Sand on the Seat", nameCnSuffix: "座位上的沙", description: "石凳上有薄薄一层沙。镇荒城的人看了看风向，说这点沙是从门缝进来的，不是有人坐过。你没有把沙拂下去。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-stopper-returned", semanticType: "human", resultType: "resource", nameSuffix: "Stopper Returned", nameCnSuffix: "放回桶上的塞", description: "一只水囊塞放在桶沿上。你把它按回桶口，管水的人说这桶今天不打开，仍按杂务给了很少的灵石。", baseWeight: 0.9, effects: { spiritStones: 6, reputationChange: 1 } },
  ],
  leizhou: [
    { idSuffix: "once-count-on-the-wall", semanticType: "fortune", resultType: "story", nameSuffix: "Count on the Wall", nameCnSuffix: "墙上的数", description: "墙上有人用炭写了三个数字，又划掉中间那个。惊霄宫的人说这是他们自己对的雷数，不用你改。数字还在。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-peg-for-the-cloak", semanticType: "human", resultType: "status", nameSuffix: "Peg for the Cloak", nameCnSuffix: "挂斗篷的钉", description: "棚壁上有一颗空钉。值日的人让你把滴水的斗篷挂上去，声过以后再取。钉子是他们的，这一阵雨小些。", baseWeight: 0.9, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  cangzhou: [
    { idSuffix: "once-tide-notch", semanticType: "fortune", resultType: "story", nameSuffix: "Tide Notch", nameCnSuffix: "桩上的潮痕", description: "木桩上新刻了一道潮痕，比上一道高一指。埠头的人看完就去解别的缆，没有叫你改路。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-dry-bead", semanticType: "human", resultType: "resource", nameSuffix: "Dry Bead", nameCnSuffix: "烘干的算珠", description: "账房的算珠有一颗是湿的。你帮着把它擦干串回去，管账的人按杂务给了很少的灵石，账本身不让你看。", baseWeight: 0.9, effects: { spiritStones: 6, reputationChange: 1 } },
  ],
  wanzhou: [
    { idSuffix: "once-cup-mark", semanticType: "fortune", resultType: "story", nameSuffix: "Cup Mark", nameCnSuffix: "几案上的杯印", description: "几案上有一圈新的杯印，杯子不在了。万象楼的人说这个位子的人刚走，印子今天不擦。你从案边过，茶已经不热。", baseWeight: 0.9, effects: {} },
    { idSuffix: "once-fan-peg", semanticType: "human", resultType: "status", nameSuffix: "Peg for the Fan", nameCnSuffix: "挂扇的钉子", description: "门边有一颗专门挂扇的钉子，钉子是空的。跑堂让你在门口站到外面的雨小一点，扇仍然没有人来取。", baseWeight: 0.9, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
};
