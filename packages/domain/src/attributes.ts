import type {
  CultivationRegistrationRecord,
  FiveElementId,
  RegistrationCultivationMotiveId,
} from "./model.js";
import {
  behaviorAspectElements,
  normalizeCultivationRegistrationRecord,
  temperamentPrimaryElement,
  temperamentSecondaryElement,
} from "./registration-taxonomy.js";

export type MainAttributeId = "gengu" | "tipu" | "lingyuan" | "shenshi" | "wuxing" | "daoxin" | "shenfa" | "bingpo";

export type DetailedAttributeId =
  | "qixue_shangxian" | "lingli_shangxian" | "lingli_huifu"
  | "waigong_shanghai_beilv" | "shufa_shanghai_beilv"
  | "mingzhong" | "shanbi" | "sudu"
  | "renxing" | "kongzhi_qiangdu" | "kongzhi_kangxing" | "tupo_wending"
  | "huixin" | "baoshang" | "huxin";

export const MAIN_ATTRIBUTE_ORDER: MainAttributeId[] = [
  "gengu",
  "tipu",
  "lingyuan",
  "shenshi",
  "wuxing",
  "daoxin",
  "shenfa",
  "bingpo",
];

const DEFAULT_MAIN_ATTRIBUTES: Record<MainAttributeId, number> = {
  gengu: 50,
  tipu: 50,
  lingyuan: 50,
  shenshi: 50,
  wuxing: 50,
  daoxin: 50,
  shenfa: 50,
  bingpo: 50,
};

const ELEMENT_ATTRIBUTE_DELTAS: Record<FiveElementId, Record<MainAttributeId, number>> = {
  metal: { gengu: -1, tipu: -2, lingyuan: -1, shenshi: 2, wuxing: -1, daoxin: 1, shenfa: -1, bingpo: 3 },
  wood: { gengu: 2, tipu: -1, lingyuan: 1, shenshi: -1, wuxing: 3, daoxin: -1, shenfa: -1, bingpo: -2 },
  water: { gengu: -1, tipu: -1, lingyuan: -1, shenshi: 2, wuxing: -1, daoxin: 3, shenfa: 1, bingpo: -2 },
  fire: { gengu: -1, tipu: -1, lingyuan: 2, shenshi: -1, wuxing: -1, daoxin: -2, shenfa: 2, bingpo: 2 },
  earth: { gengu: 2, tipu: 2, lingyuan: -1, shenshi: -1, wuxing: -1, daoxin: 2, shenfa: -2, bingpo: -1 },
};

const MOTIVE_ATTRIBUTE_DELTAS: Record<RegistrationCultivationMotiveId, Record<MainAttributeId, number>> = {
  "seek-longevity": { gengu: 2, tipu: 1, lingyuan: -1, shenshi: -1, wuxing: -1, daoxin: 2, shenfa: -1, bingpo: -1 },
  "prove-the-great-dao": { gengu: -1, tipu: -1, lingyuan: 1, shenshi: -1, wuxing: 2, daoxin: 2, shenfa: -1, bingpo: -1 },
  "seek-truth": { gengu: -1, tipu: -1, lingyuan: -1, shenshi: 2, wuxing: 2, daoxin: 1, shenfa: -1, bingpo: -1 },
  "protect-the-beloved": { gengu: 1, tipu: 2, lingyuan: -1, shenshi: -1, wuxing: -1, daoxin: 2, shenfa: -1, bingpo: -1 },
  "serve-the-world": { gengu: 1, tipu: -2, lingyuan: 1, shenshi: -1, wuxing: 1, daoxin: 2, shenfa: -1, bingpo: -1 },
  "avenge-old-grudges": { gengu: -1, tipu: -1, lingyuan: -1, shenshi: -1, wuxing: -1, daoxin: 1, shenfa: 2, bingpo: 2 },
  "compete-for-supremacy": { gengu: -1, tipu: -1, lingyuan: 1, shenshi: -1, wuxing: -1, daoxin: -1, shenfa: 2, bingpo: 2 },
  "honor-the-clan": { gengu: 1, tipu: 1, lingyuan: -1, shenshi: -1, wuxing: -2, daoxin: 2, shenfa: -1, bingpo: 1 },
  "defy-fate": { gengu: -1, tipu: -1, lingyuan: 1, shenshi: -1, wuxing: -1, daoxin: 2, shenfa: 2, bingpo: -1 },
  "seek-freedom": { gengu: -1, tipu: -1, lingyuan: -1, shenshi: 1, wuxing: 1, daoxin: 1, shenfa: 2, bingpo: -2 },
};

const CORE_PRIMARY_WEIGHT = 1.2;
const CORE_SECONDARY_WEIGHT = 0.6;
const SECONDARY_PRIMARY_WEIGHT = 0.6;
const SECONDARY_SECONDARY_WEIGHT = 0.3;
const BEHAVIOR_ELEMENT_WEIGHT = 0.5;
const MOTIVE_WEIGHT = 0.8;

const CONFIDENCE_SCALE = {
  low: 0.7,
  medium: 0.85,
  high: 1,
} as const;

export function deriveMainAttributes(
  record: CultivationRegistrationRecord | null,
): Record<MainAttributeId, number> {
  if (!record) {
    return { ...DEFAULT_MAIN_ATTRIBUTES };
  }

  const normalized = normalizeCultivationRegistrationRecord(record);
  const deltas = emptyMainAttributes();
  const { result } = normalized;

  addElementDelta(deltas, temperamentPrimaryElement(result.core_temperament_id!), CORE_PRIMARY_WEIGHT);
  addElementDelta(deltas, temperamentSecondaryElement(result.core_temperament_id!), CORE_SECONDARY_WEIGHT);
  addElementDelta(deltas, temperamentPrimaryElement(result.secondary_temperament_id!), SECONDARY_PRIMARY_WEIGHT);
  addElementDelta(deltas, temperamentSecondaryElement(result.secondary_temperament_id!), SECONDARY_SECONDARY_WEIGHT);

  for (const elementId of behaviorAspectElements(result.behavior_aspect_id!)) {
    addElementDelta(deltas, elementId, BEHAVIOR_ELEMENT_WEIGHT);
  }

  addMainAttributeDelta(deltas, MOTIVE_ATTRIBUTE_DELTAS[result.cultivation_motive_id!], MOTIVE_WEIGHT);

  const roundedDeltas = roundBalancedDeltas(deltas, CONFIDENCE_SCALE[result.confidence.overall]);
  return rebalanceMainAttributes(
    MAIN_ATTRIBUTE_ORDER.reduce<Record<MainAttributeId, number>>((accumulator, attributeId) => {
      accumulator[attributeId] = DEFAULT_MAIN_ATTRIBUTES[attributeId] + roundedDeltas[attributeId];
      return accumulator;
    }, emptyMainAttributes()),
  );
}

export function deriveDetailedAttributes(
  mainAttributes: Record<MainAttributeId, number>,
): Record<DetailedAttributeId, number> {
  return {
    qixue_shangxian: 200 + 8 * mainAttributes.tipu + 2 * mainAttributes.gengu + 2 * mainAttributes.daoxin,
    lingli_shangxian: 120 + 8 * mainAttributes.lingyuan + 2 * mainAttributes.gengu + 2 * mainAttributes.shenshi,
    lingli_huifu: roundToTwo(2 + 0.10 * mainAttributes.gengu + 0.08 * mainAttributes.lingyuan + 0.05 * mainAttributes.daoxin),
    waigong_shanghai_beilv: roundToTwo(
      100 + 0.70 * mainAttributes.bingpo + 0.20 * mainAttributes.tipu + 0.10 * mainAttributes.shenfa,
    ),
    shufa_shanghai_beilv: roundToTwo(
      100 + 0.65 * mainAttributes.lingyuan + 0.20 * mainAttributes.shenshi + 0.15 * mainAttributes.wuxing,
    ),
    mingzhong: roundToTwo(
      75 + 0.12 * mainAttributes.shenshi + 0.08 * mainAttributes.bingpo + 0.05 * mainAttributes.shenfa,
    ),
    shanbi: roundToTwo(5 + 0.15 * mainAttributes.shenfa + 0.05 * mainAttributes.shenshi),
    sudu: roundToTwo(100 + 0.60 * mainAttributes.shenfa + 0.20 * mainAttributes.shenshi),
    renxing: roundToTwo(
      0.40 * mainAttributes.tipu + 0.35 * mainAttributes.daoxin + 0.15 * mainAttributes.bingpo,
    ),
    kongzhi_qiangdu: roundToTwo(
      0.55 * mainAttributes.shenshi + 0.25 * mainAttributes.wuxing + 0.20 * mainAttributes.lingyuan,
    ),
    kongzhi_kangxing: roundToTwo(
      0.45 * mainAttributes.daoxin + 0.30 * mainAttributes.tipu + 0.15 * mainAttributes.shenshi,
    ),
    tupo_wending: roundToTwo(
      40 + 0.35 * mainAttributes.daoxin + 0.25 * mainAttributes.gengu + 0.20 * mainAttributes.wuxing,
    ),
    huixin: roundToTwo(
      0.06 * mainAttributes.shenshi
      + 0.05 * mainAttributes.shenfa
      + 0.02 * mainAttributes.wuxing
      + 0.02 * mainAttributes.bingpo,
    ),
    baoshang: roundToTwo(
      150 + 0.30 * mainAttributes.bingpo + 0.15 * mainAttributes.lingyuan + 0.10 * mainAttributes.wuxing,
    ),
    huxin: roundToTwo(0.06 * mainAttributes.daoxin + 0.04 * mainAttributes.tipu + 0.02 * mainAttributes.gengu),
  };
}

export function weaponAttack(mainAttributes: Record<MainAttributeId, number>): number {
  return Math.floor(20 + 0.60 * mainAttributes.tipu);
}

export function spellAttack(mainAttributes: Record<MainAttributeId, number>): number {
  return Math.floor(20 + 0.60 * mainAttributes.lingyuan);
}

export function physicalDefense(mainAttributes: Record<MainAttributeId, number>): number {
  return Math.floor(8 + 0.45 * mainAttributes.gengu);
}

export function spellDefense(mainAttributes: Record<MainAttributeId, number>): number {
  return Math.floor(8 + 0.45 * mainAttributes.shenshi);
}


const DEFAULT_FIVE_ELEMENT_SCORES: Record<FiveElementId, number> = { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 };

/**
 * Extract five-element scores from a cultivator's registration record.
 * Returns default 50-per-element when no record exists.
 */
export function extractFiveElementScores(record: CultivationRegistrationRecord | null): Record<FiveElementId, number> {
  return record?.result?.five_element_scores ?? { ...DEFAULT_FIVE_ELEMENT_SCORES };
}

function emptyMainAttributes(): Record<MainAttributeId, number> {
  return {
    gengu: 0,
    tipu: 0,
    lingyuan: 0,
    shenshi: 0,
    wuxing: 0,
    daoxin: 0,
    shenfa: 0,
    bingpo: 0,
  };
}

function addElementDelta(
  accumulator: Record<MainAttributeId, number>,
  elementId: FiveElementId,
  weight: number,
) {
  addMainAttributeDelta(accumulator, ELEMENT_ATTRIBUTE_DELTAS[elementId], weight);
}

function addMainAttributeDelta(
  accumulator: Record<MainAttributeId, number>,
  delta: Record<MainAttributeId, number>,
  weight: number,
) {
  for (const attributeId of MAIN_ATTRIBUTE_ORDER) {
    accumulator[attributeId] += delta[attributeId] * weight;
  }
}

function roundBalancedDeltas(
  deltas: Record<MainAttributeId, number>,
  scale: number,
): Record<MainAttributeId, number> {
  const scaledEntries = MAIN_ATTRIBUTE_ORDER.map((attributeId) => {
    const exact = deltas[attributeId] * scale;
    const roundedTowardZero = exact >= 0 ? Math.floor(exact) : Math.ceil(exact);
    return {
      attributeId,
      exact,
      roundedTowardZero,
      remainder: exact - roundedTowardZero,
    };
  });

  const result = emptyMainAttributes();
  for (const entry of scaledEntries) {
    result[entry.attributeId] = entry.roundedTowardZero;
  }

  let remainderBudget = -MAIN_ATTRIBUTE_ORDER.reduce((sum, attributeId) => sum + result[attributeId], 0);
  if (remainderBudget > 0) {
    const candidates = [...scaledEntries]
      .sort((left, right) => right.remainder - left.remainder || MAIN_ATTRIBUTE_ORDER.indexOf(left.attributeId) - MAIN_ATTRIBUTE_ORDER.indexOf(right.attributeId));
    for (let index = 0; index < remainderBudget; index += 1) {
      result[candidates[index % candidates.length]!.attributeId] += 1;
    }
  }
  if (remainderBudget < 0) {
    const candidates = [...scaledEntries]
      .sort((left, right) => left.remainder - right.remainder || MAIN_ATTRIBUTE_ORDER.indexOf(left.attributeId) - MAIN_ATTRIBUTE_ORDER.indexOf(right.attributeId));
    for (let index = 0; index < Math.abs(remainderBudget); index += 1) {
      result[candidates[index % candidates.length]!.attributeId] -= 1;
    }
  }

  return result;
}

function rebalanceMainAttributes(
  attributes: Record<MainAttributeId, number>,
): Record<MainAttributeId, number> {
  const rebalanced = { ...attributes };

  let adjusted = true;
  while (adjusted) {
    adjusted = false;
    for (const attributeId of MAIN_ATTRIBUTE_ORDER) {
      if (rebalanced[attributeId] > 70) {
        const overflow = rebalanced[attributeId] - 70;
        rebalanced[attributeId] = 70;
        distributeOverflow(rebalanced, overflow, attributeId, 1);
        adjusted = true;
      } else if (rebalanced[attributeId] < 30) {
        const deficit = 30 - rebalanced[attributeId];
        rebalanced[attributeId] = 30;
        distributeOverflow(rebalanced, deficit, attributeId, -1);
        adjusted = true;
      }
    }
  }

  return rebalanced;
}

function distributeOverflow(
  attributes: Record<MainAttributeId, number>,
  amount: number,
  sourceAttributeId: MainAttributeId,
  direction: 1 | -1,
) {
  let remaining = amount;
  const candidates = MAIN_ATTRIBUTE_ORDER.filter((attributeId) => attributeId !== sourceAttributeId);
  const orderedCandidates = direction === 1
    ? candidates.sort((left, right) => attributes[left] - attributes[right])
    : candidates.sort((left, right) => attributes[right] - attributes[left]);

  while (remaining > 0) {
    for (const attributeId of orderedCandidates) {
      const nextValue = attributes[attributeId] + direction;
      if (nextValue < 30 || nextValue > 70) {
        continue;
      }
      attributes[attributeId] = nextValue;
      remaining -= 1;
      if (remaining === 0) {
        break;
      }
    }
  }
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

// ---- Breakthrough Growth System ----

/** Wuxing generation cycle: 木→火→土→金→水→木 */
const WUXING_GENERATION_CYCLE: Record<FiveElementId, FiveElementId> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/** Inverse: given element, which element generates it ("生我") */
export const WUXING_GENERATES_ME: Record<FiveElementId, FiveElementId> = {
  fire: "wood",
  earth: "fire",
  metal: "earth",
  water: "metal",
  wood: "water",
};

/**
 * Core attributes per element, derived from positive weights in ELEMENT_ATTRIBUTE_DELTAS.
 * Each element has exactly 3 core attributes with their affinity weights.
 */
export const ELEMENT_CORE_ATTRIBUTES: Record<FiveElementId, Array<{ attr: MainAttributeId; weight: number }>> = {
  metal: [{ attr: "bingpo", weight: 3 }, { attr: "shenshi", weight: 2 }, { attr: "daoxin", weight: 1 }],
  wood: [{ attr: "wuxing", weight: 3 }, { attr: "gengu", weight: 2 }, { attr: "lingyuan", weight: 1 }],
  water: [{ attr: "daoxin", weight: 3 }, { attr: "shenshi", weight: 2 }, { attr: "shenfa", weight: 1 }],
  fire: [{ attr: "lingyuan", weight: 2 }, { attr: "shenfa", weight: 2 }, { attr: "bingpo", weight: 2 }],
  earth: [{ attr: "gengu", weight: 2 }, { attr: "tipu", weight: 2 }, { attr: "daoxin", weight: 2 }],
};

export type BreakthroughGrowthEntry = {
  readonly slot: number;
  readonly category: "minor" | "major";
  readonly mainAttributeTotal: number;
  readonly fiveElementTotal: number;
  readonly percentageBonus: number;
};

export const BREAKTHROUGH_GROWTH_TABLE: readonly BreakthroughGrowthEntry[] = [
  { slot: 1, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 2, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 3, category: "major", mainAttributeTotal: 100, fiveElementTotal: 10, percentageBonus: 5 },
  { slot: 4, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 5, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 6, category: "major", mainAttributeTotal: 100, fiveElementTotal: 10, percentageBonus: 5 },
  { slot: 7, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 8, category: "minor", mainAttributeTotal: 50, fiveElementTotal: 5, percentageBonus: 2 },
  { slot: 9, category: "major", mainAttributeTotal: 160, fiveElementTotal: 16, percentageBonus: 8 },
  { slot: 10, category: "minor", mainAttributeTotal: 80, fiveElementTotal: 8, percentageBonus: 3 },
  { slot: 11, category: "minor", mainAttributeTotal: 80, fiveElementTotal: 8, percentageBonus: 3 },
  { slot: 12, category: "major", mainAttributeTotal: 220, fiveElementTotal: 22, percentageBonus: 10 },
  { slot: 13, category: "minor", mainAttributeTotal: 110, fiveElementTotal: 11, percentageBonus: 4 },
  { slot: 14, category: "minor", mainAttributeTotal: 110, fiveElementTotal: 11, percentageBonus: 4 },
  { slot: 15, category: "major", mainAttributeTotal: 280, fiveElementTotal: 28, percentageBonus: 12 },
  { slot: 16, category: "minor", mainAttributeTotal: 140, fiveElementTotal: 14, percentageBonus: 5 },
  { slot: 17, category: "minor", mainAttributeTotal: 140, fiveElementTotal: 14, percentageBonus: 5 },
  { slot: 18, category: "major", mainAttributeTotal: 340, fiveElementTotal: 34, percentageBonus: 14 },
  { slot: 19, category: "minor", mainAttributeTotal: 170, fiveElementTotal: 17, percentageBonus: 6 },
  { slot: 20, category: "minor", mainAttributeTotal: 170, fiveElementTotal: 17, percentageBonus: 6 },
  { slot: 21, category: "major", mainAttributeTotal: 420, fiveElementTotal: 42, percentageBonus: 16 },
  { slot: 22, category: "minor", mainAttributeTotal: 200, fiveElementTotal: 20, percentageBonus: 7 },
  { slot: 23, category: "minor", mainAttributeTotal: 200, fiveElementTotal: 20, percentageBonus: 7 },
];

/**
 * Distribute main-attribute growth budget according to spec Section 2.
 * 70% to core attributes (weighted), 30% equally among non-core.
 * For dual-root: core budget split 50/50 between two anchor elements.
 * Remainder goes to highest-weight core attribute.
 */
export function distributeMainAttributeGrowth(
  totalBudget: number,
  spiritRootKind: "single-root" | "dual-root",
  anchorElements: readonly FiveElementId[],
): Record<MainAttributeId, number> {
  const result = emptyMainAttributes();
  if (totalBudget <= 0 || anchorElements.length === 0) return result;

  const coreBudget = Math.round(totalBudget * 0.7);
  const nonCoreBudget = totalBudget - coreBudget;

  // Collect core attributes from anchor elements
  const coreContributions = new Map<MainAttributeId, number>();
  const elementCount = spiritRootKind === "dual-root" && anchorElements.length >= 2 ? 2 : 1;
  const perElementCoreBudget = elementCount === 2 ? Math.floor(coreBudget / 2) : coreBudget;

  for (let i = 0; i < elementCount; i++) {
    const element = anchorElements[i]!;
    const cores = ELEMENT_CORE_ATTRIBUTES[element];
    const totalWeight = cores.reduce((s, c) => s + c.weight, 0);
    const budget = i === 0 && elementCount === 2
      ? coreBudget - Math.floor(coreBudget / 2) // first element gets remainder
      : perElementCoreBudget;

    let allocated = 0;
    const shares: Array<{ attr: MainAttributeId; amount: number; weight: number }> = [];
    for (const core of cores) {
      const share = Math.floor(budget * core.weight / totalWeight);
      shares.push({ attr: core.attr, amount: share, weight: core.weight });
      allocated += share;
    }
    // Distribute remainder to highest weight
    let leftover = budget - allocated;
    const sortedShares = [...shares].sort((a, b) => b.weight - a.weight);
    for (const s of sortedShares) {
      if (leftover <= 0) break;
      s.amount += 1;
      leftover -= 1;
    }
    for (const s of shares) {
      coreContributions.set(s.attr, (coreContributions.get(s.attr) ?? 0) + s.amount);
    }
  }

  // Apply core contributions to result
  const coreAttributeSet = new Set(coreContributions.keys());
  for (const [attr, amount] of coreContributions) {
    result[attr] += amount;
  }

  // Non-core: attributes NOT in core set, distribute equally
  const nonCoreAttributes = MAIN_ATTRIBUTE_ORDER.filter(a => !coreAttributeSet.has(a));
  if (nonCoreAttributes.length > 0) {
    const perNonCore = Math.floor(nonCoreBudget / nonCoreAttributes.length);
    let nonCoreLeftover = nonCoreBudget - perNonCore * nonCoreAttributes.length;
    for (const attr of nonCoreAttributes) {
      result[attr] += perNonCore;
    }
    // Remainder to first non-core attributes
    for (const attr of nonCoreAttributes) {
      if (nonCoreLeftover <= 0) break;
      result[attr] += 1;
      nonCoreLeftover -= 1;
    }
  }

  // Final check: total must equal totalBudget
  const actualTotal = MAIN_ATTRIBUTE_ORDER.reduce((s, a) => s + result[a], 0);
  const diff = totalBudget - actualTotal;
  if (diff !== 0) {
    // Adjust highest-weight core attribute
    const topCore = [...coreContributions.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCore) {
      result[topCore[0]] += diff;
    }
  }

  return result;
}

/**
 * Distribute five-element growth budget according to spec Section 3.
 * Single-root: 80% main element, 20% "生我" element.
 * Dual-root: 50/50 split (odd remainder to first anchor).
 */
export function distributeFiveElementGrowth(
  totalBudget: number,
  spiritRootKind: "single-root" | "dual-root",
  anchorElements: readonly FiveElementId[],
): Record<FiveElementId, number> {
  const result: Record<FiveElementId, number> = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  if (totalBudget <= 0 || anchorElements.length === 0) return result;

  if (spiritRootKind === "single-root" || anchorElements.length < 2) {
    const mainElement = anchorElements[0]!;
    const mainShare = Math.round(totalBudget * 0.8);
    const auxShare = totalBudget - mainShare;
    result[mainElement] += mainShare;
    result[WUXING_GENERATES_ME[mainElement]] += auxShare;
  } else {
    // Dual-root: split between two anchor elements
    const firstShare = Math.ceil(totalBudget / 2);
    const secondShare = totalBudget - firstShare;
    result[anchorElements[0]!] += firstShare;
    result[anchorElements[1]!] += secondShare;
  }

  return result;
}

/**
 * Compute effective main attributes: floor((baseline + growth) × (1 + percentageBonus / 100))
 */
export function computeEffectiveMainAttributes(
  baseline: Record<MainAttributeId, number>,
  growth: Record<MainAttributeId, number>,
  percentageBonus: number,
): Record<MainAttributeId, number> {
  const result = emptyMainAttributes();
  for (const attr of MAIN_ATTRIBUTE_ORDER) {
    const flat = baseline[attr] + (growth[attr] ?? 0);
    result[attr] = Math.floor(flat * (1 + percentageBonus / 100));
  }
  return result;
}

/**
 * Compute effective five-element scores: baseline + growth
 */
export function computeEffectiveFiveElementScores(
  baseline: Record<FiveElementId, number>,
  growth: Record<FiveElementId, number>,
): Record<FiveElementId, number> {
  return {
    metal: baseline.metal + (growth.metal ?? 0),
    wood: baseline.wood + (growth.wood ?? 0),
    water: baseline.water + (growth.water ?? 0),
    fire: baseline.fire + (growth.fire ?? 0),
    earth: baseline.earth + (growth.earth ?? 0),
  };
}

/** Zero-value main attribute growth map for initialization */
export function createEmptyMainAttributeGrowth(): Record<MainAttributeId, number> {
  return emptyMainAttributes();
}

/** Zero-value five-element growth map for initialization */
export function createEmptyFiveElementGrowth(): Record<FiveElementId, number> {
  return { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
}
