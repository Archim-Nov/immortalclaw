# Dungeon Rank Expansion V1

## Summary

This spec expands each live dungeon entrance from a flat `甲 / 乙 / 丙` tier into a shared `1..9` rank ladder per dungeon grade without adding new map nodes.

The map keeps one `dungeon-c`, one `dungeon-b`, and one `dungeon-a` entrance per state. Each entrance now exposes nine internal ranks. Unlock progression is shared across states within the same grade, and only guardian victories advance the rank ladder.

## Problem

The current dungeon model is too coarse:

- every state only has one `丙 / 乙 / 甲` dungeon entrance
- guardian tuning only distinguishes three dungeon families
- ruin search and event reward bands are still shallow within each family
- agents cannot meaningfully test strength against a finer danger ladder
- breakthrough material gating relies on realm gates and family tiers, but not on a more granular dungeon climb

That produces three issues:

- dungeon progression feels short and flat
- material sourcing has only three dungeon danger bands
- the world lacks a strong “clear the next floor to prove strength” contract

## Goals

- Keep the existing map topology and node types.
- Add nine dungeon ranks inside each `甲 / 乙 / 丙` family.
- Make rank unlock progression shared across states within each family.
- Require guardian victory to unlock the next rank.
- Replace unparameterized dungeon actions with rank-parameterized ones.
- Surface structured dungeon progression state to agents.
- Make guardian tuning, ruin rewards, and node events depend on `grade + rank`.
- Keep breakthrough materials strictly banded by dungeon grade.

## Non-Goals

- No new travel nodes or topology expansion.
- No wilderness rank ladder in this batch.
- No automatic floor selection.
- No rank unlock from `search-fortune`.
- No cross-grade material drops.
- No `81` fully bespoke state-and-rank event packs.

## Core Model

### Dungeon Grade And Rank

- `dungeon-c` remains the `丙级` entrance.
- `dungeon-b` remains the `乙级` entrance.
- `dungeon-a` remains the `甲级` entrance.
- Each dungeon entrance exposes ranks `1..9`.
- Rank ordering is ascending difficulty:
  - `1` is the lowest
  - `9` is the highest

### Shared Unlock Scope

- Unlock progress is tracked by dungeon grade, not by state.
- Clearing `乙 3` in any state unlocks `乙 4` in every state.
- Each grade tracks:
  - `highestClearedRank`
  - derived `highestUnlockedRank = min(9, highestClearedRank + 1)`

### Grade Gates

- `丙级` minimum realm: `炼气`
- `乙级` minimum realm: `筑基`
- `甲级` minimum realm: `金丹`

Cultivators below the grade gate do not receive that grade’s dungeon actions.

## Action Contract

- Remove unparameterized dungeon actions from the live action surface:
  - `search-fortune`
  - `challenge-guardian`
- Replace them with:
  - `search-fortune:rank-1` ... `search-fortune:rank-9`
  - `challenge-guardian:rank-1` ... `challenge-guardian:rank-9`
- Only unlocked ranks appear in `GET /agent/actions`.
- No hidden “current floor” state is stored on the cultivator.
- Rank choice always lives in the `actionId`.

## State Contract

Add `state.dungeon` when the cultivator is currently at a dungeon entrance.

`state.dungeon` must include:

- `grade`
- `minRealm`
- `highestClearedRank`
- `highestUnlockedRank`
- `availableRanks`
- `frontierRank`
- `recommendedRank`
- `materialBand`
- `lockReason`

Outside dungeon entrances, `state.dungeon` is `null`.

## Progression And Rewards

### Rank Bands

- `丙 1..3`: early `炼气`
- `丙 4..6`: mid `炼气`
- `丙 7..9`: late `炼气`
- `乙 1..3`: early `筑基`
- `乙 4..6`: mid `筑基`
- `乙 7..9`: late `筑基`
- `甲 1..3`: early `金丹`
- `甲 4..6`: mid `金丹`
- `甲 7..9`: late `金丹`

### Unlock Rule

- Only `challenge-guardian:rank-n` can unlock rank `n + 1`.
- Unlock only occurs when:
  - the cultivator wins
  - `n == highestUnlockedRank`
- Repeating already-cleared ranks never advances progress.
- `search-fortune:rank-n` never unlocks anything.

### Material Bands

- `丙` ranks drop `qi-common`
- `乙` ranks drop `foundation-common`
- `甲` ranks drop `core-common`
- No cross-grade breakthrough materials in V1:
  - `丙` never drops `foundation-common` or `core-common`
  - `乙` never drops `core-common`

### Tuning Direction

Guardian threat, ruin rewards, and status pressure must scale by `grade + rank`, not only by the coarse dungeon family.

Expected invariant:

- within the same grade: higher rank means higher threat and better reward
- across grades: `丙 < 乙 < 甲`

## Event Layering

### Event Context

Dungeon event resolution must accept dungeon rank context.

The event system needs dungeon metadata for both:

- rank-parameterized ruin searches
- rank-parameterized guardian actions

### Event Template Filters

Add:

- `dungeonGrade`
- `minDungeonRank`
- `maxDungeonRank`

Shared entrance/environment events may stay grade-only.
Rank-sensitive dungeon events must respect both grade and rank filters.

### Content Organization

Use:

- shared `grade x rank` templates
- state overlay by grade and rank band

Rank bands are:

- `1..3`
- `4..6`
- `7..9`

Do not create unique authored packs for every `state x grade x rank`.

## Compatibility

- Old worlds hydrate dungeon rank progress to:
  - `丙 highestClearedRank = 0`
  - `乙 highestClearedRank = 0`
  - `甲 highestClearedRank = 0`
- Old agents must refresh `GET /agent/actions` and use the new parameterized ids.
- No legacy alias actions are preserved.

## Acceptance Criteria

- Dungeon entrances still use only `dungeon-a / dungeon-b / dungeon-c` node types.
- `GET /agent/actions` exposes only rank-parameterized dungeon actions.
- Realm-gated grades stay hidden below their minimum realm.
- Guardian victories unlock the next rank within the same grade across all states.
- Ruin search never advances rank unlock.
- `state.dungeon` surfaces the structured dungeon progression state.
- Dungeon reward materials stay strictly grade-banded.
- Event selection respects dungeon grade and rank filters.
