import { RESIDENCE_PRODUCTION_RECIPES } from "./constants.js";
import type { Cultivator, ProductionRecipe, ResidenceActionId } from "./model.js";

export function isAtResidence(cultivator: Cultivator): boolean {
  return cultivator.locationId === cultivator.residence.locationId;
}

export function requireResidenceActionAllowed(
  cultivator: Cultivator,
  actionId: ResidenceActionId,
): void {
  if (!isAtResidence(cultivator)) {
    throw new Error(`Residence actions require being at your residence. Your residence "${cultivator.residence.name}" is located at ${cultivator.residence.locationId}. You are currently at ${cultivator.locationId}.`);
  }
  if (actionId === "residence-meditate" && cultivator.injuryTicksRemaining > 0) {
    throw new Error("Injured cultivators cannot residence-meditate.");
  }
}

export function getResidenceRecipeById(recipeId: string): ProductionRecipe | null {
  return RESIDENCE_PRODUCTION_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getFirstCraftableResidenceRecipe(cultivator: Cultivator): ProductionRecipe | null {
  return RESIDENCE_PRODUCTION_RECIPES.find((recipe) => canCraftResidenceRecipe(cultivator, recipe)) ?? null;
}

export function canCraftResidenceRecipe(cultivator: Cultivator, recipe: ProductionRecipe): boolean {
  if (cultivator.spiritStones < recipe.spiritStoneCost) return false;
  return recipe.inputMaterials.every((material) => cultivator.inventory[material.itemId] >= material.count);
}

export function consumeResidenceRecipeInputs(cultivator: Cultivator, recipe: ProductionRecipe): void {
  for (const material of recipe.inputMaterials) {
    cultivator.inventory[material.itemId] -= material.count;
  }
  cultivator.spiritStones -= recipe.spiritStoneCost;
}
