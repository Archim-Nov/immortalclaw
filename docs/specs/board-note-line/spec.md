# Board note line

## Summary

`post-board-note` was pinning its own previous receipt. A second post wrapped `把一句话钉在……告示上` around the last board sentence, and a `line` on the act was ignored. A finished commission still wrote the raw item id into the message and the dao log.

## Problem

Journey notes read `travelNotes[0].detail`. The board post then pushes a travel note whose detail is the wrapped summary, so the next post treats that summary as the sentence. Playtesters also send `line` the same way they do for chat and notes, and expect that sentence on `state.localBoard`. Commission completion text still names items as `qi-pill`.

## Goals

- A second `post-board-note` or `post-board-note:journey` does not nest the wrapper on `locationBoards`.
- When the act body includes `line`, the board text is that sentence and the Chinese summary quotes it.
- Without `line`, the pin still uses the latest travel sentence that is not itself a board post.
- Commission messages, dao logs, and the shortfall rejection name the item in Chinese.

## Non-Goals

- Rewriting board notes already stored on a live world.
- Changing favor, rival, or sect pins.
- 归虚 labels, dungeon mid-run favors, or the realm ladder.
- Raising the forty-character cap used by other `line` fields.

## User-Visible Behavior

`post-board-note` and `post-board-note:journey` stay available at a safe place. The act `line` is cleaned the same way as a spoken line: surrounding space is trimmed, breaks become spaces, and the sentence stops at forty characters. That sentence is stored as `locationBoards[].text` and on `state.localBoard`. The act `summary` stays the Chinese receipt, `某人把一句话钉在某地的告示上：` plus the pinned sentence, once.

If `line` is missing or empty, the pin uses the newest travel note whose title is not `在告示上留了话` and whose detail is not already that receipt. The diary still records the receipt, so the owner can see that a note was left. The next pin skips that receipt.

Favor, rival, and sect notes keep their own sentences. A finished commission says 回气丹 rather than `qi-pill` in the inbox, the dao log, the stone log, and the travel note. `state.localCommissions[].itemName` carries the same Chinese name beside `targetItemId`. A short bag refuses the commission in Chinese and names the item.

## Constraints

- Existing saves keep working. Old nested board rows are left as they are.
- Identifiers such as `qi-pill` stay on action ids and on `targetItemId`.
- Player-facing sentences for this pin and for commission completion stay Chinese.

## Acceptance Criteria

- Two journey posts without `line` leave board text that does not contain `把一句话钉在`, even when the newest travel note is an older board receipt.
- `post-board-note` with `line` stores that sentence on the board. The summary quotes it once and has no English receipt template.
- The following journey post, with no `line`, pins the earlier travel sentence rather than the receipt.
- Completing a `qi-pill` commission writes 回气丹 and does not write `qi-pill` into the message, the dao log, or the travel note.
