import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const SPECIAL_ITEMS: Record<
  Extract<LegacyItemId, "eight-wastes-pass" | "ancient-artifact" | "legendary-artifact">,
  ItemDefinition
> = {
  "eight-wastes-pass": {
    id: "eight-wastes-pass",
    name: "八荒符关",
    nameByLocale: makeLocalizedText("八荒符关", "Eight Wastes Pass"),
    category: "material",
    description: "进入八荒阈层所需的通行凭证，由入口逻辑直接消耗。",
    descriptionByLocale: makeLocalizedText(
      "进入八荒阈层所需的通行凭证，由入口逻辑直接消耗。",
      "Pass required to enter the Eight Wastes threshold layer, consumed automatically at the entrance.",
    ),
    baseValue: 320,
    tags: ["ticket", "bahuang-expedition", "eight-wastes"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: {
      kind: "ticket",
      actionId: null,
      consumesOnUse: true,
      effectSummary: "八荒入口会自动检定并消耗此凭证。",
      effectSummaryByLocale: makeLocalizedText(
        "八荒入口会自动检定并消耗此凭证。",
        "The Eight Wastes entrance automatically checks and consumes this pass.",
      ),
      effectBundle: null,
      grantsTechnique: null,
      ticketTargets: ["eight-wastes-threshold"],
      grantsWeaponLoadoutId: null,
      grantsSpellLoadoutId: null,
    },
  },
  "ancient-artifact": {
    id: "ancient-artifact",
    name: "上古遗宝",
    nameByLocale: makeLocalizedText("上古遗宝", "Ancient Artifact"),
    category: "material",
    description: "来自八荒与归墟边缘的古物，目前主要作为高阶战利品保留。",
    descriptionByLocale: makeLocalizedText(
      "来自八荒与归墟边缘的古物，目前主要作为高阶战利品保留。",
      "Ancient relic from the Eight Wastes and Guixu border, kept as high-tier loot.",
    ),
    baseValue: 480,
    tags: ["artifact", "wilderness-loot", "guixu-loot", "high-value"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: MATERIAL_USE,
  },
  "legendary-artifact": {
    id: "legendary-artifact",
    name: "传说遗宝",
    nameByLocale: makeLocalizedText("传说遗宝", "Legendary Artifact"),
    category: "material",
    description: "归墟深处产出的顶级遗珍，暂时只作为终局收获记录。",
    descriptionByLocale: makeLocalizedText(
      "归墟深处产出的顶级遗珍，暂时只作为终局收获记录。",
      "Top-tier relic from the depths of Guixu, currently recorded as endgame loot.",
    ),
    baseValue: 880,
    tags: ["artifact", "guixu-loot", "endgame", "high-value"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: MATERIAL_USE,
  },
};
