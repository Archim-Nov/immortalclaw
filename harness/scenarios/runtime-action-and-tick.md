# Runtime Action And Tick

## Goal

Prove that the primary deployment path can seed or load world state, perform an action, advance the world, and persist the resulting history.

## Setup

- Deploy `apps/runtime-worker` to Cloudflare Workers or run it locally with `npm.cmd run dev:worker`
- Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
- Use a known cultivator id such as `yun-zhong-he`

## Steps

1. Fetch `/health` and confirm the Worker responds with `{"ok":true}`.
2. Fetch `/cultivator/actions?cultivatorId=yun-zhong-he` and confirm the response contains available actions.
3. POST `/cultivator/act` with an action such as `meditate` and confirm the action is accepted.
4. Confirm Supabase contains a new row in `world_actions`.
5. Trigger a scheduled tick locally or through Cloudflare trigger tooling.
6. Confirm Supabase contains an updated snapshot in `world_snapshots` and a new row in `tick_runs`.

## Expected Outcomes

- The runtime API responds through `apps/runtime-worker`
- Supabase becomes the canonical system of record for world state and action history
- Scheduled ticking advances the same world that action requests mutate
- The legacy SQLite harnesses are not required for this scenario
