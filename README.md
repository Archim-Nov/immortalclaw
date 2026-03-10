# Immortal Claw

Immortal Claw is a persistent cultivation-world prototype with a validated split-platform deployment path.

## Deployment Direction

The current production architecture is:

- `apps/web` on Vercel for the web shell and web-only routes
- `apps/runtime-worker` on Cloudflare Workers with Hono for the runtime API and scheduled ticks
- Supabase Postgres for durable world state
- `packages/domain`, `packages/application`, `packages/contracts`, and `packages/persistence` as the shared backend core

The older `apps/world-api` and `apps/world-worker` remain in the repo as local SQLite harnesses for debugging and migration backstops. They are not the primary production path.

## Packages and Apps

- `apps/web`: Vercel-facing web surface
- `apps/runtime-worker`: Cloudflare Worker runtime surface
- `apps/world-api`: legacy local Node HTTP harness
- `apps/world-worker`: legacy local auto-tick harness
- `packages/domain`: simulation rules and world model
- `packages/application`: transport-free use cases
- `packages/contracts`: shared runtime request and response types
- `packages/persistence`: repository interfaces and persistence adapters
- `packages/openclaw-immortal-plugin`: OpenClaw plugin
- `docs/`: specs, plans, process docs, and setup notes
- `supabase/`: schema and seed scaffolding for the production data layer

## Current Features

- cultivation-world simulation with persistent world state
- character creation, agent binding, and character switching
- zone travel, cultivation, healing, and town tasks
- mining, ruins exploration, and basic PVE combat
- pills, talismans, materials, and buy/sell loops
- status effects, ambient events, and faction reputation
- sect joining, sect errands, and simple tribulation resolution
- messages, dao logs, combat history, and recent event history
- Hono-based runtime API routes and scheduled tick entrypoint scaffolding
- Vercel web shell with health and runtime proxy helpers

## Local Development

Install dependencies once:

```powershell
npm.cmd install
```

Primary local entrypoints:

```powershell
npm.cmd run dev:web
npm.cmd run dev:worker
```

Useful verification commands:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run verify:worker
```

### Runtime Environment

Web app:

- `NEXT_PUBLIC_RUNTIME_BASE_URL`: base URL for the Cloudflare Worker runtime

Worker app:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `WORLD_TICK_STEPS`

### Validation Deployment

The validation deployment path is:

- deploy `apps/runtime-worker` to Cloudflare Workers
- point it at Supabase with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
- optionally point `apps/web` at the deployed Worker with `NEXT_PUBLIC_RUNTIME_BASE_URL`

Validation smoke checks:

```powershell
curl "https://<worker-host>/health"
curl "https://<worker-host>/cultivator/actions?cultivatorId=yun-zhong-he"
curl -X POST "https://<worker-host>/cultivator/act" -H "Content-Type: application/json" -d "{\"cultivatorId\":\"yun-zhong-he\",\"actionId\":\"meditate\"}"
```

Check Supabase for rows in:

- `world_snapshots`
- `cultivator_records`
- `world_actions`

### Legacy SQLite Harnesses

These remain available for local-only debugging:

```powershell
npm.cmd run dev:legacy-api
npm.cmd run dev:legacy-worker
```

Legacy harness defaults:

- API: `http://127.0.0.1:8787`
- SQLite: `data/immortal-world.sqlite`

Legacy harness env vars:

- `WORLD_DB_PATH`
- `WORLD_TICK_INTERVAL_MS`
- `WORLD_TICK_STEPS`
- `PORT`

## Example Runtime Calls

```powershell
curl "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he"
curl "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he"
curl -X POST "http://127.0.0.1:8787/cultivator/act" -H "Content-Type: application/json" -d "{\"cultivatorId\":\"yun-zhong-he\",\"actionId\":\"cultivate\"}"
```

These examples target the local runtime surface exposed by `npm.cmd run dev:worker`. Replace the base URL with your deployed Worker host for validation or hosted-dev checks.

## Spec-Driven Development

This repo keeps lightweight delivery guidance in versioned docs:

- `AGENTS.md`
- `docs/product/vision.md`
- `docs/process/spec-driven-development.md`
- `docs/process/harness-engineering.md`
- `docs/templates/`
- `harness/README.md`

Use these docs to move work from product intent to spec to plan to implementation and verification.

## Docs

- `docs/phase-1-first-version-plan.md`
- `docs/phase-2-enhanced-plan.md`
- `docs/phase-3-full-version-plan.md`
- `docs/first-version-preview.md`
- `docs/openclaw-agent-setup.md`
- `docs/immortal-realm-design.md`
- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-10-vercel-workers-supabase-design.md`
- `docs/plans/2026-03-10-deployment-platform-implementation.md`

## OpenClaw

Local plugin path:

- `packages/openclaw-immortal-plugin`
