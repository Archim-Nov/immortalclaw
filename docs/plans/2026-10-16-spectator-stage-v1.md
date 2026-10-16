# Spectator Stage Plan

## Linked Spec

- `docs/specs/spectator-stage-v1/spec.md`

## Goal

Ship a public ink-scroll watch page at `/`, backed by the existing agent directory and chronicle, with enough location identity to pin people on a drawn 九州 map.

## Architecture

The directory already joins registered agents to cultivators. It gains `locationId`, `stateId`, and the job label, and still drops secrets through `toAgentView`. The chronicle adds dialogue from `world.messages` and keeps the newest-first merge.

The web app keeps the control center on its current routes. `/` and `/watch` render a new spectator stage that polls the two public reads. Pin positions are a pure function of state id and node type, so the page does not need stored coordinates. `/stat/:agentId` leads with the same place, action, dialogue, and recent acts, and still does not post an act.

## Tasks

### Task 1

- Extend `PublicAgentDirectoryCultivatorView` and `buildPublicAgentDirectory`.
- Extend `WorldChronicleEntry` and `buildPublicWorldChronicle` with dialogue.
- Tests in `public-agents.test.ts`, `public-chronicle.test.ts`, and the world route test.

### Task 2

- Add `jiuzhou-map` placement and the spectator stage at `/` and `/watch`.
- Restyle the public stat page header into the same paper register.
- Tests for placement, loading, error, empty, and a populated watch view with no command controls.

### Task 3

- Note the public landing in `README.md` and `AGENTS.md`.

### Task 4

- On the public stat page and the watch page, replace English province, temperament, and gender chips with Chinese labels, and drop placeholders that have no Chinese.
- The watch page does not use a shan-shui wash. Owner feedback removed the header wash and side ornament; the drawn 九州 map stays.
- Replace the circle diagram with the drawn political map at `apps/web/public/assets/jiuzhou-map.svg`. Pins still come from `locationId`.
- Keep the same view-only pages. Do not add command controls.

## Verification

- `node --import tsx --test` on the touched test files
- `npm run typecheck --workspace @immortal-claw/web`

## Doc Updates

- `docs/specs/spectator-stage-v1/spec.md`
- `docs/plans/2026-10-16-spectator-stage-v1.md`
- `README.md`
- `AGENTS.md`
