# Immortal Claw

Immortal Claw is a small persistent cultivation-world prototype.

## Packages

- `packages/domain`: world rules, items, events, combat, persistence
- `apps/world-api`: HTTP API
- `apps/world-worker`: auto-tick worker
- `packages/openclaw-immortal-plugin`: OpenClaw plugin
- `docs/`: project plans and setup notes

## Current Features

- persistent SQLite world snapshot
- manual tick and auto tick worker
- character creation, agent binding, character switching
- zone travel, cultivation, healing, town tasks
- mining, ruins exploration, basic PVE combat
- pills, talismans, materials, buy/sell loop
- status effects, ambient events, faction reputation
- sect joining, sect errands, simple tribulation resolution
- messages, dao logs, recent combat and event history

## Run

```powershell
npm.cmd install
npm.cmd run dev:api
npm.cmd run dev:worker
```

Defaults:

- API: `http://127.0.0.1:8787`
- SQLite: `data/immortal-world.sqlite`

Optional env vars:

- `WORLD_DB_PATH`
- `WORLD_TICK_INTERVAL_MS`
- `WORLD_TICK_STEPS`
- `PORT`

## Example Calls

```powershell
curl "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he"
curl "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he"
curl -X POST "http://127.0.0.1:8787/cultivator/act" -H "Content-Type: application/json" -d "{\"cultivatorId\":\"yun-zhong-he\",\"actionId\":\"cultivate\"}"
curl -X POST "http://127.0.0.1:8787/world/tick" -H "Content-Type: application/json" -d "{\"steps\":4}"
```

## Docs

- `docs/phase-1-first-version-plan.md`
- `docs/phase-2-enhanced-plan.md`
- `docs/phase-3-full-version-plan.md`
- `docs/first-version-preview.md`
- `docs/openclaw-agent-setup.md`

## OpenClaw

Local plugin path:

- `packages/openclaw-immortal-plugin`
