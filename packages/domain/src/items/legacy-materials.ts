import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const LEGACY_MATERIALS: Record<
  Extract<LegacyItemId, "spirit-ore" | "ruin-fragment" | "beast-core" | "qi-common" | "foundation-common" | "core-common">,
  ItemDefinition
> = {
  "spirit-ore": {
    id: "spirit-ore",
    name: "灵矿原石",
    nameByLocale: makeLocalizedText("灵矿原石", "Spirit Ore"),
    category: "material",
    description: "矿洞常见资源，可作为炼制材料或坊市货品。",
    descriptionByLocale: makeLocalizedText(
      "矿洞常见资源，可作为炼制材料或坊市货品。",
      "Common mining resource, used as crafting material or trade goods.",
    ),
    baseValue: 115,
    tags: ["material", "mining", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 115,
      tradableAt: "settlement",
    },
    use: MATERIAL_USE,
  },
  "ruin-fragment": {
    id: "ruin-fragment",
    name: "残碑碎片",
    nameByLocale: makeLocalizedText("残碑碎片", "Ruin Fragment"),
    category: "material",
    description: "遗迹中常见的残片，可出售，也常用于符箓与阵材。",
    descriptionByLocale: makeLocalizedText(
      "遗迹中常见的残片，可出售，也常用于符箓与阵材。",
      "Common ruin debris, sellable or used in talisman and array crafting.",
    ),
    baseValue: 145,
    tags: ["material", "ruins", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 145,
      tradableAt: "settlement",
    },
    use: MATERIAL_USE,
  },
  "beast-core": {
    id: "beast-core",
    name: "妖核",
    nameByLocale: makeLocalizedText("妖核", "Beast Core"),
    category: "material",
    description: "妖兽体内凝出的核心材料，兼具交易与炼制价值。",
    descriptionByLocale: makeLocalizedText(
      "妖兽体内凝出的核心材料，兼具交易与炼制价值。",
      "Core material crystallized within a beast, valued for trade and crafting.",
    ),
    baseValue: 210,
    tags: ["material", "beast", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 210,
      tradableAt: "settlement",
    },
    use: MATERIAL_USE,
  },
  "qi-common": {
    id: "qi-common",
    name: "聚气灵材",
    nameByLocale: makeLocalizedText("聚气灵材", "Qi Gathering Material"),
    category: "material",
    description: "炼气期突破通用灵材，可用于炼制本境界突破专用物。",
    descriptionByLocale: makeLocalizedText(
      "炼气期突破通用灵材，可用于炼制本境界突破专用物。",
      "Common material for qi condensation breakthroughs, used to craft stage-specific items.",
    ),
    baseValue: 90,
    tags: ["material", "breakthrough", "qi", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: MATERIAL_USE,
  },
  "foundation-common": {
    id: "foundation-common",
    name: "凝元灵材",
    nameByLocale: makeLocalizedText("凝元灵材", "Foundation Material"),
    category: "material",
    description: "筑基期突破通用灵材，通常来自中期外循环的稳定采获。",
    descriptionByLocale: makeLocalizedText(
      "筑基期突破通用灵材，通常来自中期外循环的稳定采获。",
      "Common material for foundation establishment breakthroughs, from mid-stage gathering.",
    ),
    baseValue: 180,
    tags: ["material", "breakthrough", "foundation", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: MATERIAL_USE,
  },
  "core-common": {
    id: "core-common",
    name: "养丹灵材",
    nameByLocale: makeLocalizedText("养丹灵材", "Core Formation Material"),
    category: "material",
    description: "金丹期突破通用灵材，通常来自高风险遗迹与守关收获。",
    descriptionByLocale: makeLocalizedText(
      "金丹期突破通用灵材，通常来自高风险遗迹与守关收获。",
      "Common material for core formation breakthroughs, from high-risk ruins and tribulations.",
    ),
    baseValue: 320,
    tags: ["material", "breakthrough", "core", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: MATERIAL_USE,
  },
};
