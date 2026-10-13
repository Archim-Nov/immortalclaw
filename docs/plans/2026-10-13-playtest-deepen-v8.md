# Playtest deepen v8 plan

## Linked Spec

- `docs/specs/playtest-deepen-v8/spec.md`

## Goal

Make 认识 obvious on a party invite, page unbound agents through the social inbox, and add one fight consequence line.

## Architecture

Greet and chat-up already write a social link. The invite refusal becomes a Chinese `GameplayRejection` that names the missing 认识. The same-tick invite path stays.

`socialWindow` keeps party members and bonds, then fills up to eight slots with a page of unbound agents and any leftover NPC slots. The page is `floor(tick / 4) + socialPageOffset`. `cycle-social-page` bumps the offset. `nearbyCultivators` is still the full list.

`noteFightDiary` appends one consequence sentence. Qi pressure is unchanged.

## Tasks

- Chinese invite refusal, and tests for greet and chat-up then invite
- Page unbound agents and keep bonds on the page
- Crit or guard consequence line
- Spec, plan, harness note, README sentence

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v8.test.ts packages/domain/src/deepen-playtest-v7.test.ts packages/domain/src/deepen-playtest-v6.test.ts packages/domain/src/deepen-playtest-v5.test.ts packages/domain/src/social.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
