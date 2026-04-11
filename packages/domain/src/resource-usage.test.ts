import assert from "node:assert/strict";
import test from "node:test";
import type { ItemId, ItemDefinition, ProductionRecipe } from "./model.js";
import {
  buildRecipeReverseIndex,
  buildBreakthroughReverseIndex,
  buildItemUsageSummary,
  buildSpiritStoneUsageSummary,
  type BreakthroughLevelEntry,
} from "./resource-usage.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import { RESIDENCE_PRODUCTION_RECIPES } from "./constants.js";

// ---- buildRecipeReverseIndex ----

test("buildRecipeReverseIndex maps spirit-ore to healing-pill and qi-pill recipes", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const spiritOreRefs = index.get("spirit-ore");
  assert.ok(spiritOreRefs, "spirit-ore should appear in the recipe reverse index");
  const recipeIds = spiritOreRefs.map((r) => r.recipeId);
  assert.ok(recipeIds.includes("recipe-healing-pill"), "spirit-ore should be input for recipe-healing-pill");
  assert.ok(recipeIds.includes("recipe-qi-pill"), "spirit-ore should be input for recipe-qi-pill");
});

test("buildRecipeReverseIndex maps beast-core to healing-pill recipe", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const beastCoreRefs = index.get("beast-core");
  assert.ok(beastCoreRefs, "beast-core should appear in the recipe reverse index");
  assert.equal(beastCoreRefs.length, 1);
  assert.equal(beastCoreRefs[0]!.recipeId, "recipe-healing-pill");
  assert.equal(beastCoreRefs[0]!.outputItemId, "healing-pill");
});

test("buildRecipeReverseIndex maps ruin-fragment to ward-talisman recipe", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const ruinRefs = index.get("ruin-fragment");
  assert.ok(ruinRefs, "ruin-fragment should appear in the recipe reverse index");
  assert.ok(ruinRefs.some((r) => r.recipeId === "recipe-ward-talisman"));
});

test("buildRecipeReverseIndex skips recipes with enabledInLive=false", () => {
  const disabledRecipe: ProductionRecipe = {
    id: "recipe-disabled",
    outputItemId: "healing-pill",
    outputCount: 1,
    inputMaterials: [{ itemId: "spirit-ore" as ItemId, count: 1 }],
    spiritStoneCost: 10,
    durationTicks: 1,
    enabledInLive: false,
  };
  const index = buildRecipeReverseIndex([disabledRecipe], ITEM_CATALOG);
  assert.equal(index.get("spirit-ore"), undefined, "disabled recipe inputs should not appear in index");
});

test("buildRecipeReverseIndex includes weapon-material and spell-fragment entries from loadout recipes", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  let hasWeaponMaterial = false;
  let hasSpellFragment = false;
  for (const key of index.keys()) {
    if (key.startsWith("weapon-material-")) hasWeaponMaterial = true;
    if (key.startsWith("spell-fragment-")) hasSpellFragment = true;
  }
  assert.ok(hasWeaponMaterial, "should contain weapon-material entries from forge recipes");
  assert.ok(hasSpellFragment, "should contain spell-fragment entries from synth recipes");
});

// ---- buildBreakthroughReverseIndex ----

test("buildBreakthroughReverseIndex maps materials to breakthrough levels", () => {
  const levels: BreakthroughLevelEntry[] = [
    { targetLevel: 2, targetRealm: "炼气", materials: [{ itemId: "cloud-heart-grass" as ItemId, count: 3 }, { itemId: "condensed-qi-dew" as ItemId, count: 1 }] },
    { targetLevel: 4, targetRealm: "筑基", materials: [{ itemId: "mystic-jade-stone" as ItemId, count: 4 }, { itemId: "azure-stone-marrow" as ItemId, count: 1 }] },
  ];
  const index = buildBreakthroughReverseIndex(levels);
  const grassRefs = index.get("cloud-heart-grass");
  assert.ok(grassRefs);
  assert.equal(grassRefs.length, 1);
  assert.equal(grassRefs[0]!.targetLevel, 2);
  assert.equal(grassRefs[0]!.targetRealm, "炼气");

  const dewRefs = index.get("condensed-qi-dew");
  assert.ok(dewRefs);
  assert.equal(dewRefs[0]!.targetLevel, 2);
});

test("buildBreakthroughReverseIndex handles material appearing in multiple levels", () => {
  const levels: BreakthroughLevelEntry[] = [
    { targetLevel: 2, targetRealm: "炼气", materials: [{ itemId: "cloud-heart-grass" as ItemId, count: 3 }] },
    { targetLevel: 3, targetRealm: "炼气", materials: [{ itemId: "cloud-heart-grass" as ItemId, count: 4 }] },
  ];
  const index = buildBreakthroughReverseIndex(levels);
  const refs = index.get("cloud-heart-grass");
  assert.ok(refs);
  assert.equal(refs.length, 2);
  assert.equal(refs[0]!.targetLevel, 2);
  assert.equal(refs[1]!.targetLevel, 3);
});

// ---- buildItemUsageSummary ----

test("buildItemUsageSummary returns sellable for spirit-ore", () => {
  const recipeIndex = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([]);
  const summary = buildItemUsageSummary("spirit-ore" as ItemId, ITEM_CATALOG, recipeIndex, btIndex);
  assert.ok(summary.sellable, "spirit-ore should be sellable");
  assert.equal(summary.sellable.baseValue, ITEM_CATALOG["spirit-ore"].trade.sellBasePrice);
});

test("buildItemUsageSummary returns directUse for healing-pill", () => {
  const recipeIndex = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([]);
  const summary = buildItemUsageSummary("healing-pill" as ItemId, ITEM_CATALOG, recipeIndex, btIndex);
  assert.ok(summary.directUse, "healing-pill should have directUse");
  assert.equal(summary.directUse.kind, "consume");
});

test("buildItemUsageSummary returns recipeInputFor for spirit-ore (includes healing-pill and qi-pill)", () => {
  const recipeIndex = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([]);
  const summary = buildItemUsageSummary("spirit-ore" as ItemId, ITEM_CATALOG, recipeIndex, btIndex);
  assert.ok(summary.recipeInputFor, "spirit-ore should have recipeInputFor");
  const ids = summary.recipeInputFor.map((r) => r.recipeId);
  assert.ok(ids.includes("recipe-healing-pill"));
  assert.ok(ids.includes("recipe-qi-pill"));
});

test("buildItemUsageSummary returns breakthroughMaterialFor when material is in breakthrough index", () => {
  const recipeIndex = buildRecipeReverseIndex([], ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([
    { targetLevel: 2, targetRealm: "炼气", materials: [{ itemId: "cloud-heart-grass" as ItemId, count: 3 }] },
  ]);
  const summary = buildItemUsageSummary("cloud-heart-grass" as ItemId, ITEM_CATALOG, recipeIndex, btIndex);
  assert.ok(summary.breakthroughMaterialFor);
  assert.equal(summary.breakthroughMaterialFor.length, 1);
  assert.equal(summary.breakthroughMaterialFor[0]!.targetLevel, 2);
});

test("buildItemUsageSummary returns loadoutUnlock for weapon source items", () => {
  const recipeIndex = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([]);
  // Find any weapon-item- key in catalog
  const weaponItemId = Object.keys(ITEM_CATALOG).find((id) => id.startsWith("weapon-item-")) as ItemId | undefined;
  if (weaponItemId) {
    const summary = buildItemUsageSummary(weaponItemId, ITEM_CATALOG, recipeIndex, btIndex);
    assert.ok(summary.loadoutUnlock, `${weaponItemId} should have loadoutUnlock`);
    assert.equal(summary.loadoutUnlock.type, "weapon");
  }
});

test("buildItemUsageSummary returns empty summary for unknown item", () => {
  const recipeIndex = buildRecipeReverseIndex([], ITEM_CATALOG);
  const btIndex = buildBreakthroughReverseIndex([]);
  const summary = buildItemUsageSummary("nonexistent-item" as ItemId, ITEM_CATALOG, recipeIndex, btIndex);
  assert.equal(summary.sellable, undefined);
  assert.equal(summary.directUse, undefined);
  assert.equal(summary.recipeInputFor, undefined);
  assert.equal(summary.breakthroughMaterialFor, undefined);
  assert.equal(summary.loadoutUnlock, undefined);
});

// ---- buildSpiritStoneUsageSummary ----

test("buildSpiritStoneUsageSummary includes all enabled recipes with spiritStoneCost", () => {
  const summary = buildSpiritStoneUsageSummary(RESIDENCE_PRODUCTION_RECIPES);
  assert.equal(summary.spiritStoneUsage, true);
  assert.equal(summary.marketBuying, true);
  assert.ok(summary.recipeCosts.length > 0, "should have at least one recipe cost");
  assert.ok(summary.recipeCosts.some((c) => c.recipeId === "recipe-healing-pill" && c.cost === 30));
  assert.ok(summary.recipeCosts.some((c) => c.recipeId === "recipe-qi-pill" && c.cost === 25));
  assert.ok(summary.recipeCosts.some((c) => c.recipeId === "recipe-ward-talisman" && c.cost === 40));
});

test("buildSpiritStoneUsageSummary excludes disabled recipes", () => {
  const recipes: ProductionRecipe[] = [
    { id: "r-enabled", outputItemId: "healing-pill" as ItemId, outputCount: 1, inputMaterials: [], spiritStoneCost: 50, durationTicks: 1, enabledInLive: true },
    { id: "r-disabled", outputItemId: "qi-pill" as ItemId, outputCount: 1, inputMaterials: [], spiritStoneCost: 99, durationTicks: 1, enabledInLive: false },
  ];
  const summary = buildSpiritStoneUsageSummary(recipes);
  assert.equal(summary.recipeCosts.length, 1);
  assert.equal(summary.recipeCosts[0]!.recipeId, "r-enabled");
});

// ---- Sustainability Assertion ----

test("every inputMaterial in RESIDENCE_PRODUCTION_RECIPES appears in the recipe reverse index", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  for (const recipe of RESIDENCE_PRODUCTION_RECIPES) {
    if (!recipe.enabledInLive) continue;
    for (const mat of recipe.inputMaterials) {
      const refs = index.get(mat.itemId);
      assert.ok(refs, `input material ${mat.itemId} from recipe ${recipe.id} must appear in recipe reverse index`);
      assert.ok(refs.some((r) => r.recipeId === recipe.id), `${mat.itemId} index must reference back to ${recipe.id}`);
    }
  }
});

test("recipe reverse index outputName matches ITEM_CATALOG name for all legacy recipes", () => {
  const index = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  for (const refs of index.values()) {
    for (const ref of refs) {
      const catalogEntry = ITEM_CATALOG[ref.outputItemId];
      if (catalogEntry) {
        assert.equal(ref.outputName, catalogEntry.name, `outputName for ${ref.recipeId} should match ITEM_CATALOG[${ref.outputItemId}].name`);
      }
    }
  }
});
