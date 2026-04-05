import type {
  ActionId,
  ActionItemBinding,
  ItemActionOperation,
  ItemDefinition,
  ItemId,
} from "../model.js";
import { LEGACY_CONSUMABLES } from "./legacy-consumables.js";
import { LEGACY_MATERIALS } from "./legacy-materials.js";
import { BREAKTHROUGH_ITEMS } from "./breakthrough-items.js";
import { SPECIAL_ITEMS } from "./special-items.js";
import { LOADOUT_SOURCE_ITEMS } from "./loadout-source-items.js";

type BuyActionId = "buy-healing-pill" | "buy-qi-pill" | "buy-ward-talisman";
type SellActionId = "sell-spirit-ore" | "sell-ruin-fragment" | "sell-beast-core";

export const ITEM_CATALOG: Record<ItemId, ItemDefinition> = {
  ...LEGACY_CONSUMABLES,
  ...LEGACY_MATERIALS,
  ...BREAKTHROUGH_ITEMS,
  ...SPECIAL_ITEMS,
  ...LOADOUT_SOURCE_ITEMS,
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
