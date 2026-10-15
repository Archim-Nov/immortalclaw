import type {
  DaoLogEntry,
  Residence,
  ResidenceAmbientEventView,
  ResidenceAmbientKind,
  ResidenceContextView,
  TimedActionId,
} from "./model.js";
import { residenceGlance, residenceGrandeur, residenceTierName } from "./residence-grandeur.js";

const hashString = (input: string) => Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;

const TIME_SLICES = [
  { label: "清晨", lead: "晨雾未散" },
  { label: "午后", lead: "日光穿窗" },
  { label: "薄暮", lead: "暮色渐合" },
  { label: "深夜", lead: "夜息沉静" },
] as const;

const RESIDENCE_FLAVOR: Record<string, {
  readonly scene: string;
  readonly atmosphere: readonly string[];
  readonly "human-presence": readonly string[];
  readonly omen: readonly string[];
}> = {
  qingzhou: {
    scene: "竹影与溪声把洞府裹成一处安稳的静修地",
    atmosphere: ["窗外竹叶轻擦石壁，溪水声贴着阶前回响。", "山腰薄雾顺着檐角滑下，茶案边的暖石还留着微温。"],
    "human-presence": ["山下晨市的木铃声若有若无地飘上来。", "路过的采药童在山道上低声报数，很快又没入竹雾。"],
    omen: ["聚灵阵边缘泛起一线柔青色灵光，像是在替你稳住心神。", "案上的符纸轻轻卷起，灵息回环得比平时更顺。"],
  },
  yangzhou: {
    scene: "水气、舟歌与临河灯影让这处居所带着江上修行的松弛感",
    atmosphere: ["河面水汽沿着窗棂漫进来，帘影微晃。", "远处船橹拍水的节奏，把屋里的静气衬得更细密。"],
    "human-presence": ["码头方向传来短促的号子声，又被潮声带远。", "隔河有人调试灵舟阵纹，断续金石声映进屋内。"],
    omen: ["引水灵阵轻轻一亮，空气里的水系灵气随之顺了一层。", "桌角灵灯忽明忽暗，像是和潮汐一起呼吸。"],
  },
  zhongzhou: {
    scene: "高处塔影与城中秩序感，让洞府带着一种克制而稳定的修行氛围",
    atmosphere: ["高塔间的风从窗外掠过，卷起图卷一角。", "楼外车马声被石壁削薄，只剩均匀而克制的回音。"],
    "human-presence": ["远处官道上传来巡查铜铃，节拍整齐得像一条线。", "邻塔修士翻页与磨墨的细声，在静处反而听得分明。"],
    omen: ["地面阵纹忽然稳稳亮起一圈，把散乱灵息压得更服帖。", "舆图边缘一闪而过的微光，像是提醒你此地仍在天衡之中。"],
  },
  shuzhou: {
    scene: "云崖飞瀑与洞中水气，让这处洞府天然适合沉心与养神",
    atmosphere: ["瀑声从崖外层层压进来，洞顶萤光灵矿随之微颤。", "潮湿水气绕过石壁，在指尖留下凉意。"],
    "human-presence": ["云梯那头传来短暂脚步，很快又被飞瀑吞没。", "远处似有人在崖边试剑，只余一记悠长回声。"],
    omen: ["壁间灵草忽然轻轻舒展，像是顺着你的吐纳一起呼吸。", "钟乳石尖滴落的一滴灵水，在石盆里震开细小灵纹。"],
  },
  youzhou: {
    scene: "寒原的风与极夜般的清寂，让洞府显得冷冽却可靠",
    atmosphere: ["石窗外寒风扫过冻原，屋内温火阵随之轻轻一跳。", "毛皮边缘沾着一点冷霜，落地即化。"],
    "human-presence": ["北地巡骑的铜哨声在远处响了一次，又迅速沉寂。", "洞外有人抖落甲片上的雪粒，脚步声短促而干净。"],
    omen: ["炉边灵火忽然收束成一线，像是在替你压住散乱气机。", "窗外极光一闪，把屋里的影子拉得极长。"],
  },
  liangzhou: {
    scene: "风沙、残照与地下石室的厚重感，让停留本身就像一种磨炼",
    atmosphere: ["风沙敲打外层岩壁，室内阵纹稳稳把动静隔在外面。", "黄昏热气尚未散尽，石壁却先一步凉了下来。"],
    "human-presence": ["远方驼铃断断续续地传来，像是在提醒你荒疆仍在流动。", "有人在外层清理沙砾，铁器碰石的声音短而硬。"],
    omen: ["镇荒古阵在脚下轻轻震了一下，随后归于沉稳。", "案边旧行记被风翻开一页，停在前人标注的险地旁。"],
  },
  leizhou: {
    scene: "雷泽的压迫感与电光余韵，让静修里始终带着一丝锋锐",
    atmosphere: ["远雷在高原深处滚过，墙中灵铜导线泛起细亮光。", "空气里微微发紧，像有电芒在石壁间游走。"],
    "human-presence": ["塔外值守修士低声报过一轮雷势，脚步立刻远去。", "有人在远处校正引雷桩，金属共振沿塔身传来。"],
    omen: ["聚灵阵上跳起一粒细小电弧，又很快没入纹路。", "一瞬闪电把整个洞府照得雪亮，随后又归于幽蓝。"],
  },
  cangzhou: {
    scene: "潮声、盐雾与海崖开阔感，让洞府像一处面朝大海的道场",
    atmosphere: ["潮声一阵阵推到石台边，带着淡淡盐气。", "海风掠过纱幔，屋里留下湿润而清醒的凉意。"],
    "human-presence": ["崖下渔火换班，隐约能听见船工彼此呼喊。", "有人在下方平台整理渔具，木桶轻碰声顺风而上。"],
    omen: ["潮汐灵阵顺着海浪起伏亮了一次，屋内灵息也随之起落。", "窗外一抹鲸影破浪而过，只留下一段极短的静默。"],
  },
  wanzhou: {
    scene: "花田气息、温泉暖意与商路消息，让洞府既安居又不与世隔绝",
    atmosphere: ["花香混着泥土气透进来，屋里的木案都显得柔和了些。", "后院温泉的热雾轻轻漫过回廊。"],
    "human-presence": ["山道上有旅人谈起新近商路见闻，声音顺风飘来几句。", "前院蜂蝶惊起一片，像是有人从花田边走过。"],
    omen: ["晒药架上的几片灵叶忽然微卷，像是在应你的气机。", "温泉池面荡开一圈细纹，随后又恢复平滑。"],
  },
};

const AMBIENT_TITLES: Record<ResidenceAmbientKind, string> = {
  atmosphere: "洞府风息",
  "human-presence": "洞府人声",
  omen: "洞府灵兆",
};

const AMBIENT_CHANCE: Partial<Record<TimedActionId, number>> = {
  "residence-meditate": 38,
  "residence-heal": 30,
  "residence-recover-qi": 28,
  "residence-socialize": 34,
  "residence-produce": 20,
};

function timeSliceOf(tick: number) {
  return TIME_SLICES[Math.abs(tick) % TIME_SLICES.length] ?? TIME_SLICES[0]!;
}

function residenceFlavorForState(stateId: string) {
  return RESIDENCE_FLAVOR[stateId] ?? RESIDENCE_FLAVOR.qingzhou;
}

export function describeResidenceScene(residence: Residence, tick: number): { timeSense: string; scene: string } {
  const slice = timeSliceOf(tick);
  const flavor = residenceFlavorForState(residence.stateId);
  return {
    timeSense: slice.label,
    scene: `${slice.label}时分，${slice.lead}，${flavor.scene}。`,
  };
}

export function describeResidenceAction(baseDescription: string, residence: Residence, tick: number): string {
  const { scene } = describeResidenceScene(residence, tick);
  return `${baseDescription} ${scene}`;
}

export function pickResidenceAmbientEvent(input: {
  tick: number;
  jobId: string;
  actionId: TimedActionId;
  residence: Residence;
}): { kind: ResidenceAmbientKind; title: string; description: string } | null {
  const chance = AMBIENT_CHANCE[input.actionId] ?? 0;
  if (chance <= 0) {
    return null;
  }
  const gateRoll = hashString(`${input.tick}:${input.jobId}:${input.actionId}:ambient-gate`) % 100;
  if (gateRoll >= chance) {
    return null;
  }

  const kinds: ResidenceAmbientKind[] = ["atmosphere", "human-presence", "omen"];
  const kind = kinds[hashString(`${input.tick}:${input.jobId}:${input.actionId}:ambient-kind`) % kinds.length] ?? "atmosphere";
  const slice = timeSliceOf(input.tick);
  const flavor = residenceFlavorForState(input.residence.stateId);
  const lines = flavor[kind];
  const line = lines[hashString(`${input.tick}:${input.jobId}:${input.actionId}:ambient-line`) % lines.length] ?? lines[0]!;

  return {
    kind,
    title: AMBIENT_TITLES[kind],
    description: `${slice.label}，${line}`,
  };
}

export function getRecentResidenceAmbientEvents(logs: readonly DaoLogEntry[], limit = 2): ResidenceAmbientEventView[] {
  return logs
    .filter((entry) => entry.tags.includes("residence") && entry.tags.includes("ambient-event"))
    .slice(0, limit)
    .map((entry) => {
      const kindTag = entry.tags.find((tag) => tag.startsWith("ambient-kind:"));
      const kind = (kindTag?.slice("ambient-kind:".length) ?? "atmosphere") as ResidenceAmbientKind;
      return {
        id: entry.id,
        tick: entry.tick,
        title: entry.title,
        description: entry.content,
        kind,
      };
    });
}

export function getRecentResidenceAmbientEventsForResidence(
  logs: readonly DaoLogEntry[],
  residenceId: string,
  limit = 2,
): ResidenceAmbientEventView[] {
  return getRecentResidenceAmbientEvents(
    logs.filter((entry) => entry.tags.includes(`residence-id:${residenceId}`)),
    limit,
  );
}

export function buildResidenceContext(
  residence: Residence,
  tick: number,
  recentAmbientEvents: readonly ResidenceAmbientEventView[],
): ResidenceContextView {
  const { timeSense, scene } = describeResidenceScene(residence, tick);
  return {
    id: residence.id,
    stateId: residence.stateId,
    locationId: residence.locationId,
    name: residence.name,
    description: residence.description,
    timeSense,
    scene,
    recentAmbientEvents,
    grandeur: residenceGrandeur(residence),
    tierName: residenceTierName(residence),
    glance: residenceGlance(residence),
  };
}
