import type {
  ItemId,
  ItemDefinition,
  ProductionRecipe,
  RecipeReference,
  BreakthroughReference,
  ResourceUsageSummary,
  SpiritStoneUsageSummary,
} from "./model.js";

// ---- Breakthrough Level Description (input type for reverse index) ----

export interface BreakthroughLevelEntry {
  readonly targetLevel: number;
  readonly targetRealm: string;
  readonly materials: ReadonlyArray<{ readonly itemId: ItemId; readonly count: number }>;
}

// ---- Reverse Index Builders ----

export function buildRecipeReverseIndex(
  recipes: readonly ProductionRecipe[],
  catalog: Readonly<Record<string, ItemDefinition>>,
): ReadonlyMap<string, readonly RecipeReference[]> {
  const index = new Map<string, RecipeReference[]>();
  for (const recipe of recipes) {
    if (!recipe.enabledInLive) continue;
    const outputDef = catalog[recipe.outputItemId];
    const ref: RecipeReference = {
      recipeId: recipe.id,
      outputItemId: recipe.outputItemId,
      outputName: outputDef?.name ?? recipe.outputItemId,
    };
    for (const mat of recipe.inputMaterials) {
      const existing = index.get(mat.itemId);
      if (existing) {
        existing.push(ref);
      } else {
        index.set(mat.itemId, [ref]);
      }
    }
  }
  return index;
}

export function buildBreakthroughReverseIndex(
  levels: readonly BreakthroughLevelEntry[],
): ReadonlyMap<string, readonly BreakthroughReference[]> {
  const index = new Map<string, BreakthroughReference[]>();
  for (const level of levels) {
    const ref: BreakthroughReference = {
      targetLevel: level.targetLevel,
      targetRealm: level.targetRealm,
    };
    for (const mat of level.materials) {
      const existing = index.get(mat.itemId);
      if (existing) {
        existing.push(ref);
      } else {
        index.set(mat.itemId, [ref]);
      }
    }
  }
  return index;
}

// ---- Usage Summary Builders ----

export function buildItemUsageSummary(
  itemId: ItemId,
  catalog: Readonly<Record<string, ItemDefinition>>,
  recipeIndex: ReadonlyMap<string, readonly RecipeReference[]>,
  breakthroughIndex: ReadonlyMap<string, readonly BreakthroughReference[]>,
): ResourceUsageSummary {
  const def = catalog[itemId];
  const summary: ResourceUsageSummary = {};

  if (def) {
    if (def.trade.sellBasePrice != null && def.trade.sellBasePrice > 0) {
      summary.sellable = { baseValue: def.trade.sellBasePrice };
    }
    if (def.use.kind !== "material" && def.use.effectSummary) {
      summary.directUse = { kind: def.use.kind, effectSummary: def.use.effectSummary };
    }
    if (def.use.grantsWeaponLoadoutId) {
      summary.loadoutUnlock = {
        type: "weapon",
        loadoutId: def.use.grantsWeaponLoadoutId,
        loadoutName: def.use.effectSummary ?? def.use.grantsWeaponLoadoutId,
      };
    } else if (def.use.grantsSpellLoadoutId) {
      summary.loadoutUnlock = {
        type: "spell",
        loadoutId: def.use.grantsSpellLoadoutId,
        loadoutName: def.use.effectSummary ?? def.use.grantsSpellLoadoutId,
      };
    }
  }

  const recipes = recipeIndex.get(itemId);
  if (recipes && recipes.length > 0) {
    summary.recipeInputFor = recipes;
  }

  const breakthroughs = breakthroughIndex.get(itemId);
  if (breakthroughs && breakthroughs.length > 0) {
    summary.breakthroughMaterialFor = breakthroughs;
  }

  return summary;
}

export function buildSpiritStoneUsageSummary(
  recipes: readonly ProductionRecipe[],
): SpiritStoneUsageSummary {
  const costs: { recipeId: string; cost: number }[] = [];
  for (const recipe of recipes) {
    if (recipe.enabledInLive && recipe.spiritStoneCost > 0) {
      costs.push({ recipeId: recipe.id, cost: recipe.spiritStoneCost });
    }
  }
  return {
    spiritStoneUsage: true,
    recipeCosts: costs,
    marketBuying: true,
  };
}
