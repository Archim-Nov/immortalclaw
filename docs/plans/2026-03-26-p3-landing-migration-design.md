# P3 Landing Migration Design

## Summary

This design migrates the gameplay content from `codex/p3-landing` into the current `master` branch in staged batches instead of a direct merge.

The goal is to preserve the current architecture direction on `master` while reintroducing the missing P3 gameplay systems:

- Eight Wastes wilderness expeditions
- Guixu unlock and exploration
- sect level progression
- faction war progress
- later application, contract, and route support

The migration must be conflict-aware. If the old P3 branch and the current `master` branch made different choices in the same logic area, the agent must stop and ask the user which direction to keep.

## Why A Direct Merge Is Wrong

The repository is no longer in the same architectural state as the old P3 landing branch.

The direct merge check showed conflicts in the most sensitive files:

- `packages/domain/src/engine.ts`
- `packages/domain/src/model.ts`
- `packages/domain/src/seed.ts`
- `packages/domain/src/events.ts`
- `packages/domain/src/runtime.ts`
- `packages/contracts/src/runtime-api.ts`
- `packages/application/src/*`
- `packages/persistence/src/supabase-world-repository.ts`

In plain terms:

- the current `master` branch kept evolving the game runtime and module boundaries
- the old P3 branch landed large gameplay features on top of an older shape of those same files

So the problem is not "we forgot one tiny branch."
The problem is "the gameplay branch and the architecture branch both edited the same foundation."

That makes a direct merge high-risk and hard to review.

## Migration Strategy

### 1. Migrate By Gameplay Slice, Not By Git History

We should move working gameplay systems into the current architecture one module at a time.

That means:

- copy over additive modules where possible
- adapt shared files manually
- preserve the current `master` boundaries unless the user explicitly chooses otherwise

### 2. Resolve Conflicts At Decision Points

There are two kinds of conflict:

- **mechanical conflict**
  Two branches edited nearby text, but the intended behavior is compatible. The agent can resolve this directly.
- **directional conflict**
  The branches made different product or architecture choices. The agent must stop and ask the user which direction to keep.

Examples of directional conflicts:

- old P3 persistence shape versus current persistence architecture
- old monolithic event logic versus current split event module boundaries
- route or contract shapes where one branch exposes a different public surface

### 3. Keep Each Batch Independently Verifiable

Each batch should end with focused tests before moving to the next batch.

That keeps the migration understandable:

- first prove the new gameplay slice works in the current branch
- then wire outer layers only when the domain slice is stable

## Batch Order

### Batch 1: Eight Wastes + Guixu Domain Migration

This batch introduces the missing P3 wilderness and Guixu systems into current `master`.

Scope:

- world model additions needed for wilderness and Guixu
- seed data for wilderness layers, Guixu nodes, and related rewards
- wilderness and Guixu domain services
- engine action wiring
- focused tests

Why first:

- this is the clearest missing P3 gameplay slice
- most of the logic is additive
- it gives us a stable base for later sect and faction systems

### Batch 2: Sect Level + Faction War Domain Migration

This batch introduces:

- sect level calculation
- sect-wide bonuses
- faction war progress wiring
- related tests

Why second:

- it depends on the broader P2/P3 progression loop already being present
- it is still mostly domain-side

### Batch 3: Application + Contracts + Route Adaptation

This batch adapts the outer layers so the new state and actions are visible through the current runtime surface.

Scope:

- `packages/contracts`
- `packages/application`
- current runtime route layer

Why third:

- the outer layer should follow the domain truth, not lead it

### Batch 4: Persistence Decision

This batch is intentionally last.

The old P3 branch still carries `supabase-world-repository` files that no longer match the current `master` architecture.

So this batch needs an explicit decision:

- restore and adapt the old repository shape
- or re-express the needed persistence support inside the current architecture

This is the highest-risk batch and should not block the earlier gameplay migration.

## Conflict Handling Rule

During migration:

- if the issue is only code placement or import shape, resolve it directly
- if the issue changes runtime behavior, data ownership, persistence direction, or public API shape, stop and ask the user

The user explicitly asked for this rule, so it is part of the migration design.

## Success Criteria

This migration is successful when:

- the current `master` branch contains the missing P3 gameplay modules
- the current architecture boundaries remain coherent
- each batch passes focused verification before the next batch begins
- directional conflicts are resolved with explicit user choice instead of silent agent guesses
