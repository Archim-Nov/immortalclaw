import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { DUNGEON_FLAVOR_ROWS } from "./dungeon-flavor.js";
import { buildNodeEvent } from "./shared.js";

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

const ROWS: Record<string, readonly OnceRow[]> = {
  qingzhou: [
    { idSuffix: "once-resealed-box", semanticType: "human", resultType: "resource", nameSuffix: "Resealed Herb Box", nameCnSuffix: "重新按上的药匣", description: "药匣的封条被人揭开又按回去。里面只剩三枚灵石，和一张写着“先给伤者”的纸条。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-pine-drip", semanticType: "training", resultType: "status", nameSuffix: "Pine Drip", nameCnSuffix: "还在滴的松脂", description: "廊壁上的松脂还在慢慢往下滴。你站近一点，呼吸顺了半息，除此之外没有别的东西。", baseWeight: 0.5, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "once-fork-warning", semanticType: "human", resultType: "story", nameSuffix: "Fork Warning", nameCnSuffix: "岔口的半句话", description: "两个采药人在岔口分手。往回走的那个留下半句：上面的藤会缠脚。他没有等你问下一句。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-gate-chore", semanticType: "human", resultType: "resource", nameSuffix: "Gate Chore", nameCnSuffix: "门口的杂役", description: "石阶边坐着苍木谷的杂役，他不进深层，只把一袋干粮换你一句“这一层还能走”。干粮你没要，他仍给了几枚灵石。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  yangzhou: [
    { idSuffix: "once-wet-tag", semanticType: "fortune", resultType: "resource", nameSuffix: "Wet Cargo Tag", nameCnSuffix: "湿了的货签", description: "货箱的签被水泡软，名字看不清。箱是空的，签绳上还穿着用来压签的几枚灵石。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-lantern-out", semanticType: "human", resultType: "story", nameSuffix: "Lantern Out", nameCnSuffix: "灭了的灯", description: "廊里有一盏灯先灭了。听潮阁的人从你身边过去，说这盏不归这一层管，让它灭着。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-rope-burn", semanticType: "training", resultType: "status", nameSuffix: "Rope Burn", nameCnSuffix: "绳上的水", description: "你帮着把一根浸水的绳子拉过拐角。手是红的，气息比进这一弯之前更齐。", baseWeight: 0.5, effects: { qi: -3, statusEffects: [{ effectId: "insight", ticks: 2 }] } },
    { idSuffix: "once-bell-word", semanticType: "human", resultType: "resource", nameSuffix: "Word for the Bell", nameCnSuffix: "带给潮钟的话", description: "一个弟子让你把“这一潮不要等”带到还在门口的人那里。话带到了，对方给了很少的灵石，钟没有响。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  zhongzhou: [
    { idSuffix: "once-wax-scrap", semanticType: "fortune", resultType: "resource", nameSuffix: "Wax Scrap", nameCnSuffix: "作废的封泥", description: "桌角推着一小块作废的封泥。泥里嵌着压箱的灵石，文书本身不在这一间。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-struck-line", semanticType: "human", resultType: "story", nameSuffix: "Struck Line", nameCnSuffix: "划掉的一行", description: "名册上有一行被划掉，注着“人已经出去”。墨还湿，划线的人没有留在屋里。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-copy-run", semanticType: "human", resultType: "resource", nameSuffix: "Copy to the Next Room", nameCnSuffix: "送到隔壁的抄件", description: "书吏让你把一页没有署名的抄件送到隔壁值房。值房的人收了，按跑腿给了几枚灵石，没有让你看正文。", baseWeight: 0.5, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "once-stand-in-the-hall", semanticType: "training", resultType: "status", nameSuffix: "Standing in the Hall", nameCnSuffix: "在廊上站一会儿", description: "天衡宗的人把今天谁守门念完，让你在廊上站到呼吸平下来。你的名字不在名册上。", baseWeight: 0.45, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  shuzhou: [
    { idSuffix: "once-rail-herb", semanticType: "fortune", resultType: "resource", nameSuffix: "Herb on the Rail", nameCnSuffix: "栏杆上的药", description: "栈道栏杆上挂着一小束被钩住的药。下面没有应声的人，药束里夹着几枚灵石。", baseWeight: 0.55, effects: { spiritStones: 8, itemRewards: [{ itemId: "clear-zhi-leaf", count: 1 }] } },
    { idSuffix: "once-single-bell", semanticType: "human", resultType: "story", nameSuffix: "Single Bell", nameCnSuffix: "不必上报的铃", description: "雾里的铃响了一声。破云门的巡山人说这声不用报，报了也没有人专门上来看。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-plank-back", semanticType: "training", resultType: "progression", nameSuffix: "Plank Set Back", nameCnSuffix: "把板子踩回去", description: "你把翻起的栈板踩回去，在板上站到它不再响。这一点进境很短，脚是稳的。", baseWeight: 0.5, effects: { realmProgress: 1 } },
    { idSuffix: "once-whose-shelf", semanticType: "human", resultType: "resource", nameSuffix: "Shelf Left Alone", nameCnSuffix: "没有踩的木耳架", description: "岩架上晾着别人的木耳。你从旁边绕过去，架主后来在路口把几枚灵石塞给你，说就为了你没踩。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  youzhou: [
    { idSuffix: "once-one-glove", semanticType: "fortune", resultType: "resource", nameSuffix: "One Glove", nameCnSuffix: "一只手套", description: "雪被扒开过，里面只有一只手套。手套心里攥着几枚灵石，另一只不在这一层。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-stove-smoke", semanticType: "human", resultType: "story", nameSuffix: "Stove Smoke", nameCnSuffix: "灶重新点上", description: "哨楼上的烟先白后灰。旁边的人说这是他们自己的灶灭了又点上，不是让你改路。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-ration-box", semanticType: "human", resultType: "resource", nameSuffix: "Ration Box", nameCnSuffix: "留给下一班的盒子", description: "空着的哨位旁边有一只干粮盒，板上写着留给下一班。你没有开盒，换班的人后来仍给了你几枚灵石。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
    { idSuffix: "once-fire-to-bend", semanticType: "training", resultType: "status", nameSuffix: "Fire Until the Fingers Bend", nameCnSuffix: "烤到手指能弯", description: "朔冥殿的人让你在他们的火边烤到手指能弯。火很小，烤完你就让开了。", baseWeight: 0.45, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { idSuffix: "once-empty-skin", semanticType: "fortune", resultType: "resource", nameSuffix: "Empty Skin", nameCnSuffix: "空了的水囊", description: "沙里的水囊已经空了。囊绳上还拴着主人用来做记号的几枚灵石，人没有回来。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-loose-flag", semanticType: "human", resultType: "story", nameSuffix: "Loose Flag", nameCnSuffix: "松了的旗绳", description: "镇荒城的路旗翻了个面。车夫看了看绳，说是松了，不是改道，然后继续走。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-well-rope", semanticType: "human", resultType: "resource", nameSuffix: "Well Rope", nameCnSuffix: "换上的井绳", description: "你帮着把州外井的断绳换上。管井的人按杂务给了几枚灵石，井栏上那个欠水的名字还在。", baseWeight: 0.5, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "once-shade-cloth", semanticType: "training", resultType: "status", nameSuffix: "Shade Cloth", nameCnSuffix: "一块挡阳的布", description: "车队的布底下只够再站一个人。你喝完一口水就出去，影子外的路还是烫的。", baseWeight: 0.45, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  leizhou: [
    { idSuffix: "once-glass-nail", semanticType: "fortune", resultType: "resource", nameSuffix: "Glass Nail", nameCnSuffix: "指甲大的玻璃", description: "雷停以后，沙地上凝着指甲大的一块玻璃。它不值钱，旁边震出来的灵石还没被人捡走。", baseWeight: 0.55, effects: { spiritStones: 10 } },
    { idSuffix: "once-cracked-pole", semanticType: "human", resultType: "story", nameSuffix: "Cracked Pole", nameCnSuffix: "裂了的旗杆", description: "警旗比往常早收。守旗的人说不是天晴，是旗杆裂了，今天的警示改用喊。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-eave-stand", semanticType: "training", resultType: "status", nameSuffix: "Under the Eave", nameCnSuffix: "棚檐下", description: "棚里没有空位。你在檐下站过这一声雷，出来时耳朵还嗡，步子是稳的。", baseWeight: 0.5, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
    { idSuffix: "once-oil-handed", semanticType: "human", resultType: "resource", nameSuffix: "Oil Handed Over", nameCnSuffix: "交出去的灯油", description: "你把一小瓶灯油交到下一座警棚，没有停留。接油的人按杂务给了几枚灵石。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  cangzhou: [
    { idSuffix: "once-salt-split", semanticType: "fortune", resultType: "resource", nameSuffix: "Split by Salt", nameCnSuffix: "被盐撑裂的袋", description: "礁缝里的小袋被盐撑裂。海货已经不能要了，袋底还剩几枚灵石。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-boat-gone", semanticType: "human", resultType: "story", nameSuffix: "Boat Already Gone", nameCnSuffix: "船已经走了", description: "桩上还挂着药，这一潮的船已经走了。埠头的人说下一潮再管，这句话说完就去解别的缆。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-two-bells", semanticType: "human", resultType: "resource", nameSuffix: "Two Bells", nameCnSuffix: "替人敲的两下", description: "雾里的港钟没有人摇。你替值日敲了两下，他赶到以后把差银分了一半给你。", baseWeight: 0.5, effects: { spiritStones: 8, reputationChange: 1 } },
    { idSuffix: "once-dry-sleeve", semanticType: "training", resultType: "status", nameSuffix: "Dry Sleeve", nameCnSuffix: "烘干的袖口", description: "你在棚里把湿袖口烤到不再滴水。没有第二碗热水，呼吸倒是平了。", baseWeight: 0.45, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  wanzhou: [
    { idSuffix: "once-cup-coin", semanticType: "fortune", resultType: "resource", nameSuffix: "Coin under the Cup", nameCnSuffix: "杯底的茶钱", description: "扣着的杯子底下压着上一桌留下的茶钱。掌柜说那个位子的人不会回来，这几枚不必入账。", baseWeight: 0.55, effects: { spiritStones: 8 } },
    { idSuffix: "once-unfinished-name", semanticType: "human", resultType: "story", nameSuffix: "Unfinished Name", nameCnSuffix: "没说完的名字", description: "跑堂把两个人往一张桌前送，其中一个人临时走了。留下的那个看了你一眼，没有把名字说完。", baseWeight: 0.5, effects: {} },
    { idSuffix: "once-bill-four-words", semanticType: "human", resultType: "resource", nameSuffix: "Four Words on the Bill", nameCnSuffix: "账单上的四个字", description: "掌柜把茶钱划掉，在账单边上写了“上次的信”。他不解释是哪一封，也不再收这碗的钱。", baseWeight: 0.5, effects: { spiritStones: 6, reputationChange: 1 } },
    { idSuffix: "once-seat-held", semanticType: "human", resultType: "status", nameSuffix: "Seat Held", nameCnSuffix: "留给欠账的位子", description: "你把“今晚的位子留给欠账的人”带到茶棚。对方只点头，你在门口坐到心跳慢下来。", baseWeight: 0.45, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
};

export function buildDungeonStateSingletons(location: Location): EventTemplate[] {
  const dungeonGrade = location.dungeon?.grade ?? null;
  const rows = [...(ROWS[location.stateId] ?? []), ...(DUNGEON_FLAVOR_ROWS[location.stateId] ?? [])];
  return rows.map((row) => buildNodeEvent(location, {
    ...row,
    dungeonGrade,
  }));
}
