import { aboveSpiritResourceLine } from "./above-spirit.js";
import type { DungeonGrade, ItemId } from "./model.js";

/**
 * 甲级里的三处秘境。
 *
 * 一到三层是丹霞内府，金丹就能进。
 * 四到六层是婴火莲池，金丹后期才进得去。
 * 七到九层是神纹天隙，元婴后期才进得去。
 * 丙级和乙级不在这张表里，进门规则不变。
 */

export interface MysteryRealm {
  id: "danxia" | "infant-pool" | "divine-rift";
  name: string;
  grade: "甲";
  minRank: number;
  maxRank: number;
  minLevel: number;
  band: "金丹" | "元婴" | "化神";
  tier: 3 | 4 | 5;
  cultivationItemId: ItemId;
  cultivationName: string;
  line: string;
  closedLine: string;
}

export const MYSTERY_REALMS: readonly MysteryRealm[] = [
  {
    id: "danxia",
    name: "丹霞内府",
    grade: "甲",
    minRank: 1,
    maxRank: 3,
    minLevel: 7,
    band: "金丹",
    tier: 3,
    cultivationItemId: "core-nourish-dew",
    cultivationName: "丹霞露",
    line: "丹霞内府是甲级一到三层。金丹就能进，探宝和守关会掉丹霞露，还有金丹的破境灵材。",
    closedLine: "丹霞内府是甲级一到三层。得到金丹才进得去。",
  },
  {
    id: "infant-pool",
    name: "婴火莲池",
    grade: "甲",
    minRank: 4,
    maxRank: 6,
    minLevel: 9,
    band: "元婴",
    tier: 4,
    cultivationItemId: "nascent-nourish-sand",
    cultivationName: "养魂砂",
    line: "婴火莲池是甲级四到六层。金丹后期就能进，这里出元婴的破境灵材和养魂砂，也出大圆满的锻材。",
    closedLine: "婴火莲池是甲级四到六层。得到金丹后期才进得去。金丹前期和中期先在一到三层的丹霞内府拿丹霞露。",
  },
  {
    id: "divine-rift",
    name: "神纹天隙",
    grade: "甲",
    minRank: 7,
    maxRank: 9,
    minLevel: 12,
    band: "化神",
    tier: 5,
    cultivationItemId: "spirit-nourish-dust",
    cultivationName: "神纹尘",
    line: "神纹天隙是甲级七到九层。元婴后期才进得去，这里出化神的破境灵材和神纹尘，也出化神的锻材。",
    closedLine: "神纹天隙是甲级七到九层。得到元婴后期才进得去。元婴的灵材在四到六层的婴火莲池。",
  },
];

const CULTIVATION_BONUS: Record<MysteryRealm["band"], number> = {
  金丹: 12,
  元婴: 16,
  化神: 20,
};

export function mysteryForRank(grade: DungeonGrade, rank: number): MysteryRealm | null {
  if (grade !== "甲") return null;
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  return MYSTERY_REALMS.find((realm) => step >= realm.minRank && step <= realm.maxRank) ?? null;
}

export function mysteryForTier(tier: number): MysteryRealm | null {
  return MYSTERY_REALMS.find((realm) => realm.tier === tier) ?? null;
}

export function mysteryEntry(
  grade: DungeonGrade,
  rank: number,
  realmLevel: number,
): { ok: true } | { ok: false; line: string } {
  const mystery = mysteryForRank(grade, rank);
  if (!mystery) return { ok: true };
  if (Math.floor(realmLevel) >= mystery.minLevel) return { ok: true };
  return { ok: false, line: mystery.closedLine };
}

export function cultivationDropForRank(grade: DungeonGrade, rank: number): ItemId | null {
  return mysteryForRank(grade, rank)?.cultivationItemId ?? null;
}

const LATER_AIDS = [
  { minLevel: 22, itemId: "mahayana-nourish-ash" as const, name: "乘风灰", bonus: 28 },
  { minLevel: 19, itemId: "unity-nourish-dew" as const, name: "合道露", bonus: 24 },
  { minLevel: 16, itemId: "void-nourish-mist" as const, name: "虚纹雾", bonus: 22 },
];

export function cultivationAidForLevel(realmLevel: number): { itemId: ItemId; name: string; bonus: number } | null {
  const level = Math.max(1, Math.floor(realmLevel));
  const later = LATER_AIDS.find((aid) => level >= aid.minLevel);
  if (later) return later;
  const band = level >= 13 ? "化神" : level >= 10 ? "元婴" : level >= 7 ? "金丹" : null;
  if (!band) return null;
  const mystery = MYSTERY_REALMS.find((realm) => realm.band === band);
  if (!mystery) return null;
  return {
    itemId: mystery.cultivationItemId,
    name: mystery.cultivationName,
    bonus: CULTIVATION_BONUS[band],
  };
}

export function resourceGoals(realmLevel: number): string[] {
  const level = Math.max(1, Math.floor(realmLevel));
  if (level < 7) return [];
  const above = aboveSpiritResourceLine(level);
  if (above) return [above];
  if (level >= 12) {
    return [
      "化神的破境灵材和闭关用的神纹尘，都在甲级七到九层的神纹天隙。得到元婴后期才进得去。手里有神纹尘，闭关会用上一份，修为涨得快一点。没有也能照常闭关。",
      "化神兵器和功法坊市不卖。神纹天隙会掉锻材，有时直接掉成器。带回洞府按配方锻，或到宗门驻地跑 band-errand:weapon、band-errand:manual。贡献到 220 能直接换，贡献不扣。破进化神时会留下一页功法残页。",
    ];
  }
  if (level >= 9) {
    return [
      "元婴的破境灵材和闭关用的养魂砂，都在甲级四到六层的婴火莲池。金丹后期就能进去。七层的神纹天隙要等元婴后期。手里有养魂砂，闭关会用上一份。没有也能照常闭关。",
      "大圆满兵器和功法坊市不卖。婴火莲池会掉锻材，有时直接掉成器。带回洞府按配方锻，或到宗门驻地跑 band-errand:weapon、band-errand:manual。贡献到 140 能直接换，贡献不扣。破进元婴时会留下一页功法残页。",
    ];
  }
  return [
    "金丹这一段闭关可以用丹霞露。露在甲级一到三层的丹霞内府，探宝和守关都会掉。手里有露，闭关会用上一份，修为涨得快一点。没有也能照常闭关。",
    "大成兵器和功法坊市还卖。丹霞内府也会掉这一阶的锻材，带回洞府按配方锻。四层的婴火莲池要金丹后期才开。",
  ];
}
