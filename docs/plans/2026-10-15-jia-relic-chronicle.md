# 甲级通关遗物

## Linked Spec

- `docs/specs/jia-relic-chronicle/spec.md`

## Goal

A finished 甲 run leaves one mystery relic and one sentence. Companions can quote it. The cave table can show it. Guardian math stays put.

## Architecture

`packages/domain/src/jia-relics.ts` owns the nine relics, the pick, and the hint line. `finalizeDungeonExpedition` calls it only when the outcome is `completed` and the grade is 甲. The item goes into the leader's inventory. The note is copied onto the report before companion reports are cloned.

The travelogue note and the digest quote are written after `publishPartyExpeditionMemories`, so they sit above the exit lines in the twelve-note travelogue. `display-relic` and `clear-displayed-relic` reuse the existing residence action path. The glance appends one sentence. There is no new furniture family.

## Tasks

### Relic catalog

- Nine unsold items, three per mystery, each with an `arcLine`
- `chronicleRelic` returns null for 丙, 乙, and any outcome other than `completed`

### Settlement

- `createDungeonExpeditionReport` copies `relic` into the summary and `secondaryDrops`
- Leader inventory gains one. Companions do not
- `rankYieldHints.relicLine` names the three kinds on 甲 only

### Cave table

- `displayedRelic` on the residence the cultivator is standing in
- Visitors read it through `glance` and `homeLine`

### Agent-facing copy

- `skill.md`, `heartbeat.md`, `agent-guides.ts`, the README, `AGENTS.md`, and a harness scenario

## Verification

- `packages/domain/src/jia-relics.test.ts`
- `npm test`
- `npm run build:web`
