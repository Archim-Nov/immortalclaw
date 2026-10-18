# Party witness echo

## Summary

When two cultivators speak where a party mate can hear them, that mate still gets a travel note. The note is written as something overheard. It names both people, and it does not borrow the addressee's title or the pair's affinity sentence.

## Problem

`shareMoment` copies one title and one detail onto every co-located party member who is not the speaker or the addressee. Chat-up was passing the addressee's title, `顾长川过来攀谈`, and a detail that ended with `关系到了挚友`. On the witness's 见闻 that title reads as if the speaker had come to talk to the witness, and the affinity sentence reads as the witness's own relationship. A gift used the same pattern with `递来一份礼`. Say, reply, greet, and the doorway calls had the same shape whenever the title was written in the speaker's or the addressee's voice.

## Goals

- A co-located party witness still learns that teammates spoke nearby. The mood stays `同队的人听见了`.
- The witness title names the speaker and the person they spoke to.
- The witness detail keeps the overheard sentence and the place, and leaves off `关系到了` and the pair's `关系从…到了` clause.
- The person who was actually spoken to keeps the existing note, including `过来攀谈` and `有人找上门说话`.

## Non-Goals

- Changing affinity numbers, bond crossings, or the gossip note `听见了一桩闲话`.
- Rewriting voice-transmit summaries such as `好感至778（挚友）`.
- Changing equip-card attack text.
- Changing who is eligible to hear the echo, or the city-duel witness line that already says `听见甲与乙切磋`.

## User-Visible Behavior

顾长川 chats up 柳如烟 in 广津城 while 墨儿 is in his party and standing in the same place. 墨儿's new note is titled `听见顾长川跟柳如烟攀谈`. The mood is `同队的人听见了`. The detail says 顾长川跟柳如烟攀谈 and quotes the sentence. It does not say `过来攀谈`, `关系到了`, or `关系从`.

柳如烟's own note is still titled `顾长川过来攀谈`, with mood `有人找上门说话`, and it still says `关系到了` plus any clause about her link with 顾长川. 顾长川's note is still `与柳如烟说上了话` and still carries that relationship sentence.

The same split holds for the other spoken echoes:

- say: witness title `听见甲对乙说了一句`; the two of them still use `甲说了一句`
- reply: witness title `听见甲回乙一句`; the two of them still use `甲回了一句`
- gift: witness title `听见甲把礼递给乙`; the recipient still uses `甲递来一份礼`
- greet, share-info, and request-help: the witness title names both people, and the detail does not append the pair's affinity clause
- doorway calls: witness titles are `听见甲约乙到门口`, `听见甲告诉乙可以下了`, and `听见甲让乙先等`

A party mate in another place does not get the note. When 顾长川 chats up 墨儿 herself, she gets the direct note only, not a second overheard copy of the same sentence.

A tended wound still uses `甲给乙疗了伤`, which already names both people. A city duel still uses `听见甲与乙切磋`.

## Constraints

- Action ids, affinity gains, and the party cap stay as they are.
- The dungeon memory clause (`甲说：「……」`) is unchanged, so a later shared-run retelling can still quote the sentence.
- Older travel notes already stored on a live world are left as they are.

## Acceptance Criteria

- After a chat-up, a co-located party witness has one note titled `听见甲跟乙攀谈`, mood `同队的人听见了`, quoting the sentence, with no `过来攀谈` and no `关系到了` or `关系从`.
- The addressee's note for that same sentence is still `甲过来攀谈` / `有人找上门说话` and still includes `关系到了`.
- A party mate in another place has no note for that sentence.
- Chatting up the witness writes `过来攀谈` on the witness and does not also write an overheard copy of that sentence onto the witness.
- A say and a gift heard by a party mate use overheard titles that name both people. The addressee's titles stay `说了一句` and `递来一份礼`.
- A greet that moves the pair's affinity level writes `关系从…到了` on the two of them and not on the witness note.

## Open Questions

- None. Bond crossings still tell the neighborhood through the existing gossip note when the stage is 知己. The overheard chat does not need to repeat that sentence.
