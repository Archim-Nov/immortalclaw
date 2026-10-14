import { breakthroughMethodNarrative, quietMethodStep } from "./breakthrough-methods.js";
import type { ItemId, RealmPathView, RealmStage } from "./model.js";
import { realmPhaseForLevel, realmStageForLevel } from "./realms.js";

/**
 * Post-金丹 ladder.
 *
 * 甲级 ranks 1–3 still drop the 金丹 herbs. 九转紫金髓 and the 元婴 herbs start at rank 4.
 * 化神 herbs start at rank 7. 炼气 and 筑基 pools do not change with rank.
 * A cultivator at 元婴 is pointed at 甲级 4–6. From 元婴后期 on, the hint stays on 7–9
 * instead of sending them back to rank 1.
 */

const QI_POOL = [
  "cloud-heart-grass", "moon-dew-flower", "clear-zhi-leaf",
  "spirit-brook-bamboo", "pure-heart-orchid", "mist-vine",
  "condensed-qi-dew", "azure-stone-marrow", "meridian-lotus-essence",
] as const satisfies readonly ItemId[];

const FOUNDATION_POOL = [
  "mystic-jade-stone", "jade-marrow-sand", "purple-palace-earth",
  "cold-moon-crystal", "still-cloud-wood", "tranquil-bamboo",
  "foundation-spirit-amber", "wind-control-crystal", "nine-turn-core-sand",
] as const satisfies readonly ItemId[];

const CORE_POOL = [
  "golden-spirit-flower", "purple-celestial-leaf", "star-fall-sand",
  "moon-glory-jade", "clear-mystic-wood", "chaos-moss",
  "flowing-aurora-core", "dragon-radiance-crystal",
] as const satisfies readonly ItemId[];

export const NASCENT_DROP_IDS = [
  "infant-fire-lotus",
  "nascent-jade",
  "soul-lamp-wick",
  "nurture-nascent-dew",
  "anchor-nascent-sand",
  "nine-turn-golden-marrow",
] as const satisfies readonly ItemId[];

export const SPIRIT_DROP_IDS = [
  "divine-thought-crystal",
  "heaven-soul-silk",
  "divine-pattern-stone",
  "shatter-nascent-lotus",
  "divine-embryo-dew",
  "divine-transformation-seal",
] as const satisfies readonly ItemId[];

const NASCENT_FLOOR = 4;
const SPIRIT_FLOOR = 7;

export function breakthroughDropPool(band: ItemId, rank = 1): readonly ItemId[] {
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  if (band === "cloud-heart-grass") return QI_POOL;
  if (band === "mystic-jade-stone") return FOUNDATION_POOL;
  if (band === "golden-spirit-flower") {
    const pool: ItemId[] = [...CORE_POOL];
    if (step >= NASCENT_FLOOR) pool.push(...NASCENT_DROP_IDS);
    if (step >= SPIRIT_FLOOR) pool.push(...SPIRIT_DROP_IDS);
    return pool;
  }
  return [band];
}

export function rankBandForRealmLevel(realmLevel: number): { minRank: number; maxRank: number } {
  const level = Math.max(1, Math.floor(realmLevel));
  if (level >= 12) return { minRank: 7, maxRank: 9 };
  if (level >= 10) return { minRank: 4, maxRank: 6 };
  const relativeLevel = ((level - 1) % 3) + 1;
  const minRank = ((relativeLevel - 1) * 3) + 1;
  return { minRank, maxRank: minRank + 2 };
}

export function vitalGainForBreakthrough(fromLevel: number): { qi: number; spirit: number; lifespan: number } {
  if (fromLevel >= 13) return { qi: 32, spirit: 28, lifespan: 24 };
  if (fromLevel === 12) return { qi: 64, spirit: 56, lifespan: 48 };
  if (fromLevel >= 10) return { qi: 24, spirit: 22, lifespan: 18 };
  if (fromLevel === 9) return { qi: 48, spirit: 40, lifespan: 36 };
  return { qi: 12, spirit: 12, lifespan: 12 };
}

export function isRiskyLateMajor(targetRealm: RealmStage, category: "minor" | "major"): boolean {
  return category === "major" && (targetRealm === "元婴" || targetRealm === "化神");
}

export function quietRealmStep(realmLevel: number): string | null {
  return quietMethodStep(realmLevel);
}

function earlyWhere(level: number): string {
  if (level <= 3) return "炼气的材料坊市买得到，丙级地宫和城镇差事也会掉。";
  if (level <= 6) return "筑基的材料坊市买得到，荒野和乙级地宫也会掉。";
  return "金丹前期和中期的材料坊市不卖，甲级地宫哪一层的探宝和守关都会掉。";
}

export function realmPathView(input: {
  realm: RealmStage;
  realmLevel: number;
  realmProgress: number;
  next: {
    targetRealm: RealmStage;
    targetLevel: number;
    category: "minor" | "major";
    successRate: number | null;
  } | null;
}): RealmPathView {
  const level = Math.max(1, Math.floor(input.realmLevel));
  const stage = input.realm || realmStageForLevel(level);
  const phase = realmPhaseForLevel(level);
  const next = input.next;
  const narrative = breakthroughMethodNarrative({
    realmLevel: level,
    successRate: next?.successRate ?? null,
    category: next?.category ?? null,
  });
  const base: RealmPathView = {
    stage,
    phase,
    level,
    nextStage: next?.targetRealm ?? null,
    nextLevel: next?.targetLevel ?? null,
    category: next?.category ?? null,
    where: "",
    risk: "",
    outcome: "",
    catalogTier: null,
    goals: [],
    method: narrative?.id ?? null,
    methodName: narrative?.name ?? null,
    sequence: narrative?.sequence ?? [],
  };
  if (!next) {
    return {
      ...base,
      where: "甲级地宫七层到九层仍是这一档。",
      risk: "没有下一道门槛。",
      outcome: "化神后期是目前这条梯子的顶。",
      catalogTier: "化神",
      method: null,
      methodName: null,
      sequence: ["化神后期暂时没有更高的境界。甲级七层到九层还能拿这一档的灵材，兵器和功法也停在化神。"],
      goals: ["化神后期暂时没有更高的境界。甲级七层到九层还能拿这一档的灵材，兵器和功法也停在化神。"],
    };
  }
  if (level <= 6) {
    const where = earlyWhere(level);
    const outcome = next.category === "major"
      ? `进入${next.targetRealm}。气血和灵力按原来的幅度涨。`
      : `仍在${next.targetRealm}里往前一层。`;
    return {
      ...base,
      where,
      risk: narrative?.risk ?? "",
      outcome,
      catalogTier: null,
      goals: [
        `修为 ${input.realmProgress}/100。`,
        where,
        ...(narrative?.sequence ?? []),
      ],
    };
  }
  if (level < 9) {
    const where = earlyWhere(level);
    return {
      ...base,
      where,
      risk: narrative?.risk ?? "",
      outcome: `仍在${next.targetRealm}里往前一层。`,
      catalogTier: null,
      goals: [
        `修为 ${input.realmProgress}/100。`,
        where,
        ...(narrative?.sequence ?? []),
        narrative?.risk ?? "",
      ],
    };
  }

  const late = lateCopy(level, next.successRate);
  return {
    ...base,
    where: late.where,
    risk: narrative?.risk ?? late.risk,
    outcome: late.outcome,
    catalogTier: late.catalogTier,
    goals: [
      `修为 ${input.realmProgress}/100。`,
      late.where,
      ...(narrative?.sequence ?? []),
      narrative?.risk ?? late.risk,
      late.outcome,
    ],
  };
}

function lateCopy(level: number, successRate: number | null): {
  where: string;
  risk: string;
  outcome: string;
  catalogTier: string;
} {
  if (level === 12) {
    return {
      where: "化神的灵材坊市不卖。甲级地宫七层到九层，探宝和守关会掉神念晶、天魂丝、神纹石、破婴神莲。",
      risk: `这是大境界，基础成功率大约 ${successRate ?? 30}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。`,
      outcome: "进入化神前期。气血和灵力会再涨一截，化神兵器和功法可以装备。本州的名声会动一动。宗门贡献到 220 可以换这一阶，贡献本身不扣。",
      catalogTier: "化神",
    };
  }
  if (level >= 13) {
    const special = level === 13 ? "神胎露" : "化神金章";
    return {
      where: `化神这一层的${special}，以及神念晶、天魂丝、神纹石，都在甲级地宫七层到九层。坊市不卖。`,
      risk: "这一阶是小突破，材料齐了就会成。",
      outcome: "仍在化神里往前一层。气血和灵力继续涨，化神兵器和功法保持能装备。",
      catalogTier: "化神",
    };
  }
  if (level >= 10) {
    const special = level === 10 ? "养婴露" : "固婴砂";
    return {
      where: `元婴这一层的${special}，以及婴火莲、元胎玉、魂灯芯，从甲级地宫四层起才有。坊市不卖。`,
      risk: "这一阶是小突破，材料齐了就会成。",
      outcome: "仍在元婴里往前一层。大圆满兵器和功法可以装备。宗门贡献到 140 能换这一阶，贡献本身不扣。元婴后期再去甲级七层准备化神。",
      catalogTier: "大圆满",
    };
  }
  return {
    where: "元婴的灵材坊市不卖。甲级地宫四层往上，探宝和守关会掉婴火莲、元胎玉、魂灯芯、九转紫金髓。七层也出，同时会出化神的东西。",
    risk: `这是大境界，基础成功率大约 ${successRate ?? 40}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。`,
    outcome: "进入元婴前期。气血和灵力会比前面的小突破涨得更多，大圆满兵器和功法可以装备。本州的名声会动一动。宗门贡献到 140 可以换这一阶，贡献本身不扣。",
    catalogTier: "大圆满",
  };
}
