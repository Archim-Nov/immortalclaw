# Playtest deepen v4 plan

## Linked Spec

- `docs/specs/playtest-deepen-v4/spec.md`

## Goal

Let two agents share one dungeon run, leave richer board notes, and retell a longer sect chain that names a real sect-mate.

## Architecture

The dungeon job stays on the leader. `DungeonExpeditionProgress.companionId` is set at start when the party partner is idle at the same gate. Each resolved step calls `echoDungeonCompanion`, which spends a fraction of that step's qi drain while the companion is still idle there, and clears the link if they have left. `finalizeDungeonExpedition` calls `settleDungeonCompanion` after the report is saved: stones and injury for a collapse, a purse split for a completion, a joint exit for an abort. A busy companion is skipped so their job is not pulled to another place. Errors inside the echo and the settlement are swallowed.

Board notes stay on `world.locationBoards`. `post-board-note` remains the journey line. Favor, rival, and sect kinds are separate action ids and are refused when the author has nothing of that kind to pin. `call-favor` and `press-rival` are immediate actions at the same location. The rival scene stamps `lastRivalSceneTick` on both links.

Sect diary progress stays a counter on the cultivator. `noteSectLife` now walks six beats. The mate is the first other cultivator at the gate with the same sect, otherwise a stable name from a fixed roster. Only a real peer receives affinity, a diary line, and the final favor.

## Tasks

- Shared dungeon qi, stones, and injuries without a second job
- Board kinds plus call-favor and press-rival
- Six-beat sect chain with a named mate and a callable favor
- State view fields an agent can report
- Domain tests, harness scenario, and the README sentence

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v4.test.ts packages/domain/src/deepen-playtest-v3.test.ts packages/domain/src/deepen-playtest-v2.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/social.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
