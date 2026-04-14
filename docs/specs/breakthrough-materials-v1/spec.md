# Breakthrough Materials V1

## Summary

This spec replaces the current auto-upgrade breakpoint with an explicit residence breakthrough flow.
Realm progress now caps at `100`, breakthroughs consume authored materials, and major breakthrough success rate depends only on temporary status effects rather than registration-derived aptitude.
Breakthrough-side growth grants are defined in `docs/specs/breakthrough-growth-v1/spec.md`; this spec continues to own the action, gating, record, and success-rate contract, while exact live material ids and authored source tables follow the current runtime definitions.

## Status

- The `Problem` section below is historical background from before explicit breakthroughs shipped.
- The live runtime already uses explicit `residence-breakthrough` behavior.
- Read this document as the contract for breakthrough flow shape, state legibility, persistence, and success-rate rules.
- Read `docs/specs/breakthrough-growth-v1/spec.md` for authored breakthrough growth grants.

## Problem

The live runtime still uses the simplest possible realm advancement rule:

- `cultivate` and `residence-meditate` auto-upgrade when `realmProgress >= 100`
- there is no explicit breakthrough action
- there is no authored material chain between field loops, residence production, and advancement
- registration modifiers can influence growth speed, but breakthrough itself has no separate contract or record

That creates three gaps:

- progression skips an important xianxia verb because “breakthrough” is not a real action
- the current item and residence systems do not feed directly into realm advancement
- future balance would drift toward hidden aptitude advantages unless breakthrough success is explicitly constrained

## Goals

- Turn breakthrough into a first-class residence action.
- Require breakthrough materials for every small and major breakthrough in the current `1..9` live realm ladder.
- Use one common material per major realm plus one stage-specific special material per breakthrough slot.
- Keep small breakthroughs guaranteed while making major breakthroughs probabilistic.
- Make major breakthrough probability depend only on temporary runtime status effects.
- Record breakthrough attempts as persistent cultivator history.
- Preserve onboarding completion at the first successful breakthrough.

## Non-Goals

- No `人道 / 地道 / 天道` branching.
- No material rarity tiers or average-quality formulas.
- No tribulation, thunder calamity, or failure debuff system.
- No direct market purchase path for breakthrough materials.
- No expansion beyond the current live `炼气 / 筑基 / 金丹` and `realmLevel 1..9`.

## Player And Agent Contract

The runtime must make the breakthrough chain legible from structured state rather than prose-only hints.

Agents should be able to inspect:

- whether progress is capped and waiting on a breakthrough
- which common and special materials are required
- which items are still missing
- whether the attempt must happen at residence
- the exact current major breakthrough success rate and its status-only breakdown
- which main-attribute and five-element growth packages the current breakthrough slot would grant on success
- one concrete recommended next action for the breakthrough chain

This information belongs in `state.breakthrough`.

## Mechanics

### Progress And Action Flow

- All realm-progress sources stop at `100` instead of auto-advancing the realm.
- `residence-breakthrough` is the only breakthrough action and only appears at residence.
- `residence-breakthrough` appears only when:
  - `realmProgress >= 100`
  - required materials are present
  - the cultivator is at residence
- `cultivate` and `residence-meditate` are no longer valid once progress is capped.

### Material Structure

- Common materials by major realm:
  - `qi-common`
  - `foundation-common`
  - `core-common`
- Special materials by breakthrough slot:
  - `qi-stage-1-special`
  - `qi-stage-2-special`
  - `qi-major-special`
  - `foundation-stage-1-special`
  - `foundation-stage-2-special`
  - `foundation-major-special`
  - `core-stage-1-special`
  - `core-stage-2-special`
- Special materials are residence-crafted only through `residence-produce`.
- Each special recipe consumes `1` matching common material plus spirit stones.

### Recipe Costs

- First minor special: `80` spirit stones
- Second minor special: `120` spirit stones
- Qi major special: `180` spirit stones
- Foundation major special: `260` spirit stones
- Core stage-1 special: `220` spirit stones
- Core stage-2 special: `300` spirit stones

### Breakthrough Costs

- First minor slot: `1 common + 1 special`
- Second minor slot: `2 common + 1 special`
- Major slot: `3 common + 1 special`

### Material Sources

- `qi-common` must be available from safe beginner loops:
  - `take-mortal-task`
  - low-risk travel events
  - low-risk exploration events
- `foundation-common` must come from mid-loop actions:
  - `mine-spirit-stones`
  - `hunt-mine-beast`
  - `search-fortune`
  - `challenge-guardian` on lower dungeon tiers
- `core-common` must come from higher-risk loops:
  - `search-fortune` in high-risk dungeons
  - `challenge-guardian` in high-risk dungeons

### Success And Failure

- Minor breakthroughs are guaranteed success.
- Major breakthroughs are only:
  - `3 -> 4`
  - `6 -> 7`
- Base success rates:
  - `3 -> 4 = 70%`
  - `6 -> 7 = 55%`
- Allowed success-rate modifiers:
  - `insight +10`
  - `clear-mind +8`
  - `spirit-saturated +5`
  - `deviation -20`
  - `poisoned -10`
  - `injuryTicksRemaining > 0 => -15`
- Final rate clamps to `20 .. 90`.
- Registration answers, spirit roots, elements, personality labels, or hidden aptitude fields must not affect breakthrough probability.

### Failure Result

- consume all breakthrough materials for that attempt
- keep the current realm and level
- reset `realmProgress` to `60`
- add no new debuff
- write a failure breakthrough record, dao log entry, and world event

### Success Result

- increment `realmLevel`
- update `realm` when crossing `3 -> 4` or `6 -> 7`
- reset `realmProgress` to `0`
- refill `qi` and `spiritualPower`
- apply the authored breakthrough growth contract, including main-attribute growth, five-element growth, and the live resource / lifespan updates
- write a success breakthrough record, dao log entry, and world event

## Data Contract

### Cultivator Persistence

Add `breakthroughRecords: BreakthroughRecord[]` to `Cultivator`.

`BreakthroughRecord` must include at least:

- `tick`
- `fromRealm`
- `fromLevel`
- `toRealm`
- `toLevel`
- `category`
- `outcome`
- `consumedItems`
- `successRate` for major attempts
- `rateBreakdown` for major attempts
- `grantedMainAttributeGrowth`
- `grantedFiveElementGrowth`

### State View

Add `state.breakthrough` with:

- `targetRealm`
- `targetLevel`
- `category`
- `readyByProgress`
- `readyByMaterials`
- `requiresResidence`
- `commonRequirement`
- `specialRequirement`
- `missingItems`
- `majorSuccessRate`
- `rateBreakdown`
- `previewMainAttributeGrowth`
- `previewFiveElementGrowth`
- `recommendedAction`

### Action View

`AvailableAction` for `residence-breakthrough` must expose material `costs`.
It must not expose registration- or aptitude-based modifiers because none are valid inputs.

## Compatibility

- Old stored worlds hydrate new breakthrough items with count `0`.
- Old cultivators hydrate `breakthroughRecords` as an empty array.
- Old cultivators with `realmProgress >= 100` load into a pending-breakthrough state instead of auto-advancing.

## Acceptance Criteria

- `cultivate`, `residence-meditate`, events, and exploration no longer auto-advance realm level.
- `realmProgress` caps at `100`.
- `residence-breakthrough` exists and is the only breakthrough action.
- special breakthrough materials are residence-crafted only.
- safe beginner loops can reliably reach the first breakthrough through material collection plus one residence craft.
- major breakthrough rates change only with the approved temporary statuses.
- successful breakthroughs grant the authored growth preview reported in `state.breakthrough`.
- breakthrough attempts are persisted in `breakthroughRecords`.
- public agent docs describe the new “progress cap -> collect -> craft -> breakthrough” loop.
