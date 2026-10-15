import {
  STATUS_ENTANGLE,
  STATUS_FROSTBITE,
  STATUS_ROOTED,
  STATUS_SPELL_BREAK,
} from "./combat-statuses.js";
import type { CombatStatusId, DungeonGrade, SpellLoadoutId, SpellTier } from "./model.js";

/**
 * Light identity for 乙, plus a thin overlay on 丙 7–9.
 *
 * 甲 drop gates and guardian formulas stay in high-realm.ts and
 * high-realm-dungeon.ts. This file only names the place, the two followers,
 * one existing status, and a short line for a loss or a retreat.
 */

export interface LightThreat {
  statusId: CombatStatusId;
  tier: SpellTier;
  spellLoadoutId: SpellLoadoutId;
  extraSpiritDrain: number;
}

export interface LightFailCost {
  injuryTicks: number;
  stoneLoss: number;
  spiritLoss: number;
  deviationTicks: number;
  title: string;
  mood: string;
  sentence: string;
}

interface LightBand {
  grade: "乙" | "丙";
  minRank: number;
  maxRank: number;
  name: string;
  statusId: CombatStatusId;
  spellLoadoutId: SpellLoadoutId;
  addNames: readonly [string, string];
  advice: string;
  line: string;
  realmClause: string;
  loss: { title: string; mood: string; sentence: string; stoneLoss: number };
  flee: { title: string; mood: string; sentence: string; stoneLoss: number };
}

const asSpell = (id: string) => id as SpellLoadoutId;

const BANDS: readonly LightBand[] = [
  {
    grade: "乙",
    minRank: 1,
    maxRank: 3,
    name: "雷泽残阵",
    statusId: STATUS_SPELL_BREAK,
    spellLoadoutId: asSpell("metal-break-tier-2"),
    addNames: ["阵脚", "残雷"],
    advice: "乙级一到三层是雷泽残阵。残阵会挂断法，跟着的是阵脚和残雷。输了或撤出，袋子里会少几枚灵石。",
    line: "雷泽残阵是乙级一到三层。筑基前期常从这里过，探宝和守关仍掉筑基灵材。残阵会挂断法，从者是阵脚和残雷。输了或撤出，会留下一句短话，并掉几枚灵石。",
    realmClause: "一到三层是雷泽残阵，残阵会挂断法。",
    loss: {
      title: "雷泽残阵没站住",
      mood: "手上还麻",
      sentence: "雷泽残阵把这一手断了。人没站住，袋子里少了几枚灵石。",
      stoneLoss: 4,
    },
    flee: {
      title: "从雷泽残阵撤出",
      mood: "袖上还麻",
      sentence: "从雷泽残阵撤出来，手上还麻着。",
      stoneLoss: 2,
    },
  },
  {
    grade: "乙",
    minRank: 4,
    maxRank: 6,
    name: "沉雾沼",
    statusId: STATUS_ENTANGLE,
    spellLoadoutId: asSpell("wood-bind-tier-2"),
    addNames: ["沼影", "雾丝"],
    advice: "乙级四到六层是沉雾沼。缠绕会拖住步子，跟着的是沼影和雾丝。输了或撤出，会掉几枚灵石。",
    line: "沉雾沼是乙级四到六层。筑基中期常从这里过，材料仍是筑基这一档。雾会挂缠绕，从者是沼影和雾丝。输了或撤出，会掉几枚灵石。",
    realmClause: "四到六层是沉雾沼，雾会挂缠绕。",
    loss: {
      title: "沉雾沼没走出去",
      mood: "鞋还是湿的",
      sentence: "沉雾沼把脚缠住了。这一场没走出去，灵石落了几枚。",
      stoneLoss: 6,
    },
    flee: {
      title: "从沉雾沼撤出",
      mood: "鞋上还湿",
      sentence: "从沉雾沼里撤出来，鞋上还是湿的。",
      stoneLoss: 3,
    },
  },
  {
    grade: "乙",
    minRank: 7,
    maxRank: 9,
    name: "铜棺窟",
    statusId: STATUS_FROSTBITE,
    spellLoadoutId: asSpell("water-frost-tier-2"),
    addNames: ["棺侍", "铜卫"],
    advice: "乙级七到九层是铜棺窟。霜寒会贴上来，跟着的是棺侍和铜卫。输了或撤出，会掉几枚灵石。",
    line: "铜棺窟是乙级七到九层。筑基后期常从这里过，材料仍是筑基这一档。寒气会挂霜寒，从者是棺侍和铜卫。输了或撤出，会掉几枚灵石。",
    realmClause: "七到九层是铜棺窟，寒气会挂霜寒。",
    loss: {
      title: "铜棺窟没撑住",
      mood: "袖口还冷",
      sentence: "铜棺里的寒气贴上来。人没撑住，灵石掉在棺前。",
      stoneLoss: 8,
    },
    flee: {
      title: "从铜棺窟撤出",
      mood: "人出来了，袖口还冷",
      sentence: "铜棺前站不住，人先撤了，袖口还是冷的。",
      stoneLoss: 4,
    },
  },
  {
    grade: "丙",
    minRank: 7,
    maxRank: 9,
    name: "旧驿石廊",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("wood-bind-tier-2"),
    addNames: ["灯奴", "石卒"],
    advice: "丙级七到九层是旧驿石廊。定根会拖一下先手，跟着的是灯奴和石卒。这里仍是练手，不另扣灵石。",
    line: "旧驿石廊是丙级七到九层。炼气后期会走到这里，材料仍是炼气这一档。石理会挂定根，从者是灯奴和石卒。输了只留下一句短话。",
    realmClause: "旧驿石廊会挂定根，仍是练手。",
    loss: {
      title: "旧驿石廊退出来了",
      mood: "步子还沉",
      sentence: "旧驿石廊把步子定住了一下。人退出来了。",
      stoneLoss: 0,
    },
    flee: {
      title: "从旧驿石廊撤出",
      mood: "没再往前",
      sentence: "旧驿石廊里没再往前，人撤了。",
      stoneLoss: 0,
    },
  },
];

const BING_STATE_LINE: Record<string, string> = {
  qingzhou: "青州这段廊还算干，灯是药铺顺手留下的。",
  yangzhou: "扬州这段廊潮，石上有水印。",
  zhongzhou: "中州这段廊有人登记过，墙上还剩半行字。",
  shuzhou: "蜀州这段廊窄，藤从石缝里探出来。",
  youzhou: "幽州这段廊冷，灯油凝着。",
  liangzhou: "凉州这段廊风硬，沙贴在石阶上。",
  leizhou: "雷州这段廊会响，石缝里有细碎的电。",
  cangzhou: "沧州这段廊咸，灯罩上有白渍。",
  wanzhou: "宛州这段廊静，灰积在灯台上。",
};

function bandFor(grade: DungeonGrade, rank: number): LightBand | null {
  if (grade !== "乙" && grade !== "丙") return null;
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  return BANDS.find((band) => band.grade === grade && step >= band.minRank && step <= band.maxRank) ?? null;
}

function stateClause(grade: DungeonGrade, rank: number, stateId?: string): string {
  if (grade !== "丙" || rank < 7 || !stateId) return "";
  return BING_STATE_LINE[stateId] ?? "";
}

export function lightPlaceName(grade: DungeonGrade, rank: number): string | null {
  return bandFor(grade, rank)?.name ?? null;
}

export function lightRealmClause(grade: DungeonGrade, rank: number): string {
  return bandFor(grade, rank)?.realmClause ?? "";
}

export function lightAdvice(grade: DungeonGrade, rank: number, stateId?: string): string | null {
  const band = bandFor(grade, rank);
  if (!band) return null;
  const extra = stateClause(grade, rank, stateId);
  return extra ? `${band.advice}${extra}` : band.advice;
}

export function lightMysteryHint(
  grade: DungeonGrade,
  rank: number,
  stateId?: string,
): { name: string; line: string } | null {
  const band = bandFor(grade, rank);
  if (!band) return null;
  const extra = stateClause(grade, rank, stateId);
  return { name: band.name, line: extra ? `${band.line}${extra}` : band.line };
}

export function lightPackFlavor(
  grade: DungeonGrade,
  rank: number,
): { addNames: readonly [string, string]; threat: LightThreat } | null {
  const band = bandFor(grade, rank);
  if (!band) return null;
  return {
    addNames: band.addNames,
    threat: {
      statusId: band.statusId,
      tier: 2,
      spellLoadoutId: band.spellLoadoutId,
      extraSpiritDrain: 0,
    },
  };
}

export function lightFailCost(
  grade: DungeonGrade,
  rank: number,
  outcome: "loss" | "withdraw",
): LightFailCost | null {
  const band = bandFor(grade, rank);
  if (!band) return null;
  const line = outcome === "loss" ? band.loss : band.flee;
  return {
    injuryTicks: 0,
    stoneLoss: line.stoneLoss,
    spiritLoss: 0,
    deviationTicks: 0,
    title: line.title,
    mood: line.mood,
    sentence: line.sentence,
  };
}
