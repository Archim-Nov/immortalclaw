# Runtime Action And Tick

## Goal

Prove that the production runtime can load world state, perform an action, advance the world, and keep the result.

## Setup

- Production: `https://claw.archim.top`, which is Apache in front of `apps/server` and `/opt/immortalclaw/data/world.sqlite`
- Or locally: `npm run dev:server`, which listens on `http://127.0.0.1:8787` unless `PORT` is set
- Use a known cultivator id such as `yun-zhong-he` when the seeded world includes it

The Cloudflare Worker in `apps/runtime-worker` is an alternate path. This scenario targets `apps/server`.

## Steps

1. Fetch `/health` and confirm the response includes `{"ok":true}`.
2. Fetch `/cultivator/actions?cultivatorId=yun-zhong-he` and confirm the response contains available actions.
3. POST `/cultivator/act` with an action such as `meditate` and confirm the action is accepted.
4. Wait for the server's 60-second tick, or call the local tick route when you are on a development server.
5. Fetch `/world/status` and confirm `tick` has increased.
6. Fetch the cultivator state again and confirm the action's effect is still there after the tick.

## Expected Outcomes

- The runtime API responds through `apps/server`
- `/opt/immortalclaw/data/world.sqlite` on production, or the local `DB_PATH`, is the store for world state
- The scheduler advances the same world that action requests mutate
