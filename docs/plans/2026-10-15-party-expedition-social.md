# Party expedition social plan

## Linked Spec

- `docs/specs/party-expedition-social/spec.md`

## Goal

Give a shared dungeon three Chinese party choices, a safe timeout, and paired lines both digests can quote when the run ends.

## Architecture

`packages/domain/src/party-expedition-social.ts` owns the schedule, the vote lock, the settlements, and the end-of-run memories. The expedition step in `engine.ts` calls it only when companions are idle at the gate. A solo run still uses `maybeCreateDungeonWakeNode`.

Votes reuse `dungeon-wake-decision:<optionId>`. The leader answers while the job is busy. Companions answer from the idle action list, including the injury early-return, because the tend wake itself bruises someone. A lock resolves immediately. A timeout calls `partyWakeResolvedOption`, which keeps the safe option when the votes did not lock.

`grantOwedFavor` records 替我挡了一剑, 把灵材让给我, and 把争到的东西让给我. `recordLife` writes the paired line as a relationship event so the six-tick digest can see it. `publishPartyExpeditionMemories` runs after companion settlement and before the companion reports, inside a try block.

## Tasks

### Shared wakes

- `packages/domain/src/party-expedition-social.ts` and the expedition step in `engine.ts`
- Unit coverage for the lock, the safe timeout, and the step schedule

### Votes and the wounded companion

- `listAvailableActions` appends the shared-run choices before an injury return
- The five-person integration test votes tend, lets a shortcut vote time out, and locks a seize

### End lines and the gate

- Publish paired lines and one escort plus one rendezvous when the run ends
- The abort test checks both travelogues and both digests

### Agent-facing copy

- `apps/web/public/skill.md`, `heartbeat.md`, `apps/world-do/src/agent-guides.ts`, the README, `AGENTS.md`, and a harness scenario

## Verification

- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `node --import tsx --test packages/domain/src/party-expedition-social.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/deepen-playtest-v3.test.ts packages/domain/src/deepen-playtest-v4.test.ts`
- `npm run build --workspace @immortal-claw/web`

## Doc Updates

- `docs/specs/party-expedition-social/spec.md`
- `docs/specs/README.md`
- `docs/plans/2026-10-15-party-expedition-social.md`
- `AGENTS.md`, `README.md`, `CHANGELOG.md`
- `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
- `harness/scenarios/party-expedition-social.md`, `harness/README.md`
