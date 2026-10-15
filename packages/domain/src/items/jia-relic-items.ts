import type { ItemDefinition } from "../model.js";
import { JIA_RELICS, type JiaRelicDefinition } from "../jia-relics.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type JiaRelicItemId = JiaRelicDefinition["itemId"];

function relicItem(relic: (typeof JIA_RELICS)[number]): ItemDefinition {
  return {
    id: relic.itemId,
    name: relic.name,
    nameByLocale: makeLocalizedText(relic.name, relic.nameEn),
    category: "material",
    description: relic.arcLine,
    descriptionByLocale: makeLocalizedText(relic.arcLine, relic.descriptionEn),
    baseValue: 40,
    tags: ["relic", "jia-chronicle", relic.mysteryId, relic.kind],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const JIA_RELIC_ITEMS: Record<JiaRelicItemId, ItemDefinition> = Object.fromEntries(
  JIA_RELICS.map((relic) => [relic.itemId, relicItem(relic)]),
) as Record<JiaRelicItemId, ItemDefinition>;
