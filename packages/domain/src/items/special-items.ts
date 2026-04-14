import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const SPECIAL_ITEMS: Record<
  Extract<LegacyItemId, "eight-wastes-pass" | "bahuang-spirit-essence" | "ancient-artifact" | "legendary-artifact">,
  ItemDefinition
> = {
  "eight-wastes-pass": {
    id: "eight-wastes-pass",
    name: "八荒符关",
    nameByLocale: makeLocalizedText("八荒符关", "Eight Wastes Pass"),
    category: "material",
    description: "进入八荒阈层所需的通行凭证，由入口逻辑直接消耗。可在主城坊市购买。",
    descriptionByLocale: makeLocalizedText(
      "进入八荒阈层所需的通行凭证，由入口逻辑直接消耗。可在主城坊市购买。",
      "Pass required to enter the Eight Wastes threshold layer, consumed automatically at the entrance. Available at main city markets.",
    ),
    baseValue: 800,
    tags: ["ticket", "bahuang-expedition", "eight-wastes"],
    trade: {
      buyBasePrice: 800,
      sellBasePrice: 200,
      tradableAt: "market",
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
    description: "来自八荒与归墟边缘的古物，高阶战利品，可在坊市出售。",
    descriptionByLocale: makeLocalizedText(
      "来自八荒与归墟边缘的古物，高阶战利品，可在坊市出售。",
      "Ancient relic from the Eight Wastes and Guixu border, high-tier loot sellable at markets.",
    ),
    baseValue: 480,
    tags: ["artifact", "wilderness-loot", "guixu-loot", "high-value", "bahuang-loot"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 360,
      tradableAt: "market",
    },
    use: MATERIAL_USE,
  },
  "bahuang-spirit-essence": {
    id: "bahuang-spirit-essence",
    name: "八荒灵精",
    nameByLocale: makeLocalizedText("八荒灵精", "Bahuang Spirit Essence"),
    category: "material",
    description: "八荒深层凝聚的纯粹灵气结晶，仅在高深度远征中偶尔产出，可在坊市高价出售。",
    descriptionByLocale: makeLocalizedText(
      "八荒深层凝聚的纯粹灵气结晶，仅在高深度远征中偶尔产出，可在坊市高价出售。",
      "Crystallized pure spiritual energy condensed in the deep Eight Wastes. Only drops from high-depth expeditions. Sells well at markets.",
    ),
    baseValue: 600,
    tags: ["essence", "bahuang-loot", "high-value", "deep-run"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 450,
      tradableAt: "market",
    },
    use: MATERIAL_USE,
  },
  "legendary-artifact": {
    id: "legendary-artifact",
    name: "传说遗宝",
    nameByLocale: makeLocalizedText("传说遗宝", "Legendary Artifact"),
    category: "material",
    description: "八荒最深处与归墟边缘产出的顶级遗珍，极其稀有，可在坊市高价出售。",
    descriptionByLocale: makeLocalizedText(
      "八荒最深处与归墟边缘产出的顶级遗珍，极其稀有，可在坊市高价出售。",
      "Top-tier relic from the deepest Eight Wastes and Guixu border. Extremely rare. Sells for high value at markets.",
    ),
    baseValue: 880,
    tags: ["artifact", "guixu-loot", "bahuang-loot", "endgame", "high-value"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 680,
      tradableAt: "market",
    },
    use: MATERIAL_USE,
  },
};
