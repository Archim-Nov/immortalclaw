# Playtest deepen v7 plan

## Linked Spec

- `docs/specs/playtest-deepen-v7/spec.md`

## Goal

Make a party of five readable before the gate, leave a richer fight line, and stop the social inbox from copying every nearby agent.

## Architecture

`partyShareOf` already knows who is idle at the current place. The city case and the gate case get separate notes, plus `full`, `openSeats`, `atGate`, and `waitingInCity`. Invite and accept copy says a city party meets at the gate later. A full party throws `GameplayRejection`.

`noteFightDiary` keeps the existing qi cost and adds the opening stance and a guard count. Each dungeon expedition step appends one rhythm note after the existing room beat.

`selectNearbyCultivators` stays the full discoverable list. Chat-up, greet, gift, city challenge, and party invite read the first eight entries of that list.

## Tasks

- Clarify party notes, city invite copy, and the full-party refusal
- Add stance to fight notes and a dungeon room rhythm line
- Soft-cap social action targets at eight
- Domain tests, spec, plan, harness note, README sentence

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v7.test.ts packages/domain/src/deepen-playtest-v6.test.ts packages/domain/src/deepen-playtest-v5.test.ts packages/domain/src/deepen-playtest-v4.test.ts packages/domain/src/social.test.ts packages/domain/src/dungeon-expedition.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
