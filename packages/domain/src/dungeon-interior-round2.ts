import type { DungeonBeat, DungeonExpeditionPolicy } from "./model.js";
import type { EnemyPattern } from "./party-battle.js";

/**
 * A second pass through the same doors.
 *
 * The first pack, the first side room, and the first five wakes stay where
 * they are. These are the later names, the next sentence, and the room
 * farther in.
 */

export interface LaterFoe {
  name: string;
  flavor: "兵器" | "法术";
  pattern: EnemyPattern;
  elite?: boolean;
}

export interface DeeperChoice {
  id: string;
  label: string;
  description: string;
  safe?: boolean;
  stones?: number;
  injury?: number;
  qi?: number;
  reputation?: number;
  line: string;
}

export interface DeeperScene {
  prompt: string;
  options: readonly DeeperChoice[];
}

export interface ExtraWake {
  sceneKind: "well" | "span" | "lantern" | "voice" | "ford";
  context: string;
  options: Array<{ optionId: string; label: string; description: string }>;
  defaultOptionId: string;
}

export interface ExtraWakeEffect {
  stoneDelta: number;
  moralityDelta: number;
  injuryTicks?: number;
  beat: DungeonBeat;
}

type BandKey = "bing" | "yi" | "lei" | "wu" | "tong" | "danxia" | "infant-pool" | "divine-rift";
type RoomKind = "scout" | "rest" | "side" | "approach";

export const LATER_PACKS: Record<BandKey, { foes: readonly LaterFoe[]; elite: LaterFoe }> = {
  bing: {
    foes: [
      { name: "砖斧客", flavor: "兵器", pattern: "pressure" },
      { name: "纸符修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "廊尾客", flavor: "兵器", pattern: "swift", elite: true },
  },
  yi: {
    foes: [
      { name: "灯杆客", flavor: "兵器", pattern: "swift" },
      { name: "油火修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "夜驿客", flavor: "法术", pattern: "drain", elite: true },
  },
  lei: {
    foes: [
      { name: "雷鞭客", flavor: "兵器", pattern: "swift" },
      { name: "跳符修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "阵眼客", flavor: "法术", pattern: "seal", elite: true },
  },
  wu: {
    foes: [
      { name: "泥矛客", flavor: "兵器", pattern: "pressure" },
      { name: "丝咒修", flavor: "法术", pattern: "drain" },
    ],
    elite: { name: "雾心客", flavor: "法术", pattern: "seal", elite: true },
  },
  tong: {
    foes: [
      { name: "棺钉客", flavor: "兵器", pattern: "pressure" },
      { name: "寒灯修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "铜盖客", flavor: "兵器", pattern: "swift", elite: true },
  },
  danxia: {
    foes: [
      { name: "炭锤客", flavor: "兵器", pattern: "pressure" },
      { name: "炉烟修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "灰门客", flavor: "兵器", pattern: "swift", elite: true },
  },
  "infant-pool": {
    foes: [
      { name: "莲茎客", flavor: "兵器", pattern: "swift" },
      { name: "灯影修", flavor: "法术", pattern: "drain" },
    ],
    elite: { name: "叶下客", flavor: "法术", pattern: "seal", elite: true },
  },
  "divine-rift": {
    foes: [
      { name: "纹斧客", flavor: "兵器", pattern: "pressure" },
      { name: "压字修", flavor: "法术", pattern: "seal" },
    ],
    elite: { name: "缝中客", flavor: "法术", pattern: "burst", elite: true },
  },
};

export const PLACE_HINT: Record<BandKey, string> = {
  bing: "这一截不深。",
  yi: "灯奴不在这一截。",
  lei: "手上有一点麻。",
  wu: "雾还贴着踝。",
  tong: "冷是从石里来的。",
  danxia: "墙还是热的。",
  "infant-pool": "水光晃了一下。",
  "divine-rift": "肩上的压还在。",
};

const line = (title: string, detail: string, mood: string) => ({ title, detail, mood });

export const ROOM_LINE_LATER: Record<BandKey, Record<RoomKind, { title: string; detail: string; mood: string }>> = {
  bing: {
    scout: line("探路", "这一层又转了一个弯。你把灯举高一点，砖缝还是干的，没有新的脚印。", "路还认得"),
    rest: line("歇脚", "你换了一块砖坐下，把绕在腕上的绳子松开。气顺一点，再走。", "手松了"),
    side: line("侧室", "另一间侧室的门是虚掩的。里面有半截蜡烛，你看过就退出来。", "不是主路"),
    approach: line("将到守关", "前面的灯密了。守关还没出来，你先把袋子系紧。", "该收一收神"),
  },
  yi: {
    scout: line("探路", "旧驿石廊这一截的灯是灭的。你沿墙根走，石缝里那点亮还在。", "路还认得"),
    rest: line("歇脚", "你在驿房门槛上坐了一会儿。定根的劲从脚上退了一点。", "脚腕松了"),
    side: line("侧室", "廊侧又有一间空房。床板是凉的，没有人睡过的印子。", "不是主路"),
    approach: line("将到守关", "石卒的影子在前面齐了一下。你把灯压低，人还没到跟前。", "该收一收神"),
  },
  lei: {
    scout: line("探路", "雷泽残阵这一截的砖不跳了。你又看了一圈，麻还在指上，路是认得的。", "路还认得"),
    rest: line("歇脚", "你在灭掉的阵眼边站定，等袖口的响停下来。人可以再走。", "手不那么麻"),
    side: line("侧室", "残阵另一边还有一间石龛。龛里是空的，只有一点焦味。", "不是主路"),
    approach: line("将到守关", "残雷在更前面劈过。守关还站着，这一截先把步子放稳。", "该收一收神"),
  },
  wu: {
    scout: line("探路", "沉雾沼这一段的泥软了一点。你用剑尖又点了点，左边那一脚还踩得实。", "路还认得"),
    rest: line("歇脚", "你把靴上新缠的雾丝撕掉，在石上坐到脚腕不紧。", "鞋还是湿的"),
    side: line("侧室", "雾里又露出一间石室。门槛没淹，里面只有一汪浅水。", "不是主路"),
    approach: line("将到守关", "水声在前面齐了。沼主那一带还没看见人，雾已经厚了。", "该收一收神"),
  },
  tong: {
    scout: line("探路", "铜棺窟这一口棺的霜结到了沿上。你绕开，路还是通的。", "路还认得"),
    rest: line("歇脚", "你在两口棺的窄处停了停，把冻住的袖口搓开。", "手还能握"),
    side: line("侧室", "侧室里多了一口盖着的小棺。你没有揭，只听了听，里面没有声音。", "不是主路"),
    approach: line("将到守关", "前面那口棺又响了一下。守关还在棺后，这一步放轻。", "该收一收神"),
  },
  danxia: {
    scout: line("探路", "丹霞内府这一截的墙凉了一点。你先看清火在更里面，袖子还没焦。", "路还认得"),
    rest: line("歇脚", "你在炉灰薄的地方坐下，等脸上的热退下去。气还在。", "脸上还烫"),
    side: line("侧室", "另一间侧室堆着冷掉的炭。你没有翻，只看清炭是干的。", "不是主路"),
    approach: line("将到守关", "炉火在前面又旺了一截。热先到了，守关还没扑出来。", "该收一收神"),
  },
  "infant-pool": {
    scout: line("探路", "婴火莲池这一段的莲开得密。你闭了一息眼，分清哪一朵是路。", "路还认得"),
    rest: line("歇脚", "你在池边又坐了一会儿，把被抽走的那一点灵力补回来。够再走一段。", "灵台还虚"),
    side: line("侧室", "莲叶后面还有一处石窝。窝里没有莲，只有一截熄了的灯芯。", "不是主路"),
    approach: line("将到守关", "池心的火又跳了一下。幻惑贴到眼上的时候，人还没到跟前。", "该收一收神"),
  },
  "divine-rift": {
    scout: line("探路", "神纹天隙这一笔纹路稀一点。你沿它看了一圈，出手还压得住。", "路还认得"),
    rest: line("歇脚", "你在纹路断开的地方站定，等肩上的劲再松半寸。", "肩还沉"),
    side: line("侧室", "缝侧面又有一间小室。纹比刚才那间淡，你只记住它的位置。", "不是主路"),
    approach: line("将到守关", "天隙窄成一条。镇压已经能感到，守关还在隙的那头。", "该收一收神"),
  },
};

function choice(
  id: string,
  label: string,
  description: string,
  lineText: string,
  effect: Partial<Pick<DeeperChoice, "safe" | "stones" | "injury" | "qi" | "reputation">> = {},
): DeeperChoice {
  return { id, label, description, line: lineText, ...effect };
}

export const REGIONAL_DEEPER: Record<string, DeeperScene> = {
  "qinglan-herb-cave": {
    prompt: "石窝再往里，窟顶有一条还在滴的缝。",
    options: [
      choice("deep-qinglan-stand", "站开一点", "滴下来的水不接，人先站干。", "滴缝在石窝里面。你站开一点，水滴在石头上，没有进瓶子。", { safe: true }),
      choice("deep-qinglan-cup", "用瓶子接一滴", "只接滴下来的那一滴，藤不动。", "你用瓶子接了一滴。不多，瓶口凉了一下。", { stones: 4 }),
      choice("deep-qinglan-tell", "把滴的方向记下", "后来的人就知道往哪边站。", "你在滴缝旁边划了一道，让后来的人知道水从哪边来。", { reputation: 1 }),
      choice("deep-qinglan-plug", "用手去堵", "堵住也许能积一点，藤也会抽一下。", "你用手去堵那条缝。掌心湿了，腕上也留了一道。", { stones: 8, injury: 1 }),
    ],
  },
  "tide-bell-cave": {
    prompt: "大钟旁边的壁上，挂着一排没敲过的小钟。",
    options: [
      choice("deep-tide-pass", "从小钟下面走", "一只也不碰。", "小钟挂在壁上。你从下面走过去，一只也没有碰。", { safe: true }),
      choice("deep-tide-count", "数有几只", "数清就走，不敲。", "壁上一共七只小钟。你数清，人没有伸手。", { stones: 2 }),
      choice("deep-tide-mark", "在壁上留个记号", "告诉后来的人这些钟没响过。", "你在壁上留了个记号。小钟还是静的。", { reputation: 1 }),
      choice("deep-tide-tap", "敲一只最小的", "声音会传出去，钟里也许有东西。", "最小的那只响了一下。你退开的时候，袖子是湿的，掌心里多了几枚灵石。", { stones: 8, qi: 4 }),
    ],
  },
  "cloud-plank-break": {
    prompt: "断索下面还有一块没踩过的云板。",
    options: [
      choice("deep-plank-skip", "不踩那块板", "绳还在，人从旁边过。", "云板在断索下面。你没有踩，人贴着绳子过去。", { safe: true }),
      choice("deep-plank-test", "用脚尖试一下", "试过就收回来。", "你用脚尖试了试。板还吃得住一个人，你把脚收回来了。", { stones: 2 }),
      choice("deep-plank-rope", "把断绳系在板上", "后来的人踩的时候有个抓手。", "你把一截断绳系在云板上。后来的人有地方抓。", { reputation: 1 }),
      choice("deep-plank-cross", "踩着板过去", "近一些，板也可能裂。", "你踩着云板过去。板裂了一条缝，那边的石上有几枚灵石。", { stones: 8, injury: 1 }),
    ],
  },
  "old-tea-seat": {
    prompt: "茶室外的廊下，有一笼还没揭的茶。",
    options: [
      choice("deep-tea-pass", "从茶笼旁边过", "笼不揭，茶还是干的。", "廊下有一笼茶。你从旁边过去，盖还盖着。", { safe: true }),
      choice("deep-tea-smell", "只揭开闻一下", "闻过就把盖盖上。", "你把盖揭开一条缝。茶是干的，闻过就把盖盖上了。", { stones: 2 }),
      choice("deep-tea-share", "留一半给后来的人", "自己不坐，把能喝的推出来。", "你把笼里还能冲的那一半推到廊下，给后来的人。", { stones: -2, reputation: 1 }),
      choice("deep-tea-pack", "把茶笼提走", "笼不重，席上的人会听见。", "茶笼提起来的时候，席那边有人咳了一声。灵石是夹在笼底的。", { stones: 8, reputation: -1 }),
    ],
  },
  "balance-stele": {
    prompt: "碑后又有一排没动过的小砝码。",
    options: [
      choice("deep-stele-leave", "砝码不动", "人还站在中间。", "碑后的小砝码排得很齐。你没有动，秤还是平的。", { safe: true }),
      choice("deep-stele-count", "数有几枚", "数清就放回去。", "小砝码一共九枚。你数清，又按原样放好。", { stones: 2 }),
      choice("deep-stele-hand", "把压住袖子的那枚拿开", "有人的袖子被压着。拿开，人就能走。", "一枚砝码压着别人的袖子。你拿开，那人点了下头就走了。", { reputation: 1 }),
      choice("deep-stele-pocket", "拿走一枚", "袋子会重一点，秤也会偏。", "你拿走一枚小砝码。秤偏了一下，肩上也擦过一下。", { stones: 8, injury: 1 }),
    ],
  },
  "frost-night-hunt": {
    prompt: "兽窝再往前，有一堆没燃完的火。",
    options: [
      choice("deep-frost-wide", "从火堆外面绕", "灰不翻，味也不搅。", "火堆的灰还温着。你从外面绕过去，没有把味搅起来。", { safe: true }),
      choice("deep-frost-warm", "烤一烤手", "烤完就走，灰不动。", "你在火堆边烤了烤手。灰还是原样，手指能动了。", { stones: 2 }),
      choice("deep-frost-cover", "把明火压灭", "味少散一点，后来的人好过。", "你把还亮的那一点压灭。味没有再往夜巡的路上飘。", { reputation: 1 }),
      choice("deep-frost-rake", "把灰翻开", "灰里可能有东西，窝里的也会醒。", "灰翻开以后掉出几枚灵石。小臂也被扑了一下。", { stones: 8, injury: 1 }),
    ],
  },
  "scorched-altar": {
    prompt: "祭坛下面有一条还烫的灰沟。",
    options: [
      choice("deep-altar-wait", "先不进灰沟", "烟往上走，人站在边上。", "灰沟还烫。你站在边上，没有下去。", { safe: true }),
      choice("deep-altar-cool", "等它凉一点再看", "看清沟里有什么，不捡。", "你等灰凉了一点。沟里是空的，只有焦木。", { stones: 2 }),
      choice("deep-altar-path", "把能过的地方让出来", "后来的人不用踩烫的那一截。", "你把凉了的焦木拨到一边。后来的人可以从边上过。", { reputation: 1 }),
      choice("deep-altar-reach", "伸手进沟里", "沟底可能有东西，烟也会上来。", "你伸手进灰沟。摸到几枚暖的灵石，眼睛也被烟呛了一下。", { stones: 10, qi: 4 }),
    ],
  },
  "salt-wreck": {
    prompt: "船舷上有一只没钉死的匣子。",
    options: [
      choice("deep-salt-leave", "匣子不打开", "人还留在甲板上。", "船舷上的匣子没钉死。你看了一眼，没有打开。", { safe: true }),
      choice("deep-salt-shake", "摇一摇", "听里面有没有东西，盖不揭。", "你把匣子摇了摇。里面有响，盖还盖着。", { stones: 2 }),
      choice("deep-salt-nail", "把松了的钉子按上", "后来的人少被绊一下。", "你把松了的钉子按上。匣子不再自己响。", { reputation: 1 }),
      choice("deep-salt-open", "把盖揭开", "里面可能有灵石，盐也会呛人。", "盖揭开以后盐呛上来。匣底有几枚灵石，人退回甲板。", { stones: 8, injury: 1 }),
    ],
  },
  "sand-gate-seal": {
    prompt: "闭关室外有一盘没画完的沙。",
    options: [
      choice("deep-sand-watch", "只看沙上的纹", "手不放上去。", "沙盘上的纹没画完。你看了一眼，手没有放上去。", { safe: true }),
      choice("deep-sand-read", "把画完的那半读了", "读完就站开。", "画完的那半写的是风从哪边来。你读完，人站开了。", { stones: 2 }),
      choice("deep-sand-cover", "把沙盘挪出风口", "纹就不会被吹乱。", "你把沙盘挪出风口。没画完的那半还在。", { reputation: 1 }),
      choice("deep-sand-draw", "把没画完的补上", "补上也许有东西，沙也会进袖子。", "你把没画完的补上。沙灌进袖子，盘边掉出几枚灵石。", { stones: 8, injury: 1 }),
    ],
  },
  "wanderer-cave": {
    prompt: "残札屋后面有一堵还刻着字的墙。",
    options: [
      choice("deep-wanderer-pass", "从墙边过去", "字不抠，人继续往里。", "刻着字的墙在札屋后面。你从旁边过去，字还在墙上。", { safe: true }),
      choice("deep-wanderer-read", "把字读完", "读完就走，石不动。", "墙上的字还能认。你读完，人没有去抠。", { stones: 2 }),
      choice("deep-wanderer-copy", "把字抄下来", "抄在掌心，留给后来的人。", "你把墙上的字抄在掌心。墙没有动。", { reputation: 1 }),
      choice("deep-wanderer-chip", "抠下一块", "带字的石也许能换灵石，指节也会磨破。", "你抠下一块带字的石。指节磨破了，后来换成了几枚灵石。", { stones: 8, injury: 1 }),
    ],
  },
  "merchant-hold": {
    prompt: "货席后面有一卷没对完的账。",
    options: [
      choice("deep-merchant-look", "只看账头", "账不卷走。", "账卷在货席后面。你看了看账头，没有卷走。", { safe: true }),
      choice("deep-merchant-count", "把对得上的数清", "数清就放下。", "账上有三笔对得上。你数清，账还放在原处。", { stones: 4 }),
      choice("deep-merchant-note", "把对不上的记在边上", "后来的人少吃亏。", "有一笔对不上。你记在账边，自己没有补上。", { reputation: 1 }),
      choice("deep-merchant-roll", "把账卷走", "夹层里可能有灵石，仓里的人会听见。", "账卷起来的时候，仓里面有人咳了一声。夹层里有几枚灵石。", { stones: 10, reputation: -1 }),
    ],
  },
  "ancient-vigil": {
    prompt: "灯后再有一个没人坐过的蒲团角。",
    options: [
      choice("deep-vigil-stand", "先不坐", "蒲团还是空的。", "灯后的蒲团角没有坐痕。你站了一会儿，没有坐。", { safe: true }),
      choice("deep-vigil-brush", "把角上的灰拂掉", "拂掉就站开。", "蒲团角上有一层灰。你拂掉，人还站着。", { stones: 2 }),
      choice("deep-vigil-straight", "把蒲团摆正", "后来的人坐的时候不用再挪。", "你把蒲团摆正。灯还是那盏，人没有坐下。", { reputation: 1 }),
      choice("deep-vigil-lift", "把蒲团掀起来", "下面可能有东西，灯也可能灭。", "蒲团下面有几枚灵石。你拿起来的时候，灯灭了一息，又自己亮了。", { stones: 8, qi: 4 }),
    ],
  },
};

function option(optionId: string, label: string, description: string) {
  return { optionId, label, description };
}

export function extraWakeScene(
  kind: string,
  posture: DungeonExpeditionPolicy,
): ExtraWake | null {
  if (kind === "well") {
    return {
      sceneKind: "well",
      context: "路上有一口枯井，绳还搭在沿上。可以走开、把绳子留在沿上、在沿上做个记号，或者把桶放下去看看。",
      options: [
        option("leave-well", "从井边走开", "绳不动，人从旁边过。"),
        option("share-well", "把绳子留在沿上", "后来的人下来的时候有个抓手。"),
        option("point-well", "在井沿做记号", "划一道，自己不下去。"),
        option("lower-bucket", "把桶放下去", "井底可能有东西，绳也可能断。"),
      ],
      defaultOptionId: posture === "aggressive" ? "lower-bucket" : posture === "balanced" ? "share-well" : "leave-well",
    };
  }
  if (kind === "span") {
    return {
      sceneKind: "span",
      context: "前面的路断成一条窄梁。可以不踩、把绳头抛给对面、在梁头做个记号，或者跑过去。",
      options: [
        option("leave-span", "不踩窄梁", "从旁边的碎石绕，慢一点。"),
        option("share-span", "把绳头抛过去", "对面的人能抓住，自己还站在这边。"),
        option("point-span", "在梁头做记号", "让后来的人知道这里窄。"),
        option("sprint-span", "跑过去", "近一些。梁裂的话，人会先晃一下。"),
      ],
      defaultOptionId: posture === "aggressive" ? "sprint-span" : posture === "balanced" ? "share-span" : "leave-span",
    };
  }
  if (kind === "lantern") {
    return {
      sceneKind: "lantern",
      context: "墙边有一盏还没灭的残灯。可以留在原处、把灯油分一半、把灯移到能看见的地方，或者把灯摘走。",
      options: [
        option("leave-lantern", "灯留在原处", "火还在，人继续走。"),
        option("share-lantern", "把灯油分一半", "自己的灯能再亮一会儿，墙上的也不灭。"),
        option("point-lantern", "把灯移到路口", "后来的人一进弯就能看见。"),
        option("take-lantern", "把灯摘走", "这一截会黑。灯座里可能有东西。"),
      ],
      defaultOptionId: posture === "aggressive" ? "take-lantern" : posture === "balanced" ? "share-lantern" : "leave-lantern",
    };
  }
  if (kind === "voice") {
    return {
      sceneKind: "voice",
      context: "侧壁里有人低声问路。可以不答、回一句路、把水囊递过去，或者顺着声音走。",
      options: [
        option("leave-voice", "不答", "脚步放轻，人从主路过去。"),
        option("share-voice", "回一句路", "告诉对方哪边还通，人不过去。"),
        option("aid-voice", "把水囊递过去", "只递水，不进那条缝。"),
        option("follow-voice", "顺着声音走", "缝里可能有人，也可能只有回声。"),
      ],
      defaultOptionId: posture === "aggressive" ? "follow-voice" : posture === "balanced" ? "share-voice" : "leave-voice",
    };
  }
  if (kind === "ford") {
    return {
      sceneKind: "ford",
      context: "路上积了一滩浅水。可以从干处绕、把能踩的石头摆正、在岸边做个记号，或者踩水穿过去。",
      options: [
        option("leave-ford", "从干处绕", "鞋不湿，路远一点。"),
        option("share-ford", "把石头摆正", "后来的人有地方踩。"),
        option("point-ford", "在岸边做记号", "划一道，自己从干处走。"),
        option("wade-ford", "踩水穿过去", "近一些。水底滑的话，人会跪一下。"),
      ],
      defaultOptionId: posture === "aggressive" ? "wade-ford" : posture === "balanced" ? "share-ford" : "leave-ford",
    };
  }
  return null;
}

function effect(
  stoneDelta: number,
  moralityDelta: number,
  title: string,
  detail: string,
  extra: { stones?: number; morality?: number; injuryTicks?: number; kind?: DungeonBeat["kind"] } = {},
): ExtraWakeEffect {
  return {
    stoneDelta: extra.stones ?? stoneDelta,
    moralityDelta: extra.morality ?? moralityDelta,
    injuryTicks: extra.injuryTicks,
    beat: {
      kind: extra.kind ?? (stoneDelta < 0 ? "person" : stoneDelta > 0 ? "find" : "mood"),
      title,
      detail,
      mood: stoneDelta < 0 ? "袋子轻了一点" : extra.injuryTicks ? "还得看这一下" : "这一段可以回去说",
    },
  };
}

export const EXTRA_WAKE_EFFECTS: Record<string, ExtraWakeEffect> = {
  "leave-well": effect(0, 0, "从井边走开", "枯井的绳还搭在沿上。你从旁边走过去，桶没有放下去。"),
  "share-well": effect(-2, 1, "把绳子留在井沿", "你把绳子在井沿上绕紧。后来的人下来的时候有个抓手。", { stones: -2 }),
  "point-well": effect(2, 1, "在井沿做了记号", "你在井沿上划了一道，自己没有下去。后来的人看得到。", { stones: 2 }),
  "lower-bucket": effect(8, -1, "把桶放了下去", "桶放下去的时候绳顿了一下。井底有几枚灵石，袖子也湿了。", { injuryTicks: 2, stones: 8, morality: -1, kind: "injury" }),
  "leave-span": effect(0, 0, "没有踩窄梁", "窄梁还在原处。你从旁边的碎石绕过去，鞋是干的。"),
  "share-span": effect(0, 1, "把绳头抛了过去", "你把绳头抛到对面。那边有人抓住了，你自己还站在这边。"),
  "point-span": effect(2, 1, "在梁头做了记号", "你在梁头划了一道，人从碎石那边绕。后来的人知道这里窄。", { stones: 2 }),
  "sprint-span": effect(10, -1, "从窄梁跑了过去", "你跑过窄梁。梁裂了一条缝，对面的石上却有几枚灵石。", { injuryTicks: 2, stones: 10, morality: -1, kind: "injury" }),
  "leave-lantern": effect(0, 0, "残灯留在原处", "墙边的灯还亮着。你看了一眼，人继续走。"),
  "share-lantern": effect(-2, 1, "分了一半灯油", "你把灯油分了一半到自己的灯里。墙上的那盏也没有灭。", { stones: -2 }),
  "point-lantern": effect(2, 1, "把灯移到路口", "你把残灯移到路口。后来的人一进弯就能看见。", { stones: 2 }),
  "take-lantern": effect(8, -1, "把残灯摘走了", "灯摘下来以后这一截黑了。灯座里有几枚灵石。", { stones: 8, morality: -1, kind: "close-call" }),
  "leave-voice": effect(0, 0, "没有答那一声", "侧壁里有人问路。你把脚步放轻，从主路过去了。"),
  "share-voice": effect(0, 1, "回了一句路", "你告诉那边哪一条还通。人没有进那条缝。"),
  "aid-voice": effect(-4, 1, "把水囊递了过去", "你把水囊递进缝里。喝完又递了回来，人还在主路上。", { stones: -4 }),
  "follow-voice": effect(10, -1, "顺着声音走了", "你顺着声音走进去。缝里没有人，只有几枚灵石和一声回响。肩上重了一下。", { injuryTicks: 2, stones: 10, morality: -1, kind: "injury" }),
  "leave-ford": effect(0, 0, "从干处绕开了", "浅水拦在路上。你从干处绕过去，鞋没有湿。"),
  "share-ford": effect(0, 1, "把石头摆正了", "你把能踩的石头摆正。后来的人有地方落脚。"),
  "point-ford": effect(2, 1, "在岸边做了记号", "你在岸边划了一道，自己从干处走。后来的人看得到水有多浅。", { stones: 2 }),
  "wade-ford": effect(8, -1, "踩水穿了过去", "你踩水穿过去。膝盖湿了，对岸的石缝里有几枚灵石。", { injuryTicks: 2, stones: 8, morality: -1, kind: "injury" }),
};

export const EXTRA_WILD_ROOMS = [
  (place: string) => `${place}的风从侧面来。你把袋子换到另一只手上，没有停。`,
  (place: string) => `${place}有一截被踩实的土。你顺着走了几步，脚印是别人的。`,
  (place: string) => `${place}路边的草是倒的。你看了看方向，没有追。`,
  (place: string) => `${place}有一汪不深的水。你洗了洗手，没有装。`,
] as const;

export const EXTRA_BAHUANG_ROOMS = [
  (place: string) => `${place}的尘里有一串浅印。你看清是往前的，没有踩上去。`,
  (place: string) => `${place}有一块能挡风的碑。你在碑阴站了一会儿，没有刻字。`,
  (place: string) => `${place}侧面的石缝里有光。你看了一眼，光是从外面漏的。`,
  (place: string) => `${place}前面有人把干粮纸留在石头上。你没有捡，只把纸压好。`,
] as const;
