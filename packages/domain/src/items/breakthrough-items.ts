import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

export const BREAKTHROUGH_ITEMS: Record<
  Extract<
    LegacyItemId,
    | "qi-stage-1-special"
    | "qi-stage-2-special"
    | "qi-major-special"
    | "foundation-stage-1-special"
    | "foundation-stage-2-special"
    | "foundation-major-special"
    | "core-stage-1-special"
    | "core-stage-2-special"
  >,
  ItemDefinition
> = {
  "qi-stage-1-special": {
    id: "qi-stage-1-special",
    name: "聚气丹",
    nameByLocale: makeLocalizedText("聚气丹", "Qi Gathering Pill"),
    category: "material",
    description: "炼气一层突破至二层的专用突破丹。",
    descriptionByLocale: makeLocalizedText(
      "炼气一层突破至二层的专用突破丹。",
      "Specialized pill for breaking through from qi condensation level 1 to level 2.",
    ),
    baseValue: 180,
    tags: ["material", "breakthrough", "qi", "special", "stage-1", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "qi-stage-2-special": {
    id: "qi-stage-2-special",
    name: "凝息丹",
    nameByLocale: makeLocalizedText("凝息丹", "Breath Condensation Pill"),
    category: "material",
    description: "炼气二层突破至三层的专用突破丹。",
    descriptionByLocale: makeLocalizedText(
      "炼气二层突破至三层的专用突破丹。",
      "Specialized pill for breaking through from qi condensation level 2 to level 3.",
    ),
    baseValue: 220,
    tags: ["material", "breakthrough", "qi", "special", "stage-2", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "qi-major-special": {
    id: "qi-major-special",
    name: "筑基引脉丹",
    nameByLocale: makeLocalizedText("筑基引脉丹", "Foundation Meridian Pill"),
    category: "material",
    description: "炼气圆满冲击筑基时使用的专用突破丹。",
    descriptionByLocale: makeLocalizedText(
      "炼气圆满冲击筑基时使用的专用突破丹。",
      "Specialized pill for the major breakthrough from qi condensation to foundation establishment.",
    ),
    baseValue: 320,
    tags: ["material", "breakthrough", "qi", "major", "special", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "foundation-stage-1-special": {
    id: "foundation-stage-1-special",
    name: "凝元丹",
    nameByLocale: makeLocalizedText("凝元丹", "Essence Condensation Pill"),
    category: "material",
    description: "筑基一层突破至二层的专用突破丹。",
    descriptionByLocale: makeLocalizedText(
      "筑基一层突破至二层的专用突破丹。",
      "Specialized pill for breaking through from foundation level 1 to level 2.",
    ),
    baseValue: 360,
    tags: ["material", "breakthrough", "foundation", "special", "stage-1", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "foundation-stage-2-special": {
    id: "foundation-stage-2-special",
    name: "归元丹",
    nameByLocale: makeLocalizedText("归元丹", "Origin Return Pill"),
    category: "material",
    description: "筑基二层突破至三层的专用突破丹。",
    descriptionByLocale: makeLocalizedText(
      "筑基二层突破至三层的专用突破丹。",
      "Specialized pill for breaking through from foundation level 2 to level 3.",
    ),
    baseValue: 420,
    tags: ["material", "breakthrough", "foundation", "special", "stage-2", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "foundation-major-special": {
    id: "foundation-major-special",
    name: "结丹宝器",
    nameByLocale: makeLocalizedText("结丹宝器", "Core Formation Treasure"),
    category: "material",
    description: "筑基圆满冲击金丹时使用的专用突破法宝。",
    descriptionByLocale: makeLocalizedText(
      "筑基圆满冲击金丹时使用的专用突破法宝。",
      "Specialized treasure for the major breakthrough from foundation to core formation.",
    ),
    baseValue: 620,
    tags: ["material", "breakthrough", "foundation", "major", "special", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "core-stage-1-special": {
    id: "core-stage-1-special",
    name: "养丹露",
    nameByLocale: makeLocalizedText("养丹露", "Core Nourishing Dew"),
    category: "material",
    description: "金丹一层突破至二层的专用养丹灵液。",
    descriptionByLocale: makeLocalizedText(
      "金丹一层突破至二层的专用养丹灵液。",
      "Specialized essence for breaking through from core formation level 1 to level 2.",
    ),
    baseValue: 760,
    tags: ["material", "breakthrough", "core", "special", "stage-1", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
  "core-stage-2-special": {
    id: "core-stage-2-special",
    name: "淬丹宝液",
    nameByLocale: makeLocalizedText("淬丹宝液", "Core Tempering Elixir"),
    category: "material",
    description: "金丹二层突破至三层的专用淬炼宝液。",
    descriptionByLocale: makeLocalizedText(
      "金丹二层突破至三层的专用淬炼宝液。",
      "Specialized elixir for breaking through from core formation level 2 to level 3.",
    ),
    baseValue: 920,
    tags: ["material", "breakthrough", "core", "special", "stage-2", "crafted-only"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  },
};
