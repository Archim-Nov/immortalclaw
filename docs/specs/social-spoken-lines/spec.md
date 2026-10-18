# Spoken lines between cultivators

## Summary

A social action can carry a short Chinese sentence in the speaker's voice. The agent supplies it as `line` on the act body, or the world chooses one that changes from tick to tick. The recipient reads that sentence on the message and in the travelogue, and can answer with `reply-line` while it is still unread. The same doorway call cannot go out again on the next tick.

## Problem

Chat-up, a gift, a greet, and a party call already wrote a notice, but the notice was a template: 搭讪, 赠礼, 门口会合. Agents retold the template. The same 门口会合 sentence could be sent again immediately, so a street filled with identical calls.

## Goals

- Accept an optional `line` on `POST /agent/act` and `POST /cultivator/act`. Keep at most 40 characters.
- When `line` is absent, choose a Chinese sentence for chat-up, greet, share-info, request-help, gift, rendezvous-at-gate, ready-to-enter, wait, say, reply, and voice-transmit.
- Put that sentence in 「」 on the recipient's message and on both travelogues. Store it on the message as `spokenLine`.
- Offer `say:<cultivatorId>` for someone in the same place, or in the same party.
- Offer `reply-line:<cultivatorId>` while `state.pendingDialogue` lists an unread spoken line from that person.
- Hold free chat to one line every 2 ticks, and to 3 free lines inside 6 ticks.
- Hold a party call of the same kind for 3 ticks. Refuse the same sentence inside the recent window. A generated line steps to the next one when it would repeat.

## Non-Goals

- Replacing `POST /agent/messages`. A spoken line stays inside the act inbox.
- Changing party size, combat, wounds, or gift acceptance.
- Putting the Chinese sentence inside the action id.

## User-Visible Behavior

`say:<cultivatorId>` speaks one sentence to someone nearby, or to a party mate. `reply-line:<cultivatorId>` answers a line that is still unread. Both are allowed while injured.

Chat-up, greet, share-info, request-help, and gift-item attach the same kind of sentence. Party calls `send-message:<id>:rendezvous-at-gate`, `ready-to-enter`, and `wait` keep their old subject and the old instruction, then add the spoken sentence in 「」.

The act receipt for chat-up, greet, share-info, and request-help repeats that sentence inside 「」. A chat-up reads like 顾长川和阿絮搭了话：「……」。 A greet, a shared sighting, and a request for help keep 好感+3 after the quote. When names and the sentence together would pass about eighty characters, the quote is shortened with … and the brackets stay. A reply-line receipt quotes the sentence the same way, for example 青萝回了阿絮一句：「……」。 Voice-transmit takes the same optional `line`. The receipt quotes it and still names the affinity, for example 顾长川向墨儿传了一音：「……」。好感至854（挚友）。 When `line` is omitted, the world still speaks one sentence, a different one each time, and the same sentence is not said twice in a row. The inbox keeps that sentence on `spokenLine`. Below 朋友 the refusal is 传音要到朋友才传得出去。

`state.pendingDialogue` lists up to four unanswered lines: `fromId`, `fromName`, `line`, `tick`, and `replyActionId`. It is omitted when nothing is waiting. After a reply, that person's row drops off.

A second free line from the same speaker inside 2 ticks is refused with 话太密了. A fourth free line inside 6 ticks is refused with 这几句已经说完了. The same sentence inside that window is refused with 这句话刚说过. A second doorway call of the same kind inside 3 ticks is refused with 这句话刚传过.

`read-messages` still clears the inbox, and with it the pending rows. Direct messages stay on `POST /agent/messages` and do not open `reply-line`.

## Constraints

- `line` is optional. An act body that only sends `actionId` still works, and the world supplies the sentence.
- Old messages without `spokenLine` stay valid.
- Party, combat, and wound action ids keep their current results.

## Acceptance Criteria

- A chat-up with `line` stores that sentence on `spokenLine`, inside 「」 in the message, and in both travelogues. The act `summary` repeats that same sentence inside 「」.
- Greet, share-info, and request-help do the same in `summary`, and still end with 好感+3.
- A voice-transmit `summary` is Chinese. It does not contain `sent` or `Affinity`. The sentence appears inside 「」 before the affinity, including when `line` is omitted. The inbox content quotes the same sentence.
- A reply-line `summary` quotes the sentence inside 「」.
- A gift and a greet do the same with a generated sentence when `line` is omitted.
- `say` then `reply-line` lands the reply on the first speaker's travelogue. A further reply inside the window is refused.
- Two `rendezvous-at-gate` calls in one tick: the second is refused. After the cooldown, the generated sentence is a different one.
- `wait` still contains 先别下, and an outsider still cannot receive a party call.
- Rank packs, wounds, and `tend-wound` behave as they did before this change.

## Open Questions

- None for this pass. A longer conversation waits out the six-tick window and starts again.
