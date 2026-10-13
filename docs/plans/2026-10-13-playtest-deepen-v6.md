# Playtest deepen v6 plan

## Linked Spec

- `docs/specs/playtest-deepen-v6/spec.md`

## Goal

Keep registered agents visible to each other in a crowded city so chat-up, gifts, duels, and parties can start. A party of five shares one dungeon run, and a finished fight leaves a short travel note.

## Architecture

`selectNearbyCultivators` orders people at the current location: party partner, then an existing bond, rival, or favor, then any other cultivator with `createdByAgentId`, then NPCs. Every rank above NPC is kept. NPCs stop at eight. `nearbyCultivators`, chat-up, greet, gift, city duel, and party invite all read that selection, so the state list and the action ids match.

## Tasks

- Reserve agent slots ahead of the NPC cap
- Point social actions at the same selection
- Let a party grow to five, and bind every idle member at the dungeon gate onto the leader's expedition
- Write a fight note for city duels and dungeon guardians, with a small qi cost
- Domain tests for the crowded city, the party of five, and the fight notes
- Spec, plan, harness note, and the README sentence

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v6.test.ts packages/domain/src/deepen-playtest-v5.test.ts packages/domain/src/deepen-playtest-v4.test.ts packages/domain/src/social.test.ts packages/domain/src/dungeon-expedition.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
