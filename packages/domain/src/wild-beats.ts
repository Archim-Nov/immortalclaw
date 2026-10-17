import { GameplayRejection } from "./gameplay-error.js";
import { noteWild, type WildPlace } from "./wild-places.js";
import type { Cultivator, ItemId, WildernessProgress, WorldEvent, WorldState } from "./model.js";
import { grantOwedFavor } from "./social.js";

/**
 * Two Chinese beats inside a wilderness layer.
 *
 * The layer stays solo. A companion does not vote, and 八荒 does not read this
 * table. Loot is applied only when that option is chosen.
 */

export const WILD_DECISION_LINE = "荒野岔路待决";
export const WILD_BEAT_GAP = 2;

export interface WildBeatOption {
  id: string;
  label: string;
  detail: string;
  line: string;
  qi?: number;
  qiDamage?: number;
  injury?: number;
  stones?: number;
  itemId?: ItemId;
  itemCount?: number;
  favorReason?: string;
  helpedLine?: string;
  aloneLine?: string;
}

export interface WildBeatDef {
  id: string;
  stateId: string;
  step: 1 | 2;
  kind: "历练" | "奇遇" | "人情";
  prompt: string;
  options: readonly WildBeatOption[];
}

const WILD_BEATS: readonly WildBeatDef[] = [
  {
    id: "qing-drill",
    stateId: "qingzhou",
    step: 1,
    kind: "历练",
    prompt: "青岚坡上，露蛛把丝横在草里，药藤已经缠到脚踝。缠绕拖着步子。",
    options: [
      { id: "qing-cut", label: "割开丝绕过去", detail: "把眼前的丝割断，人从坡上绕开。", line: "丝割开了。露蛛没有追出来，药藤留在原地。", qi: 8 },
      { id: "qing-spider", label: "顺着丝找露蛛", detail: "顺着没干的丝找过去。", line: "露蛛从叶下扑出来，缠绕拖住了脚踝。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "qing-vine", label: "割一截带露的药藤", detail: "把缠着露的那截药藤割下来。", line: "这一截还带着露的药藤收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "qing-favor",
    stateId: "qingzhou",
    step: 2,
    kind: "人情",
    prompt: "坡上有个人的篓子翻了，露洒了一地，人还蹲着捡。",
    options: [
      { id: "qing-gather", label: "把洒了的露拢回去", detail: "蹲下去，帮他把露拢回篓子。", line: "露拢回了篓子。", favorReason: "把洒了的露拢给我", helpedLine: "你把洒了的露拢回去。记下一笔：把洒了的露拢给我。", aloneLine: "旁边没有人。洒掉的露留在坡上，没有收进袋子。" },
      { id: "qing-pocket", label: "自己捡走洒出来的露", detail: "趁人没回头，把洒出来的露收走。", line: "洒出来的露收进袋子，灵石多了一些。", stones: 22 },
      { id: "qing-pass", label: "绕开这摊露", detail: "从洒了露的地方旁边走过去。", line: "露还在草上。你没有停，也没有拿。", qi: 4 },
    ],
  },
  {
    id: "yang-drill",
    stateId: "yangzhou",
    step: 1,
    kind: "历练",
    prompt: "听潮浦退了潮。潮蟹横在湿沙上，浦影贴着水线。霜寒先凉了鞋。",
    options: [
      { id: "yang-dry", label: "退到干沙上", detail: "鞋已经凉了，先退回干处。", line: "人退到干沙上。潮蟹还在湿处，没有跟过来。", qi: 8 },
      { id: "yang-crab", label: "按住这只潮蟹", detail: "趁它横着走，一把按住。", line: "潮蟹的壳是凉的，霜寒贴上手背。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "yang-shell", label: "捡潮水冲上来的石", detail: "蟹壳旁边有一枚被潮水磨过的石。", line: "这枚被潮水磨过的石收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "yang-find",
    stateId: "yangzhou",
    step: 2,
    kind: "奇遇",
    prompt: "浦边插着半截渔网，网眼里卡着一枚还温的石。",
    options: [
      { id: "yang-net", label: "把网解开，石留在原地", detail: "解开网，石仍放在湿沙上。", line: "网解开了。石留在湿沙上，你没有拿。", qi: 6 },
      { id: "yang-pry", label: "把石从网眼里抠出来", detail: "费一点手脚，把石抠出来。", line: "网眼里那枚石抠出来，收进袋子，灵石多了一些。", stones: 18 },
      { id: "yang-wade", label: "顺着网绳往水里走", detail: "拉着网绳，往还没退尽的水里走两步。", line: "水没过脚踝，霜寒贴上来。网绳那头是空的。", qiDamage: 10 },
    ],
  },
  {
    id: "zhong-drill",
    stateId: "zhongzhou",
    step: 1,
    kind: "历练",
    prompt: "衡野驿的路碑斜着，驿影站在亭外。脚刚靠近，定根就拖了一下。这里不是旧驿石廊。",
    options: [
      { id: "zhong-right", label: "扶正碑就走", detail: "把碑扶正，人继续上路。", line: "碑扶正了。驿影没有拦，定根只拖了那一下。", qi: 8 },
      { id: "zhong-shadow", label: "和驿影对上一掌", detail: "亭外的影子不让路，就对上一掌。", line: "驿影的掌是凉的，定根把后脚钉住一下。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "zhong-slip", label: "揭开碑下的路引", detail: "碑根压着半张路引，揭开来看。", line: "碑下那张路引连着一枚小石，收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "zhong-favor",
    stateId: "zhongzhou",
    step: 2,
    kind: "人情",
    prompt: "亭里坐着一个赶路的人，水囊是空的，桌上只剩半块干粮。",
    options: [
      { id: "zhong-water", label: "把水囊递过去", detail: "把自己的水倒进他的空囊。", line: "水囊递了过去。", favorReason: "在衡野驿把水囊递给我", helpedLine: "你把水囊递过去。记下一笔：在衡野驿把水囊递给我。", aloneLine: "亭里没有人。空水囊还在桌上，你没有拿走。" },
      { id: "zhong-ration", label: "把桌上的干粮拿走", detail: "人若是睡着了，干粮就先拿走。", line: "桌上的干粮收走，里面夹着几枚灵石。", stones: 16 },
      { id: "zhong-rest", label: "在亭外歇一下", detail: "不进亭，在碑影里站一会儿。", line: "人在亭外站了一会儿。干粮和水囊都还在里面。", qi: 8 },
    ],
  },
  {
    id: "shu-drill",
    stateId: "shuzhou",
    step: 1,
    kind: "历练",
    prompt: "栈云径窄。藤猿坐在栈板上，云蛛的丝从藤上垂下来。缠绕会拖脚。",
    options: [
      { id: "shu-side", label: "侧着身子过去", detail: "贴着崖壁，从藤猿旁边侧过去。", line: "人侧着走过去。藤猿看了一眼，没有下来。", qi: 8 },
      { id: "shu-ape", label: "把藤猿赶下栈板", detail: "栈板只有这一块稳，先把藤猿赶开。", line: "藤猿跳开的时候，缠绕的藤抽了你一下。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "shu-silk", label: "收起垂下来的丝", detail: "云蛛的丝垂到手边，把它收起来。", line: "垂下来的丝缠成一小束，收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "shu-find",
    stateId: "shuzhou",
    step: 2,
    kind: "奇遇",
    prompt: "栈板缝里卡着一截别人落下的绳，云还没散。",
    options: [
      { id: "shu-rope", label: "把绳抽出来绕上", detail: "把卡在缝里的绳抽出来，绕在腰上。", line: "这截绳抽出来，绳结里藏着几枚灵石。", stones: 20 },
      { id: "shu-cliff", label: "留在缝里，贴着崖走", detail: "绳不动，人贴着崖壁走。", line: "绳还卡在缝里。你贴着崖走过去，云擦过袖口。", qi: 6 },
      { id: "shu-lower", label: "拉着绳往下探", detail: "抓住绳，往栈板下面看一眼。", line: "绳忽然松了半尺。下面是空的，缠绕的藤刮过手腕。", qiDamage: 10, itemId: "ruin-fragment", itemCount: 1 },
    ],
  },
  {
    id: "you-drill",
    stateId: "youzhou",
    step: 1,
    kind: "历练",
    prompt: "猎霜原上，霜犬的爪印比靴子深，猎影贴着林线。霜寒贴着草，呼出来的气是白的。",
    options: [
      { id: "you-print", label: "绕开爪印", detail: "不跟着爪印走，从林线外面绕。", line: "爪印留在霜上。霜犬没有回头。", qi: 8 },
      { id: "you-hound", label: "迎上那只霜犬", detail: "林线里有呼吸声，迎上去。", line: "霜犬贴着霜扑过来，霜寒先到。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "you-arrow", label: "捡起结霜的箭", detail: "火堆边有一根结了霜的箭。", line: "箭杆里嵌着一枚小石，收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "you-favor",
    stateId: "youzhou",
    step: 2,
    kind: "人情",
    prompt: "熄了的火堆边坐着一个人，袖口结了霜，干粮只剩半块。",
    options: [
      { id: "you-share", label: "把干粮分过去", detail: "把自己的干粮掰一半递过去。", line: "干粮分了过去。", favorReason: "猎霜原上把干粮分给我", helpedLine: "你把干粮分过去。记下一笔：猎霜原上把干粮分给我。", aloneLine: "火堆边没有人。半块干粮还冻在灰上，你没有拿。" },
      { id: "you-flask", label: "把炭边的皮囊拿走", detail: "皮囊挂在熄了的炭边，先拿走。", line: "皮囊是沉的，里面有几枚灵石。", stones: 24 },
      { id: "you-lee", label: "在下风处停一停", detail: "不靠近火堆，在下风的草里站一会儿。", line: "人停在下风处。火堆边的东西没有动。", qi: 8 },
    ],
  },
  {
    id: "liang-drill",
    stateId: "liangzhou",
    step: 1,
    kind: "历练",
    prompt: "砂门碛的风硬。沙蜥的背壳埋了一半，风骑的蹄印很快就浅了。断法会乱一手。",
    options: [
      { id: "liang-sleeve", label: "把符纸收进袖里绕开", detail: "风把符纸打得乱，先收进袖里，从沙窝旁边走。", line: "符纸收进袖里。沙蜥没有钻出来。", qi: 8 },
      { id: "liang-lizard", label: "挖出这只沙蜥", detail: "背壳露在外面，把它从沙里挖出来。", line: "沙蜥翻出来的时候，风把这一手法诀断了。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "liang-charm", label: "从沙里刨出一截断符", detail: "蹄印旁边埋着半截烧过的符。", line: "这截断符从沙里刨出来，收进袋子。", itemId: "ruin-fragment", itemCount: 1 },
    ],
  },
  {
    id: "liang-find",
    stateId: "liangzhou",
    step: 2,
    kind: "奇遇",
    prompt: "前一个人的水囊被风吹进沙窝，囊口还开着，里面剩了半口。",
    options: [
      { id: "liang-sip", label: "喝一口再把囊埋回去", detail: "润一下嘴，把水囊重新埋进沙里。", line: "喝了一口。水囊埋回沙窝，没有带走。", qi: 10 },
      { id: "liang-skin", label: "把整囊带走", detail: "沙还在灌，先把整囊提走。", line: "水囊提起来，囊底垫着几枚灵石。", stones: 14 },
      { id: "liang-hoof", label: "追着蹄印往碛里走", detail: "风骑的蹄印还看得见，追过去。", line: "蹄印两步就浅了。风把法诀断了一拍，什么也没追上。", qiDamage: 10 },
    ],
  },
  {
    id: "lei-drill",
    stateId: "leizhou",
    step: 1,
    kind: "历练",
    prompt: "焦林野里，雷雀停在还热的焦木上。焚灼贴着手。这里不是雷泽残阵。",
    options: [
      { id: "lei-hand", label: "缩回手绕开焦枝", detail: "枝还是热的，把手缩回来，从旁边绕。", line: "手缩回来了。雷雀叫了一声，没有追。", qi: 8 },
      { id: "lei-bird", label: "把雷雀从枝上赶下来", detail: "焦木挡路，先把雷雀赶开。", line: "雷雀贴着火扑下来，焚灼烫了袖口。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "lei-wood", label: "敲下一截还温的焦木", detail: "枝心还是干的，敲下一小截。", line: "这一截还温的焦木敲下来，收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "lei-find",
    stateId: "leizhou",
    step: 2,
    kind: "奇遇",
    prompt: "灰里埋着一只没烧完的口袋，口是松的，边缘还烫。",
    options: [
      { id: "lei-ash", label: "把口袋留在灰里", detail: "灰还烫，口袋不动。", line: "口袋留在灰里。你绕开那摊热灰。", qi: 6 },
      { id: "lei-pouch", label: "把口袋里的石倒出来", detail: "等边缘凉一点，把里面的石倒出来。", line: "口袋里倒出几枚灵石，收进袋子。", stones: 26 },
      { id: "lei-reach", label: "伸手进还烫的灰里摸", detail: "不等它凉，手伸进灰里。", line: "灰是烫的，焚灼贴上指节。摸出来一块焦壳。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
    ],
  },
  {
    id: "cang-drill",
    stateId: "cangzhou",
    step: 1,
    kind: "历练",
    prompt: "盐风礁上，礁蟹留在退潮的石头上，盐鲛的影子在水线外一闪。霜寒贴着礁石，风是咸的。",
    options: [
      { id: "cang-high", label: "从高处礁绕过去", detail: "不上那块退潮的石头，从高处绕。", line: "人从高处绕过去。礁蟹还留在石头上。", qi: 8 },
      { id: "cang-pin", label: "按住这只礁蟹", detail: "趁钳子还慢，按住蟹壳。", line: "礁蟹的壳上全是盐，霜寒从石缝里上来。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "cang-salt", label: "刮下一层礁上的盐晶", detail: "石头上结着一层白盐，刮下来。", line: "刮下来的盐晶收进袋子。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "cang-favor",
    stateId: "cangzhou",
    step: 2,
    kind: "人情",
    prompt: "礁边一条船缆松了，浪已经漫过脚踝，水线外有人在喊。",
    options: [
      { id: "cang-line", label: "把缆绳拉紧", detail: "抓住松了的缆，把它重新勒到礁上。", line: "缆绳拉紧了。", favorReason: "盐风礁上把缆绳拉紧给我", helpedLine: "你把松了的缆绳拉紧。记下一笔：盐风礁上把缆绳拉紧给我。", aloneLine: "水线外没有人。缆绳仍松着，你没有把船上的东西拿走。" },
      { id: "cang-box", label: "把船上的匣子拿下来", detail: "船舷上有一只没扣严的匣子。", line: "匣子拿下来，里面是几枚灵石。", stones: 12 },
      { id: "cang-dry", label: "退到干礁上", detail: "浪还在涨，先退到干处。", line: "人退到干礁上。缆绳和匣子都留在浪里。", qi: 6 },
    ],
  },
  {
    id: "wan-drill",
    stateId: "wanzhou",
    step: 1,
    kind: "历练",
    prompt: "茶桥野的茶棚收了。茶鼬从案下钻出来，桥影拉在桥板上。定根拖了一下步子。",
    options: [
      { id: "wan-bridge", label: "把茶案让开从桥上过", detail: "茶案挡着桥板，侧过身走过去。", line: "茶案让开了。茶鼬钻回案下，没有追。", qi: 8 },
      { id: "wan-weasel", label: "把茶鼬从案下赶出来", detail: "案下有响动，先把它赶出来。", line: "茶鼬窜出来的时候，茶藤把脚踝定住一下。兽核进了袋子。", qiDamage: 12, injury: 1, itemId: "beast-core", itemCount: 1 },
      { id: "wan-tea", label: "收起案上没喝完的茶", detail: "半碗凉茶还在，连着茶案下的一枚小石。", line: "茶案下那枚小石收进袋子。凉茶留在碗里。", itemId: "spirit-ore", itemCount: 1 },
    ],
  },
  {
    id: "wan-favor",
    stateId: "wanzhou",
    step: 2,
    kind: "人情",
    prompt: "棚里还坐着一个收摊的人，壶是温的，他问要不要坐一下。",
    options: [
      { id: "wan-sit", label: "坐下喝一口再走", detail: "在茶案边坐下，喝一口再走。", line: "坐下来喝了一口。", favorReason: "茶桥上把半盏让给我", helpedLine: "你坐下喝了一口。记下一笔：茶桥上把半盏让给我。", aloneLine: "棚里没有人。温壶还在案上，你喝了一口就走，没有把壶带走。", qi: 6 },
      { id: "wan-pot", label: "把壶里剩下的带走", detail: "不等茶凉，把壶里剩下的倒走。", line: "壶里剩下的茶饼连着几枚灵石，收进袋子。", stones: 28 },
      { id: "wan-cross", label: "从桥上直接过去", detail: "不进棚，桥板是干的，直接走。", line: "人从桥上走过去。棚里的壶没有动。", qi: 4 },
    ],
  },
];

const BEAT_BY_ID = new Map(WILD_BEATS.map((beat) => [beat.id, beat]));

export function wildBeats(): readonly WildBeatDef[] {
  return WILD_BEATS;
}

export function wildBeatsForState(stateId: string): readonly WildBeatDef[] {
  return WILD_BEATS.filter((beat) => beat.stateId === stateId);
}

export function wildBeatById(beatId: string | null | undefined): WildBeatDef | null {
  if (!beatId) return null;
  return BEAT_BY_ID.get(beatId) ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function syncWildBeat(progress: WildernessProgress, place: WildPlace | null, busy: boolean): boolean {
  if (!place) return false;
  const cleared = progress.beatsCleared ?? 0;
  if (cleared >= 2) {
    progress.pendingBeatId = undefined;
    return false;
  }
  if (progress.pendingBeatId && wildBeatById(progress.pendingBeatId)) return true;
  if (busy) return false;
  if (cleared > 0 && progress.ticksSurvived < (progress.nextBeatAt ?? 0)) return false;
  const beat = wildBeatsForState(place.stateId)[cleared];
  if (!beat) return false;
  progress.pendingBeatId = beat.id;
  return true;
}

export interface WildBeatView {
  step: 1 | 2;
  total: 2;
  kind: WildBeatDef["kind"];
  prompt: string;
  decisionLine: typeof WILD_DECISION_LINE;
  options: Array<{ id: string; label: string; description: string }>;
}

export function wildBeatView(progress: WildernessProgress): WildBeatView | null {
  const beat = wildBeatById(progress.pendingBeatId);
  if (!beat) return null;
  return {
    step: beat.step,
    total: 2,
    kind: beat.kind,
    prompt: beat.prompt,
    decisionLine: WILD_DECISION_LINE,
    options: beat.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.detail,
    })),
  };
}

function companionHere(world: WorldState, cultivator: Cultivator): Cultivator | null {
  for (const other of Object.values(world.cultivators)) {
    if (other.id === cultivator.id) continue;
    if (other.locationId === cultivator.locationId) return other;
  }
  return null;
}

function applyWildBeatOption(world: WorldState, cultivator: Cultivator, option: WildBeatOption): string {
  if (option.favorReason) {
    const other = companionHere(world, cultivator);
    if (other) {
      grantOwedFavor(world, other.id, cultivator.id, option.favorReason, "wild-beat");
      return option.helpedLine ?? option.line;
    }
    if (option.qi) {
      cultivator.qi = clamp(cultivator.qi + option.qi, 0, cultivator.maxQi);
    }
    return option.aloneLine ?? option.line;
  }
  if (option.qi) cultivator.qi = clamp(cultivator.qi + option.qi, 0, cultivator.maxQi);
  if (option.qiDamage) cultivator.qi = clamp(cultivator.qi - option.qiDamage, 1, cultivator.maxQi);
  if (option.injury) {
    cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, option.injury);
  }
  if (option.stones) cultivator.spiritStones += option.stones;
  if (option.itemId) {
    cultivator.inventory[option.itemId] = (cultivator.inventory[option.itemId] ?? 0) + (option.itemCount ?? 1);
  }
  return option.line;
}

function addWorldEvent(world: WorldState, event: Omit<WorldEvent, "id" | "tick">): void {
  world.worldEvents.unshift({
    id: `event-${world.nextEventSequence++}`,
    tick: world.tick,
    ...event,
  });
}

export function resolveWildBeat(
  world: WorldState,
  cultivator: Cultivator,
  progress: WildernessProgress,
  place: WildPlace,
  optionId: string,
): string {
  const beat = wildBeatById(progress.pendingBeatId);
  if (!beat || beat.stateId !== place.stateId) {
    throw new GameplayRejection("这片荒野没有待决的岔路。");
  }
  const option = beat.options.find((candidate) => candidate.id === optionId);
  if (!option) throw new GameplayRejection("这个选择不在当前岔路上。");
  const body = applyWildBeatOption(world, cultivator, option);
  const sentence = `你选了${option.label}。${place.name}这一段的见闻：${body}`;
  noteWild(cultivator, {
    tick: world.tick,
    locationId: cultivator.locationId,
    title: "这一段见闻",
    detail: sentence,
  });
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "荒野岔路",
    content: sentence,
    severity: "medium",
    tags: ["wilderness", "wild-beat"],
  });
  const cleared = (progress.beatsCleared ?? 0) + 1;
  progress.beatsCleared = cleared;
  progress.pendingBeatId = undefined;
  if (cleared < 2) progress.nextBeatAt = progress.ticksSurvived + WILD_BEAT_GAP;
  return sentence;
}
