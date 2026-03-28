# Dungeon Event Pool Alignment V1

## Summary

This spec narrows the next exploration adjustment batch to dungeon nodes and their event loops.
The goal is to make `dungeon-c / dungeon-b / dungeon-a` feel materially different in play by aligning ruin search, guardian risk, and node-specific events with the existing event-pool architecture instead of leaving most dungeon outcomes in hardcoded engine branches.

## Problem

The repository now has a structurally correct event-pool system, but the current dungeon loop is still only partially inside it.

Current issues:

- `search-fortune` resolves through hardcoded modulo branches in `packages/domain/src/engine.ts` instead of a catalog-driven dungeon event draw.
- `challenge-guardian` is still one shared combat shell with only light reward variance, so dungeon tiers do not create enough identity.
- `packages/domain/src/events/catalog-node.ts` generates only one generic placeholder event per wilderness or dungeon node.
- The global and state pools satisfy minimum counts, but for dungeon play they mostly act as background garnish rather than the main feedback layer of exploration.

The result is that dungeon content technically exists, but repeated runs feel too flat:

- node identity is weak
- tier identity is weak
- the event pool does not yet own the main exploratory experience

## Goals

- Make dungeon node tier matter in outcome mix, risk profile, and flavor.
- Pull `search-fortune` closer to the event-pool system so ruin exploration is not only a hardcoded reward table.
- Keep dungeon combat on the current action surface while making guardian differentiation more data-driven.
- Deliver a small, testable batch that improves the current exploration loop without reopening larger world-structure debates.

## Non-Goals

- Reworking Eight Wastes or Guixu.
- Rebuilding the entire exploration and travel event architecture.
- Introducing the full `task-hook / social-hook / sect-hook / trade-hook` follow-up chain in this batch.
- Writing a fully bespoke narrative pool for all nine states.
- Replacing the current combat engine with a new dungeon-only combat subsystem.

## User-Visible Behavior

When this change is complete:

- entering and repeatedly running dungeon nodes should no longer feel like the same reward script with different labels
- `dungeon-c`, `dungeon-b`, and `dungeon-a` should expose different local event mixes
- `search-fortune` should resolve from dungeon-aware event content, producing more varied combinations of fragments, manuals, progress, statuses, and setbacks
- `challenge-guardian` should still be a combat action, but its risk and reward profile should reflect the node tier more clearly
- world logs for dungeon play should show recognizably different local event names instead of mostly generic placeholders

## Proposed Direction

### 1. Keep the existing event module boundaries

Do not reopen the recent event-module split.

Keep:

- `packages/domain/src/events.ts` as the public contract
- catalog files focused on content
- engine files focused on weighting, draws, and effect application

### 2. Treat dungeon nodes as real node overlays, not placeholders

Replace the current single-event placeholder generation for dungeon nodes with tier-aware overlay builders.

At minimum:

- `dungeon-c` should lean toward lighter fortune and progression outcomes
- `dungeon-b` should add more hazard, combat pressure, and manual-grade upside
- `dungeon-a` should feel like a true high-risk node with stronger status pressure, better rare drops, and sharper guardian hooks

This can still be implemented through the current `node-specific` pool shape.

### 3. Route ruin search through catalog-driven content

`search-fortune` should stop being only a hardcoded modulo roll.

Expected direction:

- resolve a dungeon-aware event draw from the existing event-pool system, or from a catalog-driven node/tier resolver that stays within the same architecture
- keep the current action id and timed-action flow
- preserve the current reward families such as `ruin-fragment`, manuals, realm progress, and status effects

The important product outcome is that ruin search now reflects node content rather than bypassing it.

### 4. Make guardian differentiation data-driven before making it bigger

`challenge-guardian` can remain a combat action in V1, but its tuning should stop being one mostly shared shell for all dungeon tiers.

This batch should move tier differences into structured configuration for:

- threat pressure
- victory reward mix
- defeat penalty profile
- optional bonus drops

That keeps the scope small while still improving dungeon identity.

### 5. Defer full state-by-state flavorization

This batch should not attempt to solve all event-pool sameness at once.

The immediate priority is:

- dungeon node identity
- ruin exploration feel
- guardian tier identity

Broader state flavor work can follow after this batch lands.

## Constraints

- The change affects gameplay behavior, so it must stay spec-driven.
- The current `packages/domain/src/events.ts` contract should remain stable unless a clear implementation blocker forces a change.
- The batch should stay additive where possible and avoid a second large event-architecture refactor.
- Existing action ids such as `search-fortune` and `challenge-guardian` should remain intact.
- Current tests for event-pool shape, engine behavior, and combat should continue to pass after adjustment.

## Acceptance Criteria

- Dungeon node overlays are no longer generated as one generic placeholder event per node.
- `search-fortune` is no longer resolved only by the current hardcoded modulo reward branches.
- `dungeon-c`, `dungeon-b`, and `dungeon-a` produce observably different reward/risk behavior under automated tests.
- Dungeon world logs surface local event names or summaries that reflect node-tier content rather than only generic local triggers.
- Focused domain tests cover:
  - event-pool shape after the new dungeon overlays
  - dungeon search behavior
  - guardian tier differentiation

## Open Questions

- Should travel arrival into a dungeon continue to trigger a generic exploration event, or should dungeon flavor concentrate on explicit dungeon actions first?
- Should `wilderness` node overlays be lightly expanded in the same batch for consistency, or left unchanged to keep the batch tighter?
- Should `challenge-guardian` consume node-specific combat parameters only, or also attach a pre-combat event draw in V1?
