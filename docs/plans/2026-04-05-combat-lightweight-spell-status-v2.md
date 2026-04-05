# Combat Lightweight Spell Status V2 Content Plan

**Goal:** Land the spell-side content package for lightweight combat statuses on top of the existing V2 loadout system, using `5 elements × 3 routes` and `5 tiers per spell type`, without mixing spell content expansion and status runtime execution into one plan.

**Relationship:**

- Runtime loadout base: `docs/plans/2026-04-05-combat-gameplay-v2.md`
- Gap-closure supplement: `docs/plans/2026-04-05-combat-gameplay-v2-gap-closure.md`
- Status runtime supplement: `docs/plans/2026-04-05-combat-lightweight-status-runtime-v2.md`
- Behavior spec for this plan: `docs/specs/combat-lightweight-spell-status-v2/spec.md`
- 75-loadout packaging appendix: `docs/specs/combat-lightweight-spell-status-v2/spell-loadout-packaging.md`

## Summary

This supplement owns the **spell content side only**.

This plan does **not** build the combat status runtime itself.

Instead, it adds a controlled, table-driven spell layer with three fixed ideas:

1. Every spell branch has exactly one `primaryStatusId`.
2. Every spell branch has exactly one `secondaryStatusId`.
3. Every spell branch can exist in `5` tiers, and tier only changes numeric budget, not rule shape.

That keeps spell content growth predictable, while status runtime execution is handled in its own supplement plan.

## Implementation Changes

### 1. Extend spell-loadout typing with explicit tier and fixed status binding

- Add `SpellTier = 1 | 2 | 3 | 4 | 5`.
- Extend `SpellLoadoutDefinition` with:
  - `spellTier`
  - `primaryStatusId`
  - `secondaryStatusId`
- Keep `basicAttackStatusHookIds` and `coreSkillStatusHookIds`, but make them derive from the explicit primary / secondary status mapping instead of staying empty placeholders.

### 2. Add a branch-to-status mapping table

- Add one stable mapping table from `SpellBranchId` to:
  - `primaryStatusId`
  - `secondaryStatusId`
- Freeze the current branch mapping:
  - `metal-edge -> 裂甲 + 金锋刻印`
  - `metal-guard -> 裂甲 + 锐化`
  - `metal-break -> 裂甲 + 断法`
  - `wood-growth -> 缠绕 + 生长祝福`
  - `wood-bind -> 缠绕 + 定根`
  - `wood-bloom -> 缠绕 + 生息`
  - `water-frost -> 回春 + 霜寒`
  - `water-illusion -> 回春 + 幻惑`
  - `water-flow -> 回春 + 化劲`
  - `fire-blaze -> 焚灼 + 熔甲`
  - `fire-smelt -> 焚灼 + 烈焰印记`
  - `fire-burst -> 焚灼 + 激燃标记`
  - `earth-wall -> 岩甲 + 稳固`
  - `earth-suppress -> 岩甲 + 镇压`
  - `earth-vein -> 岩甲 + 地壁`

### 3. Expand spell loadouts from 15 starter entries to 75 tiered entries

- Keep the current `15` starter spell loadouts as tier-1 anchors.
- Expand to `15 branches × 5 tiers = 75` spell loadouts.
- For each branch:
  - tier 1 = current starter-grade baseline
  - tiers 2-5 = stronger variants of the same branch
- Do not change branch behavior across tiers; only change:
  - `name`
  - `spellTier`
  - `attackPowerBonus`
  - `coreSkillSpiritCost`
  - status value tier lookup

### 4. Keep balance control in shared tier tables, not scattered custom math

- Add a shared budget table for:
  - `attackPowerBonus` band per tier
  - `coreSkillSpiritCost` band per tier
- Add shared tier-value arrays for all statuses as content inputs for the runtime plan.
- Require every spell loadout to stay inside its tier budget band.
- Avoid hidden formulas that mix attribute math, element math, and temporary status scaling in one place.

### 5. Expose spell metadata to state view and logs

- Show the equipped spell loadout's:
  - branch
  - tier
  - primary status
  - secondary status
- Round logs should at minimum carry enough spell metadata for the runtime plan to explain:
  - branch
  - tier
  - which status set this action was allowed to emit

### 6. Runtime boundary for the separate status plan

- This plan defines **what statuses each spell branch can emit**.
- The separate runtime plan defines:
  - how statuses become instances in combat
  - how same-name refresh works
  - how round-end tick works
  - how one-time consume-on-trigger statuses work
  - how active statuses modify initiative, damage, defense, healing, or spirit recovery

## Test Plan

- Type completeness:
  - all `15` spell branches have primary and secondary status mappings
  - all `5` tiers exist for every branch
- Budget checks:
  - every spell loadout stays inside the configured tier band for `attackPowerBonus`
  - every spell loadout stays inside the configured tier band for `coreSkillSpiritCost`
- View/log checks:
  - state view shows branch and tier for equipped spell loadout
  - combat logs carry enough spell metadata for the runtime layer to explain what this spell was allowed to apply
- Regression checks:
  - existing V2 loadout tests stay green
  - current action-layer and per-round channel tests stay green

## Assumptions

- This plan only owns spell-side content packaging and branch binding.
- Weapon status hooks remain out of scope for this wave; this wave only lands the spell side.
- Tier is a numeric balance tool, not a new combat mechanic.
- High-tier spells are allowed to cost much more spirit, and that cost increase is a deliberate balance lever rather than a drawback to be optimized away.
