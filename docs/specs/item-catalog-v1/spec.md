# Item Catalog V1

## Summary

This spec introduces a behavior-driven item catalog for the current cultivation runtime.
The goal is not just to centralize names and values, but to turn item metadata into a reliable source of truth for agent decision-making, trade, use, study, and ticket semantics.

## Problem

The runtime currently has a shallow item definition table plus several separate hardcoded behavior paths:

- `seed.ts` defines item names, categories, descriptions, and base values
- `engine.ts` separately hardcodes buy and sell prices
- consumable effects are hardcoded in action branches
- manual study behavior and granted techniques are hardcoded in a dedicated mapping
- tickets and special items are visible in inventory but do not expose their gameplay meaning to agents

This creates two problems:

- item behavior is fragmented across multiple files, which makes balancing and extension slow
- agent-facing state and action payloads do not expose enough structured information for reliable planning

## Goals

- Create one canonical item catalog for all current `ItemId` values.
- Move current item metadata out of `seed.ts` into a dedicated item module.
- Extend item definitions with structured trade, use, and tagging metadata.
- Make buy, sell, use, and study runtime behavior read from the catalog instead of local hardcoded tables.
- Expose item-backed action metadata and inventory actionability through existing state and actions APIs.
- Preserve legacy stored worlds through hydration defaults without requiring a reset.

## Non-Goals

- Adding a new standalone `/items` API.
- Moving residence recipes into the item catalog.
- Designing a future rarity, loot-table, or affix system.
- Renaming current actions or changing route shapes.

## Agent-First Constraints

This game is intended for agent play as well as human-facing runtime access.
The item system should therefore optimize for structured actionability instead of prose-only hints.

The runtime should make it possible for an agent to inspect:

- what an item is for
- whether it can currently be used, studied, or sold
- which action id corresponds to that interaction
- what the approximate cost and effect of that action will be

without requiring the agent to infer rules from string descriptions.

## User-Visible Behavior

Players and agents should continue to see the same action ids and the same core item behavior:

- healing pill, qi pill, and ward talisman remain the same consumables
- the three manuals still grant their current techniques and short-term states
- trade prices still reflect current location reputation modifiers
- eight wastes entry still consumes the same ticket through wilderness entry logic

What changes is the amount of structured metadata returned by existing state and action endpoints:

- inventory entries now include tags, trade metadata, use metadata, and currently available item action ids
- item-backed actions now include structured item bindings, costs, and effect summaries

## Acceptance Criteria

- `packages/domain/src/items/catalog.ts` becomes the canonical source for all current item definitions.
- `seed.ts` consumes the item catalog instead of owning the definitions inline.
- `ItemDefinition`, `InventoryEntryView`, and `AvailableAction` are extended additively for agent decision support.
- `engine.ts` no longer hardcodes buy and sell base prices, consumable effects, or manual technique mappings outside the catalog flow.
- old persisted worlds are hydrated with the new item metadata shape through existing world hydration.
- domain and persistence tests cover catalog completeness, runtime action metadata, and hydration compatibility.

## Open Questions

- In a future version, should recipes reference richer item tags instead of explicit item ids?
- Should later agent-facing work add priority hints or strategic value scores on top of item metadata?
