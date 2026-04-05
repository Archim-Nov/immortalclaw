# Item Catalog V2 Unification

## Summary

This spec upgrades the item catalog from a single-language runtime metadata table into a unified, multilingual, content-and-behavior source of truth.

The live runtime already has:

- a canonical `ITEM_CATALOG` entrypoint
- inventory-backed item actions
- residence production outputs that are item-based
- loadout sourcing items generated for combat progression

What it does **not** have yet is a clean V2 item architecture that:

- treats all current items and sourced combat items as one catalog system
- separates content text from runtime behavior ownership
- supports multilingual item text without breaking current callers
- keeps names and derived source-item names maintainable as authored content grows

This spec defines that V2 architecture.

## Problem

The current item system has three structural problems.

### 1. The catalog is unified at the entrypoint, but not in authorship

`packages/domain/src/items/catalog.ts` is already the runtime entrypoint, but authored content is still mixed together:

- legacy consumables and materials are defined inline inside the catalog file
- loadout source items are generated in `loadout-sourcing.ts`
- behavior mappings and catalog assembly live side by side

That means the runtime has one catalog, but the repository still has several competing authorship locations.

### 2. Item text is not ready for multilingual content

The current data model still assumes single-language strings:

- `ItemDefinition.name`
- `ItemDefinition.description`
- `ItemUseDefinition.effectSummary`

This makes it hard to:

- localize inventory and item-backed action surfaces
- author combat source items in multiple languages
- keep future naming changes consistent across derived items

### 3. Naming and behavior are still too tightly coupled

Combat loadout sourcing already generates:

- weapon materials
- forged weapon items
- spell fragments
- completed spell manuals

But the same module currently owns both:

- sourcing behavior rules
- final player-facing names and descriptions

That creates avoidable maintenance cost. A content rename should not require touching sourcing logic.

## Goals

- Make the item catalog the single source of truth for all current items and first-wave loadout source items.
- Add multilingual item text support for `zh-CN` and `en`.
- Preserve current runtime compatibility by keeping existing scalar text fields available.
- Separate item content authorship from runtime behavior assembly.
- Move loadout source item display text to a centralized naming source.
- Keep loadout source names derived from core weapon and spell names instead of hand-maintained parallel strings.
- Preserve all current item behavior unless explicitly changed by this spec.

## Non-Goals

- No external spreadsheet import pipeline in this wave.
- No full-project localization pass across every action, log, and UI surface.
- No redesign of current trade economics, rarity systems, affixes, or dismantling.
- No changes to combat formulas, loadout tier availability, or sourcing rules.
- No replacement of current `ItemId` values for existing items.

## Agent-First Constraints

This repository is built for agent play as well as human-facing game access.

The item catalog therefore has to optimize for structured machine-readable semantics, not only prose descriptions.

Agents should be able to inspect:

- an item's multilingual display text
- its category and tags
- whether it can be bought, sold, used, studied, or used to unlock a loadout
- the action id associated with that interaction
- the effect summary of that interaction

without guessing behavior from freeform narrative text.

## Core Rules

### 1. The item catalog remains TypeScript-config driven

This wave keeps the item catalog inside repository-owned TypeScript modules.

That is a deliberate rule, not a temporary shortcut.

Reasons:

- the current runtime, tests, and hydration logic already depend on TypeScript definitions
- V2 first needs a stable data contract before any future import pipeline
- moving to CSV or spreadsheet import now would add parsing and validation complexity before the structure is settled

### 2. Multilingual text uses locale maps

The canonical locale set for V2 item text is:

- `zh-CN`
- `en`

The canonical text container is:

- `LocalizedText = Record<RegistrationLocale, string>`

This becomes the new authored source for item text fields.

### 3. Existing scalar text fields stay as compatibility mirrors

To avoid breaking the current runtime and current callers, V2 keeps these existing fields:

- `ItemDefinition.name`
- `ItemDefinition.description`
- `ItemUseDefinition.effectSummary`

Their compatibility contract is frozen:

- `name === nameByLocale["zh-CN"]`
- `description === descriptionByLocale["zh-CN"]`
- `effectSummary === effectSummaryByLocale["zh-CN"]` when non-null

So V2 adds multilingual truth without forcing a one-wave migration of every existing consumer.

### 4. Names become authored content, not embedded logic

Weapon and spell progression items should no longer own their final names inside sourcing logic modules.

Instead:

- weapon loadouts own the core weapon names
- spell loadouts own the core spell names
- source item names are derived from those names

This means:

- a weapon rename should automatically update its material and unlock-item names
- a spell rename should automatically update its fragment and full-manual names

## Data Contract

### ItemDefinition

`ItemDefinition` must gain:

- `nameByLocale: LocalizedText`
- `descriptionByLocale: LocalizedText`

and keep:

- `name`
- `description`

### ItemUseDefinition

`ItemUseDefinition` must gain:

- `effectSummaryByLocale: LocalizedText | null`

and keep:

- `effectSummary`

### InventoryEntryView

Inventory state must expose the same multilingual item text additively:

- `nameByLocale`
- `descriptionByLocale`
- `use.effectSummaryByLocale`

This lets current UI and agent-facing state gradually adopt multilingual rendering without blocking the runtime.

## Catalog Architecture

### 1. Catalog assembly stays centralized

`packages/domain/src/items/catalog.ts` remains the public runtime entrypoint for:

- `ITEM_CATALOG`
- `ITEM_IDS`
- item-to-action bindings
- action-to-item bindings

That file remains the runtime assembler.

### 2. Authored content is split into sub-registries

V2 formalizes authored item content into separate sub-registries:

- legacy consumables
- legacy materials
- breakthrough items
- special items
- loadout source items

This split is about authorship and maintenance, not changing runtime semantics.

### 3. Shared item helpers become explicit

V2 allows and expects shared helper utilities for:

- creating localized text objects
- resolving locale values
- applying default templates for material-like items
- deriving source-item text from loadout names

These helpers are part of the catalog architecture and not considered implementation detail drift.

## Loadout Source Naming Rules

### 1. Core names are the only manually maintained names

The repository should manually author only:

- `100` weapon loadout core names
- `75` spell loadout core names

Those names must be authored in both:

- `zh-CN`
- `en`

### 2. Derived item naming is fixed

Derived names are frozen to these rules.

#### Weapon side

- source material:
  - `zh-CN`: `<weapon name>锻材`
  - `en`: `<weapon name> Forging Materials`
- forged item:
  - `zh-CN`: `<weapon name>`
  - `en`: `<weapon name>`

#### Spell side

- fragment:
  - `zh-CN`: `<spell name>残本`
  - `en`: `Fragment of <spell name>`
- completed manual:
  - `zh-CN`: `<spell name>`
  - `en`: `<spell name>`

### 3. Derived descriptions and effect summaries may also be templated

V2 allows source-chain descriptions and unlock summaries to be mechanically derived from:

- core localized names
- loadout ids
- unlock target type

This is preferred over hand-authoring hundreds of nearly identical strings.

## Scope Of Unified Catalog Content

The V2 catalog must include:

- all current legacy items
- all current breakthrough materials
- all current tickets and special items
- all loadout source items already defined by combat progression

For first-wave combat sourcing, this includes:

- `100` weapon materials
- `100` weapon unlock items
- `75` spell fragments
- `75` spell manuals

Tier `4` and `5` items remain authored in data but non-live, following the sourcing spec.

## Runtime Compatibility

The following behaviors must remain unchanged:

- current consumable effects
- current buy and sell routes
- current ticket semantics
- current breakthrough item semantics
- current `unlock-loadout` semantics

This spec is about catalog architecture and multilingual support, not gameplay rebalance.

## Persistence Compatibility

Old stored worlds must continue to hydrate successfully.

Hydration here means: when older saved data is loaded into a newer code version, the runtime fills in new fields that did not exist before.

V2 requires:

- old worlds keep their current inventory counts
- old worlds keep their current item definitions
- newly introduced multilingual fields are backfilled through catalog defaults
- `zh-CN` acts as the compatibility baseline for scalar fields

## Acceptance Criteria

- all current item content is served from one unified catalog architecture
- item definitions support both `zh-CN` and `en`
- legacy scalar text fields remain present and mirror `zh-CN`
- inventory item views expose multilingual text additively
- loadout source item names are derived from centralized core weapon and spell names
- sourcing logic no longer owns final display names as its long-term source of truth
- existing item behavior remains unchanged
- old worlds hydrate without inventory or item-definition regressions

## Open Questions

- In a later wave, should action labels and dao log copy also switch to locale-driven text from the same content source?
- After V2 is stable, should the repository add an external content authoring pipeline on top of the TypeScript catalog?
