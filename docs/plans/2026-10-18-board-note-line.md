# Board note line plan

## Linked Spec

- `docs/specs/board-note-line/spec.md`

## Goal

Stop a journey board post from pinning its own receipt, honor a submitted `line`, and name commission items in Chinese.

## Architecture

Journey text is chosen in `immediateAction` before the receipt is written. A submitted `line` goes through `cleanSpokenLine`. Otherwise the newest travel note is used, skipping a note titled `在告示上留了话` or a detail that already contains `把一句话钉在……告示上：`. The diary still receives the Chinese receipt, and `locationBoards[].text` stores only the pinned sentence.

Commission completion already used the Chinese name on the travel note and the act summary. The inbox message, the stone log, the poster's dao log, and the shortfall rejection now use `itemDisplayName` as well. `localCommissions` adds `itemName` beside the existing item id.

## Tasks

- Skip board receipts when choosing the default journey sentence
- Pin `line` on `post-board-note` and `post-board-note:journey`
- Chinese item names on commission completion text and `localCommissions.itemName`
- Domain tests for a double post, a submitted line, and a `qi-pill` commission

## Verification

- `node --import tsx --test packages/domain/src/board-note-line.test.ts packages/domain/src/deepen-playtest-v3.test.ts packages/domain/src/deepen-playtest-v4.test.ts`

## Doc Updates

- `docs/specs/board-note-line/spec.md`
- `docs/specs/playtest-deepen-v4/spec.md`
- `AGENTS.md`
- `harness/scenarios/social-and-higher-dungeon.md`
