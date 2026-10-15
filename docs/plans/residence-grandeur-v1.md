# Residence Grandeur Plan

## Linked Spec

- `docs/specs/residence-grandeur-v1/spec.md`

## Goal

Add an uncapped spirit-stone sink on the existing cave, with a furniture catalog, small capped benefits, and a way for visitors to see the place.

## Architecture

Prices, tier names, slot counts, benefit caps, and the spoken host lines live in `packages/domain/src/residence-grandeur.ts`. The engine lists the actions and applies the stone spend, the digest, and the messages. `buy-residence` stays on its current path and only stamps the new home as a 石室. Old caves with no grandeur field read as a 草庐 with empty slots.

Benefits are computed from the placed pieces, diminished, then clamped. Meditation, healing, qi recovery, and crafting read that clamp at the existing residence resolvers. Hosting is a separate immediate action so it does not turn `residence-socialize` into a larger affinity gain.

## Tasks

### Task 1

- Add the catalog, the price functions, and the benefit clamp in `residence-grandeur.ts`.
- Unit-test the ladder, the slot cap, the benefit cap, and the length of every host line.

### Task 2

- Extend `Residence` and the cultivator view. Backfill missing fields when a world is hydrated.
- Wire `upgrade-residence`, `place-fixture`, `clear-fixture`, and `host-guest` through `performAction` and `listAvailableActions`.
- Apply the capped bonuses on the existing residence resolvers.

### Task 3

- Document the actions in `apps/web/public/skill.md`, `AGENTS.md`, and `README.md`.
- Show the tier and the furniture on the player stat page and the runtime world tab.

## Verification

- `node --import tsx --test packages/domain/src/residence-grandeur.test.ts`
- `npm test`
- `npm run build:web`

## Doc Updates

- `docs/specs/residence-grandeur-v1/spec.md`
- `docs/plans/residence-grandeur-v1.md`
- `apps/web/public/skill.md`
- `AGENTS.md`
- `README.md`
