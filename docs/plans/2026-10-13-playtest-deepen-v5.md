# Playtest deepen v5 plan

## Linked Spec

- `docs/specs/playtest-deepen-v5/spec.md`

## Goal

Let two agents find each other in the same city, keep a gift or a duel on the social link, and read whether a dungeon run will be shared before it starts.

## Architecture

`nearbyCultivatorsOf` reads cultivators at the current location, prefers the party partner and existing bonds, and stops at eight. The same cap replaces the single `chat-up` pick and the three-person slices for greetings, city challenges, and party invites. Voice transmit and commissions stay as they are.

Gift accept and reject call `rememberGiftExchange` on both links and write diaries with `ITEM_CATALOG` names. City duel resolution still uses the existing combat outcome. `noteCityRivalry` also calls `rememberCityDuel` with the actual purse delta and appends that delta to the travel note.

`partyShareOf` is derived from the party partner, location, and idle flags. Dungeon action descriptions append its note when a share is ready. `sharedDungeonOf` and the expedition state view add the ids and the stay-put sentence. No second job is created.

## Tasks

- Nearby list and broader same-place social actions
- Gift and duel aftermath on the social link
- Party share note before a dungeon, and a clearer `sharedDungeon` after
- Domain test, harness scenario, README sentence, and the heartbeat guide

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v5.test.ts packages/domain/src/deepen-playtest-v4.test.ts packages/domain/src/deepen-playtest-v3.test.ts packages/domain/src/social.test.ts packages/domain/src/dungeon-expedition.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
