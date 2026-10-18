import {
  STATUS_BURNING,
  STATUS_ENTANGLE,
  STATUS_FROSTBITE,
  STATUS_ILLUSION_BLUR,
  STATUS_ROOTED,
  STATUS_SPELL_BREAK,
} from "./combat-statuses.js";
import { recordLife } from "./inner-life.js";
import type { CombatStatusId, Cultivator, WildRouteView } from "./model.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

/**
 * Names for the nine state wilderness roads, and for the three bands of 八荒.
 *
 * Dungeon places stay in yi-mystery.ts and high-realm.ts. This file only
 * supplies the sentence an agent can read before leaving, and the line left
 * on the road, in the layer, or after a hunt. It does not change hit points.
 */

export interface WildPlace {
  stateId: string;
  name: string;
  statusId: CombatStatusId;
  statusLabel: string;
  enemy: string;
  follower: string;
  advice: string;
  line: string;
  road: string;
  sightings: readonly string[];
  huntLoss: string;
  withdraw: string;
}

export interface BahuangBand {
  minDepth: number;
  maxDepth: number;
  name: string;
  statusId: CombatStatusId;
  statusLabel: string;
  enemy: string;
  follower: string;
  advice: string;
  line: string;
  sightings: readonly string[];
  loss: string;
  retreat: string;
}

const WILD_PLACES: readonly WildPlace[] = [
  {
    stateId: "qingzhou",
    name: "青岚坡",
    statusId: STATUS_ENTANGLE,
    statusLabel: "缠绕",
    enemy: "露蛛",
    follower: "药藤",
    advice: "青州州外是青岚坡。露还挂在叶子上，缠绕会拖住步子。跟着的是露蛛和药藤。",
    line: "青岚坡在青岚城外。药坡上的露没干，缠绕会拖脚。露蛛在前，药藤跟在旁边。路上和坡里都会留一句见闻。退出来只留一句短话，不另扣灵石。",
    road: "往青岚坡去的路上，风里有药味。露蛛的丝挂在路边的草上，还没干。",
    sightings: [
      "叶子上的露还没干。你把袖口撩起来，药藤已经缠到脚踝。",
      "坡上有人晒过药，布收走了，露蛛还在布印上爬。",
      "雾贴着坡往下走。你停了一停，听见药藤在石缝里响。",
    ],
    huntLoss: "青岚坡上的露蛛把脚缠住了。这一场没站住。",
    withdraw: "从青岚坡退出来，鞋上还沾着露。",
  },
  {
    stateId: "yangzhou",
    name: "听潮浦",
    statusId: STATUS_FROSTBITE,
    statusLabel: "霜寒",
    enemy: "潮蟹",
    follower: "浦影",
    advice: "扬州州外是听潮浦。潮气会挂霜寒，跟着的是潮蟹和浦影。",
    line: "听潮浦在广津城外。潮退以后鞋先凉，霜寒会贴上来。潮蟹在前，浦影跟在水线边上。退出来只留一句短话。",
    road: "去听潮浦的路越走越湿。潮声比城门里听得清楚，浦影在水线边上。",
    sightings: [
      "潮退了一截，蟹壳扣在湿沙上。你踩过去，鞋先凉了。",
      "浦边的柳丝沾着盐。你拨开，看见一只潮蟹横着走。",
      "夜潮上来的时候，浦影贴着水面，看不清是人还是雾。",
    ],
    huntLoss: "听潮浦的潮蟹贴上来。寒气先到，人没站住。",
    withdraw: "从听潮浦退出来，裤脚还是湿的。",
  },
  {
    stateId: "zhongzhou",
    name: "衡野驿",
    statusId: STATUS_ROOTED,
    statusLabel: "定根",
    enemy: "驿影",
    follower: "路碑",
    advice: "中州州外是衡野驿。石理会挂定根，跟着的是驿影和路碑。这里不是地宫里的旧驿石廊。",
    line: "衡野驿在天衡城外的官道上，不是旧驿石廊。墙上还剩半行字。定根会拖一下先手，跟着的是驿影和路碑。",
    road: "往衡野驿去，里程碑被人改过一个数字，又划掉。路还是这条路。",
    sightings: [
      "驿亭里没有人。石桌上压着半张路引，字被风吹糊了。",
      "路碑斜了一点。你扶正的时候，脚先被石缝定住一下。",
      "亭外有一串新的脚印，到碑前就停了。人已经不在。",
    ],
    huntLoss: "衡野驿的路碑把步子定住了。这一场没走出去。",
    withdraw: "从衡野驿退出来，步子还沉。",
  },
  {
    stateId: "shuzhou",
    name: "栈云径",
    statusId: STATUS_ENTANGLE,
    statusLabel: "缠绕",
    enemy: "藤猿",
    follower: "云蛛",
    advice: "蜀州州外是栈云径。藤会挂缠绕，跟着的是藤猿和云蛛。",
    line: "栈云径在栖云城外。径窄，藤从石缝里探出来，缠绕会拖脚。藤猿在前，云蛛的丝挂在藤上。",
    road: "去栈云径的栈板有一块松了。藤从石缝里探出来，云还没散。",
    sightings: [
      "栈板在脚下响了一声。你抓住藤，藤上有云蛛的丝。",
      "径窄，只能侧着走。藤猿在上面的枝上看了一眼，没有下来。",
      "云贴着崖壁。你停下来等它过去，鞋带已经被藤绕了一圈。",
    ],
    huntLoss: "栈云径的藤猿把路缠住了。人没走出去。",
    withdraw: "从栈云径退出来，袖上还挂着丝。",
  },
  {
    stateId: "youzhou",
    name: "猎霜原",
    statusId: STATUS_FROSTBITE,
    statusLabel: "霜寒",
    enemy: "霜犬",
    follower: "猎影",
    advice: "幽州州外是猎霜原。寒气会挂霜寒，跟着的是霜犬和猎影。",
    line: "猎霜原在朔宁城外。灯油在路上就会凝，霜寒贴着草。霜犬在前，猎影跟在林线上。",
    road: "往猎霜原去，灯油在路上就开始凝。远处有狗叫，人还没看见。",
    sightings: [
      "草上全是霜。你蹲下去看爪印，印比靴子深，霜犬已经过去了。",
      "猎影贴着林线走，不进亮处。你跟着走了十几步，呼出来的气是白的。",
      "一堆熄了的火。炭还在，人把干粮带走了，只留下一根结霜的箭。",
    ],
    huntLoss: "猎霜原上的霜犬贴上来。寒气先到，人没撑住。",
    withdraw: "从猎霜原退出来，袖口还是冷的。",
  },
  {
    stateId: "liangzhou",
    name: "砂门碛",
    statusId: STATUS_SPELL_BREAK,
    statusLabel: "断法",
    enemy: "沙蜥",
    follower: "风骑",
    advice: "凉州州外是砂门碛。风沙会挂断法，跟着的是沙蜥和风骑。",
    line: "砂门碛在砺关外。风硬，沙打在符纸上，断法会乱一手。沙蜥埋在沙里，风骑的蹄印很快就浅了。",
    road: "去砂门碛的风硬。沙打在符纸上，你把袖口扎紧，法诀先乱了一拍。",
    sightings: [
      "牙缝里有沙。你停下来吐掉，看见沙蜥的背壳埋了一半。",
      "前一个人的绳子被风吹横过来。你从底下钻过去，风骑的蹄印已经浅了。",
      "碛上没有路标。你把已经到手的东西又缠紧一圈，沙还是往怀里灌。",
    ],
    huntLoss: "砂门碛的风把这一手断了。沙蜥还在，人没站住。",
    withdraw: "从砂门碛退出来，牙缝里还有沙。",
  },
  {
    stateId: "leizhou",
    name: "焦林野",
    statusId: STATUS_BURNING,
    statusLabel: "焚灼",
    enemy: "雷雀",
    follower: "焦木",
    advice: "雷州州外是焦林野，不是地宫里的雷泽残阵。焦木会挂焚灼，跟着的是雷雀和焦木。",
    line: "焦林野在惊霆城外，不是雷泽残阵。烧过的枝还温着，焚灼会贴上手。雷雀在前，焦木跟在枝上。",
    road: "往焦林野去，林子会响。烧过的枝还是热的，雷雀在上头叫。",
    sightings: [
      "树皮是黑的，摸上去还温。你缩回手，雷雀从焦枝上飞起来。",
      "地面有一条新的焦痕。你绕开，鞋底还是烫了一下。",
      "雨没下下来。林子先响了一声，焦木上的灰被震下来，落在袖上。",
    ],
    huntLoss: "焦林野的雷雀贴着火来。这一场没撑住。",
    withdraw: "从焦林野退出来，袖上还有灰。",
  },
  {
    stateId: "cangzhou",
    name: "盐风礁",
    statusId: STATUS_FROSTBITE,
    statusLabel: "霜寒",
    enemy: "礁蟹",
    follower: "盐鲛",
    advice: "沧州州外是盐风礁。海风会挂霜寒，跟着的是礁蟹和盐鲛。",
    line: "盐风礁在沧澜城外。风是咸的，霜寒贴着礁石。礁蟹留在退潮的石头上，盐鲛的影子在水线外。",
    road: "去盐风礁的风是咸的。灯罩上已经有白渍，礁还在前面。",
    sightings: [
      "礁石上的盐结成一层。你舔到嘴唇，才发现风把盐送进了嘴里。",
      "退潮留下一只礁蟹。壳是白的，钳子还动。",
      "盐鲛的影子在水线外一闪。你没有下水，鞋已经湿了。",
    ],
    huntLoss: "盐风礁的礁蟹贴上来。寒气先到，人没站住。",
    withdraw: "从盐风礁退出来，嘴唇还是咸的。",
  },
  {
    stateId: "wanzhou",
    name: "茶桥野",
    statusId: STATUS_ROOTED,
    statusLabel: "定根",
    enemy: "茶鼬",
    follower: "桥影",
    advice: "宛州州外是茶桥野。茶藤会挂定根，跟着的是茶鼬和桥影。",
    line: "茶桥野在长和城外。茶棚收了，灰还在案上。定根会拖一下步子，茶鼬在前，桥影拉在桥板上。",
    road: "往茶桥野去，桥板是干的。茶棚收了，灰还积在案上。",
    sightings: [
      "茶案上有半碗凉茶，没人喝。你坐下，茶鼬从案下钻出来看了一眼。",
      "桥影拉得很长。你走过去，藤先把脚踝定住一下。",
      "棚里的炭灭了。你摸到还温的壶，壶盖下压着一张没写完的条子。",
    ],
    huntLoss: "茶桥野的茶藤把步子定住了。这一场没走出去。",
    withdraw: "从茶桥野退出来，袖上还有茶灰。",
  },
];

const BAHUANG_BANDS: readonly BahuangBand[] = [
  {
    minDepth: 0,
    maxDepth: 3,
    name: "荒尘驿",
    statusId: STATUS_SPELL_BREAK,
    statusLabel: "断法",
    enemy: "沙客",
    follower: "尘骑",
    advice: "八荒浅处是荒尘驿。风会挂断法，跟着的是沙客和尘骑。再往里是断碑原，最深处是无灯壑。",
    line: "荒尘驿是八荒前三段。风里全是细沙，断法会乱一手。沙客在前，尘骑跟在旁边。见闻隔两三步写一次。撤出来会留下一句短话。",
    sightings: [
      "风里全是细沙，牙缝里也有。沙客的脚印比靴子深，人已经不在了。",
      "尘骑的绳子被风吹横过来。你从绳子底下钻过去，符纸上全是沙。",
      "远处有一点光，走近才发现是别人扔下的灯芯，油已经干了。",
      "沙客的影子比人短。断法压过来的时候，尘骑的绳子先响。",
      "你数了数干粮。沙灌进袋口，尘骑经过时没停。",
      "井沿上有一根断绳。沙客的印子停在井边，尘骑没有下去。",
      "断法压过来的时候，你看见沙里埋着半块干粮，没有去捡。",
    ],
    loss: "荒尘驿里气先尽了。人没走出去。",
    retreat: "从荒尘驿撤出来，牙缝里还有沙。",
  },
  {
    minDepth: 4,
    maxDepth: 6,
    name: "断碑原",
    statusId: STATUS_ROOTED,
    statusLabel: "定根",
    enemy: "碑影",
    follower: "碑仆",
    advice: "八荒中段是断碑原。石理会挂定根，跟着的是碑影和碑仆。",
    line: "断碑原是八荒四到六段。碑是断的，字只剩半行。定根会拖住步子，碑影在前，碑仆跟在碑下。",
    sightings: [
      "碑是断的，字只剩半行。你念出声，脚先被石缝定住一下。",
      "原上没有树。碑影在正午缩得很短，人影比碑影长。",
      "有人在碑下留过干粮。袋子空了，绳子还在。",
      "碑仆把断碑扶正了一点，又放下。定根从你脚踝爬上来，又松开。",
      "碑影盖住半行字。你没念出声，步子还是被定了一下。",
      "碑下那只碗是空的。碑仆站在碗边，定根从碗底的缝里爬出来。",
      "你在断碑阴里停了一停。碑影比刚才短，字还是那半行。",
    ],
    loss: "断碑原把步子定住了。这一趟没走出去。",
    retreat: "从断碑原撤出来，步子还沉。",
  },
  {
    minDepth: 7,
    maxDepth: 99,
    name: "无灯壑",
    statusId: STATUS_ILLUSION_BLUR,
    statusLabel: "幻惑",
    enemy: "灯烬",
    follower: "壑影",
    advice: "八荒深处是无灯壑。暗处会挂幻惑，跟着的是灯烬和壑影。",
    line: "无灯壑是八荒七段往后。灯点不着，幻惑会先花了眼。灯烬在前，壑影站在你以为有光的地方。",
    sightings: [
      "灯芯是干的。你点不着，壑影在你以为有光的地方站着。",
      "脚下忽然软了一块。你退半步，看见的脚印比靴子深，人已经不在了。",
      "你停下来数干粮。还够再走一段，眼睛却先花了。",
      "灯烬忽然亮一下。壑影站在亮处，幻惑让你分不清那是火还是人。",
      "你伸手去摸壁。壁是干的，眼睛先花了，灯烬在脚边没热气。",
      "灯盏下有一小袋干粮。你没掀，灯烬是凉的，壑影还站在灯后。",
      "幻惑让井沿看起来在左边。你伸手，摸到的是干壁。",
    ],
    loss: "无灯壑里看不清来路。人没撑住。",
    retreat: "从无灯壑撤出来，眼前还花着。",
  },
];

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function wildPlaces(): readonly WildPlace[] {
  return WILD_PLACES;
}

export function wildPlaceForState(stateId: string | null | undefined): WildPlace | null {
  if (!stateId) return null;
  return WILD_PLACES.find((place) => place.stateId === stateId) ?? null;
}

export function bahuangBands(): readonly BahuangBand[] {
  return BAHUANG_BANDS;
}

export function bahuangBandForDepth(depth: number): BahuangBand {
  const step = Math.max(0, Math.floor(depth));
  return BAHUANG_BANDS.find((band) => step >= band.minDepth && step <= band.maxDepth) ?? BAHUANG_BANDS[0]!;
}

export function wildRouteFromPlace(place: WildPlace): WildRouteView {
  return {
    kind: "wilderness",
    placeName: place.name,
    advice: place.advice,
    mysteryLine: place.line,
    statusLabel: place.statusLabel,
    enemyLabel: place.enemy,
    followerLabel: place.follower,
  };
}

export function wildRouteFromBand(band: BahuangBand): WildRouteView {
  return {
    kind: "bahuang",
    placeName: band.name,
    advice: band.advice,
    mysteryLine: band.line,
    statusLabel: band.statusLabel,
    enemyLabel: band.enemy,
    followerLabel: band.follower,
  };
}

export function wildSightingGap(seed: string): 2 | 3 | 4 {
  return (2 + (hashString(`${seed}:gap`) % 3)) as 2 | 3 | 4;
}

export function pickWildLine(lines: readonly string[], seed: string): string {
  return lines[hashString(seed) % lines.length] ?? lines[0]!;
}

export function huntSentence(place: WildPlace, outcome: "win" | "loss" | "retreat"): string {
  if (outcome === "loss") return place.huntLoss;
  if (outcome === "retreat") return `从${place.name}的${place.enemy}旁边撤出来。`;
  return `${place.name}上的${place.enemy}挂着${place.statusLabel}。${place.follower}也在旁边。这一场打完了。`;
}

export function noteWild(
  cultivator: Cultivator,
  input: { tick: number; locationId: string; title: string; detail: string; fight?: boolean },
): void {
  pushTravelNote(cultivator, travelNote({
    tick: input.tick,
    kind: input.fight ? "find" : "insight",
    title: input.title,
    detail: input.detail,
    locationId: input.locationId,
    mood: "这一句可以拿回去说",
  }));
  recordLife(cultivator, {
    tick: input.tick,
    kind: input.fight ? "fight" : "growth",
    text: input.detail,
  });
}
