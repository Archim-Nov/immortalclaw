# Companion Shared Report

## Linked Spec

- `docs/specs/companion-shared-report/spec.md`

## Goal

Give every companion on a finished shared dungeon the leader's `combatRounds`, and make the closing 见闻 name roles, a skill, and any spoken line or tended wound from that run.

## Architecture

`finalizeDungeonExpedition` already builds one report for the leader. After that, clone it onto each id still in `companionIds`, set `sharedLeaderId`, and prefix the summary. The live `sharedDungeon` view copies `combatRounds` while the expedition still exists.

Spoken lines and `tend-wound` already call `pushTravelNote`. The same moment now echoes one note to other party members in that place, and appends a short clause onto the active expedition. Starting a shared run also scans the last six ticks of those notes, so a line said at the gate is still there when the exit note is written. `settleDungeonCompanion` keeps the old stone and injury sentences and appends that retelling.

A city duel already builds a `DungeonCombatSummary`. That object is stored on the combat job and copied onto both combat logs.

## Tasks

### Task 1

- Add the optional report, progress, shared-dungeon, and combat-log fields in `packages/domain/src/model.ts`.
- Publish the companion report and the exit retelling from `packages/domain/src/engine.ts`.

### Task 2

- Cover the companion report, the closing note, and the duel `combatRounds` in `packages/domain/src/companion-report.test.ts` and the existing gate-companion test.

## Verification

- `node --import tsx --test packages/domain/src/companion-report.test.ts packages/domain/src/party-battle.test.ts packages/domain/src/spoken-lines.test.ts packages/domain/src/combat-deepen-v2.test.ts packages/domain/src/combat-deepen-v3.test.ts packages/domain/src/deepen-playtest-v4.test.ts packages/domain/src/deepen-playtest-v6.test.ts packages/domain/src/dungeon-expedition.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `AGENTS.md`, `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`
- `README.md`, `CHANGELOG.md`, `docs/specs/README.md`, `harness/README.md`, `harness/scenarios/companion-shared-report.md`
