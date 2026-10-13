# Architecture Boundary Reset Design

> Status: the official production path is now `browser → Apache → apps/server → packages/application → packages/persistence → packages/domain` on `https://claw.archim.top`. References below to `apps/runtime-worker` as the only transport describe this design at the time it was written. The Worker remains an alternate path.

## Summary

This design resets the repository around one official runtime path:

- `apps/web`
- `apps/runtime-worker`
- `packages/application`
- `packages/persistence`
- `packages/domain`

Everything else should either support that path or be clearly labeled as legacy scaffolding.

The main purpose is not to rewrite the whole project. The purpose is to stop mixing:

- HTTP request parsing
- product workflow orchestration
- persistence decisions
- world simulation rules
- legacy compatibility paths

inside the same files and layers.

## Current Problem

The repository already has the shape of a layered architecture, but the boundaries are weak:

- `apps/runtime-worker/src/routes.ts` handles HTTP, auth context, registration parsing, onboarding composition, direct repository access, and direct domain calls in the same file
- `packages/application` exists, but the current runtime service is mostly a thin pass-through instead of a real workflow layer
- `packages/persistence` does more than store data; repositories also make business decisions such as character registration and persona sync
- `packages/domain` contains the real world rules, but also still exposes product-facing helper surfaces that make it too easy for outer layers to reach in directly
- `apps/world-api` and `apps/world-worker` are still present, which keeps an older architecture alive in parallel even though the project now treats them as legacy harnesses

The result is a repository that feels like two systems merged together:

- the new production path
- the old experimental/local harness path

## Target Architecture

The target architecture is:

`web -> runtime-worker -> application -> persistence -> domain`

Each layer should have a narrow job:

- `apps/web`
  UI only. Calls runtime APIs and renders responses.
- `apps/runtime-worker`
  Transport layer only. Parses HTTP input, authenticates the caller, invokes application use cases, formats HTTP responses.
- `packages/application`
  Workflow orchestration layer. Owns registration flow, onboarding flow, authenticated agent flow, and response assembly that combines multiple repository/domain reads.
- `packages/persistence`
  Storage layer only. Reads and writes durable state, runs transactions, and enforces persistence-level concurrency rules.
- `packages/domain`
  World rules only. Owns simulation logic, state transitions, calculations, and pure gameplay rules.

## Key Decisions

### 1. One Official Runtime Path

The only product architecture we actively build on is:

- `apps/web`
- `apps/runtime-worker`
- `packages/*`

`apps/world-api` and `apps/world-worker` stay in the repo only as legacy harnesses. They are not part of the product architecture discussion anymore.

### 2. Move Workflow Logic Upward

Registration, onboarding, and agent-facing flow assembly should move into `packages/application`.

That includes use cases such as:

- register agent with questionnaire
- fetch authenticated agent state
- fetch authenticated actions
- send authenticated direct messages
- reset credential while keeping agent binding

The simple rule is:

- if a flow combines multiple reads/writes or multiple concepts, it belongs in `application`

### 3. Keep Persistence Boring

Repositories should stop making game/product decisions.

They should:

- load world snapshots
- save world snapshots
- persist profiles, credentials, messages, and tick metadata
- enforce transaction / optimistic concurrency rules

They should not decide:

- how registration works
- how onboarding is assembled
- what persona sync means for gameplay

### 4. Keep Domain About The World

`domain` should keep:

- cultivation rules
- action resolution
- event resolution
- economy formulas
- topology and seed data
- registration scoring if it is treated as world/system logic

`domain` should not carry:

- HTTP-specific concerns
- repository-facing assembly helpers
- product history baggage just because older outer layers still use it

### 5. Compatibility Is Explicit

Compatibility layers may exist, but they must be visibly marked:

- deprecated request fields
- legacy routes
- legacy harness apps
- temporary bridges between old and new workflow paths

Compatibility should be something we can point at and say:
"this is here temporarily"

not something silently mixed into the main architecture.

## Migration Strategy

This should be done in phases, not a rewrite.

### Phase 1: Declare Boundaries

- document the official runtime path
- mark legacy harness apps as non-product architecture
- define application-layer ownership for registration, onboarding, and agent orchestration

### Phase 2: Extract Application Use Cases

Start with the highest-value workflows currently trapped in `routes.ts`:

- questionnaire-driven registration
- onboarding/bootstrap response assembly
- authenticated agent state/actions/messages

`routes.ts` should become thinner after each extraction.

### Phase 3: Shrink Persistence Responsibilities

Move registration/persona business decisions out of repositories.

Repositories should expose narrower primitives and transaction helpers. Application should decide how to use them.

### Phase 4: Clean Domain Surface

Reduce product-history exports and compatibility helpers from the outer domain surface. Keep domain APIs centered on world logic.

### Phase 5: Retire Or Fence Legacy Paths

Keep `apps/world-api` and `apps/world-worker` only if they still help testing. If they stay, they should be fenced as legacy harnesses with minimal maintenance expectations.

## Risks

### Risk: Over-refactoring

If we try to fix every boundary at once, we will destabilize the game loop.

Mitigation:

- move one workflow family at a time
- keep tests on every migrated seam

### Risk: Application Layer Becomes A Dumping Ground

If we move everything out of `routes.ts` without designing clear use cases, `application` will become another large mess.

Mitigation:

- create named use cases
- group by workflow, not by transport

### Risk: Compatibility Paths Stay Forever

If we do not mark bridges as temporary, they will silently become permanent.

Mitigation:

- add explicit deprecated notes
- track cleanup steps in follow-up plans

## Success Criteria

We should consider this boundary reset successful when:

- the repo has one clearly documented official runtime path
- `routes.ts` mostly does transport work instead of orchestration
- registration/onboarding/agent flows live in `packages/application`
- repositories mostly do storage and transaction work
- domain mostly exposes world rules
- legacy harness apps are clearly outside product architecture decisions

