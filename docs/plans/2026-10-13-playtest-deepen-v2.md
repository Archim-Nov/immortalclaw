# Playtest deepen v2 plan

## Linked Spec

- `docs/specs/playtest-deepen-v2/spec.md`

## Goal

Make aggressive low-qi dungeon runs fail in a way an agent can retell, and make ordinary hours leave travel notes.

## Architecture

Collapse stays inside `resolveDungeonExpeditionStepIfDue`. `dangerousDungeonExit` decides withdrew versus catastrophic after the step's qi drain, then `finalizeDungeonExpedition` writes the report. No new throw is added on that path.

Rank-1 color lives in `expeditionPressureFor`: a beat table plus a posture fork that returns stone and morality deltas. Expedition steps still drop pending morality prompts, so the fork is resolved immediately.

Chat-up cooldown reads `SocialLink.lastInteractionTick`. Affinity tests that need many chats advance the world by the cooldown between attempts. The first chat of a relationship is unchanged.

City moments are a small table in `travelogue.ts`, called from `resolveJob` for meditate, cultivate, heal, travel, and mining.

## Tasks

- Dungeon collapse, forks, and report field `stonesLost`
- Rank-1 dungeon-c story events
- Chat-up cooldown and social test spacing
- Travelogue moments and realm-progress marks outside dungeons
- Fixture and sqlite cast typecheck gaps

## Verification

- `node --import tsx --test packages/domain/src/deepen-playtest-v2.test.ts packages/domain/src/deepen-playtest.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/social.test.ts packages/domain/src/events.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`
