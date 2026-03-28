import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "./index.js";
import { ITEM_CATALOG, ITEM_IDS } from "./items/catalog.js";

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
});
