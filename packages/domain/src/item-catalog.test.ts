import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "./index.js";
import { ITEM_CATALOG, ITEM_IDS } from "./items/catalog.js";
import {
  WEAPON_LOADOUT_NAME_BY_ID,
  SPELL_LOADOUT_NAME_BY_ID,
} from "./items/loadout-item-names.js";

test("item catalog covers all current items with agent-readable metadata", () => {
  const world = createSeedWorld();

  assert.deepEqual(
    [...ITEM_IDS].sort(),
    Object.keys(world.itemDefinitions).sort(),
  );

  for (const itemId of ITEM_IDS) {
    const definition = ITEM_CATALOG[itemId];
    assert.ok(definition);
    assert.ok(Array.isArray(definition.tags));
    assert.ok("trade" in definition);
    assert.ok("use" in definition);
    assert.ok(definition.use.kind);
    assert.ok("actionId" in definition.use);
    assert.ok("consumesOnUse" in definition.use);
  }

  assert.equal(world.itemDefinitions["eight-wastes-pass"].use.kind, "ticket");
  assert.deepEqual(world.itemDefinitions["eight-wastes-pass"].use.ticketTargets, ["eight-wastes-threshold"]);
  assert.equal(world.itemDefinitions["healing-pill"].trade.buyBasePrice, 100);
  assert.equal(world.itemDefinitions["spirit-ore"].trade.sellBasePrice, 115);
  assert.equal("sword-manual" in (world.itemDefinitions as Record<string, unknown>), false);
  assert.equal("alchemy-manual" in (world.itemDefinitions as Record<string, unknown>), false);
  assert.equal("array-manual" in (world.itemDefinitions as Record<string, unknown>), false);
});

test("item catalog enforces V2 localization parity and zh-CN compatibility fields", () => {
  for (const itemId of ITEM_IDS) {
    const definition = ITEM_CATALOG[itemId];

    assert.equal(typeof definition.nameByLocale["zh-CN"], "string", `${itemId} missing zh-CN name`);
    assert.equal(typeof definition.nameByLocale.en, "string", `${itemId} missing en name`);
    assert.equal(
      typeof definition.descriptionByLocale["zh-CN"],
      "string",
      `${itemId} missing zh-CN description`,
    );
    assert.equal(typeof definition.descriptionByLocale.en, "string", `${itemId} missing en description`);

    assert.equal(
      definition.name,
      definition.nameByLocale["zh-CN"],
      `${itemId} name must equal zh-CN localized name`,
    );
    assert.equal(
      definition.description,
      definition.descriptionByLocale["zh-CN"],
      `${itemId} description must equal zh-CN localized description`,
    );

    if (definition.use.effectSummaryByLocale !== null) {
      assert.equal(
        typeof definition.use.effectSummaryByLocale["zh-CN"],
        "string",
        `${itemId} effectSummaryByLocale missing zh-CN`,
      );
      assert.equal(
        typeof definition.use.effectSummaryByLocale.en,
        "string",
        `${itemId} effectSummaryByLocale missing en`,
      );
      assert.equal(
        definition.use.effectSummary,
        definition.use.effectSummaryByLocale["zh-CN"],
        `${itemId} effectSummary must equal zh-CN localized effect summary`,
      );
    } else {
      assert.equal(
        definition.use.effectSummary,
        null,
        `${itemId} effectSummary must be null when effectSummaryByLocale is null`,
      );
    }
  }
});

test("weapon and spell source item names stay derived from core loadout names", () => {
  for (const [loadoutId, nameByLocale] of Object.entries(WEAPON_LOADOUT_NAME_BY_ID)) {
    const material = ITEM_CATALOG[`weapon-material-${loadoutId}` as keyof typeof ITEM_CATALOG];
    const unlock = ITEM_CATALOG[`weapon-item-${loadoutId}` as keyof typeof ITEM_CATALOG];

    assert.ok(material, `missing weapon material for ${loadoutId}`);
    assert.ok(unlock, `missing weapon unlock item for ${loadoutId}`);

    assert.equal(material.nameByLocale["zh-CN"], `${nameByLocale["zh-CN"]}锻材`);
    assert.equal(material.nameByLocale.en, `${nameByLocale.en} Forging Materials`);
    assert.equal(unlock.nameByLocale["zh-CN"], nameByLocale["zh-CN"]);
    assert.equal(unlock.nameByLocale.en, nameByLocale.en);
  }

  for (const [loadoutId, nameByLocale] of Object.entries(SPELL_LOADOUT_NAME_BY_ID)) {
    const fragment = ITEM_CATALOG[`spell-fragment-${loadoutId}` as keyof typeof ITEM_CATALOG];
    const manual = ITEM_CATALOG[`spell-manual-${loadoutId}` as keyof typeof ITEM_CATALOG];

    assert.ok(fragment, `missing spell fragment for ${loadoutId}`);
    assert.ok(manual, `missing spell manual for ${loadoutId}`);

    assert.equal(fragment.nameByLocale["zh-CN"], `${nameByLocale["zh-CN"]}残本`);
    assert.equal(fragment.nameByLocale.en, `Fragment of ${nameByLocale.en}`);
    assert.equal(manual.nameByLocale["zh-CN"], nameByLocale["zh-CN"]);
    assert.equal(manual.nameByLocale.en, nameByLocale.en);
  }
});
