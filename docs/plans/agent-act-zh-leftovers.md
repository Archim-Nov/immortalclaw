# Implementation Plan

## Linked Spec

- `docs/specs/agent-act-zh-leftovers/spec.md`

## Goal

Gift, greet, and the nearby message receipts come back in Chinese. A busy refusal names the person who is actually busy, and a running dungeon still names `abort-dungeon-expedition`.

## Architecture

The gift receipt is the `summary` returned by `immediateAction` for `gift-item`. The catalog name is already computed as `giftName`. The English line is the only piece still using the item id.

`requireIdle` runs before that function. It checks the actor's `activeJobId`. The city-duel block reason is a separate string, used when the actor is idle and the target is not.

## Tasks

### Task 1

- Chinese gift, greet, share, help, gate-call, and read-message summaries.
- Chinese rejects on that same send path: already gifted, nothing to give, wrong place, gift already gone.

### Task 2

- Chinese self-busy refusal, including the dungeon abort id.
- Chinese target-busy, challenger-busy, and party-partner-busy refusals.
- Chinese injury refusal next to the idle check, and the existing test that matches it.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/engine.test.ts packages/domain/src/sect-life.test.ts packages/domain/src/spoken-lines.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/agent-act-zh-leftovers/spec.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
