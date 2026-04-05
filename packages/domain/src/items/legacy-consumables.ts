import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const LEGACY_CONSUMABLES: Record<
  Extract<LegacyItemId, "healing-pill" | "qi-pill" | "ward-talisman">,
  ItemDefinition
> = {
  "healing-pill": {
    id: "healing-pill",
    name: "疗伤丹",
    nameByLocale: makeLocalizedText("疗伤丹", "Healing Pill"),
    category: "consumable",
    description: "快速恢复气血并缓和轻伤，适合战后续航。",
    descriptionByLocale: makeLocalizedText(
      "快速恢复气血并缓和轻伤，适合战后续航。",
      "Quickly restores qi and eases minor injuries, ideal for post-combat recovery.",
    ),
    baseValue: 100,
    tags: ["pill", "healing", "starter-sustain", "market-stock"],
    trade: {
      buyBasePrice: 100,
      sellBasePrice: null,
      tradableAt: "settlement",
    },
    use: {
      kind: "consume",
      actionId: "use-healing-pill",
      consumesOnUse: true,
      effectSummary: "恢复 35 点气，并减轻 2 tick 伤势。",
      effectSummaryByLocale: makeLocalizedText(
        "恢复 35 点气，并减轻 2 tick 伤势。",
        "Restores 35 qi and reduces injury by 2 ticks.",
      ),
      effectBundle: {
        qi: 35,
        injuryTicksDelta: -2,
      },
      grantsTechnique: null,
      ticketTargets: null,
      grantsWeaponLoadoutId: null,
      grantsSpellLoadoutId: null,
    },
  },
  "qi-pill": {
    id: "qi-pill",
    name: "回气丹",
    nameByLocale: makeLocalizedText("回气丹", "Qi Restoration Pill"),
    category: "consumable",
    description: "快速回补灵力，并短时间提振吐纳状态。",
    descriptionByLocale: makeLocalizedText(
      "快速回补灵力，并短时间提振吐纳状态。",
      "Quickly replenishes spiritual power and briefly boosts breathing state.",
    ),
    baseValue: 60,
    tags: ["pill", "qi", "cultivation", "market-stock"],
    trade: {
      buyBasePrice: 60,
      sellBasePrice: null,
      tradableAt: "settlement",
    },
    use: {
      kind: "consume",
      actionId: "use-qi-pill",
      consumesOnUse: true,
      effectSummary: "恢复 30 点灵力，并获得 spirit-saturated。",
      effectSummaryByLocale: makeLocalizedText(
        "恢复 30 点灵力，并获得 spirit-saturated。",
        "Restores 30 spiritual power and grants spirit-saturated.",
      ),
      effectBundle: {
        spiritualPower: 30,
        statusEffects: [{ effectId: "spirit-saturated", ticks: 4 }],
      },
      grantsTechnique: null,
      ticketTargets: null,
      grantsWeaponLoadoutId: null,
      grantsSpellLoadoutId: null,
    },
  },
  "ward-talisman": {
    id: "ward-talisman",
    name: "镇煞符",
    nameByLocale: makeLocalizedText("镇煞符", "Ward Talisman"),
    category: "talisman",
    description: "临时稳住护体气机，降低一段时间内的风险。",
    descriptionByLocale: makeLocalizedText(
      "临时稳住护体气机，降低一段时间内的风险。",
      "Temporarily stabilizes protective qi flow, reducing risk for a period.",
    ),
    baseValue: 180,
    tags: ["talisman", "defense", "combat-prep", "market-stock"],
    trade: {
      buyBasePrice: 180,
      sellBasePrice: null,
      tradableAt: "settlement",
    },
    use: {
      kind: "consume",
      actionId: "use-ward-talisman",
      consumesOnUse: true,
      effectSummary: "获得 warded 状态，持续 6 tick。",
      effectSummaryByLocale: makeLocalizedText(
        "获得 warded 状态，持续 6 tick。",
        "Grants warded status for 6 ticks.",
      ),
      effectBundle: {
        statusEffects: [{ effectId: "warded", ticks: 6 }],
      },
      grantsTechnique: null,
      ticketTargets: null,
      grantsWeaponLoadoutId: null,
      grantsSpellLoadoutId: null,
    },
  },
};
