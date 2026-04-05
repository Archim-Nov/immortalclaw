# Combat Loadout Sourcing V2

## Summary

This spec turns combat loadouts into authored progression targets instead of starter-only hidden data.

The live runtime already has:

- `100` weapon loadouts
- `75` spell loadouts
- a residence production system that consumes materials and outputs items
- inventory-backed item use
- separate equip actions for weapon and spell loadouts

What it does **not** have yet is a stable sourcing chain between world drops, residence production, inventory items, and permanent loadout unlocks.

This spec adds that chain without changing the residence production contract.

The frozen sourcing loop is:

- weapons: `drop source material -> forge at residence -> get weapon item -> use item -> unlock weapon loadout`
- spells: `drop fragment -> synthesize at residence -> get full manual -> use manual -> unlock spell loadout`

## Problem

The current combat V2 layer is mechanically rich but progression-light:

- loadouts exist, but most are not earned through authored gameplay loops
- residence production can only output items, not unlock combat content directly
- item use can grant effects or techniques, but it does not yet unlock combat loadouts
- drop sources do not currently feed weapon and spell progression in a structured way
- wilderness is not yet configured as a live tier-1 source for this progression path

That creates four gameplay gaps:

- combat build growth is not yet part of the exploration loop
- residence production is useful, but not yet tied to combat expansion
- weapon progression and spell progression are not yet legible to agents from inventory and actions
- future high-tier combat content would need ad hoc unlock rules instead of one stable sourcing model

## Goals

- Make every weapon loadout and spell loadout belong to a concrete sourcing chain.
- Keep residence production item-based instead of introducing direct loadout production.
- Make inventory the bridge between drop acquisition and permanent combat unlocks.
- Keep tier availability explicit and controllable.
- Enable live progression for tiers `1..3` now.
- Pre-register tiers `4..5` for future expansion without exposing them in live loops.
- Keep the entire chain legible through structured state and action lists.

## Non-Goals

- No residence building upgrade tree in this wave.
- No direct market purchase path for weapon source materials or spell fragments.
- No partial synthesis progress or multi-fragment assembly formulas.
- No automatic equip-on-unlock behavior.
- No duplicate-item conversion, refund, salvage, or dismantling system.
- No tier-4 or tier-5 live drop sources in this wave.
- No changes to combat formulas, combat balancing, or loadout stat definitions.

## Player And Agent Contract

The runtime must make the sourcing chain inspectable without requiring prose-only interpretation.

Agents should be able to inspect:

- which source items currently exist in inventory
- which residence recipes are currently craftable
- which forged weapons or completed manuals can be used right now
- which loadout each item unlocks
- whether using the item will consume it
- whether the target loadout is already unlocked
- which activities can drop tier-1, tier-2, or tier-3 source items

This information belongs in structured runtime data:

- inventory item definitions
- available actions
- state view unlocked loadout lists
- optional state hints for pending unlockable items

## Mechanics

### 1. Core Loop

The live loop for sourced loadouts is fixed as follows.

#### Weapons

1. Obtain one authored weapon source material from an allowed drop source.
2. Return to residence.
3. Run the matching residence forging recipe.
4. Receive one forged weapon item in inventory.
5. Use that item through an explicit unlock action.
6. Permanently unlock the matching weapon loadout.

#### Spells

1. Obtain one authored spell fragment from an allowed drop source.
2. Return to residence.
3. Run the matching residence synthesis recipe.
4. Receive one completed spell manual in inventory.
5. Use that manual through an explicit unlock action.
6. Permanently unlock the matching spell loadout.

### 2. Item Counts And Tier Counts

The content counts are frozen for this wave.

#### Weapon side

- `20 weapon types × 5 tiers = 100 weapon source materials`
- `100 forged weapon items`
- `100 residence forging recipes`
- `100 weapon loadout unlock targets`

#### Spell side

- `15 spell branches × 5 tiers = 75 spell fragments`
- `75 completed spell manuals`
- `75 residence synthesis recipes`
- `75 spell loadout unlock targets`

The earlier spoken count of `65` spell fragments is treated as superseded by the correct `15 × 5 = 75`.

### 3. Tier Availability

Tier availability is split into authored data and live access.

#### Authored data

All tiers are registered in data:

- tier 1
- tier 2
- tier 3
- tier 4
- tier 5

#### Live access

Only these tiers are live-enabled:

- tier 1
- tier 2
- tier 3

Tier `4` and tier `5` must:

- exist in data
- exist in item definitions
- exist in recipe definitions
- exist in unlock mappings
- not appear in live drop pools
- not appear in live residence craftable actions

### 4. Residence Production Contract

Residence production remains item-only.

That means:

- `ProductionRecipe` still outputs `outputItemId`
- residence jobs still add output items to inventory
- residence production does **not** directly unlock weapon or spell loadouts

This is a hard requirement for this wave because it keeps the new system aligned with the current runtime shape instead of introducing a second production contract.

### 5. Weapon Item Structure

Each weapon loadout produces two authored items.

#### Source material

- item id: `weapon-material-${weaponLoadoutId}`
- meaning: the authored source material required to forge that exact weapon loadout
- category: `material`
- use kind: `material`
- tradable: `none`

#### Forged weapon item

- item id: `weapon-item-${weaponLoadoutId}`
- meaning: the forged weapon item that can be consumed to unlock that exact weapon loadout
- category: `manual`
- use kind: `unlock-loadout`
- tradable: `none`
- use consumes the item on successful unlock

### 6. Spell Item Structure

Each spell loadout produces two authored items.

#### Spell fragment

- item id: `spell-fragment-${spellLoadoutId}`
- meaning: the authored fragment required to synthesize that exact spell loadout
- category: `material`
- use kind: `material`
- tradable: `none`

#### Completed manual

- item id: `spell-manual-${spellLoadoutId}`
- meaning: the completed manual that can be consumed to unlock that exact spell loadout
- category: `manual`
- use kind: `unlock-loadout`
- tradable: `none`
- use consumes the item on successful unlock

### 7. Unlock Action Contract

Unlocking is an explicit immediate action.

- action id shape: `unlock-loadout:${itemId}`

The runtime must only generate this action when:

- the item exists in inventory
- the item is a forged weapon item or completed spell manual
- the mapped target loadout is not already unlocked

When this action resolves:

1. validate that the item exists in inventory
2. resolve the target loadout from item metadata
3. reject if the target loadout is already unlocked
4. add the loadout to the correct unlocked list
5. consume exactly one item
6. do not auto-equip the loadout
7. write a dao log entry

If the target loadout is already unlocked:

- the action fails
- the item is not consumed

### 8. Recipe Contract

Every source item maps one-to-one to one residence recipe.

#### Weapon forging recipe

- recipe id: `recipe-forge-${weaponLoadoutId}`
- input: `weapon-material-${weaponLoadoutId} × 1`
- output: `weapon-item-${weaponLoadoutId} × 1`

#### Spell synthesis recipe

- recipe id: `recipe-synthesize-${spellLoadoutId}`
- input: `spell-fragment-${spellLoadoutId} × 1`
- output: `spell-manual-${spellLoadoutId} × 1`

No recipe in this wave requires:

- more than one source item
- a secondary catalyst
- a probability roll
- a branching output

### 9. Recipe Cost Tables

Recipe cost is controlled by tier, not by per-item hand tuning.

#### Weapon forging spirit stone cost

- tier 1: `40`
- tier 2: `90`
- tier 3: `160`
- tier 4: `260`
- tier 5: `400`

#### Spell synthesis spirit stone cost

- tier 1: `30`
- tier 2: `70`
- tier 3: `130`
- tier 4: `220`
- tier 5: `340`

#### Residence production duration

For both forging and synthesis:

- tier 1: `2 ticks`
- tier 2: `2 ticks`
- tier 3: `3 ticks`
- tier 4: `4 ticks`
- tier 5: `5 ticks`

### 10. Live Drop Sources

Live drop sources are frozen by tier.

#### Tier 1

- wilderness
- grade-C dungeon

#### Tier 2

- grade-B dungeon

#### Tier 3

- grade-A dungeon

#### Tier 4 and Tier 5

- authored only
- no live drops

### 11. Drop Pool Shape

Each live tier owns one authored source pool.

- `source-pool-tier-1`
- `source-pool-tier-2`
- `source-pool-tier-3`

Each pool contains:

- all weapon source materials for that tier
- all spell fragments for that tier

To prevent the `20 weapon types vs 15 spell branches` content count difference from skewing the overall progression mix, the pool resolves in two steps:

1. first decide `weapon material` vs `spell fragment` with a `50 / 50` split
2. then select one item uniformly inside that category

Each successful source roll grants exactly one source item.

### 12. Wilderness Requirement

The current runtime does not yet have a live-authored wilderness layer configured for this sourcing path.

Therefore this spec explicitly requires a live tier-1 wilderness layer that:

- is active
- is reachable from current wilderness locations
- is valid for `炼气`
- uses the tier-1 source pool as its regional reward layer

Without this, the statement “tier-1 weapon/spell materials drop in wilderness” would not be true in live gameplay.

### 13. Dungeon Source Rules

#### Manual dungeon actions

- `search-fortune:*`
- `challenge-guardian:*`

Rules:

- grade-C successful result grants `1` tier-1 source item
- grade-B successful result grants `1` tier-2 source item
- grade-A successful result grants `1` tier-3 source item

For `challenge-guardian:*`, “successful result” means victory.

Defeat or retreat does not grant a source item.

#### Dungeon expeditions

Rules:

- `completed` grants `1` source item for the expedition grade
- `withdrew` grants `1` source item for the expedition grade only if at least one step resolved
- `aborted` grants no source item
- `catastrophic` grants no source item

Grade mapping:

- C -> tier 1
- B -> tier 2
- A -> tier 3

## Data Contract

### Item Definitions

The item system must support a new use kind:

- `unlock-loadout`

Item use metadata must support explicit loadout unlock targets:

- `grantsWeaponLoadoutId?: WeaponLoadoutId | null`
- `grantsSpellLoadoutId?: SpellLoadoutId | null`

Only one of these may be set for any single item.

### Loadout Sourcing Registry

The runtime must be able to derive, not hand-maintain:

- source item id by loadout id
- forged item id by loadout id
- fragment item id by spell loadout id
- completed manual id by spell loadout id
- recipe id by loadout id
- tier by loadout id
- live-enabled flag by tier

This should be table-driven from existing weapon and spell loadout definitions.

### Action View

`AvailableAction` must expose:

- only currently craftable residence recipes for this sourcing path
- explicit unlock actions for usable forged items and completed manuals

The description must clearly state:

- what item is consumed
- which loadout is unlocked
- that unlock does not auto-equip

### State View

The state view must continue exposing:

- unlocked weapon loadouts
- unlocked spell loadouts

It may additionally expose source-chain hints, but those are optional.

## Compatibility

- Existing starter loadouts remain valid.
- Existing residence production recipes remain valid.
- Existing breakthrough material chains remain valid.
- Existing item-buy / item-use / item-sell behavior remains valid for old items.
- Existing save data hydrates with zero count for all new source and unlock items.
- Existing cultivators do not lose any already unlocked loadouts.

## Acceptance Criteria

- the runtime contains authored source items for all `100` weapon loadouts
- the runtime contains authored source items for all `75` spell loadouts
- every live-enabled source item has exactly one matching residence recipe
- using a forged weapon item unlocks exactly one weapon loadout and consumes the item
- using a completed spell manual unlocks exactly one spell loadout and consumes the item
- unlock never auto-equips the newly unlocked loadout
- already-unlocked targets reject reuse without consuming the item
- wilderness can award tier-1 source items in live gameplay
- grade-C dungeon content can award tier-1 source items
- grade-B dungeon content can award tier-2 source items
- grade-A dungeon content can award tier-3 source items
- tier-4 and tier-5 source items exist in data but do not appear in live drop sources

