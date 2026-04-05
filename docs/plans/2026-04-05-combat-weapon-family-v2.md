# Combat Weapon Family V2 Supplement Plan

**Goal:** Split weapon-family and weapon-loadout growth into an explicit V2 supplement plan, so weapon-side progression no longer lives implicitly inside the general loadout-layer plan.

**Relationship:**

- Main V2 loadout foundation: `docs/plans/2026-04-05-combat-gameplay-v2.md`
- V2 gap-closure supplement: `docs/plans/2026-04-05-combat-gameplay-v2-gap-closure.md`
- Weapon behavior spec: `docs/specs/combat-weapon-family-v2/spec.md`
- Weapon packaging appendix: `docs/specs/combat-weapon-family-v2/weapon-loadout-packaging.md`

## Summary

This supplement owns the **weapon side only**.

It freezes three ideas:

1. Weapons do not add a new status layer.
2. Weapons differentiate themselves through a two-layer stat model:
   - family bonus
   - type bonus
3. Each of the `20` weapon types expands into `5` tiers, producing `100` concrete weapon loadouts.

That means the main V2 plan can stay focused on the shared loadout foundation, while this supplement owns weapon-side content growth and balance.

## Implementation Changes

### 1. Extend weapon-loadout typing with explicit tier

- Add `WeaponTier = 1 | 2 | 3 | 4 | 5`.
- Extend `WeaponLoadoutDefinition` with:
  - `weaponTier`
  - `weaponFamilyId`
  - `familyBonusProfileId`
  - `typeBonusProfileId`
- Keep `basicAttackStatusHookIds` and `coreSkillStatusHookIds`, but freeze them to empty arrays for this weapon wave.

### 2. Add explicit family metadata

- Add a stable metadata table for the `5` weapon families.
- Each family definition must carry:
  - `id`
  - `name`
  - `memberWeaponTypes`
  - `defaultCombatStyle`
  - `bonusProfile`
- Freeze family bonus directions:
  - `quick -> speed + dodge`
  - `heavy -> tenacity + critDamage`
  - `polearm -> accuracy + speed`
  - `flexible -> dodge + critChance`
  - `ranged-mystic -> accuracy + guardHeart`

### 3. Add explicit weapon-type metadata

- Add a stable metadata table for all `20` weapon types.
- Each type definition must carry:
  - `id`
  - `name`
  - `weaponFamilyId`
  - `coreSkillCategory`
  - `typeBonusProfile`
- Freeze one type-bonus direction per weapon type, matching the current weapon spec.

### 4. Add shared tier budget tables for weapon growth

- Add one shared tier table for:
  - display tier label
  - allowed `attackPowerBonus` band
  - allowed `coreSkillSpiritCost` band
- Keep weapon growth intentionally flatter than spell growth.
- Require all concrete weapon loadouts to stay inside this budget band.

### 5. Expand weapon loadouts from 20 starter entries to 100 tiered entries

- Keep the current `20` starter weapon loadouts as tier-1 anchors.
- Expand to `20 weapon types × 5 tiers = 100` weapon loadouts.
- For each type:
  - tier 1 = current starter-grade baseline
  - tiers 2-5 = stronger variants of the same type
- Do not change type identity across tiers; only change:
  - `name`
  - `weaponTier`
  - `attackPowerBonus`
  - `coreSkillSpiritCost`
  - inherited family/type bonus magnitude via tier lookup

### 6. Keep weapon-side mechanics intentionally simple

- No weapon-specific status application in this phase.
- No third passive layer beyond family + type.
- No special-case weapon-only subresource in this phase.
- No new weapon-specific combat actions in this phase.

### 7. Integrate into state view and combat logs

- State view should show:
  - equipped weapon family
  - equipped weapon type
  - equipped weapon tier
  - family bonus summary
  - type bonus summary
- Combat logs should be able to show:
  - which concrete weapon loadout was used
  - which tier it belongs to
  - which family/type bonuses were in effect

## Test Plan

- Type completeness:
  - all `5` weapon families are registered
  - all `20` weapon types are registered
  - all `20` weapon types map to exactly one family
- Tier completeness:
  - all `20` weapon types have `5` tiers
  - total concrete loadouts = `100`
- Budget checks:
  - every weapon loadout stays inside the configured tier band for `attackPowerBonus`
  - every weapon loadout stays inside the configured tier band for `coreSkillSpiritCost`
- Metadata checks:
  - every weapon loadout carries family + type metadata
  - family bonus and type bonus are both resolvable from the loadout
- Runtime checks:
  - equipped weapon tier is visible in state view
  - weapon family/type bonus summaries are visible in state view
- Regression checks:
  - existing V2 loadout tests stay green
  - action-layer, per-round channel, and fixed spirit cost tests stay green

## Assumptions

- Weapon-side progression is a balance/content supplement, not a new combat subgame.
- Weapon status hooks remain reserved for future design and are intentionally not activated now.
- Tier is a numeric packaging tool, not a separate unlock system by itself.
