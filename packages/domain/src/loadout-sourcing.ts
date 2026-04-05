import type {
  ItemId,
  ProductionRecipe,
  WeaponLoadoutId,
  SpellLoadoutId,
  WeaponTier,
  SpellTier,
} from "./model.js";
import { WEAPON_LOADOUT_DEFINITIONS, SPELL_LOADOUT_DEFINITIONS } from "./combat-loadouts.js";

// ---- Cost & Duration Tables ----

const WEAPON_FORGE_COSTS: Record<WeaponTier, number> = {
  1: 40,
  2: 90,
  3: 160,
  4: 260,
  5: 400,
};

const SPELL_SYNTH_COSTS: Record<SpellTier, number> = {
  1: 30,
  2: 70,
  3: 130,
  4: 220,
  5: 340,
};

const TIER_DURATION: Record<WeaponTier, number> = {
  1: 2,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

// ---- Hash Utility ----

function hashValue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ---- Generate Recipes ----

const weaponRecipes: ProductionRecipe[] = [];

for (const wl of Object.values(WEAPON_LOADOUT_DEFINITIONS)) {
  const tier: WeaponTier = wl.weaponTier ?? 1;
  const wlId = wl.id;

  weaponRecipes.push(
    Object.freeze<ProductionRecipe>({
      id: `recipe-forge-${wlId}`,
      outputItemId: `weapon-item-${wlId}` as ItemId,
      outputCount: 1,
      inputMaterials: [{ itemId: `weapon-material-${wlId}` as ItemId, count: 1 }],
      spiritStoneCost: WEAPON_FORGE_COSTS[tier],
      durationTicks: TIER_DURATION[tier],
      enabledInLive: tier <= 3,
    }),
  );
}

const spellRecipes: ProductionRecipe[] = [];

for (const sl of Object.values(SPELL_LOADOUT_DEFINITIONS)) {
  const tier: SpellTier = sl.spellTier ?? 1;
  const slId = sl.id;

  spellRecipes.push(
    Object.freeze<ProductionRecipe>({
      id: `recipe-synthesize-${slId}`,
      outputItemId: `spell-manual-${slId}` as ItemId,
      outputCount: 1,
      inputMaterials: [{ itemId: `spell-fragment-${slId}` as ItemId, count: 1 }],
      spiritStoneCost: SPELL_SYNTH_COSTS[tier],
      durationTicks: TIER_DURATION[tier],
      enabledInLive: tier <= 3,
    }),
  );
}

export const LOADOUT_SOURCE_RECIPES: readonly ProductionRecipe[] = Object.freeze([
  ...weaponRecipes,
  ...spellRecipes,
]);

// ---- Tier-Indexed Source Pools ----

function buildTierPool<T extends { id: string }>(
  defs: Record<string, T>,
  getTier: (d: T) => number,
  prefix: string,
): Record<1 | 2 | 3 | 4 | 5, ItemId[]> {
  const pool: Record<1 | 2 | 3 | 4 | 5, ItemId[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const d of Object.values(defs)) {
    const t = getTier(d) as 1 | 2 | 3 | 4 | 5;
    pool[t].push(`${prefix}${d.id}` as ItemId);
  }
  return pool;
}

export const WEAPON_SOURCE_ITEMS_BY_TIER: Record<1 | 2 | 3 | 4 | 5, ItemId[]> = buildTierPool(
  WEAPON_LOADOUT_DEFINITIONS,
  (w) => w.weaponTier ?? 1,
  "weapon-material-",
);

export const SPELL_SOURCE_ITEMS_BY_TIER: Record<1 | 2 | 3 | 4 | 5, ItemId[]> = buildTierPool(
  SPELL_LOADOUT_DEFINITIONS,
  (s) => s.spellTier ?? 1,
  "spell-fragment-",
);

// ---- Source Drop Picker ----

export function pickLoadoutSourceDrop(tier: 1 | 2 | 3, seed: string): ItemId {
  const weaponMaterials = WEAPON_SOURCE_ITEMS_BY_TIER[tier];
  const spellFragments = SPELL_SOURCE_ITEMS_BY_TIER[tier];
  const hash = hashValue(seed);
  const isWeapon = hash % 2 === 0;
  const pool = isWeapon ? weaponMaterials : spellFragments;
  const idx = hashValue(`${seed}:pick`) % pool.length;
  return pool[idx]!;
}
