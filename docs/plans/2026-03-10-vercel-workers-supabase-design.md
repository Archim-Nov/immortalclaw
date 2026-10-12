# Cloudflare Pages, Cloudflare Workers, and Supabase Deployment Design

> Status update on 2026-03-11: the follow-on frontend migration replaced the planned Vercel and Next.js web surface with a Vite React SPA on Cloudflare Pages. Treat older Vercel and Next.js references in this document as superseded design history unless they are restated below.
>
> Later status: that Cloudflare target is also historical. Production is self-hosted at `https://claw.archim.top`. See `README.md`.

## Goal

Define a deployable architecture for Immortal Claw that preserves rapid feature iteration while replacing local-process assumptions with portable runtime and persistence boundaries.

## Context

The current repository has three prototype traits that are valuable locally but limiting for deployment:

- `apps/world-api/src/server.ts` exposes the API through a plain Node HTTP server.
- `apps/world-worker/src/worker.ts` advances the world through a resident process.
- `packages/domain/src/store.ts` stores world state in a local SQLite file and couples persistence to the domain package.

The target operating model is:

- Cloudflare Pages for the web and product surface
- Cloudflare Workers for the runtime and scheduled execution surface
- Supabase Postgres for durable state

This follows the useful lesson from ClawCity: separate product delivery from runtime execution, but keep durable state centralized instead of splitting it across runtime-local files and database records.

## Design Principles

- Keep simulation logic pure and portable.
- Centralize durable state in Supabase.
- Use short-lived compute invocations instead of permanent workers.
- Keep runtime adapters thin.
- Design for future runtime expansion without paying that cost now.
- Use framework help at the transport edge only, not in the game logic core.

## Recommended Architecture

### Execution Surfaces

- `apps/web`: Vite React frontend deployed to Cloudflare Pages.
- `apps/runtime-worker`: Cloudflare Worker for the runtime API, scheduled ticks, and future async entrypoints.
- `packages/domain`: pure cultivation and world rules.
- `packages/application`: orchestration layer for actions, state reads, tick advancement, validation, locks, and idempotency.
- `packages/persistence`: repository interfaces and Supabase/Postgres implementations.
- `packages/contracts`: shared schemas and request and response types.

### Responsibility Split

Cloudflare Pages owns:

- the website
- future player-facing UI
- docs and landing experiences
- optional admin or inspection surfaces

Cloudflare Workers owns:

- public runtime API endpoints
- scheduled world ticking
- webhook-style entrypoints
- future queue or async handlers

Supabase owns:

- canonical world state
- tick bookkeeping and coordination metadata
- action and event history
- future account linkage or auth-adjacent data

### Worker Framework Boundary

Use Hono inside `apps/runtime-worker` as the transport framework for:

- route registration
- middleware such as CORS, auth, and error mapping
- request parsing and response helpers
- runtime-specific composition

Do not let Hono leak into `packages/domain`, `packages/application`, or `packages/persistence`.

Those packages should stay framework-agnostic so the core game logic remains portable across Cloudflare Workers, local harnesses, and any future dedicated runtime service.

## Runtime Strategy

Do not introduce a separate always-on runtime service in the first pass.

Instead, treat runtime as an internal abstraction. The system should expose application use cases that can be called by:

- a Hono HTTP handler running on Cloudflare Workers
- a Cloudflare scheduled handler
- a future queue consumer
- a future dedicated runtime service if the product later needs one

This keeps the current deployment target lightweight while leaving a clear path to expand into a ClawCity-style gateway later if autonomous agents or higher-frequency execution justify it.

## World State and Tick Flow

The world should behave as a database-backed state machine.

For request-driven actions:

1. A client calls a Worker endpoint.
2. The Hono route invokes an application-layer use case.
3. The use case loads the necessary world state from persistence repositories.
4. The domain logic computes the result.
5. The persistence layer writes the new state and append-only logs.
6. The Worker returns a typed response.

For scheduled progression:

1. A Cloudflare cron trigger invokes the tick handler.
2. The application layer acquires a durable world or shard lock.
3. The system advances a bounded number of ticks.
4. The persistence layer writes the new state and tick metadata.
5. The invocation exits.

Required properties:

- no request depends on process-local state
- ticks are bounded per invocation
- repeated invocations are duplicate-safe
- world mutation writes include history or event records
- coordination lives in durable storage, not in-memory globals

## Persistence Direction

Supabase Postgres is the production source of truth.

The first persistence iteration should favor implementation speed without blocking later normalization. A hybrid approach is acceptable:

- keep some coarse world data as snapshots while migrating off SQLite
- normalize high-value entities such as cultivators, actions, ticks, and event logs
- hide storage details behind repositories so the application layer does not depend on table shape

The domain package should no longer create or manage the database connection directly.

## Local Development

Local development should stay ergonomic even after the architecture split:

- run the Vite app locally for the web surface
- run the Cloudflare Worker locally for runtime and API behavior through Wrangler and the Hono app
- use either hosted-dev Supabase or local Supabase for persistence
- move toward explicit seed and reset tooling instead of relying on implicit SQLite seeding in the legacy harnesses

The repo should keep a simple path for developers to inspect state, perform actions, and advance ticks without deploying the full stack.

The older `apps/world-api` and `apps/world-worker` can remain in the repository as explicit local-only SQLite harnesses, but they should be documented as debugging backstops rather than as the primary runtime path.

## Verification Strategy

Verification should cover three layers:

- domain tests for simulation rules
- application tests for use cases and repository contracts
- adapter tests for the Hono Worker routes and scheduled handlers

At least one end-to-end harness path should cover:

1. seed or reset the world
2. perform an action
3. advance ticks
4. confirm state and history changes

## Trade-Offs

Benefits:

- clean separation between the static web shell and the simulation runtime
- better fit for scheduled ticking than frontend-hosted server functions
- cleaner separation between product shell and simulation runtime
- Hono reduces raw transport boilerplate while staying lightweight
- flexibility to add a dedicated runtime service later

Costs:

- three-platform operational picture instead of one
- more adapter and contract discipline required
- migration effort to remove SQLite and Node-server assumptions
- one more framework dependency at the Worker boundary

## Risks and Mitigations

- Risk: transport adapters duplicate business logic.
  Mitigation: keep use cases in `packages/application` and contracts in `packages/contracts`.

- Risk: Hono types or helpers leak into shared packages.
  Mitigation: restrict Hono usage to `apps/runtime-worker`.

- Risk: concurrent tick and action mutations corrupt state.
  Mitigation: add durable locking and idempotency in the application and persistence layers.

- Risk: early schema choices become hard to evolve.
  Mitigation: start with repository boundaries and allow a hybrid snapshot-plus-relational first pass.

- Risk: local development becomes harder than the prototype.
  Mitigation: add explicit dev commands for reset, seed, and local runtime startup.

## Recommendation

Adopt `Cloudflare Pages + Cloudflare Workers + Supabase` as the target architecture.

Implement it as a runtime-portable backend:

- keep domain rules pure
- add an application layer
- add persistence adapters
- use Hono as the Cloudflare Worker transport layer
- move the public runtime API and scheduled ticks to Cloudflare Workers
- deploy the web surface as a Vite SPA on Cloudflare Pages

Do not introduce a separate always-on runtime service yet. Treat that as a future extension point rather than a requirement for the first deployable version.

## Validation Deployment Notes

The validation deployment milestone is satisfied when:

- the Worker is deployed and responds to `/health`
- runtime reads auto-seed or load state from Supabase
- at least one action call persists rows into `world_actions`
- scheduled ticking can be exercised locally or through Cloudflare trigger tooling

That validation flow should be the default way this architecture is demonstrated going forward.
