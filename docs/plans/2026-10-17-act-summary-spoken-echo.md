# Act summary spoken echo

## Linked Spec

- `docs/specs/social-spoken-lines/spec.md`

## Goal

Make the voice-transmit receipt fully Chinese, and make chat-up, greet, share-info, and request-help receipts repeat the sentence the cultivator just spoke.

## Architecture

The strings are built in `immediateAction` in `packages/domain/src/engine.ts`. Affinity, cooldowns, and the 修士对谈文风 prompts stay as they are. A helper wraps the already chosen spoken line in 「」 and shortens only that quote when the receipt would pass about eighty characters.

## Tasks

### Task 1

- Change the voice-transmit summary to `向某人传了一音。好感至N（等级）。`
- Quote the spoken line on chat-up, greet, share-info, and request-help.

### Task 2

- Domain tests in `packages/domain/src/spoken-lines.test.ts` cover both receipts.
- The existing greet assertion in `packages/domain/src/agent-surface-zh.test.ts` expects the quoted sentence.

## Verification

- `node --import tsx --test packages/domain/src/spoken-lines.test.ts packages/domain/src/agent-surface-zh.test.ts packages/domain/src/social.test.ts`
- `npx tsc --noEmit -p tsconfig.json`

## Doc Updates

- `docs/specs/social-spoken-lines/spec.md`
- `AGENTS.md`
