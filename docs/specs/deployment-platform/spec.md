# Deployment Platform Spec

## Summary

Reshape Immortal Claw from a local Node.js prototype into a deployable multi-platform architecture with Cloudflare Pages for the web surface, Cloudflare Workers for the runtime and API surface, and Supabase Postgres as the canonical system of record.

## Problem

The original prototype was optimized for local development with a plain Node HTTP server, a long-running worker, and local SQLite persistence.

Those old SQLite harnesses have been removed from the repository. The production runtime path is now the only runtime path:

`apps/web -> apps/runtime-worker -> packages/application -> packages/persistence -> packages/domain`

That shape maps cleanly to the deployment target and keeps the game logic portable across runtime adapters.

## Goals

- Make the full project deployable with a clear production architecture.
- Use Supabase Postgres as the canonical durable store.
- Keep game rules portable across runtime adapters.
- Separate product-facing web delivery from simulation runtime execution.
- Replace the permanent worker model with bounded scheduled execution.
- Preserve a path to add a dedicated runtime service later without rewriting core logic.
- Migrate the web surface from Next.js on Vercel to a Vite React SPA on Cloudflare Pages.
- Preserve GitHub-visible deployment history for the web surface after the Vercel migration.

## Non-Goals

- Finalize every table schema detail before implementation begins.
- Introduce a separate always-on gateway or runtime service now.
- Move simulation rules into SQL or database functions by default.
- Commit the project to Cloudflare-specific state primitives such as Durable Objects in the first pass.

## User-Visible Behavior

When the change is complete:

- the web surface can be deployed through Cloudflare Pages as a static SPA
- the runtime and API surface can be deployed through Cloudflare Workers
- world state persists in Supabase instead of a local SQLite file
- scheduled world progression runs through bounded tick executions instead of a resident worker process
- local development still supports seeding, inspecting, acting on, and advancing the world
- the older SQLite server and worker have been removed, so the production runtime path is the only runtime path
- browser routes are handled through client-side routing instead of Next.js route handlers
- the browser reads the runtime base URL from `VITE_RUNTIME_BASE_URL`
- the Worker CORS allowlist is configured through `FRONTEND_ORIGIN`
- GitHub Deployments shows `Preview` entries for pull requests and `Production` entries for `master` pushes after Cloudflare Pages reports success
- closing a pull request marks its GitHub `Preview` deployments inactive

## Constraints

- `packages/domain` should remain focused on simulation rules rather than transport or infrastructure.
- Runtime handlers must tolerate short-lived execution and retries.
- Persistent world updates must be safe under concurrent requests and scheduled ticks.
- Source-of-truth docs must be updated alongside implementation.
- The initial architecture should favor portability over provider-specific optimization.
- The frontend should remain client-rendered for this migration and call the Worker origin directly.
- `FRONTEND_ORIGIN` must be a valid absolute frontend origin such as `https://immortal-claw.pages.dev`.
- GitHub production deployment records require a repository variable such as `CLOUDFLARE_PAGES_PRODUCTION_URL` for the canonical Pages production URL.

## Acceptance Criteria

- A shared application layer exists between transport adapters and domain logic.
- The production persistence layer targets Supabase Postgres.
- The Cloudflare Worker can serve the runtime and API surface and invoke scheduled ticks.
- The Vite app can build to static assets for Cloudflare Pages without embedding server-only logic in the frontend surface.
- The frontend runtime client reads from `VITE_RUNTIME_BASE_URL` instead of `NEXT_PUBLIC_RUNTIME_BASE_URL`.
- Worker deployment guidance documents `FRONTEND_ORIGIN` as a required binding for frontend CORS.
- World mutation paths use durable coordination rather than in-memory single-process assumptions.
- Local verification covers domain behavior, application use cases, and at least one end-to-end action-plus-tick flow.
- A repository-managed workflow mirrors successful Cloudflare Pages results into GitHub Deployments for both `Preview` and `Production`.
- The GitHub deployment mirroring workflow marks stale pull request previews inactive when pull requests update or close.

## Open Questions

- Should the first Postgres persistence pass use coarse world snapshots, normalized tables, or a hybrid model?
- Should the public runtime API live entirely behind a separate Worker origin, or should the project unify frontend and backend deployment on Workers later?

## Transition Decision

Treat `apps/web` on Cloudflare Pages plus `apps/runtime-worker` on Cloudflare Workers with Supabase as the production runtime path. The legacy SQLite harnesses have been removed, so there is no parallel local runtime path to preserve.
