import {
  STATUS_BURNING,
  STATUS_ILLUSION_BLUR,
  STATUS_SPIRIT_BREATH,
  STATUS_SUPPRESSION,
} from "./combat-statuses.js";
import { mysteryForRank, type MysteryRealm } from "./high-realm.js";
import type { CombatStatusId, DungeonGrade, SpellLoadoutId, SpellTier } from "./model.js";

/**
 * How a 甲级 mystery realm fights.
 *
 * The door and the drop stay in high-realm.ts. This file only says what the
 * guardian pack does, and what a loss or a retreat costs. 丙 and 乙 are not here.
 */

type EnemyPatternName = "pressure" | "burst" | "drain" | "swift" | "seal";

interface BandFight {
  warning: string;
  statusId: CombatStatusId;
  selfStatusId?: CombatStatusId;
  spellForRank: (rank: number) => { id: SpellLoadoutId; tier: SpellTier };
  addNames: readonly [string, string];
  addFactors: readonly [number, number];
  patterns: readonly [EnemyPatternName, EnemyPatternName, EnemyPatternName];
  extraSpiritDrain: (rank: number) => number;
  loss: BandFail;
  flee: BandFail;
  companionLoss: number;
  companionFlee: number;
}

interface BandFail {
  injuryTicks: number;
  stoneLoss: number;
  spiritLoss: number;
  deviationTicks: number;
  title: string;
  mood: string;
  sentence: string;
}

export interface JiaFailCost {
  injuryTicks: number;
  stoneLoss: number;
  spiritLoss: number;
  deviationTicks: number;
  title: string;
  mood: string;
  sentence: string;
}

export interface GuardianThreat {
  statusId: CombatStatusId;
  tier: SpellTier;
  spellLoadoutId: SpellLoadoutId;
  extraSpiritDrain: number;
  selfStatusId?: CombatStatusId;
}

export interface JiaPackShape {
  addNames: readonly [string, string];
  addFactors: readonly [number, number];
  patterns: readonly [EnemyPatternName, EnemyPatternName, EnemyPatternName];
  stats: { hp: number; attack: number; defense: number };
  threat: GuardianThreat;
}

const asSpell = (id: string) => id as SpellLoadoutId;

const BANDS: Record<MysteryRealm["id"], BandFight> = {
  danxia: {
    warning: "丹霞内府的守关会压上来，焚灼会贴在身上烧。一个人还能试，五个人分好角色会稳得多。",
    statusId: STATUS_BURNING,
    spellForRank: (rank) => rank >= 3
      ? { id: asSpell("fire-blaze-tier-3"), tier: 3 }
      : { id: asSpell("fire-blaze-tier-2"), tier: 2 },
    addNames: ["炉卫", "余火"],
    addFactors: [0.58, 0.46],
    patterns: ["pressure", "pressure", "swift"],
    extraSpiritDrain: () => 0,
    loss: {
      injuryTicks: 7,
      stoneLoss: 18,
      spiritLoss: 0,
      deviationTicks: 0,
      title: "丹霞内府没站住",
      mood: "火还贴在身上",
      sentence: "丹霞内府的火贴上来了。这一场没站住，焚灼还挂在身上，人受了伤，袋子里也少了些灵石。",
    },
    flee: {
      injuryTicks: 4,
      stoneLoss: 8,
      spiritLoss: 0,
      deviationTicks: 0,
      title: "从丹霞内府撤出",
      mood: "袖口还是热的",
      sentence: "从丹霞内府撤出来的时候袖口还在冒烟。人挂了伤，路上也撒了些灵石。",
    },
    companionLoss: 4,
    companionFlee: 0,
  },
  "infant-pool": {
    warning: "婴火莲池的守关会抽灵力，幻惑会让下一击发飘。单人或者装备不够很容易被耗死。五人里要有人护、有人补、有人破防。",
    statusId: STATUS_ILLUSION_BLUR,
    selfStatusId: STATUS_SPIRIT_BREATH,
    spellForRank: (rank) => rank >= 6
      ? { id: asSpell("water-illusion-tier-4"), tier: 4 }
      : { id: asSpell("water-illusion-tier-3"), tier: 3 },
    addNames: ["莲侍", "魂灯"],
    addFactors: [0.72, 0.6],
    patterns: ["drain", "drain", "burst"],
    extraSpiritDrain: (rank) => 4 + (Math.max(4, Math.min(6, rank)) - 4) * 2,
    loss: {
      injuryTicks: 9,
      stoneLoss: 36,
      spiritLoss: 14,
      deviationTicks: 0,
      title: "婴火莲池把人耗住了",
      mood: "灵力是空的",
      sentence: "婴火莲池把灵力抽走了一截。这一场输了，人受了伤，灵石也散了。",
    },
    flee: {
      injuryTicks: 5,
      stoneLoss: 18,
      spiritLoss: 8,
      deviationTicks: 0,
      title: "从婴火莲池撤出",
      mood: "灵台还是空的",
      sentence: "婴火莲池里没能站稳，人先撤了。灵力发空，身上挂了伤，灵石也落了一路。",
    },
    companionLoss: 6,
    companionFlee: 2,
  },
  "divine-rift": {
    warning: "神纹天隙的镇压会压住出手和先手。一个人或没配齐角色很难清关。五个人把护、控、破、输出、辅助都带上，才是这里的走法。输了或者逃走都会挂伤，灵石也会掉。",
    statusId: STATUS_SUPPRESSION,
    spellForRank: (rank) => rank >= 8
      ? { id: asSpell("earth-suppress-tier-5"), tier: 5 }
      : { id: asSpell("earth-suppress-tier-4"), tier: 4 },
    addNames: ["纹卫", "天隙"],
    addFactors: [0.7, 0.58],
    patterns: ["pressure", "seal", "swift"],
    extraSpiritDrain: () => 2,
    loss: {
      injuryTicks: 11,
      stoneLoss: 60,
      spiritLoss: 10,
      deviationTicks: 3,
      title: "神纹天隙把人压住了",
      mood: "念头还是乱的",
      sentence: "神纹天隙把念头压住了。这一场输了，人受了伤，气息乱了一阵，灵石也没保住。",
    },
    flee: {
      injuryTicks: 7,
      stoneLoss: 30,
      spiritLoss: 4,
      deviationTicks: 2,
      title: "从神纹天隙撤出",
      mood: "人出来了，念头还乱",
      sentence: "神纹天隙里撑不住，人撤了出来。伤还在，念头也乱，灵石撒在纹上。",
    },
    companionLoss: 8,
    companionFlee: 3,
  },
};

const STATS: readonly { hp: number; attack: number; defense: number }[] = [
  { hp: 1.12, attack: 1.12, defense: 1.02 },
  { hp: 1.18, attack: 1.16, defense: 1.03 },
  { hp: 1.26, attack: 1.22, defense: 1.04 },
  { hp: 1.42, attack: 1.32, defense: 1.06 },
  { hp: 1.55, attack: 1.4, defense: 1.08 },
  { hp: 1.68, attack: 1.48, defense: 1.1 },
  { hp: 1.88, attack: 1.58, defense: 1.12 },
  { hp: 2.05, attack: 1.66, defense: 1.14 },
  { hp: 2.2, attack: 1.74, defense: 1.16 },
];

function fightFor(grade: DungeonGrade, rank: number): { mystery: MysteryRealm; fight: BandFight } | null {
  const mystery = mysteryForRank(grade, rank);
  if (!mystery) return null;
  return { mystery, fight: BANDS[mystery.id] };
}

function statsForRank(rank: number): { hp: number; attack: number; defense: number } {
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  return STATS[step - 1] ?? STATS[0]!;
}

export function jiaFightWarning(rank: number): string {
  return fightFor("甲", rank)?.fight.warning ?? "";
}

export function jiaDirectEncounterScale(grade: DungeonGrade, rank: number): number {
  return fightFor(grade, rank)?.fight ? statsForRank(rank).attack : 1;
}

export function jiaGuardianSpellId(grade: DungeonGrade, rank: number): SpellLoadoutId | null {
  return fightFor(grade, rank)?.fight.spellForRank(rank).id ?? null;
}

export function stampJiaGuardianTemplate<T extends { equippedWeaponLoadoutId?: string; equippedSpellLoadoutId?: string }>(
  template: T,
  grade: DungeonGrade,
  rank: number,
): T {
  const spell = jiaGuardianSpellId(grade, rank);
  if (!spell) return template;
  return { ...template, equippedWeaponLoadoutId: undefined, equippedSpellLoadoutId: spell };
}

export function jiaGuardianThreat(grade: DungeonGrade, rank: number, elite = false): GuardianThreat | null {
  const found = fightFor(grade, rank);
  if (!found) return null;
  const spell = found.fight.spellForRank(rank);
  return {
    statusId: found.fight.statusId,
    tier: spell.tier,
    spellLoadoutId: spell.id,
    extraSpiritDrain: found.fight.extraSpiritDrain(rank),
    ...(elite && found.fight.selfStatusId ? { selfStatusId: found.fight.selfStatusId } : {}),
  };
}

export function jiaPackShape(grade: DungeonGrade, rank: number): JiaPackShape | null {
  const found = fightFor(grade, rank);
  const threat = jiaGuardianThreat(grade, rank, true);
  if (!found || !threat) return null;
  return {
    addNames: found.fight.addNames,
    addFactors: found.fight.addFactors,
    patterns: found.fight.patterns,
    stats: statsForRank(rank),
    threat,
  };
}

export function jiaBandFailCost(
  grade: DungeonGrade,
  rank: number,
  outcome: "loss" | "withdraw",
): JiaFailCost | null {
  const found = fightFor(grade, rank);
  if (!found) return null;
  const cost = outcome === "loss" ? found.fight.loss : found.fight.flee;
  return { ...cost };
}

export function jiaInjuryFloor(
  grade: DungeonGrade,
  rank: number,
  outcome: "loss" | "withdraw" | "win" | "draw",
): number {
  if (outcome === "win") return 0;
  // A timeout draw leaves both sides standing, so 甲级 uses the retreat wound length.
  const fail = outcome === "draw" ? "withdraw" : outcome;
  return jiaBandFailCost(grade, rank, fail)?.injuryTicks ?? 0;
}

export function jiaCompanionInjury(
  grade: DungeonGrade,
  rank: number,
  outcome: "loss" | "withdraw",
): number | null {
  const found = fightFor(grade, rank);
  if (!found) return null;
  return outcome === "loss" ? found.fight.companionLoss : found.fight.companionFlee;
}

export function dungeonAdvice(grade: DungeonGrade, rank: number): string {
  if (grade === "丙") return "丙级地宫仍是练手的地方。按自己的境界从低层往上打，守关还留得住人。";
  if (grade === "乙") return "乙级地宫仍是筑基的练手处。比丙级重一档，结伴更稳，还不到甲级那种会把人压伤的关。";
  const warning = jiaFightWarning(rank);
  return warning || "甲级守关比丙级和乙级重。先看这一层的提醒，再决定一个人进还是五人结队。";
}
