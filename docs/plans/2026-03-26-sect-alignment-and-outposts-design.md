# Sect Alignment And Outposts Design

## Summary

This design cleans up the current sect-related legacy direction and moves sect duties onto dedicated sect outpost nodes.

The two direct goals are:

- replace the old player-sect classification direction with explicit alignment: `正道 / 魔道 / 中立`
- move sect duty entry off the main city task flow and onto dedicated sect outpost nodes

This change must preserve the current small fixed world while avoiding a future trap where every player-created sect becomes a permanent global map node.

## Decisions

### 1. Alignment model

Player sects no longer use `剑修 / 丹修 / 阵修` as their core classification.

Instead:

- player sects use `alignment: 正道 | 魔道`
- default neutral sects use `alignment: 中立`

The `中立` classification is only used for the nine default neutral sects already defined in the world seed.

This keeps the design aligned with the frozen docs and avoids treating craft style as the primary sect identity.

### 2. Sect outpost nodes

The nine default neutral sects each get their own dedicated world node.

Default worlds no longer pre-seed fixed official sects.

Player sect outposts only exist when a runtime world actually contains player-sect data.

These outposts are real map nodes because the total number is still small and fixed.

This means:

- sect duty is entered from a sect outpost, not a main city task board
- neutral duty is entered from a neutral sect outpost, not a main city
- travel and recommendation logic can point to a concrete organization location

### 3. Future player sect scalability

Future player-created sects must not become normal global topology nodes.

Instead, they should later be implemented as virtual or instanced organization entrances.

In plain terms:

- fixed default neutral sects = real map buildings
- player sects = world-driven organization nodes that are absent by default
- future large-scale player sect systems = separate rooms that look like locations to the player but do not join the global route graph

This keeps the current feature expressive without creating a long-term topology and quest-board performance problem.

## Architecture

### Location model

The current location system assumes a mostly fixed cross-product of `state x nodeType`.

Dedicated sect outposts require a small extension:

- keep the normal fixed node types for state-level public locations
- add explicit sect outpost locations as extra seeded locations
- refactor topology building to use the actual seeded location set instead of only the fixed cross-product list

Each sect outpost location should carry enough metadata to know which organization it belongs to.

### Task entry model

Base task boards remain on:

- main city
- sub towns

Sect task boards move to:

- player sect outposts

Neutral duties move to:

- neutral sect outposts

This preserves the split between public errands and organization errands.

### Join flow

This change does not require a large join-system rewrite.

The minimum viable behavior is:

- sect membership still stays mutually exclusive with neutral sect membership
- sect duties only appear when the cultivator is at the correct outpost
- neutral duties only appear when the cultivator is at the neutral sect outpost

The join action can continue to be simple for this pass as long as the duty入口 is moved onto the correct dedicated node.

## Scope

### In scope

- sect alignment field cleanup
- neutral sect alignment field addition
- sect outpost seeded locations for the nine default neutral sects
- support for player-sect outposts only when player-sect data exists
- task board routing and action availability changes
- travel/topology support for the new fixed outposts
- tests and required plan/doc updates

### Out of scope

- converting future player-created sects into real world nodes
- full organization model unification
- deep refactor of faction reputation
- large social or party-system changes

## Success Criteria

This change is successful when:

- no player sect relies on `剑修 / 丹修 / 阵修` as its primary classification
- neutral sects clearly use `中立`
- sect duties no longer come from main-city task entry
- default neutral sects each have their own dedicated outpost node
- default worlds no longer inject fixed official sect seeds
- the route graph and quest-board initialization still perform against the fixed seeded world
