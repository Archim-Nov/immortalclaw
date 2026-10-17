import type { EnemyPattern } from "./party-battle.js";
import type { DungeonBeat, DungeonExpeditionPolicy } from "./model.js";

/**
 * Playable rooms that exist only on 乙 floors.
 *
 * The door already names 雷泽残阵, 沉雾沼, and 铜棺窟. These are the
 * encounter, the thin chance, and the quarrel after that door. 丙 and 甲
 * keep the older draw. The finale followers are not in this file.
 */

export interface YiFoe {
  name: string;
  flavor: "兵器" | "法术";
  pattern: EnemyPattern;
}

export interface YiWakeEffect {
  stoneDelta: number;
  moralityDelta: number;
  injuryTicks?: number;
  beat: DungeonBeat;
}

export type YiMidrunKind = "yi-chance" | "yi-quarrel";

const LEI_PACK: readonly YiFoe[] = [
  { name: "雷索客", flavor: "兵器", pattern: "swift" },
  { name: "麻符修", flavor: "法术", pattern: "drain" },
];

const WU_PACK: readonly YiFoe[] = [
  { name: "沼钩客", flavor: "兵器", pattern: "pressure" },
  { name: "湿咒修", flavor: "法术", pattern: "seal" },
];

const TONG_PACK: readonly YiFoe[] = [
  { name: "霜戟客", flavor: "兵器", pattern: "swift" },
  { name: "铜灯修", flavor: "法术", pattern: "burst" },
];

const PLACES = ["雷泽残阵", "沉雾沼", "铜棺窟"] as const;
type YiPlace = (typeof PLACES)[number];

function placeOf(rank: number): YiPlace {
  if (rank >= 7) return "铜棺窟";
  if (rank >= 4) return "沉雾沼";
  return "雷泽残阵";
}

export function yiThirdPack(rank: number): readonly YiFoe[] {
  if (rank >= 7) return TONG_PACK;
  if (rank >= 4) return WU_PACK;
  return LEI_PACK;
}

interface YiOption {
  optionId: string;
  label: string;
  description: string;
}

interface YiScene {
  context: string;
  options: readonly YiOption[];
  conservative: string;
  balanced: string;
  aggressive: string;
}

const CHANCE: Record<YiPlace, YiScene> = {
  雷泽残阵: {
    context: "雷泽残阵里，灭掉的阵眼边上还亮着一颗没人取的残雷。可以绕开，记下它跳的拍子，留半颗给后来的人，或者伸手摘下来。",
    options: [
      { optionId: "avoid-spark", label: "绕开残雷", description: "贴着灭掉的那一格走，亮着的那一点留在原处。" },
      { optionId: "share-spark", label: "记下它跳的拍子", description: "看清再跳要隔多久，不伸手。" },
      { optionId: "point-spark", label: "留半颗给后来的人", description: "取走一半，另一半用石块压住，留个能看见的角。" },
      { optionId: "pry-spark", label: "伸手摘下来", description: "整颗带走。手上会麻一下。" },
    ],
    conservative: "avoid-spark",
    balanced: "share-spark",
    aggressive: "pry-spark",
  },
  沉雾沼: {
    context: "沉雾沼里，一块干处露着一包还没湿透的灵材。可以从边上走开，告诉旁边的人，只取干燥的一角，或者整包拎走。",
    options: [
      { optionId: "avoid-bundle", label: "从边上走开", description: "包还在干处，人先走湿一点的那一脚。" },
      { optionId: "share-bundle", label: "告诉旁边的人", description: "说一声这里还干，自己不拿。" },
      { optionId: "point-bundle", label: "只取干燥的一角", description: "湿了的留在原处。" },
      { optionId: "pry-bundle", label: "整包拎走", description: "干的湿的一起收进袋子。" },
    ],
    conservative: "avoid-bundle",
    balanced: "share-bundle",
    aggressive: "pry-bundle",
  },
  铜棺窟: {
    context: "铜棺窟里，一口没盖严的小棺沿上温着一小块铜屑。可以不碰，记住温着的位置，把温处指给同路的人，或者揭开看一看。",
    options: [
      { optionId: "avoid-copper", label: "不碰棺沿", description: "温还在，手不放上去。" },
      { optionId: "share-copper", label: "记住温着的位置", description: "看清是哪一口，人退开。" },
      { optionId: "point-copper", label: "把温处指给同路的人", description: "自己只取一小块，其余的留在沿上。" },
      { optionId: "pry-copper", label: "揭开看一看", description: "盖动一下，里面可能有东西，寒气也会贴上来。" },
    ],
    conservative: "avoid-copper",
    balanced: "share-copper",
    aggressive: "pry-copper",
  },
};

const QUARREL: Record<YiPlace, YiScene> = {
  雷泽残阵: {
    context: "雷泽残阵里，两个散修为了一截阵脚木争起来。一个说自己先看见，一个说手已经按上了。可以把两人拉开，帮先看见的人说一句，把木头留下，或者趁乱拿走。",
    options: [
      { optionId: "aid-array", label: "把两人拉开", description: "木头先放回地上，人分开。" },
      { optionId: "share-array", label: "帮先看见的人说一句", description: "说谁先看见，自己不拿木头。" },
      { optionId: "leave-array", label: "把木头留下", description: "不帮任何一边，木头还在原地。" },
      { optionId: "grab-array", label: "趁乱拿走", description: "两人还在争的时候，木头进了自己袋子。" },
    ],
    conservative: "aid-array",
    balanced: "share-array",
    aggressive: "grab-array",
  },
  沉雾沼: {
    context: "沉雾沼里，两个散修争着那一脚还干的地方。一个站不稳，一个已经把脚伸过去了。可以把两人拉开，把干处让给站不稳的那个，自己从边上走，或者先踩上去。",
    options: [
      { optionId: "aid-fog", label: "把两人拉开", description: "先让开那一脚，人再说话。" },
      { optionId: "share-fog", label: "把干处让给站不稳的那个", description: "扶他站上去，自己留在边上。" },
      { optionId: "leave-fog", label: "自己从边上走", description: "不插话，从湿处绕过去。" },
      { optionId: "grab-fog", label: "先踩上去", description: "干处归自己。后面的人还站在雾里。" },
    ],
    conservative: "aid-fog",
    balanced: "share-fog",
    aggressive: "grab-fog",
  },
  铜棺窟: {
    context: "铜棺窟里，两个散修争棺盖上那一点暖。一个手是冷的，一个先捂住了。可以把两人拉开，把暖处让给手冷的那个，记下谁先到，或者自己先捂住。",
    options: [
      { optionId: "aid-frost", label: "把两人拉开", description: "暖处先空出来，人分开。" },
      { optionId: "share-frost", label: "把暖处让给手冷的那个", description: "让他的手贴上去，自己不占。" },
      { optionId: "leave-frost", label: "记下谁先到", description: "只记住先后，暖处不动。" },
      { optionId: "grab-frost", label: "自己先捂住", description: "手按上去。旁边两个人都看见了。" },
    ],
    conservative: "aid-frost",
    balanced: "share-frost",
    aggressive: "grab-frost",
  },
};

function sceneFor(kind: YiMidrunKind, place: string): YiScene | null {
  if (!PLACES.includes(place as YiPlace)) return null;
  const table = kind === "yi-chance" ? CHANCE : QUARREL;
  return table[place as YiPlace];
}

export function yiMidrunDraft(
  kind: YiMidrunKind,
  place: string,
  posture: DungeonExpeditionPolicy,
): {
  sceneKind: YiMidrunKind;
  context: string;
  options: YiOption[];
  defaultOptionId: string;
} | null {
  const scene = sceneFor(kind, place);
  if (!scene) return null;
  const defaultOptionId = posture === "aggressive"
    ? scene.aggressive
    : posture === "balanced"
      ? scene.balanced
      : scene.conservative;
  return {
    sceneKind: kind,
    context: scene.context,
    options: scene.options.map((option) => ({ ...option })),
    defaultOptionId,
  };
}

function effect(
  stoneDelta: number,
  moralityDelta: number,
  title: string,
  detail: string,
  extra: { injuryTicks?: number; kind?: DungeonBeat["kind"] } = {},
): YiWakeEffect {
  return {
    stoneDelta,
    moralityDelta,
    injuryTicks: extra.injuryTicks,
    beat: {
      kind: extra.kind ?? (stoneDelta > 0 ? "find" : moralityDelta > 0 ? "person" : "mood"),
      title,
      detail,
      mood: extra.injuryTicks ? "还得看这一下" : stoneDelta < 0 ? "袋子轻了一点" : "这一段可以回去说",
    },
  };
}

const EFFECTS: Record<string, YiWakeEffect> = {
  "avoid-spark": effect(0, 0, "绕开了残雷", "雷泽残阵里，你贴着灭掉的那一格走过去。亮着的那一点还在阵眼边上。"),
  "share-spark": effect(0, 1, "记下了拍子", "雷泽残阵里，你看清残雷再跳要隔多久，没有伸手。"),
  "point-spark": effect(4, 1, "留了半颗", "雷泽残阵里，你取走一半，另一半用石块压住，后来的人还看得见。", { kind: "find" }),
  "pry-spark": effect(8, -1, "摘下了残雷", "雷泽残阵里，你把那颗残雷摘下来。袋子里多了几枚灵石，手上麻了一下。", { injuryTicks: 1, kind: "injury" }),
  "avoid-bundle": effect(0, 0, "从边上走开", "沉雾沼里，那包灵材还在干处。你从湿一点的地方走过去，没有拿。"),
  "share-bundle": effect(0, 1, "告诉了旁边的人", "沉雾沼里，你说了一声这里还干。包还在原处。"),
  "point-bundle": effect(4, 1, "只取了一角", "沉雾沼里，你取走干燥的一角，湿了的留在干处。", { kind: "find" }),
  "pry-bundle": effect(10, -1, "把整包拎走", "沉雾沼里，你把那包灵材整包收进袋子。干处空了。", { kind: "close-call" }),
  "avoid-copper": effect(0, 0, "没有碰棺沿", "铜棺窟里，棺沿上那一点温还在。你的手没有放上去。"),
  "share-copper": effect(0, 1, "记住了温处", "铜棺窟里，你看清是哪一口小棺在温，人退开了。"),
  "point-copper": effect(4, 1, "指给了同路的人", "铜棺窟里，你取了一小块，把还温的位置指给同路的人。", { kind: "find" }),
  "pry-copper": effect(8, -1, "揭开看了看", "铜棺窟里，你把小棺的盖揭开一点。里面滚出几枚灵石，寒气也贴上手背。", { injuryTicks: 1, kind: "injury" }),
  "aid-array": effect(0, 1, "把两人拉开", "雷泽残阵里，你把争阵脚木的两个人拉开。木头放回地上。"),
  "share-array": effect(2, 1, "帮先看见的人说了一句", "雷泽残阵里，你说了谁先看见那截木头。自己没有拿。", { kind: "person" }),
  "leave-array": effect(0, 0, "木头还在原地", "雷泽残阵里，两个人还在争。你没有帮任何一边，木头留在地上。"),
  "grab-array": effect(10, -2, "趁乱拿走了木头", "雷泽残阵里，你趁两个人还在吵，把阵脚木收进袋子。他们都看见了。", { kind: "close-call" }),
  "aid-fog": effect(0, 1, "把两人拉开", "沉雾沼里，你让开那一脚干处，把两个人分开。"),
  "share-fog": effect(2, 1, "把干处让了出去", "沉雾沼里，你扶着站不稳的那个人踏上干处，自己留在边上。", { kind: "person" }),
  "leave-fog": effect(0, 0, "从边上走了", "沉雾沼里，你没有插话，从湿处绕过去。干处还是他们的事。"),
  "grab-fog": effect(10, -2, "先踩上了干处", "沉雾沼里，你先把脚踩上那一块干处。后面的人还站在雾里。", { kind: "close-call" }),
  "aid-frost": effect(0, 1, "把两人拉开", "铜棺窟里，你把争暖处的两个人拉开。棺盖上那一点先空出来。"),
  "share-frost": effect(2, 1, "把暖处让了出去", "铜棺窟里，你让手冷的那个人贴上棺盖，自己没有占。", { kind: "person" }),
  "leave-frost": effect(0, 0, "记下了先后", "铜棺窟里，你只记住谁先到。暖处还在棺盖上。"),
  "grab-frost": effect(10, -2, "自己先捂住了", "铜棺窟里，你的手先按上那一点暖。旁边两个人都看见了。", { kind: "close-call" }),
};

export function yiMidrunEffect(optionId: string): YiWakeEffect | null {
  return EFFECTS[optionId] ?? null;
}

export function yiPlaceForRank(rank: number): string {
  return placeOf(rank);
}
