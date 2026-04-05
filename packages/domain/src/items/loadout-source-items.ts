import type {
  ItemDefinition,
  ItemId,
  LocalizedText,
  WeaponLoadoutId,
  SpellLoadoutId,
  WeaponTier,
  SpellTier,
} from "../model.js";
import { WEAPON_LOADOUT_DEFINITIONS, SPELL_LOADOUT_DEFINITIONS } from "../combat-loadouts.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";
import { WEAPON_LOADOUT_NAME_BY_ID, SPELL_LOADOUT_NAME_BY_ID } from "./loadout-item-names.js";

// ---- Derive Weapon Source Texts ----

function deriveWeaponSourceTexts(name: LocalizedText): {
  materialName: LocalizedText;
  materialDesc: LocalizedText;
  unlockName: LocalizedText;
  unlockDesc: LocalizedText;
  unlockEffect: LocalizedText;
} {
  return {
    materialName: makeLocalizedText(
      `${name["zh-CN"]}锻材`,
      `${name.en} Forging Materials`,
    ),
    materialDesc: makeLocalizedText(
      `用于在洞府锻造${name["zh-CN"]}的原始材料。`,
      `Raw materials for forging ${name.en} at the residence.`,
    ),
    unlockName: makeLocalizedText(name["zh-CN"], name.en),
    unlockDesc: makeLocalizedText(
      `使用后永久解锁武器装配「${name["zh-CN"]}」。`,
      `Permanently unlocks weapon loadout "${name.en}" upon use.`,
    ),
    unlockEffect: makeLocalizedText(
      `永久解锁武器装配「${name["zh-CN"]}」，不会自动装备。`,
      `Permanently unlocks weapon loadout "${name.en}". Does not auto-equip.`,
    ),
  };
}

// ---- Derive Spell Source Texts ----

function deriveSpellSourceTexts(name: LocalizedText): {
  fragmentName: LocalizedText;
  fragmentDesc: LocalizedText;
  manualName: LocalizedText;
  manualDesc: LocalizedText;
  manualEffect: LocalizedText;
} {
  return {
    fragmentName: makeLocalizedText(
      `${name["zh-CN"]}残本`,
      `Fragment of ${name.en}`,
    ),
    fragmentDesc: makeLocalizedText(
      `功法残本，需在洞府合成完整功法「${name["zh-CN"]}」。`,
      `Spell fragment, synthesize into the full spell "${name.en}" at the residence.`,
    ),
    manualName: makeLocalizedText(name["zh-CN"], name.en),
    manualDesc: makeLocalizedText(
      `使用后永久解锁法术装配「${name["zh-CN"]}」。`,
      `Permanently unlocks spell loadout "${name.en}" upon use.`,
    ),
    manualEffect: makeLocalizedText(
      `永久解锁法术装配「${name["zh-CN"]}」，不会自动装备。`,
      `Permanently unlocks spell loadout "${name.en}". Does not auto-equip.`,
    ),
  };
}

// ---- Generate Weapon Items ----

const weaponItems: ItemDefinition[] = [];

for (const wl of Object.values(WEAPON_LOADOUT_DEFINITIONS)) {
  const tier: WeaponTier = wl.weaponTier ?? 1;
  const wlId = wl.id;
  const coreName = WEAPON_LOADOUT_NAME_BY_ID[wlId];
  const texts = deriveWeaponSourceTexts(coreName);

  // Weapon Material
  weaponItems.push(
    Object.freeze<ItemDefinition>({
      id: `weapon-material-${wlId}` as ItemId,
      name: texts.materialName["zh-CN"],
      nameByLocale: texts.materialName,
      category: "material",
      description: texts.materialDesc["zh-CN"],
      descriptionByLocale: texts.materialDesc,
      baseValue: 0,
      tags: ["material", "weapon-source", "crafted-input", `tier-${tier}`],
      trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
      use: MATERIAL_USE,
    }),
  );

  // Weapon Unlock Item
  weaponItems.push(
    Object.freeze<ItemDefinition>({
      id: `weapon-item-${wlId}` as ItemId,
      name: texts.unlockName["zh-CN"],
      nameByLocale: texts.unlockName,
      category: "manual",
      description: texts.unlockDesc["zh-CN"],
      descriptionByLocale: texts.unlockDesc,
      baseValue: 0,
      tags: ["manual", "weapon-unlock", `tier-${tier}`],
      trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
      use: {
        kind: "unlock-loadout",
        actionId: null,
        consumesOnUse: true,
        effectSummary: texts.unlockEffect["zh-CN"],
        effectSummaryByLocale: texts.unlockEffect,
        effectBundle: null,
        grantsTechnique: null,
        ticketTargets: null,
        grantsWeaponLoadoutId: wlId as WeaponLoadoutId,
        grantsSpellLoadoutId: null,
      },
    }),
  );
}

// ---- Generate Spell Items ----

const spellItems: ItemDefinition[] = [];

for (const sl of Object.values(SPELL_LOADOUT_DEFINITIONS)) {
  const tier: SpellTier = sl.spellTier ?? 1;
  const slId = sl.id;
  const coreName = SPELL_LOADOUT_NAME_BY_ID[slId];
  const texts = deriveSpellSourceTexts(coreName);

  // Spell Fragment
  spellItems.push(
    Object.freeze<ItemDefinition>({
      id: `spell-fragment-${slId}` as ItemId,
      name: texts.fragmentName["zh-CN"],
      nameByLocale: texts.fragmentName,
      category: "material",
      description: texts.fragmentDesc["zh-CN"],
      descriptionByLocale: texts.fragmentDesc,
      baseValue: 0,
      tags: ["material", "spell-source", "crafted-input", `tier-${tier}`],
      trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
      use: MATERIAL_USE,
    }),
  );

  // Spell Manual
  spellItems.push(
    Object.freeze<ItemDefinition>({
      id: `spell-manual-${slId}` as ItemId,
      name: texts.manualName["zh-CN"],
      nameByLocale: texts.manualName,
      category: "manual",
      description: texts.manualDesc["zh-CN"],
      descriptionByLocale: texts.manualDesc,
      baseValue: 0,
      tags: ["manual", "spell-unlock", `tier-${tier}`],
      trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
      use: {
        kind: "unlock-loadout",
        actionId: null,
        consumesOnUse: true,
        effectSummary: texts.manualEffect["zh-CN"],
        effectSummaryByLocale: texts.manualEffect,
        effectBundle: null,
        grantsTechnique: null,
        ticketTargets: null,
        grantsWeaponLoadoutId: null,
        grantsSpellLoadoutId: slId as SpellLoadoutId,
      },
    }),
  );
}

// ---- Build Exported Lookup ----

const allItems = [...weaponItems, ...spellItems];

export const LOADOUT_SOURCE_ITEMS: Record<ItemId, ItemDefinition> = Object.freeze(
  Object.fromEntries(allItems.map((item) => [item.id, item])) as Record<ItemId, ItemDefinition>,
);
