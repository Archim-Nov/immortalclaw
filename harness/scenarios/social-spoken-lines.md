# Spoken lines between cultivators

Stand with another cultivator in the same city. `chat-up:<id>` with a `line` in the act body. Their message `spokenLine` and both travelogues contain that sentence inside 「」.

Give them an item with `send-message:<id>:gift-item:<itemId>`, or the older `send-message:<id>:gift-item` plus a body `itemId`, and no `line`. The gift message still quotes a short sentence in the sender's voice, and the inbox gains one notice.

`say:<id>` with a short sentence. Their state shows `pendingDialogue` and `reply-line:<id>`. Their reply shows up on the first travelogue. A fourth free line inside the same few ticks is refused.

Form a party. `send-message:<id>:rendezvous-at-gate` twice in one tick: the second is refused. After a few ticks the next generated doorway sentence is a different one. `wait` still says 先别下. Someone outside the party still cannot receive that call.

A third cultivator in that party, standing in the same place, hears the chat, the say, the reply, the gift, the greet, and the doorway call. The note mood is 同队的人听见了. The title names both people, for example 听见甲跟乙攀谈, and does not say 过来攀谈 or 递来一份礼. The detail quotes the sentence and does not say 关系到了 or 关系从…到了. The person who was actually spoken to still has 过来攀谈 and 有人找上门说话. A party mate in another place does not get that note.
