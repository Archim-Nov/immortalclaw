import type { CultivationRegistrationRecord, FiveElementId } from "./model.js";

export type MainAttributeId = "gengu" | "tipu" | "lingyuan" | "shenshi" | "wuxing" | "daoxin" | "shenfa" | "bingpo";

export type DetailedAttributeId =
  | "qixue_shangxian" | "lingli_shangxian" | "lingli_huifu"
  | "waigong_shanghai_beilv" | "shufa_shanghai_beilv"
  | "mingzhong" | "shanbi" | "sudu"
  | "renxing" | "kongzhi_qiangdu" | "kongzhi_kangxing" | "tupo_wending"
  | "huixin" | "baoshang" | "huxin";

/**
 * Temporary stub — returns all 8 main attributes at default 50.
 * Replace with real attribute model when main attributes are implemented.
 */
export function stubMainAttributes(): Record<MainAttributeId, number> {
  return { gengu: 50, tipu: 50, lingyuan: 50, shenshi: 50, wuxing: 50, daoxin: 50, shenfa: 50, bingpo: 50 };
}

/**
 * Temporary stub — returns all 15 detailed attributes at round placeholders.
 * The design spec (oc-cultivation-foundation/spec.md §6.2) defines derivation formulas
 * from main attributes. Replace this with formula computation when main attributes land.
 */
export function stubDetailedAttributes(): Record<DetailedAttributeId, number> {
  return {
    qixue_shangxian: 600,
    lingli_shangxian: 420,
    lingli_huifu: 10,
    waigong_shanghai_beilv: 150,
    shufa_shanghai_beilv: 150,
    mingzhong: 85,
    shanbi: 10,
    sudu: 130,
    renxing: 45,
    kongzhi_qiangdu: 50,
    kongzhi_kangxing: 45,
    tupo_wending: 80,
    huixin: 8,
    baoshang: 175,
    huxin: 6,
  };
}

const DEFAULT_FIVE_ELEMENT_SCORES: Record<FiveElementId, number> = { metal: 50, wood: 50, water: 50, fire: 50, earth: 50 };

/**
 * Extract five-element scores from a cultivator's registration record.
 * Returns default 50-per-element when no record exists.
 */
export function extractFiveElementScores(record: CultivationRegistrationRecord | null): Record<FiveElementId, number> {
  return record?.result?.five_element_scores ?? { ...DEFAULT_FIVE_ELEMENT_SCORES };
}
