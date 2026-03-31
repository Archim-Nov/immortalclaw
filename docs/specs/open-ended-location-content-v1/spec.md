# Open-Ended Location Content And Cached World Runtime

## Summary

Replace the hardcoded Jiuzhou-only location schema with a repo-authored geography registry whose types widen automatically from content instead of manually maintained unions, move the Durable Object runtime to a warm in-memory cached world backed by SQLite persistence, and automatically merge newly added developer-authored locations into existing worlds on hydrate. Backward compatibility with pre-change snapshots is not a goal; the rollout will reset legacy snapshots once, and future content additions should be absorbed automatically without backend crashes.

## Problem

The current runtime couples world geography to hardcoded state/location unions and persists derived runtime structures inside the world snapshot. This creates two problems:

1. adding a new location requires code assumptions to stay perfectly aligned with stored snapshot shape
2. stale persisted derived data can crash the live runtime when newer code expects fields the old snapshot does not contain

The recent production failure showed this clearly: the Durable Object stayed reachable, but scheduled ticks crashed because the stored world contained an outdated `eventPools` shape. The system needs a cleaner boundary between:

- developer-authored geography content
- canonical mutable world state
- derived runtime-only structures

## Goals

- allow developers to add new states and locations through repo content files without manually editing closed geography ID unions in runtime logic
- preserve existing cultivators, jobs, progression, inventory, and world history when new geography content is added
- automatically merge newly added geography content into an existing persisted world during hydrate
- keep the world warm in Durable Object memory while SQLite remains the durable source of truth
- rebuild derived runtime structures from current content so stale snapshot-derived indexes cannot crash the backend
- make future geography/content additions automatic after deploy, without recurring manual snapshot nukes

## Non-Goals

- preserving compatibility with snapshots created before this architecture lands
- supporting runtime-created locations outside developer-authored repo content
- redesigning gameplay rules for quests, events, travel, or progression beyond what is needed for safe geography extension
- splitting the single-world `"primary"` Durable Object into a multi-world system

## User-Visible Behavior

- after this change ships, the initial rollout resets the old incompatible world snapshot and reseeds the world under the new architecture
- after the reset, future deploys that add new repo-authored locations automatically make those locations part of the live world without deleting player progress
- existing cultivators stay where they are when geography expands
- the backend continues serving requests and scheduled ticks without crashing because of stale derived geography data

## Requirements

### Geography Content Model

- replace the manually maintained `StateId` and `LocationId` union model with types derived from the canonical geography registry for production code (for example `type StateId = keyof typeof GEOGRAPHY_REGISTRY`)
- test-only registry injection must use generic helpers or generic seed/hydration builders rather than assuming the exported default aliases widen automatically when a different registry instance is passed at runtime
- keep geography developer-authored in repo content files, not created dynamically from live gameplay
- introduce a canonical geography registry that defines:
  - state metadata
  - base locations
  - location display metadata
  - geography-linked defaults needed for seeding
  - neutral sect definition per state (id, name, description, reward multiplier)
  - travel connectivity: intra-state distances and cross-state edges
- keep validation at content boundaries so malformed developer-authored geography fails during development or test verification rather than at runtime tick time
- specifically, a state with no cross-state travel edges must fail validation at build or test time — preventing silently disconnected geography from reaching production

### World Persistence Model

- SQLite remains the durable source of truth for canonical mutable world state
- the Durable Object keeps a warm in-memory cached world for reads, ticks, and actions while the object stays active
- writes follow a write-through flow:
  - mutate the cached in-memory world
  - persist the canonical world state to SQLite in the same operation
  - only treat the operation as committed after SQLite succeeds
- if persistence fails, the runtime must discard the dirty in-memory cached world and replay from SQLite: re-read the last committed canonical state, re-hydrate, and rebuild derived structures — reusing the same cold-start hydration path. The single-threaded Durable Object input gate guarantees no concurrent request can observe the dirty in-memory state between a failed persist and the replay. If the SQLite replay itself fails, the Durable Object should let the error propagate and allow the runtime to restart naturally.

### Canonical vs Derived State

- the world model must be split into two explicit types:
  - `PersistedWorldState` — contains only canonical mutable gameplay data; this is what SQLite stores
  - `WorldState` — extends `PersistedWorldState` with derived runtime fields; this is what the cached in-memory world uses
- persisting a runtime world must require an explicit projection step (for example `toPersistedWorldState(world)` returning a branded/projected persisted type) before serialization; accepting plain `PersistedWorldState` is not sufficient because `WorldState` is structurally assignable to it
- the serializer accepts only the explicit projected persisted type, so a hydrated `WorldState` cannot be passed straight into storage without going through the projection boundary first
- the hydration function accepts `PersistedWorldState` and returns `WorldState` by rebuilding derived fields from current content
- at minimum, the following are runtime-derived and must be rebuilt from current content:
  - topology
  - `eventPools`
  - state `locationIds`
  - any geography/content-derived indexes or lookup maps introduced by this feature
- `questBoards` are canonical (persisted), not derived — they accumulate mutable state (active quests). During hydration merge, new quest boards must be seeded for newly added locations while preserving existing boards and their active quests.

### Hydration Flow

- when the Durable Object needs to materialize the world from SQLite, it must:
  1. load the canonical persisted world
  2. load the current repo-authored geography registry
  3. always merge missing states and locations from current content into the stored world
  4. preserve existing mutable live state, especially cultivator position and progression
  5. rebuild all derived runtime structures from the merged content
  6. cache the rebuilt world in memory
  7. persist the upgraded canonical world if the merge changed canonical geography-bearing state

- hydration always runs the merge and derived-state rebuild — no content versioning or skip optimization. The merge is a key comparison between registry entries and persisted state, which is trivially cheap relative to the derived-structure rebuilds that must happen regardless.

### Reset Policy

- pre-change snapshots are allowed to be discarded during rollout
- the rollout plan must reset the legacy Durable Object storage through a dedicated storage-clear path (`deleteAlarm()` plus `deleteAll()` or an equivalent implementation-level reset primitive), then reseed the canonical world under the new architecture
- if a warm in-memory cache exists in the repository or Durable Object instance, the reset flow must also invalidate that cache or force an instance restart before normal traffic resumes
- once the new architecture is live, future geography additions are expected to merge automatically instead of requiring resets

## Architecture

### Repo-Authored Geography Registry

The domain layer should expose a geography registry that acts as the canonical source for states and locations. This registry replaces the current assumption that geography is defined by hardcoded TypeScript unions and fixed state arrays. The seed world should be generated from this registry, and hydration should use the same registry to fill in missing geography content in a persisted world.

This keeps geography content-controlled and reviewable while removing the runtime assumption that only the currently hardcoded Jiuzhou IDs can ever exist.

### Cached World Runtime

The Durable Object should no longer deserialize the full world snapshot on every request. Instead, it should lazily load and hydrate the world once per warm object lifetime, keep it in memory, and use SQLite as the durable commit layer. This is the standard shape for the project after the change:

- SQLite stores the canonical committed world
- the DO caches the current hydrated world in memory
- requests and alarms operate on the cached world
- successful mutations are written back to SQLite
- eviction or restart discards memory, but the world can be reconstructed from SQLite plus current repo content

### Derived Runtime Rebuild

`eventPools` and similar structures should be considered runtime artifacts, not durable snapshot truth. They must be regenerated from current geography and event content during hydration. This prevents stale snapshots from carrying forward outdated derived structures that newer code may index unsafely.

This design also makes adding a new location safer: once the geography registry includes the new location, hydration rebuilds the event pool and related indexes against the expanded geography instead of trusting an old stored copy.

## Acceptance Criteria

- runtime geography identifiers are no longer constrained to a fixed manually maintained Jiuzhou union in the core runtime model
- developers can add a new repo-authored state or location and have an existing post-migration world absorb it automatically on hydrate
- existing cultivators remain at their current locations when new geography is merged in
- the live world does not depend on persisted `eventPools` shape for correctness
- the Durable Object uses an in-memory cached world with SQLite as the durable source of truth
- the initial rollout includes a one-time legacy snapshot reset
- after the rollout, future geography additions do not require manual snapshot nukes

## Risks

- moving from per-operation snapshot loads to a warm cached world changes failure handling and requires disciplined write-through persistence
- deriving types from the geography registry preserves compile-time safety, but code that previously used exhaustive `switch` on a closed union will need to handle the possibility of new IDs added by future registry entries
- splitting the world model into `PersistedWorldState` and `WorldState` requires explicitly classifying every field as canonical or derived upfront
