/**
 * One pause on the last tick of a sect post or a sect chain.
 *
 * Gather and raid do not pause. A timeout takes the plain option so a duty
 * cannot sit forever. Rewards stay thin.
 */

import { GameplayRejection } from "./gameplay-error.js";
import { grudgeArcOf, recordLife, shiftCultivatorMood } from "./inner-life.js";
import type {
  ActionExecutionResult,
  ActionId,
  ActionJob,
  AvailableAction,
  Cultivator,
  WorldState,
} from "./model.js";
import { addMutualAffinity, addMutualGrudge, getSocialLink } from "./social.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

const SCENE_WAIT_TICKS = 3;
const TAKE_STONES = 6;
const SPEND_STONES = 4;
const SHARE_AFFINITY = 4;
const HARD_GRUDGE = 2;

interface DutyVariant {
  id: string;
  context: string;
  plain: readonly [string, string];
  share: readonly [string, string, string];
  take: readonly [string, string];
  spend: readonly [string, string];
  hard: readonly [string, string];
}

const CATALOG: Record<string, readonly DutyVariant[]> = {
  "outer-chore": [
    {
      id: "spill",
      context: "{sect}的偏院里，一篓刚收回的药洒在台阶上。人在{place}。",
      plain: ["捡回去", "把洒在台阶上的药一株一株捡回去，册子还是送到了。"],
      share: ["喊人来", "{mate}过来把药篓扶正，两个人一起把洒了的捡完。", "喊了一声，附近没有同门应，只好自己把篓子扶正。"],
      take: ["先不管", "药先留在台阶上，这一趟多揣了六枚灵石，心里不踏实。"],
      spend: ["自己赔", "从口袋里赔上四枚灵石，把洒掉的那份补上。"],
      hard: ["把话说硬", "当着{foe}的面把话说硬。两个人有{arc}，剑拔弩张，药还是自己捡的。"],
    },
    {
      id: "night",
      context: "{place}还没亮。{sect}的册子要送到内门，路上黑。",
      plain: ["摸黑送", "摸黑把册子送到了内门，路上没有多停留。"],
      share: ["等个伴", "{mate}提了灯一起走，册子送到时天还没大亮。", "等了一会儿，附近没有同门，还是自己把册子送了。"],
      take: ["抄近路", "抄了近路，口袋里多了六枚灵石，册子也送到了，心里却虚。"],
      spend: ["买盏灯", "花了四枚灵石买了盏灯，册子照着送到了。"],
      hard: ["把话说硬", "路过{foe}时把话说硬了。两个人有{arc}，剑拔弩张，册子仍是自己送的。"],
    },
  ],
  "inner-cultivate": [
    {
      id: "knock",
      context: "{sect}的静室里有人敲门。功课才写到一半，人在{place}。",
      plain: ["做完再开", "把门留着，功课按今天的页数做完了。"],
      share: ["让出座位", "{mate}进了静室，两个人把剩下的半页一起看完。", "开了门，附近没有同门，座位还是自己的。"],
      take: ["把页藏起", "少写了几行，口袋里多了六枚灵石，功课算是敷衍过去了。"],
      spend: ["续上灯油", "添了四枚灵石的灯油，功课在亮处做完了。"],
      hard: ["把话说硬", "门外是{foe}。话没热，两个人有{arc}，剑拔弩张，门仍关着。"],
    },
    {
      id: "lamp",
      context: "{sect}的灯灭了。{place}的功课还摊在案上。",
      plain: ["就着余光", "就着余光把今天的功课写完，没有出静室。"],
      share: ["借一盏", "{mate}把灯分过来，两个人在同一盏灯下把功课写完。", "想借灯，附近没有同门，还是就着余光写完了。"],
      take: ["提前交差", "功课只写了个开头，这一趟多留了六枚灵石，自己知道没写完。"],
      spend: ["再点一盏", "花四枚灵石又点了一盏，案上的功课写完了。"],
      hard: ["把话说硬", "{foe}就在灯灭的时候站在外面。两个人有{arc}，剑拔弩张。"],
    },
  ],
  steward: [
    {
      id: "roll",
      context: "{sect}的名册对不上。{place}里有一个名字今天没到。",
      plain: ["照册子记", "缺席的名字照册子记上，账没有改。"],
      share: ["让人去问", "{mate}去问了那个人，名字补回了名册。", "想找人去问，附近没有同门，名字先空着。"],
      take: ["扣下份额", "把缺席的那份灵石扣下，自己口袋里多了六枚，名册上写了笔。"],
      spend: ["先垫上", "自己垫了四枚灵石，名册上这个名字今天仍算到。"],
      hard: ["把话说硬", "缺席的事当着{foe}的面说硬了。两个人有{arc}，剑拔弩张。"],
    },
    {
      id: "crate",
      context: "{sect}的库房少了一匣。账是在{place}对的。",
      plain: ["把账记实", "少的那一匣照实记上，没有把别的匣子挪过来补。"],
      share: ["一起对匣", "{mate}和自己把库房再点了一遍，少的那匣找到了下落。", "喊人一起点，附近没有同门，账先按少的记。"],
      take: ["先记在自己名下", "少的那匣先记成自己经手，口袋里却多了六枚灵石。"],
      spend: ["赔进库里", "赔了四枚灵石进库，这一匣的账先平了。"],
      hard: ["把话说硬", "对匣的时候{foe}也在。话没热，两个人有{arc}，剑拔弩张。"],
    },
  ],
  elder: [
    {
      id: "vein",
      context: "{sect}的堂上有人争一条脉。人在{place}。",
      plain: ["先守着", "这一条先守着，今天不改归属。"],
      share: ["让同门说", "{mate}把看见的情况说了，堂上按守着这条脉散了。", "想听同门的，附近没有人接话，还是按守着散了。"],
      take: ["准他们先看", "准了先去看一眼，自己这趟多留了六枚灵石，脉仍记在本宗名下。"],
      spend: ["押四枚", "在堂上押了四枚灵石，表示这条脉今天谁也不许动。"],
      hard: ["把话说硬", "争脉的话对着{foe}说硬了。两个人有{arc}，剑拔弩张，脉仍守着。"],
    },
    {
      id: "leave",
      context: "{place}的堂下有弟子来问，能不能下山。{sect}还等一句。",
      plain: ["让他下山", "准了下山，嘱咐办完就回，没有多留。"],
      share: ["让同门带", "{mate}带他走到山门，这句话算堂上应过了。", "想找人带，附近没有同门，还是自己应了下山。"],
      take: ["留下再问", "没让他走，这趟堂上多留了六枚灵石，人仍在山上。"],
      spend: ["给盘缠", "给了四枚灵石当盘缠，人下山去了。"],
      hard: ["把话说硬", "{foe}也在堂下。两个人有{arc}，话没热，剑拔弩张。"],
    },
  ],
  "master-seat": [
    {
      id: "order",
      context: "{sect}的令还没写完。{place}的人在等。",
      plain: ["照旧发", "令照昨天的句子发了下去，没有改。"],
      share: ["问过再发", "{mate}看过句子，令才发下去。", "想问一句，附近没有同门，令还是照旧发了。"],
      take: ["加一句赏", "令里多写了一句赏，自己口袋里也多了六枚灵石。"],
      spend: ["先出四枚", "令还没发，先从自己口袋里出了四枚灵石安抚等着的人。"],
      hard: ["把话说硬", "等令的人里有{foe}。两个人有{arc}，剑拔弩张，令仍照旧发。"],
    },
    {
      id: "gate",
      context: "{place}门外有人候着。{sect}今天的令还没发。",
      plain: ["只认旧令", "今天不发新令，门外的人按旧令散了。"],
      share: ["同门去回", "{mate}到门外把旧令复述了一遍，人散了。", "想让同门去回，附近没有人，自己到门外说了旧令。"],
      take: ["拖到明日", "说明日再发，这一天自己多留了六枚灵石，门外的人还在等。"],
      spend: ["发点茶水", "花了四枚灵石，让候着的人先有一口热的，令仍按旧的。"],
      hard: ["把话说硬", "门外候着的是{foe}那边的事。两个人有{arc}，剑拔弩张。"],
    },
  ],
  transmit: [
    {
      id: "lost",
      context: "{sect}的传功讲到一式，有人没听懂。人在{place}。",
      plain: ["再拆一遍", "把没听懂的那一式又拆开讲了一遍。"],
      share: ["让他上手", "{mate}把那一式练了一遍给大家看，席上才安静。", "想找人示范，附近没有同门接，还是自己又讲了一遍。"],
      take: ["跳到下一式", "没再讲懂，这一趟多留了六枚灵石，席上有人仍愣着。"],
      spend: ["留下抄本", "花四枚灵石留下一页抄本，没听懂的人可以回头看。"],
      hard: ["把话说硬", "没听懂的人里有{foe}。两个人有{arc}，剑拔弩张，这一式仍讲完了。"],
    },
    {
      id: "cut-in",
      context: "{place}的讲席上有人插话。{sect}这一式还没讲完。",
      plain: ["等他说完", "等插话的人说完，再把这一式讲完。"],
      share: ["请同门接", "{mate}接过下半式，插话的人坐下了。", "想请人接，附近没有同门，自己把下半式讲完了。"],
      take: ["直接打断", "把话打断，这一趟多留了六枚灵石，席上的人不太服。"],
      spend: ["请他喝茶", "花四枚灵石请插话的人先坐下喝茶，这一式才讲完。"],
      hard: ["把话说硬", "插话的是{foe}。两个人有{arc}，剑拔弩张。"],
    },
  ],
  patrol: [
    {
      id: "prints",
      context: "{sect}巡到{place}这一段，山路上有一串新脚印。",
      plain: ["顺着看", "顺着脚印看了一段，没有追出人，巡山继续。"],
      share: ["叫人一起", "{mate}跟着看了那串脚印，两个人确认不是冲着山门来的。", "喊了一声，附近没有同门，自己看完脚印就回头了。"],
      take: ["当作没看见", "脚印没报上去，这一趟多留了六枚灵石。"],
      spend: ["做个记号", "花四枚灵石留了记号，后来的巡山能看见。"],
      hard: ["把话说硬", "脚印旁边碰上{foe}。两个人有{arc}，剑拔弩张，巡山没有停。"],
    },
    {
      id: "pass",
      context: "{place}的山口有人拦着问来历。{sect}的牌子还在身上。",
      plain: ["亮牌子", "把宗门的牌子亮出来，人让开了，巡山过去了。"],
      share: ["同门作保", "{mate}在旁边作保，山口的人让开了。", "想找人作保，附近没有同门，还是自己亮了牌子。"],
      take: ["绕开山口", "没答话，绕开了，口袋里多了六枚灵石，这条路没巡完。"],
      spend: ["留四枚", "留了四枚灵石当路资，人让开，巡山照旧走完。"],
      hard: ["把话说硬", "拦路的事扯到{foe}。两个人有{arc}，剑拔弩张，牌子还是亮了。"],
    },
  ],
  "guard-vein": [
    {
      id: "squat",
      context: "{sect}的脉口蹲着一个不认得的人。人在{place}。",
      plain: ["问清楚", "问清了来历，人离开了，脉还在自己这边。"],
      share: ["同门看着", "{mate}在脉口看着，自己去问那个人，人走了。", "想找人看着脉口，附近没有同门，自己问完就守着。"],
      take: ["先撵走", "没问来历就把人撵了，这一趟多留了六枚灵石。"],
      spend: ["给口干粮", "给了四枚灵石换的干粮，人吃完离开，脉口空了。"],
      hard: ["把话说硬", "蹲在脉口的事对着{foe}说硬了。两个人有{arc}，剑拔弩张。"],
    },
    {
      id: "dim",
      context: "{place}这条脉的光弱了一截。{sect}的人还守在旁边。",
      plain: ["守到复亮", "在脉口守着，光慢慢回来了一点，没有离岗。"],
      share: ["换班", "{mate}过来换了一段，光弱的时候脉上一直有人。", "想换班，附近没有同门，自己把这段守完了。"],
      take: ["先回去报", "光还弱着就回去报，口袋里多了六枚灵石，脉上空了一会儿。"],
      spend: ["补一笔", "贴了四枚灵石的香火，光仍弱，人还守着。"],
      hard: ["把话说硬", "{foe}也看见光弱了。两个人有{arc}，剑拔弩张，岗还是自己的。"],
    },
  ],
  "recruit-chore": [
    {
      id: "gate",
      context: "{sect}的门口站着一个新人，还没报名。人在{place}。",
      plain: ["记下名字", "把名字记上杂役的册子，让他先扫院。"],
      share: ["同门领进去", "{mate}把人领进院里，名字落在册子上了。", "想找人领，附近没有同门，自己把名字记下了。"],
      take: ["让他明天再来", "今天没收，这一趟多留了六枚灵石，门口的人还站着。"],
      spend: ["先给一顿", "花四枚灵石让他先吃一口，名字再记。"],
      hard: ["把话说硬", "门口的事{foe}也看见了。两个人有{arc}，剑拔弩张。"],
    },
    {
      id: "blank",
      context: "{place}的杂役名单多了一个空名。{sect}今天要不要补上。",
      plain: ["先空着", "空名留着，没有随便填一个。"],
      share: ["问同门", "{mate}知道这个空名是谁，册子补上了。", "问了一圈，附近没有同门知道，空名先留着。"],
      take: ["填自己人", "空名填了一个熟人，自己口袋里多了六枚灵石。"],
      spend: ["划掉重写", "花四枚灵石把这一页重抄了，空名没有留。"],
      hard: ["把话说硬", "空名的事当着{foe}说硬了。两个人有{arc}，剑拔弩张。"],
    },
  ],
  escort: [
    {
      id: "rope",
      context: "{sect}的车上，一只箱子的绳子松了。人在{place}。",
      plain: ["重新捆上", "把松了的绳子重新捆紧，车继续走。"],
      share: ["同门压着", "{mate}压着箱盖，绳子捆紧了，东西没有洒。", "喊人压箱，附近没有同门，自己把绳子捆上了。"],
      take: ["少算一箱", "少报了一箱，口袋里多了六枚灵石，车上的数对不上。"],
      spend: ["买根新绳", "花四枚灵石买了根新绳，箱子捆好了。"],
      hard: ["把话说硬", "松绳的时候{foe}在旁边。两个人有{arc}，剑拔弩张，箱子还是捆上了。"],
    },
    {
      id: "ask",
      context: "{place}的半路有人来问车上装的是什么。{sect}的牌子还在。",
      plain: ["只说灵材", "说是宗门的灵材，没有打开箱子，车继续走。"],
      share: ["同门挡一挡", "{mate}站到车前挡了挡，问话的人让开了。", "想找人挡，附近没有同门，自己说了一句就走。"],
      take: ["把人支走", "支走了问话的人，这一趟多留了六枚灵石，箱子没开。"],
      spend: ["给四枚过路", "给了四枚灵石，问话的人不再跟，车照旧到了。"],
      hard: ["把话说硬", "问话扯到{foe}。两个人有{arc}，剑拔弩张，箱子没有打开。"],
    },
  ],
  council: [
    {
      id: "late",
      context: "{sect}的议事已经开始，有人迟到。人在{place}。",
      plain: ["等一刻", "等了一刻，人到了，议事按原来的题目继续。"],
      share: ["让同门先说", "{mate}先把看见的说了，迟到的人进门时题目已经清楚。", "想让人先说，附近没有同门，还是自己等。"],
      take: ["不等了", "没等就开议，这一趟多留了六枚灵石，迟到的人进门时话已经说完。"],
      spend: ["留下位置", "花四枚灵石留了茶，位置还在，人迟到也有得坐。"],
      hard: ["把话说硬", "迟到的人是{foe}这边的事。两个人有{arc}，剑拔弩张。"],
    },
    {
      id: "first",
      context: "{place}的堂上有两个人争着先开口。{sect}还等一句。",
      plain: ["按座次", "按座次让先坐着的人先说，堂上安静了。"],
      share: ["问同门", "{mate}提醒了上次的座次，两个人按那个顺序说。", "想问座次，附近没有同门记得，还是按眼前的位子来。"],
      take: ["自己先说", "抢在两个人前面把话说了，口袋里多了六枚灵石，堂上不太平。"],
      spend: ["先敬茶", "花四枚灵石敬了茶，两个人喝完才按座次说。"],
      hard: ["把话说硬", "争着开口的事对着{foe}说硬了。两个人有{arc}，剑拔弩张。"],
    },
  ],
};

export const SECT_DUTY_KEYS = Object.keys(CATALOG);

interface SceneOption {
  optionId: string;
  label: string;
  description: string;
  line: string;
}

export interface SectDutyScene {
  sceneId: string;
  context: string;
  defaultOptionId: string;
  deadlineTick: number;
  mateId?: string;
  foeId?: string;
  options: SceneOption[];
}

interface Cast {
  sect: string;
  place: string;
  mate: Cultivator | null;
  foe: Cultivator | null;
  arc: "嫌隙" | "宿怨" | null;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function sameSect(left: Cultivator, right: Cultivator): boolean {
  return Boolean(
    (left.sectId && left.sectId === right.sectId)
    || (left.neutralSectId && left.neutralSectId === right.neutralSectId),
  );
}

function taskKey(cultivator: Cultivator, actionId: string): string | null {
  if (actionId === "post-duty") return cultivator.sectPost ?? null;
  if (actionId.startsWith("sect-chain:")) return actionId.slice("sect-chain:".length);
  return null;
}

export function isSectSceneAction(actionId: string): boolean {
  return actionId === "post-duty" || actionId.startsWith("sect-chain:");
}

function placeLabel(world: WorldState, locationId: string): string {
  const name = world.locations[locationId]?.name ?? "";
  return /[\u4e00-\u9fff]/.test(name) ? name : "山门";
}

function sectLabel(world: WorldState, cultivator: Cultivator): string {
  const named = cultivator.sectId
    ? world.sects[cultivator.sectId]?.name
    : cultivator.neutralSectId
      ? world.neutralSects[cultivator.neutralSectId]?.name
      : null;
  return named && /[\u4e00-\u9fff]/.test(named) ? named : "宗门";
}

function castOf(world: WorldState, cultivator: Cultivator): Cast {
  let mate: Cultivator | null = null;
  let foe: Cultivator | null = null;
  let arc: Cast["arc"] = null;
  for (const other of Object.values(world.cultivators)) {
    if (other.id === cultivator.id || other.locationId !== cultivator.locationId) continue;
    if (!mate && sameSect(cultivator, other)) mate = other;
    const found = grudgeArcOf(getSocialLink(world, cultivator.id, other.id)?.grudge ?? 0);
    if (found && (!arc || found === "宿怨")) {
      foe = other;
      arc = found;
    }
  }
  return {
    sect: sectLabel(world, cultivator),
    place: placeLabel(world, cultivator.locationId),
    mate,
    foe,
    arc,
  };
}

function fill(text: string, cast: Cast): string {
  return text
    .replaceAll("{sect}", cast.sect)
    .replaceAll("{place}", cast.place)
    .replaceAll("{mate}", cast.mate?.name ?? "同门")
    .replaceAll("{foe}", cast.foe?.name ?? "那个人")
    .replaceAll("{arc}", cast.arc ?? "嫌隙");
}

function sceneOf(world: WorldState, cultivator: Cultivator, actionId: string): SectDutyScene | null {
  const key = taskKey(cultivator, actionId);
  const variants = key ? CATALOG[key] : undefined;
  if (!key || !variants || variants.length === 0) return null;
  const cast = castOf(world, cultivator);
  const variant = variants[hashString(`${cultivator.id}:${world.tick}:${key}`) % variants.length]!;
  const shareLine = cast.mate ? variant.share[1] : variant.share[2];
  const options: SceneOption[] = [
    { optionId: "plain", label: variant.plain[0], description: fill(variant.plain[1], cast), line: fill(variant.plain[1], cast) },
    { optionId: "share", label: cast.mate ? `喊${cast.mate.name}` : variant.share[0], description: fill(shareLine, cast), line: fill(shareLine, cast) },
    { optionId: "take", label: variant.take[0], description: fill(variant.take[1], cast), line: fill(variant.take[1], cast) },
  ];
  if (cast.foe && cast.arc) {
    options.push({
      optionId: "hard",
      label: variant.hard[0],
      description: fill(variant.hard[1], cast),
      line: fill(variant.hard[1], cast),
    });
  } else {
    options.push({
      optionId: "spend",
      label: variant.spend[0],
      description: fill(variant.spend[1], cast),
      line: fill(variant.spend[1], cast),
    });
  }
  const context = fill(variant.context, cast);
  return {
    sceneId: `${key}:${variant.id}`,
    context,
    defaultOptionId: "plain",
    deadlineTick: world.tick + SCENE_WAIT_TICKS,
    ...(cast.mate ? { mateId: cast.mate.id } : {}),
    ...(cast.foe ? { foeId: cast.foe.id } : {}),
    options,
  };
}

export function buildSectDutyScene(world: WorldState, cultivator: Cultivator, actionId: string): SectDutyScene | null {
  return sceneOf(world, cultivator, actionId);
}

export function listSectDutyVariantIds(taskKeyName: string): string[] {
  return (CATALOG[taskKeyName] ?? []).map((variant) => variant.id);
}

function writeSight(world: WorldState, cultivator: Cultivator, line: string, names: string[]): void {
  const text = line.startsWith("见闻：") ? line : `见闻：${line}`;
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "insight",
    title: "事务里的见闻",
    detail: text,
    locationId: cultivator.locationId,
    mood: "活做到一半",
  }));
  recordLife(cultivator, { tick: world.tick, kind: "growth", text });
  if (names.length > 0) {
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text, names });
  }
}

function applyScene(world: WorldState, cultivator: Cultivator, job: ActionJob, optionId: string, timedOut: boolean): string {
  const scene = job.meta?.sectScene;
  if (!scene) throw new GameplayRejection("这趟事务没有停下来等你选。");
  const option = scene.options.find((row) => row.optionId === optionId);
  if (!option) throw new GameplayRejection("这个做法不在这一趟事务上。");
  let line = option.line;
  const names: string[] = [];
  if (!timedOut && option.optionId === "share" && scene.mateId) {
    const mate = world.cultivators[scene.mateId];
    if (mate) {
      addMutualAffinity(world, cultivator.id, mate.id, SHARE_AFFINITY);
      names.push(mate.name);
      shiftCultivatorMood(world, cultivator, "spoken", `${mate.name}在这趟活里搭了手。`);
      writeSight(world, mate, `见闻：${cultivator.name}做宗门的活时喊了自己。`, [cultivator.name]);
    }
  }
  if (!timedOut && option.optionId === "take") {
    cultivator.spiritStones += TAKE_STONES;
    shiftCultivatorMood(world, cultivator, "rejection", "这一笔心里不踏实。");
  }
  if (!timedOut && option.optionId === "spend") {
    const paid = Math.min(cultivator.spiritStones, SPEND_STONES);
    cultivator.spiritStones -= paid;
    if (paid < SPEND_STONES) {
      line = paid === 0 ? "想赔上几枚灵石，口袋里没有。" : `口袋里只赔得出${paid}枚灵石，事情仍按这个做法落了。`;
    }
    shiftCultivatorMood(world, cultivator, "spoken", "这一笔自己认了。");
  }
  if (!timedOut && option.optionId === "hard" && scene.foeId) {
    const foe = world.cultivators[scene.foeId];
    if (foe) {
      addMutualGrudge(world, cultivator.id, foe.id, HARD_GRUDGE);
      names.push(foe.name);
      const tense = `${cultivator.name}和${foe.name}在这趟活里把话说硬了，剑拔弩张，好感没有涨。`;
      shiftCultivatorMood(world, cultivator, "rejection", tense);
      shiftCultivatorMood(world, foe, "rejection", tense);
      writeSight(world, foe, `见闻：${tense}`, [cultivator.name]);
    }
  }
  if (timedOut) line = `时辰到了，按稳妥的做了。${line}`;
  const stamped = line.startsWith("见闻：") ? line : `见闻：${line}`;
  writeSight(world, cultivator, stamped, names);
  const meta = { ...(job.meta ?? {}) };
  delete meta.sectScene;
  meta.sectSceneLine = stamped;
  job.meta = meta;
  return stamped;
}

export function holdSectDutyScene(world: WorldState, job: ActionJob): void {
  if (!isSectSceneAction(job.actionId)) return;
  const cultivator = world.cultivators[job.cultivatorId];
  if (!cultivator) return;
  const pending = job.meta?.sectScene;
  if (pending) {
    if (world.tick < pending.deadlineTick) {
      job.remainingTicks += 1;
      return;
    }
    applyScene(world, cultivator, job, pending.defaultOptionId, true);
    return;
  }
  if (job.meta?.sectSceneLine) return;
  if (job.remainingTicks > 0) return;
  const scene = sceneOf(world, cultivator, job.actionId);
  if (!scene) return;
  job.meta = { ...(job.meta ?? {}), sectScene: scene };
  job.remainingTicks = 1;
  writeSight(world, cultivator, `见闻：${scene.context}活做到这里，要选一个做法。`, []);
}

export function listSectSceneActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  const scene = job?.meta?.sectScene;
  if (!scene) return [];
  return scene.options.map((option) => ({
    actionId: `sect-scene:${option.optionId}` as ActionId,
    label: option.label,
    description: `${scene.context}${option.description}`,
    durationTicks: 0,
    kind: "immediate" as const,
  }));
}

export function answerSectDutyScene(world: WorldState, cultivator: Cultivator, optionId: string): ActionExecutionResult {
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  if (!job?.meta?.sectScene) throw new GameplayRejection("这趟事务没有停下来等你选。");
  const summary = applyScene(world, cultivator, job, optionId, false);
  job.remainingTicks = 0;
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId: `sect-scene:${optionId}` as ActionId,
    accepted: true,
    summary,
  };
}
