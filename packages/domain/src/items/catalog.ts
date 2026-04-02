import type {
  ActionId,
  ActionItemBinding,
  ItemActionOperation,
  ItemDefinition,
  ItemId,
} from "../model.js";

type BuyActionId = "buy-healing-pill" | "buy-qi-pill" | "buy-ward-talisman";
type SellActionId = "sell-spirit-ore" | "sell-ruin-fragment" | "sell-beast-core";

const materialUse = {
  kind: "material" as const,
  actionId: null,
  consumesOnUse: false,
  effectSummary: null,
  effectBundle: null,
  grantsTechnique: null,
  ticketTargets: null,
};

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  "healing-pill": {
    id: "healing-pill",
    name: "疗伤丹",
    category: "consumable",
    description: "快速恢复气血并缓和轻伤，适合战后续航。",
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
      effectBundle: {
        qi: 35,
        injuryTicksDelta: -2,
      },
      grantsTechnique: null,
      ticketTargets: null,
    },
  },
  "qi-pill": {
    id: "qi-pill",
    name: "回气丹",
    category: "consumable",
    description: "快速回补灵力，并短时间提振吐纳状态。",
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
      effectBundle: {
        spiritualPower: 30,
        statusEffects: [{ effectId: "spirit-saturated", ticks: 4 }],
      },
      grantsTechnique: null,
      ticketTargets: null,
    },
  },
  "ward-talisman": {
    id: "ward-talisman",
    name: "镇煞符",
    category: "talisman",
    description: "临时稳住护体气机，降低一段时间内的风险。",
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
      effectBundle: {
        statusEffects: [{ effectId: "warded", ticks: 6 }],
      },
      grantsTechnique: null,
      ticketTargets: null,
    },
  },
  "spirit-ore": {
    id: "spirit-ore",
    name: "灵矿原石",
    category: "material",
    description: "矿洞常见资源，可作为炼制材料或坊市货品。",
    baseValue: 115,
    tags: ["material", "mining", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 115,
      tradableAt: "settlement",
    },
    use: materialUse,
  },
  "ruin-fragment": {
    id: "ruin-fragment",
    name: "残碑碎片",
    category: "material",
    description: "遗迹中常见的残片，可出售，也常用于符箓与阵材。",
    baseValue: 145,
    tags: ["material", "ruins", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 145,
      tradableAt: "settlement",
    },
    use: materialUse,
  },
  "beast-core": {
    id: "beast-core",
    name: "妖核",
    category: "material",
    description: "妖兽体内凝出的核心材料，兼具交易与炼制价值。",
    baseValue: 210,
    tags: ["material", "beast", "trade-good", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: 210,
      tradableAt: "settlement",
    },
    use: materialUse,
  },
  "qi-common": {
    id: "qi-common",
    name: "聚气灵材",
    category: "material",
    description: "炼气期突破通用灵材，可用于炼制本境界突破专用物。",
    baseValue: 90,
    tags: ["material", "breakthrough", "qi", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "foundation-common": {
    id: "foundation-common",
    name: "凝元灵材",
    category: "material",
    description: "筑基期突破通用灵材，通常来自中期外循环的稳定采获。",
    baseValue: 180,
    tags: ["material", "breakthrough", "foundation", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "core-common": {
    id: "core-common",
    name: "养丹灵材",
    category: "material",
    description: "金丹期突破通用灵材，通常来自高风险遗迹与守关收获。",
    baseValue: 320,
    tags: ["material", "breakthrough", "core", "common", "residence-input"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "qi-stage-1-special": {
    id: "qi-stage-1-special",
    name: "聚气丹",
    category: "material",
    description: "炼气一层突破至二层的专用突破丹。",
    baseValue: 180,
    tags: ["material", "breakthrough", "qi", "special", "stage-1", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "qi-stage-2-special": {
    id: "qi-stage-2-special",
    name: "凝息丹",
    category: "material",
    description: "炼气二层突破至三层的专用突破丹。",
    baseValue: 220,
    tags: ["material", "breakthrough", "qi", "special", "stage-2", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "qi-major-special": {
    id: "qi-major-special",
    name: "筑基引脉丹",
    category: "material",
    description: "炼气圆满冲击筑基时使用的专用突破丹。",
    baseValue: 320,
    tags: ["material", "breakthrough", "qi", "major", "special", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "foundation-stage-1-special": {
    id: "foundation-stage-1-special",
    name: "凝元丹",
    category: "material",
    description: "筑基一层突破至二层的专用突破丹。",
    baseValue: 360,
    tags: ["material", "breakthrough", "foundation", "special", "stage-1", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "foundation-stage-2-special": {
    id: "foundation-stage-2-special",
    name: "归元丹",
    category: "material",
    description: "筑基二层突破至三层的专用突破丹。",
    baseValue: 420,
    tags: ["material", "breakthrough", "foundation", "special", "stage-2", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "foundation-major-special": {
    id: "foundation-major-special",
    name: "结丹宝器",
    category: "material",
    description: "筑基圆满冲击金丹时使用的专用突破法宝。",
    baseValue: 620,
    tags: ["material", "breakthrough", "foundation", "major", "special", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "core-stage-1-special": {
    id: "core-stage-1-special",
    name: "养丹露",
    category: "material",
    description: "金丹一层突破至二层的专用养丹灵液。",
    baseValue: 760,
    tags: ["material", "breakthrough", "core", "special", "stage-1", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "core-stage-2-special": {
    id: "core-stage-2-special",
    name: "淬丹宝液",
    category: "material",
    description: "金丹二层突破至三层的专用淬炼宝液。",
    baseValue: 920,
    tags: ["material", "breakthrough", "core", "special", "stage-2", "crafted-only"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "eight-wastes-pass": {
    id: "eight-wastes-pass",
    name: "八荒符关",
    category: "material",
    description: "进入八荒阈层所需的通行凭证，由入口逻辑直接消耗。",
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
      effectBundle: null,
      grantsTechnique: null,
      ticketTargets: ["eight-wastes-threshold"],
    },
  },
  "ancient-artifact": {
    id: "ancient-artifact",
    name: "上古遗宝",
    category: "material",
    description: "来自八荒与归墟边缘的古物，目前主要作为高阶战利品保留。",
    baseValue: 480,
    tags: ["artifact", "wilderness-loot", "guixu-loot", "high-value"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
  "legendary-artifact": {
    id: "legendary-artifact",
    name: "传说遗宝",
    category: "material",
    description: "归墟深处产出的顶级遗珍，暂时只作为终局收获记录。",
    baseValue: 880,
    tags: ["artifact", "guixu-loot", "endgame", "high-value"],
    trade: {
      buyBasePrice: null,
      sellBasePrice: null,
      tradableAt: "none",
    },
    use: materialUse,
  },
};

export const ITEM_IDS = Object.freeze(Object.keys(ITEM_CATALOG) as ItemId[]);

const BUY_ACTION_TO_ITEM: Record<BuyActionId, ItemId> = {
  "buy-healing-pill": "healing-pill",
  "buy-qi-pill": "qi-pill",
  "buy-ward-talisman": "ward-talisman",
};

const SELL_ACTION_TO_ITEM: Record<SellActionId, ItemId> = {
  "sell-spirit-ore": "spirit-ore",
  "sell-ruin-fragment": "ruin-fragment",
  "sell-beast-core": "beast-core",
};

const ITEM_OPERATION_ACTION_IDS: Record<ItemId, Partial<Record<ItemActionOperation, ActionId>>> = ITEM_IDS.reduce(
  (acc, itemId) => {
    acc[itemId] = {};
    return acc;
  },
  {} as Record<ItemId, Partial<Record<ItemActionOperation, ActionId>>>,
);

for (const [actionId, itemId] of Object.entries(BUY_ACTION_TO_ITEM) as Array<[BuyActionId, ItemId]>) {
  ITEM_OPERATION_ACTION_IDS[itemId].buy = actionId;
}

for (const [actionId, itemId] of Object.entries(SELL_ACTION_TO_ITEM) as Array<[SellActionId, ItemId]>) {
  ITEM_OPERATION_ACTION_IDS[itemId].sell = actionId;
}

for (const itemId of ITEM_IDS) {
  const actionId = ITEM_CATALOG[itemId].use.actionId;
  if (!actionId) {
    continue;
  }
  ITEM_OPERATION_ACTION_IDS[itemId][ITEM_CATALOG[itemId].use.kind === "study" ? "study" : "use"] = actionId;
}

const ACTION_ITEM_BINDINGS: Partial<Record<ActionId, ActionItemBinding>> = {};

for (const [actionId, itemId] of Object.entries(BUY_ACTION_TO_ITEM) as Array<[BuyActionId, ItemId]>) {
  ACTION_ITEM_BINDINGS[actionId] = { itemId, operation: "buy" };
}

for (const [actionId, itemId] of Object.entries(SELL_ACTION_TO_ITEM) as Array<[SellActionId, ItemId]>) {
  ACTION_ITEM_BINDINGS[actionId] = { itemId, operation: "sell" };
}

for (const itemId of ITEM_IDS) {
  const actionId = ITEM_CATALOG[itemId].use.actionId;
  if (!actionId) {
    continue;
  }
  ACTION_ITEM_BINDINGS[actionId] = {
    itemId,
    operation: ITEM_CATALOG[itemId].use.kind === "study" ? "study" : "use",
  };
}

export function getItemOperationActionId(
  itemId: ItemId,
  operation: ItemActionOperation,
): ActionId | null {
  return ITEM_OPERATION_ACTION_IDS[itemId][operation] ?? null;
}

export function getItemActionBinding(actionId: ActionId): ActionItemBinding | null {
  return ACTION_ITEM_BINDINGS[actionId] ?? null;
}
