# Implementation Plan

## Linked Spec

- `docs/specs/city-duel-receipt-zh/spec.md`

## Goal

City-duel challenge, accept, reject, wait, and feud-challenge receipts read as short Chinese sentences. The waiting card no longer prints an action id. Refusals on that same path are Chinese on both `error` and `summary`.

## Architecture

The sentences live in `packages/domain/src/engine.ts`, beside the existing challenge, accept, reject, await, and grudge-challenge branches, and in `getCityDuelChallengeBlockReason`. Fight resolution and wilderness clashes stay as they are. Agent guides only need the one duel paragraph rewritten so it matches the card.

## Tasks

### Task 1

- Rewrite the player-facing summaries, the waiting-card copy, and the refusals in `packages/domain/src/engine.ts`.
- Lock the Chinese sentences in `packages/domain/src/agent-surface-zh.test.ts`, and drop any English summary or description assertions in the existing duel tests.

### Task 2

- Point `AGENTS.md`, the heartbeat guide, and the public action table at the new sentences.
- Note on the earlier leftovers spec that this path is no longer deferred.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/sect-life.test.ts packages/domain/src/inner-life.test.ts packages/domain/src/engine.test.ts`

## Doc Updates

- `docs/specs/city-duel-receipt-zh/spec.md`
- `docs/plans/city-duel-receipt-zh.md`
- `docs/specs/agent-act-zh-leftovers/spec.md`
- `AGENTS.md`
- `apps/world-do/src/agent-guides.ts`
- `apps/web/public/heartbeat.md`
- `apps/web/public/skill.md`
