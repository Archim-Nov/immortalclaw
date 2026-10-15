import { mysteryForRank } from "./high-realm.js";
import { jiaPackShape, type GuardianThreat } from "./high-realm-dungeon.js";
import { lightPackFlavor } from "./yi-mystery.js";
import { runPartyBattle, type BattleCombatant, type EnemyPattern, type PartyBattleResult } from "./party-battle.js";
import type { DungeonBeat, DungeonExpeditionPolicy, DungeonGrade } from "./model.js";

/**
 * What a cultivator actually meets between the door and the last fight.
 *
 * Ranked floors still wake at most three times. These rooms, packs, and
 * side choices sit in the steps that used to be silent. State dungeons keep
 * their signature choice; the side room is answered with the same
 * `regional-choice` id and does not replace the door.
 */

export interface NamedFoe {
  name: string;
  flavor: "兵器" | "法术";
  pattern: EnemyPattern;
  elite?: boolean;
}

export interface InteriorChoice {
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

export interface InteriorScene {
  prompt: string;
  options: readonly InteriorChoice[];
}

export interface WakeEffect {
  stoneDelta: number;
  moralityDelta: number;
  injuryTicks?: number;
  beat: DungeonBeat;
}

type BandKey = "bing" | "yi" | "lei" | "wu" | "tong" | "danxia" | "infant-pool" | "divine-rift";
type RoomKind = "scout" | "rest" | "side" | "approach";
type FreshWake = "trap" | "shrine" | "chamber" | "nest" | "sealed";

const FLOOR_PACKS: Record<BandKey, { place: string; foes: readonly NamedFoe[]; elite: NamedFoe }> = {
  bing: {
    place: "这一层",
    foes: [
      { name: "石刀客", flavor: "兵器", pattern: "swift" },
      { name: "火符修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "廊中客", flavor: "兵器", pattern: "pressure", elite: true },
  },
  yi: {
    place: "旧驿石廊",
    foes: [
      { name: "灯刃", flavor: "兵器", pattern: "swift" },
      { name: "石咒修", flavor: "法术", pattern: "drain" },
    ],
    elite: { name: "驿卒长", flavor: "兵器", pattern: "pressure", elite: true },
  },
  lei: {
    place: "雷泽残阵",
    foes: [
      { name: "雷枪客", flavor: "兵器", pattern: "swift" },
      { name: "断法修", flavor: "法术", pattern: "seal" },
    ],
    elite: { name: "残阵主", flavor: "法术", pattern: "burst", elite: true },
  },
  wu: {
    place: "沉雾沼",
    foes: [
      { name: "沼刃", flavor: "兵器", pattern: "pressure" },
      { name: "缠雾修", flavor: "法术", pattern: "drain" },
    ],
    elite: { name: "沼主", flavor: "法术", pattern: "seal", elite: true },
  },
  tong: {
    place: "铜棺窟",
    foes: [
      { name: "铜矛客", flavor: "兵器", pattern: "pressure" },
      { name: "霜术士", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "棺前客", flavor: "兵器", pattern: "swift", elite: true },
  },
  danxia: {
    place: "丹霞内府",
    foes: [
      { name: "火刀客", flavor: "兵器", pattern: "swift" },
      { name: "焚咒修", flavor: "法术", pattern: "burst" },
    ],
    elite: { name: "炉前使", flavor: "兵器", pattern: "pressure", elite: true },
  },
  "infant-pool": {
    place: "婴火莲池",
    foes: [
      { name: "莲枪客", flavor: "兵器", pattern: "swift" },
      { name: "幻莲修", flavor: "法术", pattern: "drain" },
    ],
    elite: { name: "池上使", flavor: "法术", pattern: "seal", elite: true },
  },
  "divine-rift": {
    place: "神纹天隙",
    foes: [
      { name: "纹剑客", flavor: "兵器", pattern: "pressure" },
      { name: "镇印修", flavor: "法术", pattern: "seal" },
    ],
    elite: { name: "隙前客", flavor: "法术", pattern: "burst", elite: true },
  },
};

const ROOM_LINES: Record<BandKey, Record<RoomKind, { title: string; detail: string; mood: string }>> = {
  bing: {
    scout: { title: "探路", detail: "这一层不算深。你先沿墙看了一圈，灯还是自己带来的那盏，砖缝里没有新的脚印。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在干一点的砖上坐了一会儿，把靴底的灰磕掉。气顺过来一点，再往前。", mood: "腿不那么沉了" },
    side: { title: "侧室", detail: "侧室的门只掩着。里面有一张没人睡完的席，席角压着半枚灵石，你看过就退出来。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "前面的风变干了。守关还没露面，墙上的灯却比来路密。", mood: "该收一收神" },
  },
  yi: {
    scout: { title: "探路", detail: "旧驿石廊的灯油是凝的。你先看了一圈，灯奴没在这一截，只有墙根的石缝还亮。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你靠着驿墙歇了一会儿。定根的那股劲还在脚上，坐下来就轻些。", mood: "步子缓过来" },
    side: { title: "侧室", detail: "廊侧有一间旧驿房，门轴是响的。桌上剩半盏冷茶，没有人。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "石卒的脚步在前面齐了一下。你把灯压低，离守关还有一截。", mood: "该收一收神" },
  },
  lei: {
    scout: { title: "探路", detail: "雷泽残阵的砖还在跳。你沿灭掉的那一格看了一圈，手上有一点麻，人还没往里冲。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在阵眼外面站定，等那一阵麻过去。袖口还响，气先收回来。", mood: "手不那么麻" },
    side: { title: "侧室", detail: "残阵边上开着一间石龛。龛里没有人，只有一截断掉的阵脚木。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "残雷在前面劈过一下。守关还站在原处，这一截先别跑。", mood: "该收一收神" },
  },
  wu: {
    scout: { title: "探路", detail: "沉雾沼的雾贴着踝。你用剑尖点了点前面的泥，看哪一脚还踩得实。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你找了一块没塌的石，把缠在靴上的雾丝撕掉。坐一会儿，脚腕不那么紧。", mood: "鞋还是湿的" },
    side: { title: "侧室", detail: "雾里露出一间半淹的石室。门还能推开，里面只有一汪不动的水。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "雾在前面厚了一层。沼主那一带还没看见人，水声却齐了。", mood: "该收一收神" },
  },
  tong: {
    scout: { title: "探路", detail: "铜棺窟里冷。你先摸了摸棺沿，霜还没结到这一口，路是通的。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在棺与棺之间的窄处停了停，把冻住的指节活动开。", mood: "手还能握" },
    side: { title: "侧室", detail: "侧室里并排两口空棺，盖是开的。没有人躺，只有铜味。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "前面那口棺的盖自己响了一下。守关就在棺后，这一步放轻。", mood: "该收一收神" },
  },
  danxia: {
    scout: { title: "探路", detail: "丹霞内府的墙是热的。你先看了一圈，火没贴到袖子上，炉还在更里面。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在一口灭了的小炉边坐下，等脸上的热退一点。气还在，人能再走。", mood: "脸上还烫" },
    side: { title: "侧室", detail: "侧室堆着没烧完的炉灰。你没有翻，只看清灰是新的，就退出来。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "炉火在前面旺了一截。守关还没扑出来，热已经先到了。", mood: "该收一收神" },
  },
  "infant-pool": {
    scout: { title: "探路", detail: "婴火莲池的水光会晃。你先闭了一息眼，看清哪一朵莲是路，哪一朵是影。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在池边的石上坐住，把被抽走的那一点灵力慢慢补回来。不多，够再走一段。", mood: "灵台还虚" },
    side: { title: "侧室", detail: "莲叶后面有一间不深的石窝。窝里没有莲，只有一盏快灭的魂灯。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "池心的火跳了一下。守关还浮在那里，幻惑已经先贴到眼上。", mood: "该收一收神" },
  },
  "divine-rift": {
    scout: { title: "探路", detail: "神纹天隙把脚步压得很沉。你先沿纹路看了一圈，哪一笔是路，哪一笔会镇压出手。", mood: "先把路看清" },
    rest: { title: "歇脚", detail: "你在纹路稀一点的地方站定，等那股压在肩上的劲松半寸。", mood: "肩还沉" },
    side: { title: "侧室", detail: "缝侧面有一间被纹封住的小室。纹没破，你只记住它的样子。", mood: "不是主路" },
    approach: { title: "将到守关", detail: "天隙在前面窄成一条。守关的镇压已经能感到，人还没到跟前。", mood: "该收一收神" },
  },
};

const REGIONAL_ESCORTS: Record<string, NamedFoe> = {
  "qinglan-herb-cave": { name: "藤下影", flavor: "法术", pattern: "drain" },
  "tide-bell-cave": { name: "钟锈", flavor: "兵器", pattern: "pressure" },
  "cloud-plank-break": { name: "索影", flavor: "兵器", pattern: "swift" },
  "old-tea-seat": { name: "席客", flavor: "兵器", pattern: "swift" },
  "balance-stele": { name: "衡影", flavor: "法术", pattern: "seal" },
  "frost-night-hunt": { name: "夜巡者", flavor: "兵器", pattern: "swift" },
  "scorched-altar": { name: "焦坛侍", flavor: "法术", pattern: "burst" },
  "salt-wreck": { name: "盐骨", flavor: "兵器", pattern: "pressure" },
  "sand-gate-seal": { name: "闭关仆", flavor: "兵器", pattern: "pressure" },
  "wanderer-cave": { name: "残札影", flavor: "法术", pattern: "drain" },
  "merchant-hold": { name: "账房影", flavor: "兵器", pattern: "swift" },
  "ancient-vigil": { name: "灰里的人", flavor: "法术", pattern: "seal" },
};

function choice(
  id: string,
  label: string,
  description: string,
  line: string,
  effect: Partial<Pick<InteriorChoice, "safe" | "stones" | "injury" | "qi" | "reputation">> = {},
): InteriorChoice {
  return { id, label, description, line, ...effect };
}

const REGIONAL_SCENES: Record<string, InteriorScene> = {
  "qinglan-herb-cave": {
    prompt: "藤根旁边有一处石窝，露还没滴到那里。",
    options: [
      choice("room-qinglan-look", "只看一眼", "石窝是干的，不伸手。", "你在藤根旁边看了一眼。石窝是干的，露还挂在上面的藤上。", { safe: true }),
      choice("room-qinglan-cup", "用杯子接", "窝里有一点渗出来的露，接走就走。", "石窝里渗着一点露。你用杯子接了，不多，瓶子先凉了一下。", { stones: 4 }),
      choice("room-qinglan-help", "把藤拨开", "有人的袖子挂在藤上。拨开，人就能出去。", "袖子挂在藤上。你把藤拨开，那人点了下头，从石窝边退走了。", { stones: -2, reputation: 1 }),
      choice("room-qinglan-pull", "拽窝里的根", "根还活着，拽下来可能有灵石，藤也会缠一下。", "你拽了石窝里的根。灵石是有的，藤也在腕上留了一道。", { stones: 8, injury: 1 }),
    ],
  },
  "tide-bell-cave": {
    prompt: "钟还没响。潮水退到一半的石阶上，有一扇侧门。",
    options: [
      choice("room-tide-pass", "从石阶走过去", "侧门不推，人先到钟前。", "你沿退潮的石阶走过去，侧门没有推。钟还没响。", { safe: true }),
      choice("room-tide-listen", "听一会儿", "把耳朵贴在侧门上，听里面有没有水。", "侧门里面有水声。你听了一会儿，记下潮还要退多久。", { stones: 2 }),
      choice("room-tide-mark", "在门上划一下", "给后来的人留个记号，自己不进去。", "你在侧门上划了一道，让后来的人知道这里有水。人没有进去。", { reputation: 1 }),
      choice("room-tide-push", "把侧门推开", "里面可能有潮钟掉下来的碎片，水也会灌进来。", "侧门推开以后水灌到膝上。碎片捡到一片，人退出来的时候袖子是湿的。", { stones: 8, qi: 4 }),
    ],
  },
  "cloud-plank-break": {
    prompt: "断索旁边有一间挂着旧绳的侧室。",
    options: [
      choice("room-plank-walk", "贴着绳子走", "不进侧室，只沿着还能用的那根绳。", "你贴着还能用的绳子走，侧室的门在身后响了一下，没有进去。", { safe: true }),
      choice("room-plank-coil", "捡一截断绳", "地上的断绳还能缠在腕上，不算纤维。", "地上有一截断绳。你缠在腕上，过桥的时候稳一点。", { stones: 4 }),
      choice("room-plank-call", "喊一声", "侧室里好像有人。喊一声，不必进去。", "你朝侧室喊了一声。里面有人应了，说自己能出去，不用进来。", { reputation: 1 }),
      choice("room-plank-cut", "砍开侧室的藤", "藤把门锁住了。砍开能进去，藤也会抽一下。", "你砍开锁门的藤。屋里有几枚灵石，藤也在手上抽了一下。", { stones: 8, injury: 1 }),
    ],
  },
  "old-tea-seat": {
    prompt: "旧席旁边还有一间没人坐的茶室。",
    options: [
      choice("room-tea-pass", "从茶室门口过", "不入席，茶还是凉的。", "茶室的门开着，茶是凉的。你从门口过去，没有坐。", { safe: true }),
      choice("room-tea-cup", "喝一口凉茶", "壶里还有一口。喝完把杯子扣上。", "壶里剩一口凉茶。你喝了，把杯子扣上，嘴里有一点旧茶叶的味道。", { stones: 2 }),
      choice("room-tea-leave", "给后来的人留一杯", "把还能喝的那杯推到桌边。", "你把还能喝的那杯推到桌边，给后来的人。自己没有坐。", { stones: -2, reputation: 1 }),
      choice("room-tea-search", "翻茶案的抽屉", "抽屉里可能有灵石，席上的人会不高兴。", "抽屉里有几枚灵石。你拿走的时候，席那边有人咳了一声。", { stones: 8, reputation: -1 }),
    ],
  },
  "balance-stele": {
    prompt: "碑前的秤还没动。侧边有一条压着石锁的窄道。",
    options: [
      choice("room-stele-center", "先站在中间", "窄道不走，人留在秤还能看平的地方。", "你先站在碑前中间。窄道上的石锁没有动，秤也还平。", { safe: true }),
      choice("room-stele-read", "读碑侧的小字", "小字不是守关的规矩，是有人留下的路。", "碑侧的小字写着哪一脚会偏。你读完，自己还站在中间。", { stones: 2 }),
      choice("room-stele-hold", "帮一把被锁住的人", "有人的袖子压在石锁下。抬一下，人就能抽出手。", "袖子压在石锁下。你抬起一角，那人抽出手，点了下头就走了。", { stones: -2, reputation: 1 }),
      choice("room-stele-step", "踩上窄道", "窄道近一些，秤会偏，石锁也可能砸下来。", "你踩上窄道。灵石是捡到了，秤偏了一下，石锁擦过肩。", { stones: 8, injury: 1 }),
    ],
  },
  "frost-night-hunt": {
    prompt: "夜巡的路上有一处兽窝，霜还没盖严。",
    options: [
      choice("room-frost-wide", "绕开兽窝", "风从另一边走，窝里的东西不惊。", "你从兽窝外面绕过去。霜下有呼吸，你没有惊它。", { safe: true }),
      choice("room-frost-look", "只看窝里有什么", "看一眼就走，不伸手。", "窝里是两只还没长全的东西，毛上有霜。你看了一眼就走。", { stones: 2 }),
      choice("room-frost-cover", "把露出来的那一只盖上", "用自己的袖口挡一挡风。", "有一只露在霜外面。你用袖口挡了挡风，等它缩回去。", { reputation: 1 }),
      choice("room-frost-take", "从窝边拿走骨头", "骨头能换几枚灵石，窝里的东西会扑出来。", "你拿走窝边的骨头。灵石后来换成了几枚，小臂也被扑了一下。", { stones: 8, injury: 1 }),
    ],
  },
  "scorched-altar": {
    prompt: "祭坛还没站人。坛边有一扇被焦木挡住的侧门。",
    options: [
      choice("room-altar-wait", "先不推侧门", "焦木还在冒烟，人站在烟外面。", "侧门被焦木挡住。你站在烟外面，没有推。", { safe: true }),
      choice("room-altar-ash", "刮一点冷却的灰", "灰已经不烫，刮下来能记住这里的火。", "你刮了一点冷却的灰，收在掌心里。火是什么样，这一下就记住了。", { stones: 4 }),
      choice("room-altar-move", "把焦木挪开一条缝", "给后面的人留一条能过的缝，自己不进门。", "你把焦木挪开一条缝。后面的人能过，你自己没有进门。", { reputation: 1 }),
      choice("room-altar-enter", "从侧门进去", "里面可能有祭台上掉下来的东西，烟也会灌进来。", "侧门里面烟很厚。你摸到几枚暖的灵石，出来的时候眼睛还涩。", { stones: 10, qi: 4 }),
    ],
  },
  "salt-wreck": {
    prompt: "舱还没开。甲板下有一条没上锁的窄廊。",
    options: [
      choice("room-salt-deck", "留在甲板上", "窄廊不进，盐风先吹过去。", "你留在甲板上。窄廊的门自己响了一下，人没有下去。", { safe: true }),
      choice("room-salt-lamp", "拿廊口的灯", "灯还亮着，拿了能看清舱门上的字。", "廊口有一盏还亮的灯。你拿起来，舱门上的字就清楚了。", { stones: 4 }),
      choice("room-salt-call", "朝窄廊里喊", "下面好像有人。喊一声，不必下去。", "你朝窄廊喊了一声。下面有人应了，说自己爬得上来，不用下去。", { reputation: 1 }),
      choice("room-salt-down", "下到窄廊", "廊里可能有没封死的箱子，盐也会呛人。", "窄廊里有一只没封死的箱子。灵石拿了几枚，盐呛得人退回甲板。", { stones: 8, injury: 1 }),
    ],
  },
  "sand-gate-seal": {
    prompt: "闭关的门还关着。门侧有一面已经裂开的沙墙。",
    options: [
      choice("room-sand-wait", "先不碰沙墙", "裂口在，人站在风小的一边。", "沙墙裂着。你站在风小的一边，没有伸手。", { safe: true }),
      choice("room-sand-read", "读裂口里的符", "符还在，读一下就知道这里封的是什么。", "裂口里的符还在。你读完，知道这里封的是出手，不是路。", { stones: 2 }),
      choice("room-sand-press", "把裂口按上", "沙会再合一点，后来的人少吃一口风。", "你把裂口按上一点。沙又合拢一些，风没有刚才那么直。", { reputation: 1 }),
      choice("room-sand-reach", "从裂口里摸", "里面可能有符页边掉下来的东西，沙也会灌进袖子。", "你从裂口里摸到几枚灵石。沙也灌进袖子，腕上磨红了一块。", { stones: 8, injury: 1 }),
    ],
  },
  "wanderer-cave": {
    prompt: "旧洞的主路还黑着。旁边有一间堆着残札的小屋。",
    options: [
      choice("room-wanderer-pass", "从小屋门口过", "札不翻，路继续往里。", "小屋门口堆着残札。你看了一眼题目，没有翻，就往里走。", { safe: true }),
      choice("room-wanderer-page", "抽一页能看的", "有一页还没烂。抽走，剩下的不动。", "有一页还没烂。你抽走，剩下的札仍堆在原处。", { stones: 4 }),
      choice("room-wanderer-sort", "把能看的和烂的分开", "后来的人就不用在灰里翻。", "你把还能看的札和烂掉的分开。后来的人不用在灰里翻。", { reputation: 1 }),
      choice("room-wanderer-bag", "把整叠札塞进袋子", "里面夹着灵石，札也会碎在手里。", "整叠札塞进袋子的时候，里面掉出几枚灵石，札也碎了大半。", { stones: 8, qi: 2 }),
    ],
  },
  "merchant-hold": {
    prompt: "暗仓的门还锁着。仓侧有一张没人看的货席。",
    options: [
      choice("room-merchant-look", "只看货席", "东西不拿，先看签。", "货席上的签还在。你看了看，东西一件没拿。", { safe: true }),
      choice("room-merchant-count", "把散落的灵石数清", "地上有几枚滚出来的，数清就收起来。", "有几枚灵石滚在席脚。你数清，收进自己袋子。", { stones: 6 }),
      choice("room-merchant-note", "把短了一件的事写下", "签和货对不上。写下，后来的人少吃亏。", "签上写着三件，席上只有两件。你把这件事写在签背，自己没有补上。", { reputation: 1 }),
      choice("room-merchant-lift", "把货席的布掀开", "布下可能还有一格，仓里的人会听见。", "布下还有一格灵石。你掀开的时候，仓里面有人咳了一声。", { stones: 10, reputation: -1 }),
    ],
  },
  "ancient-vigil": {
    prompt: "闭关室的蒲团还空着。门边有一盏没人拨的灯。",
    options: [
      choice("room-vigil-stand", "先在灯边站一会儿", "灯不拨，人还没坐。", "你在灯边站了一会儿。灯自己跳了一下，你没有拨。", { safe: true }),
      choice("room-vigil-trim", "把灯芯拨正", "火会稳一点，坐的时候不至于黑。", "你把灯芯拨正。火稳下来，屋里的灰也看得清。", { stones: 2 }),
      choice("room-vigil-ash", "把落在蒲团上的灰拂掉", "拂掉再坐，后来的人也干净一点。", "蒲团上有一层灰。你拂掉，灰落在门槛外面。", { reputation: 1 }),
      choice("room-vigil-niche", "摸门边的壁龛", "龛里可能有上一任留下的东西，灯也可能灭。", "壁龛里有几枚灵石。你摸出来的时候，灯灭了一息，又自己亮了。", { stones: 8, qi: 4 }),
    ],
  },
};

const WILD_ROOMS = [
  (place: string) => `${place}这一段你先看了一圈。兽还没贴近，脚印是新的，人可以挑一条干一点的路。`,
  (place: string) => `${place}路边有一块能坐的石头。你歇了歇脚，把靴上的土磕掉，再往前。`,
  (place: string) => `${place}侧面有一处浅窝。你看了看，没有伸手，窝里的东西也没有出来。`,
  (place: string) => `${place}前面的风变了。还没到要打的时候，你先把袋子系紧。`,
] as const;

const BAHUANG_ROOMS = [
  (place: string) => `${place}里你先探了一段。尘还没没过踝，路是认得出的。`,
  (place: string) => `${place}有一处背风的缺口。你歇了歇，干粮没动，只把气顺过来。`,
  (place: string) => `${place}侧面露出一扇没合严的石门。你看了看门后的黑，没有进去。`,
  (place: string) => `${place}前面有人留下的记号。你照着记号走了几步，没有把记号抹掉。`,
] as const;

function bandKey(grade: DungeonGrade, rank: number): BandKey {
  if (grade === "甲") return mysteryForRank(grade, rank)?.id ?? "danxia";
  if (grade === "乙") {
    if (rank >= 7) return "tong";
    if (rank >= 4) return "wu";
    return "lei";
  }
  return rank >= 7 ? "yi" : "bing";
}

function bandThreat(grade: DungeonGrade, rank: number): GuardianThreat | undefined {
  const raw = jiaPackShape(grade, rank)?.threat ?? lightPackFlavor(grade, rank)?.threat;
  if (!raw) return undefined;
  return { ...raw, selfStatusId: undefined };
}

export function floorPack(grade: DungeonGrade, rank: number, withElite: boolean): NamedFoe[] {
  const band = FLOOR_PACKS[bandKey(grade, rank)];
  return withElite ? [...band.foes, band.elite] : [...band.foes];
}

export function floorPackKeys(): BandKey[] {
  return Object.keys(FLOOR_PACKS) as BandKey[];
}

export function regionalEscortName(dungeonId: string): string | null {
  return REGIONAL_ESCORTS[dungeonId]?.name ?? null;
}

export function regionalEscort(dungeonId: string, leader: BattleCombatant | undefined): BattleCombatant | null {
  const foe = REGIONAL_ESCORTS[dungeonId];
  if (!foe) return null;
  return foeBody(foe, leader, 0.34, undefined);
}

export function regionalInterior(dungeonId: string): InteriorScene | null {
  return REGIONAL_SCENES[dungeonId] ?? null;
}

export function regionalInteriorIds(): string[] {
  return Object.keys(REGIONAL_SCENES);
}

export function interiorContentCounts(): {
  wakeScenes: number;
  wakeOptions: number;
  regionalScenes: number;
  regionalOptions: number;
  floorPacks: number;
  regionalEscorts: number;
  roomLines: number;
} {
  const wakeOptions = (["trap", "shrine", "chamber", "nest", "sealed"] as const)
    .reduce((sum, kind) => sum + (interiorWakeDraft(kind, "balanced")?.options.length ?? 0), 0);
  const regionalOptions = Object.values(REGIONAL_SCENES)
    .reduce((sum, scene) => sum + scene.options.length, 0);
  const roomLines = Object.values(ROOM_LINES)
    .reduce((sum, kinds) => sum + Object.keys(kinds).length, 0);
  return {
    wakeScenes: 5,
    wakeOptions,
    regionalScenes: Object.keys(REGIONAL_SCENES).length,
    regionalOptions,
    floorPacks: Object.keys(FLOOR_PACKS).length,
    regionalEscorts: Object.keys(REGIONAL_ESCORTS).length,
    roomLines,
  };
}

export function interiorRoomBeat(input: {
  grade: DungeonGrade;
  rank: number;
  step: number;
  fought: boolean;
}): DungeonBeat | null {
  if (input.step === 3 || input.step === 6 || input.step === 8) return null;
  if (input.fought && input.step !== 1) return null;
  const kind: RoomKind = input.step === 1 || input.step === 7
    ? "scout"
    : input.step === 10
      ? "approach"
      : input.step === 4 || input.step === 9
        ? "rest"
        : "side";
  const line = ROOM_LINES[bandKey(input.grade, input.rank)][kind];
  const beatKind: DungeonBeat["kind"] = kind === "rest" ? "mood" : kind === "side" ? "find" : "insight";
  return { kind: beatKind, title: line.title, detail: line.detail, mood: line.mood };
}

export function wildRoomLine(placeName: string, seed: string): string {
  const index = hashString(`${seed}:wild-room`) % WILD_ROOMS.length;
  return WILD_ROOMS[index]!(placeName);
}

export function bahuangRoomLine(placeName: string, seed: string): string {
  const index = hashString(`${seed}:bahuang-room`) % BAHUANG_ROOMS.length;
  return BAHUANG_ROOMS[index]!(placeName);
}

export function pickLateWakeKind(input: {
  used: ReadonlySet<string>;
  elite: boolean;
  bank: boolean;
  roll: number;
}): "fork" | "relic" | "fellow" | "loot" | "elite" | "bank" | FreshWake | null {
  const classic = (["fork", "relic", "fellow", "loot"] as const).filter((kind) => !input.used.has(kind));
  const extra: Array<"elite" | "bank"> = [];
  if (input.elite && !input.used.has("elite")) extra.push("elite");
  if (input.bank && !input.used.has("bank")) extra.push("bank");
  const fresh = (["trap", "shrine", "chamber", "nest", "sealed"] as const).filter((kind) => !input.used.has(kind));
  const familiar = [...classic, ...extra];
  if (familiar.length === 0 && fresh.length === 0) return null;
  const takeFresh = familiar.length >= 2 && fresh.length > 0 && input.roll % 5 === 0;
  const pool = takeFresh ? fresh : familiar.length > 0 ? familiar : fresh;
  return pool[input.roll % pool.length] ?? null;
}

export function interiorWakeDraft(
  kind: string,
  posture: DungeonExpeditionPolicy,
): { sceneKind: FreshWake; context: string; options: Array<{ optionId: string; label: string; description: string }>; defaultOptionId: string } | null {
  if (kind === "trap") {
    return {
      sceneKind: "trap",
      context: "脚边的砖松了一块，下面有细线。可以绕开、在墙上做个记号、把线挑明给旁边的人，或者直接踩过去赌线是断的。",
      options: [
        { optionId: "avoid-snare", label: "绕开细线", description: "贴着另一边的墙走，线留在原处。" },
        { optionId: "share-snare", label: "把线挑明", description: "用剑尖把线挑起来，让后面的人看见。" },
        { optionId: "point-snare", label: "在墙上做记号", description: "砖上划一道，人自己绕开。" },
        { optionId: "trip-snare", label: "踩过去", description: "赌这根线已经断了。没断的话，袖子会先响。" },
      ],
      defaultOptionId: posture === "aggressive" ? "trip-snare" : posture === "balanced" ? "share-snare" : "avoid-snare",
    };
  }
  if (kind === "shrine") {
    return {
      sceneKind: "shrine",
      context: "侧壁有一座小龛，灰是新的。可以放两枚灵石、把灰留着、只记住龛上的字，或者把龛里的东西抠出来。",
      options: [
        { optionId: "offer-shrine", label: "放两枚灵石", description: "压在灰上，算打个招呼。" },
        { optionId: "leave-shrine", label: "灰留在原处", description: "看清就走，龛里的东西不动。" },
        { optionId: "share-shrine", label: "只记住上面的字", description: "字不长，读一遍，不带走东西。" },
        { optionId: "pry-shrine", label: "把东西抠出来", description: "龛底可能有灵石，灰也就散了。" },
      ],
      defaultOptionId: posture === "aggressive" ? "pry-shrine" : posture === "balanced" ? "share-shrine" : "leave-shrine",
    };
  }
  if (kind === "chamber") {
    return {
      sceneKind: "chamber",
      context: "主路旁边开着一间侧室，门只掩着。可以在门口看一眼、给后来的人指一下、把能用的分一半，或者进去把袋子装满。",
      options: [
        { optionId: "leave-chamber", label: "门口看一眼", description: "门不推到底，人留在主路上。" },
        { optionId: "point-chamber", label: "给后来的人指一下", description: "在门框上留个能看见的记号。" },
        { optionId: "share-chamber", label: "只拿一半", description: "能用的拿走一半，另一半留在桌上。" },
        { optionId: "take-chamber", label: "进去装满", description: "桌上的都收走。门在身后可能会响。" },
      ],
      defaultOptionId: posture === "aggressive" ? "take-chamber" : posture === "balanced" ? "share-chamber" : "leave-chamber",
    };
  }
  if (kind === "nest") {
    return {
      sceneKind: "nest",
      context: "石缝里有一处兽窝，里面的东西还没醒透。可以绕开、把窝边的食分一点、替小的挡一下风，或者把窝边的骨头拿走。",
      options: [
        { optionId: "avoid-nest", label: "绕开兽窝", description: "脚步放轻，从另一边过去。" },
        { optionId: "share-nest", label: "分一点吃的", description: "把干粮角放下，人继续走。" },
        { optionId: "aid-nest", label: "替小的挡一下风", description: "用石块把风口堵住，不碰窝里的东西。" },
        { optionId: "rob-nest", label: "拿走骨头", description: "骨头在窝边上。拿走的话，里面的东西会醒。" },
      ],
      defaultOptionId: posture === "aggressive" ? "rob-nest" : posture === "balanced" ? "share-nest" : "avoid-nest",
    };
  }
  if (kind === "sealed") {
    return {
      sceneKind: "sealed",
      context: "路上有一扇封着的门，泥印还没干。可以走开、把印记下来、在门前放一点东西，或者把印揭开。",
      options: [
        { optionId: "leave-seal", label: "从门边走开", description: "印不碰，路从旁边过。" },
        { optionId: "stable-seal", label: "把印记下来", description: "看清印上的字，人不动门。" },
        { optionId: "offer-seal", label: "在门前放一点", description: "放两枚灵石，算是打过招呼。" },
        { optionId: "force-seal", label: "把印揭开", description: "门后可能有东西，印破了也会有响动。" },
      ],
      defaultOptionId: posture === "aggressive" ? "force-seal" : posture === "balanced" ? "stable-seal" : "leave-seal",
    };
  }
  return null;
}

const WAKE_EFFECTS: Record<string, WakeEffect> = {
  "avoid-snare": effect(0, 0, "绕开细线", "砖下有细线。你贴着另一边走过去，线还在原处。"),
  "share-snare": effect(0, 1, "把线挑明", "你用剑尖把细线挑起来，后面的人就能看见。线没有响。"),
  "point-snare": effect(2, 1, "做了记号", "你在松动的砖旁划了一道，自己从旁边过去。后来的人看得到。", { stones: 2 }),
  "trip-snare": effect(8, -1, "踩了上去", "你踩了过去。线没有断干净，袖子先响了一下，地上却留下几枚灵石。", { injuryTicks: 2, stones: 8, morality: -1, kind: "injury" }),
  "offer-shrine": effect(-4, 1, "在龛前放了灵石", "你在小龛的灰上放了两枚灵石。灰还是热的，人退回主路。", { stones: -4 }),
  "leave-shrine": effect(0, 0, "龛没有动", "小龛里的灰是新的。你看清就走，东西还在里面。"),
  "share-shrine": effect(0, 1, "记住了龛上的字", "龛上只有半行字。你读了一遍，没有带走东西。"),
  "pry-shrine": effect(10, -1, "抠出了龛里的东西", "你把龛底的东西抠出来。灵石有几枚，灰也散在袖上。", { stones: 10, morality: -1, kind: "close-call" }),
  "leave-chamber": effect(0, 0, "侧室没有进", "侧室的门只掩着。你在门口看了一眼，人还留在主路上。"),
  "point-chamber": effect(0, 1, "给后来的人留了记号", "你在侧室门框上留了个能看见的角。自己没有进去。"),
  "share-chamber": effect(4, 1, "只拿了一半", "侧室桌上有一点能用的。你拿了一半，另一半留在原处。", { stones: 4 }),
  "take-chamber": effect(12, -1, "把侧室装了满", "你把侧室桌上的都收进袋子。门在身后响了一下。", { stones: 12, morality: -1, kind: "close-call" }),
  "avoid-nest": effect(0, 0, "绕开了兽窝", "石缝里有呼吸。你把脚步放轻，从另一边过去。"),
  "share-nest": effect(-2, 1, "在窝边放了一点", "你把干粮角放在窝边，人继续往前。里面的东西没有醒。", { stones: -2 }),
  "aid-nest": effect(0, 1, "把风口堵住", "你用石块把灌风的口堵住。窝里的小东西没有出来。"),
  "rob-nest": effect(8, -2, "拿走了窝边的骨头", "骨头拿走的时候，里面的东西醒了。你退得快，小臂还是被扑了一下。", { stones: 8, morality: -2, injuryTicks: 2, kind: "injury" }),
  "leave-seal": effect(0, 0, "封门没有碰", "封着的门泥印还没干。你从门边走过去，印还在。"),
  "stable-seal": effect(0, 1, "记下了印上的字", "你把印上的字看清，人没有动那扇门。"),
  "offer-seal": effect(-4, 1, "在门前放了灵石", "你在封门前放了两枚灵石。印没有破，人从旁边走了。", { stones: -4 }),
  "force-seal": effect(10, -1, "把印揭开了", "印揭开的时候门后响了一下。你拿到几枚灵石，肩上也重了一下。", { stones: 10, morality: -1, injuryTicks: 2, kind: "injury" }),
};

function effect(
  stoneDelta: number,
  moralityDelta: number,
  title: string,
  detail: string,
  extra: { stones?: number; morality?: number; injuryTicks?: number; kind?: DungeonBeat["kind"] } = {},
): WakeEffect {
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

export function interiorWakeEffect(optionId: string): WakeEffect | null {
  return WAKE_EFFECTS[optionId] ?? null;
}

function foeBody(
  foe: NamedFoe,
  leader: BattleCombatant | undefined,
  factor: number,
  threat: GuardianThreat | undefined,
): BattleCombatant {
  const hp = Math.max(18, Math.round((leader?.maxHp ?? 80) * factor));
  const attack = Math.max(3, Math.round((leader?.weaponAttack ?? 10) * factor * 0.72));
  const spell = foe.flavor === "法术";
  return {
    id: `interior:${foe.name}`,
    name: foe.name,
    side: "enemy",
    role: "dps",
    hp,
    maxHp: hp,
    weaponAttack: spell ? Math.max(1, Math.round(attack * 0.5)) : attack,
    spellAttack: spell ? attack : Math.max(1, Math.round(attack * 0.4)),
    defense: Math.max(1, Math.round((leader?.defense ?? 6) * factor * 0.55)),
    speed: Math.max(1, (leader?.speed ?? 10) + (foe.pattern === "swift" ? 2 : 0)),
    hit: 72,
    dodge: 4,
    crit: foe.elite ? 8 : 4,
    critDamage: 130,
    guardHeart: 0,
    spirit: 24,
    maxSpirit: 24,
    skills: [],
    pattern: foe.pattern,
    elite: Boolean(foe.elite),
    ...(threat ? { threat } : {}),
  };
}

export function resolveInteriorSkirmish(input: {
  grade: DungeonGrade;
  rank: number;
  stepIndex: number;
  actionKind: "search" | "guardian";
  seed: string;
  allies: readonly BattleCombatant[];
  leaderId: string;
  policy: DungeonExpeditionPolicy;
}): PartyBattleResult | null {
  if (input.actionKind !== "search") return null;
  const kind = input.stepIndex === 1 ? "skirmish" : input.stepIndex === 4 ? "midboss" : null;
  if (!kind) return null;
  const named = floorPack(input.grade, input.rank, kind === "midboss");
  const leader = input.allies[0];
  const threat = bandThreat(input.grade, input.rank);
  const factors = kind === "midboss" ? [0.46, 0.4, 0.58] : [0.36, 0.3];
  const enemies = named.map((foe, index) => foeBody(
    foe,
    leader,
    factors[index] ?? 0.4,
    foe.flavor === "法术" ? threat : undefined,
  ));
  return runPartyBattle({
    allies: [...input.allies],
    enemies,
    policy: kind === "midboss" ? input.policy : "balanced",
    seed: input.seed,
    maxRounds: kind === "midboss" ? 6 : 5,
    leaderId: input.leaderId,
  });
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
