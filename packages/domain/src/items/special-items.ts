import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const SPECIAL_ITEMS: Record<
  Extract<LegacyItemId, "eight-wastes-pass" | "bahuang-spirit-essence" | "ancient-artifact" | "legendary-artifact">,
  ItemDefinition
> = {
  "eight-wastes-pass": {
    id: "eight-wastes-pass",
    name: "八荒令",
    nameByLocale: makeLocalizedText("八荒令", "Eight Wastes Pass"),
    category: "material",
    description: "进入八荒所需的通行凭证，由入口直接消耗。主城坊市可以买。荒野巡查、猎兽、答过的岔路，以及地宫四阶以上撤出或走完，也有机会摸到一枚。",
    descriptionByLocale: makeLocalizedText(
      "进入八荒所需的通行凭证，由入口直接消耗。主城坊市可以买。荒野巡查、猎兽、答过的岔路，以及地宫四阶以上撤出或走完，也有机会摸到一枚。",
      "Pass required to enter the Eight Wastes, consumed at the entrance. Sold at main-city markets. Wilderness surveys, hunts, answered beats, and dungeon ranks 4 and above can also yield one on a withdraw or a clear.",
    ),
    baseValue: 800,
    tags: ["ticket", "bahuang-expedition", "eight-wastes", "wilderness-loot", "dungeon-loot"],
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
