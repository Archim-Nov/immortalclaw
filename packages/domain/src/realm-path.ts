import { aboveSpiritOutcome, aboveSpiritWhere } from "./above-spirit.js";
import { breakthroughMethodNarrative, quietMethodStep } from "./breakthrough-methods.js";
import { jiaFightWarning } from "./high-realm-dungeon.js";
import { resourceGoals } from "./high-realm.js";
import { lightRealmClause } from "./yi-mystery.js";
import type { ItemId, RealmPathView, RealmStage } from "./model.js";
import { realmPhaseForLevel, realmStageForLevel } from "./realms.js";

/**
 * Post-金丹 ladder.
 *
 * 甲级 ranks 1–3 still drop the 金丹 herbs. 九转紫金髓 and the 元婴 herbs start at rank 4.
 * 化神 herbs start at rank 7. 炼气 and 筑基 pools do not change with rank.
 * A cultivator at 金丹后期 or 元婴前中期 is pointed at 甲级 4–6, the 婴火莲池.
 * From 元婴后期 on, the hint stays on 7–9, the 神纹天隙.
 * 金丹前期 and 中期 stay on 1–3, the 丹霞内府.
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
  if (level >= 9) return { minRank: 4, maxRank: 6 };
  if (level >= 7) return { minRank: 1, maxRank: 3 };
  const relativeLevel = ((level - 1) % 3) + 1;
  const minRank = ((relativeLevel - 1) * 3) + 1;
  return { minRank, maxRank: minRank + 2 };
}

export function vitalGainForBreakthrough(fromLevel: number): { qi: number; spirit: number; lifespan: number } {
  if (fromLevel >= 22) return { qi: 48, spirit: 42, lifespan: 36 };
  if (fromLevel === 21) return { qi: 96, spirit: 84, lifespan: 72 };
  if (fromLevel >= 19) return { qi: 44, spirit: 38, lifespan: 32 };
  if (fromLevel === 18) return { qi: 88, spirit: 76, lifespan: 64 };
  if (fromLevel >= 16) return { qi: 40, spirit: 34, lifespan: 28 };
  if (fromLevel === 15) return { qi: 80, spirit: 68, lifespan: 56 };
  if (fromLevel >= 13) return { qi: 32, spirit: 28, lifespan: 24 };
  if (fromLevel === 12) return { qi: 64, spirit: 56, lifespan: 48 };
  if (fromLevel >= 10) return { qi: 24, spirit: 22, lifespan: 18 };
  if (fromLevel === 9) return { qi: 48, spirit: 40, lifespan: 36 };
  return { qi: 12, spirit: 12, lifespan: 12 };
}

export function isRiskyLateMajor(targetRealm: RealmStage, category: "minor" | "major"): boolean {
  return category === "major" && (
    targetRealm === "元婴"
    || targetRealm === "化神"
    || targetRealm === "炼虚"
    || targetRealm === "合体"
    || targetRealm === "大乘"
  );
}

export function quietRealmStep(realmLevel: number): string | null {
  const method = quietMethodStep(realmLevel);
  if (!method) return null;
  const level = Math.max(1, Math.floor(realmLevel));
  const extra = resourceGoals(level)[0];
  const warning = level >= 15 ? "" : level >= 12 ? jiaFightWarning(7) : jiaFightWarning(4);
  return `${method}${extra ?? ""}${warning}`;
}

function earlyWhere(level: number): string {
  if (level <= 2) return "炼气的材料坊市买得到，丙级地宫和城镇差事也会掉。";
  if (level === 3) return `炼气后期的材料坊市买得到，丙级七到九层的旧驿石廊和城镇差事也会掉。${lightRealmClause("丙", 7)}`;
  if (level <= 6) {
    const rank = level === 4 ? 1 : level === 5 ? 4 : 7;
    const bought = `筑基的材料坊市买得到，荒野和乙级地宫也会掉。${lightRealmClause("乙", rank)}`;
    if (level >= 5) {
      return `${bought}这一步仍是小突破，材料可以在坊市买。再往上结金丹，金丹的材料坊市不卖，要去甲级一到三层的丹霞内府。`;
    }
    return bought;
  }
  return `金丹前期和中期的材料坊市不卖，甲级一到三层的丹霞内府，探宝和守关都会掉。${jiaFightWarning(1)}四层的婴火莲池要金丹后期才开。`;
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
  const resources = resourceGoals(level);
  if (!next) {
    const mahayana = level >= 22;
    const line = mahayana
      ? "大乘后期暂时没有更高的境界。凉州和雷州的灵脉仍会分出乘风灰，兵器和功法也停在化神。"
      : "化神后期暂时没有更高的境界。神纹天隙还能拿这一档的灵材，兵器和功法也停在化神。";
    return {
      ...base,
      where: mahayana ? "凉州和雷州的灵脉仍会分出乘风灰。" : "甲级地宫七层到九层的神纹天隙仍是这一档。",
      risk: "没有下一道门槛。",
      outcome: mahayana ? "大乘后期是目前这条梯子的顶。" : "化神后期是目前这条梯子的顶。",
      catalogTier: "化神",
      method: null,
      methodName: null,
      sequence: [line],
      goals: [line, ...resources],
      resources,
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
        ...resources,
      ],
      resources,
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
      ...resources,
    ],
    resources,
  };
}

function lateCopy(level: number, successRate: number | null): {
  where: string;
  risk: string;
  outcome: string;
  catalogTier: string;
} {
  if (level >= 15) {
    return {
      where: aboveSpiritWhere(level),
      risk: "",
      outcome: aboveSpiritOutcome(level),
      catalogTier: "化神",
    };
  }
  if (level === 12) {
    return {
      where: `化神的灵材坊市不卖。甲级七到九层的神纹天隙，探宝和守关会掉神念晶、天魂丝、神纹石、破婴神莲，还有闭关用的神纹尘。${jiaFightWarning(7)}`,
      risk: `这是大境界，基础成功率大约 ${successRate ?? 30}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。`,
      outcome: "进入化神前期。气血和灵力会再涨一截，化神兵器和功法可以装备。本州的名声会动一动。宗门贡献到 220 可以换这一阶，贡献本身不扣。",
      catalogTier: "化神",
    };
  }
  if (level >= 13) {
    const special = level === 13 ? "神胎露" : "化神金章";
    return {
      where: `化神这一层的${special}，以及神念晶、天魂丝、神纹石和神纹尘，都在甲级七到九层的神纹天隙。坊市不卖。${jiaFightWarning(7)}`,
      risk: "这一阶是小突破，材料齐了就会成。",
      outcome: "仍在化神里往前一层。气血和灵力继续涨，化神兵器和功法保持能装备。",
      catalogTier: "化神",
    };
  }
  if (level >= 10) {
    const special = level === 10 ? "养婴露" : "固婴砂";
    return {
      where: `元婴这一层的${special}，以及婴火莲、元胎玉、魂灯芯和养魂砂，都在甲级四到六层的婴火莲池。坊市不卖。${jiaFightWarning(4)}`,
      risk: "这一阶是小突破，材料齐了就会成。",
      outcome: "仍在元婴里往前一层。大圆满兵器和功法可以装备。宗门贡献到 140 能换这一阶，贡献本身不扣。元婴后期再去甲级七层准备化神。",
      catalogTier: "大圆满",
    };
  }
  return {
    where: `元婴的灵材坊市不卖。甲级四到六层的婴火莲池，探宝和守关会掉婴火莲、元胎玉、魂灯芯、九转紫金髓，还有闭关用的养魂砂。七层的神纹天隙要元婴后期才开。${jiaFightWarning(4)}`,
    risk: `这是大境界，基础成功率大约 ${successRate ?? 40}。失败会耗掉材料，进度退到六成，并留下伤和一段走火。`,
    outcome: "进入元婴前期。气血和灵力会比前面的小突破涨得更多，大圆满兵器和功法可以装备。本州的名声会动一动。宗门贡献到 140 可以换这一阶，贡献本身不扣。",
    catalogTier: "大圆满",
  };
}
