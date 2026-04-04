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

const MAIN_ATTRIBUTE_ORDER: MainAttributeId[] = [
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
