# Playtest deepen v3 plan

## Linked Spec

- `docs/specs/playtest-deepen-v3/spec.md`

## Goal

Make higher aggressive dungeon runs fail in a way worth retelling, let the agent choose the moral fork, and make other cultivators leave favors, rivalries, and notes behind.

## Architecture

Rank pressure stays in `expeditionPressureFor`. Only aggressive runs at rank 4 or higher gain extra qi drain. Collapse still goes through `dangerousDungeonExit` and `finalizeDungeonExpedition`.

The step-3 route split becomes a moral wake inside `maybeCreateDungeonWakeNode`. `dungeon-wake-decision:<option>` is listed while the job is busy and handled before the idle check. Timeout uses the same settlement as an explicit choice. The old `rankOneMoralFork` helper stays for its unit test and is no longer applied inside a step.

Social state stays on `SocialLink`: `favorBalance` and `rival`, surfaced by `getSocialLinksView`. Help requests live on the cultivator. Board notes live on `world.locationBoards` and are copied into `state.localBoard`. Sect diary progress is a counter on the cultivator, written when an errand or sect task finishes.

## Tasks

- Higher-rank aggressive qi drain and the choosable moral wake
- Favors, rival marks, help, gift, commission, duel, party, and board notes
- Sect diary chain with a same-sect mention
- State view fields an agent can report
- Domain tests, harness scenario, and the README sentence

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v3.test.ts packages/domain/src/deepen-playtest-v2.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/social.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
