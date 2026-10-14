# Favor chains, a social digest, and a reunion

## Summary

A favor now keeps a short reason an agent can quote. When that favor is later called in, or repaid by a different favor for the same person or for their friend, both travelogues and both digests tell the two parts as one story. The six-tick digest prefers those social beats over an ordinary stretch. A party mate or favor partner who is traveling or in another city can be waited for, and the reunion is written once.

Spoken lines that the world supplies should sound like someone talking in the scene. A reply stays with the person who spoke, and a line that addresses someone else is refused.

## Problem

Favors already change a number and leave a sentence, but the later repayment does not know what the first favor was. An agent cannot say 「上回你替我守关」. A quiet cultivation window still summarizes as 过得平常 even when a favor, a note, a rumor, a sect task, or a bond crossing happened. People who leave the city disappear from the social beat until someone happens to stand in the same place again.

Generated speech also keeps announcing the mood or repeating one polite shape. A reply can be stored against the wrong person, so one cultivator's sentence shows up in another conversation.

## Goals

- Remember each owed favor with a short reason. Show it on `state.owedFavors`.
- When `call-favor` settles one, or when the debtor later does a different favor for the creditor or for that creditor's friend, write one linked story into both travelogues and both digests. The story names the earlier reason and the repayment, in the shape 「上回你替我守关，这次我来还这份人情」.
- Prefer those social beats, notes, gossip, sect tasks, and bond crossings in `state.digest.summary` over 「过得平常」. Name up to three people and include one quoted line when the window has one.
- Let a cultivator `wait-for:<id>` a party mate or favor partner who is traveling or in another city. When they meet again, write one reunion into the 见闻. The same pair waits a long time before another reunion.
- Make generated lines for say, reply, chat-up, greet, gifts, favor asks and accepts, and note replies into complete spoken sentences. Vary them. Use the wound, the gift, the gate, or the favor when that is what is happening.
- Keep a reply on the person who is being answered. Refuse a line that addresses a different cultivator.

## Non-Goals

- Replacing spoken-line cooldowns, doorway cooldowns, the party cap of five, turn-based combat, or the six-tick digest window.
- Letting the debtor invent a new action id for `call-favor`. The creditor still calls it.
- A mailbox that keeps every old favor forever. The reason stack stays short.

## User-Visible Behavior

Doing a favor still raises `favorBalance`. It also pushes one reason, such as 替我守关 or 替我采了云心草, onto `state.owedFavors`. The direction says whether they owe you or you owe them.

`call-favor` still needs both people present and still moves stones when they can be paid. The sentence on both sides quotes the reason that was just settled.

If the person who owes a favor later fulfills a different one for the creditor, that fulfillment is told as the repayment and the old reason is settled. A new favor can then be owed the other way. If they fulfill a favor for the creditor's friend instead, the friend is someone at 点头之交 or in the same party, and the story names all three.

`wait-for:<id>` is listed only for a party mate or a favor partner who is on the road or in another city. The reunion is one sentence. The same pair does not get another reunion story for twelve ticks.

A generated line is one sentence an actor could say. It does not open with 心气正盛, 近来可好, or 权作照应. A gift names the item. A reply uses the line just heard from that person. 「顾兄保重」 is refused when the person being answered is not 顾.

## Constraints

- New fields and action ids are additive. Older saves hydrate without reasons, waits, or answered marks.
- Player-facing sentences are complete Chinese. Existing English error strings stay as they are.
- Spoken-line limits, doorway cooldowns, party size, combat, and the digest window stay as they are.
- An agent-supplied `line` is still cut at 40 characters.

## Acceptance Criteria

- After one cultivator stands watch for another, `owedFavors` carries 替我守关. `call-favor` clears it, and both digests mention the watch and the repayment sentence.
- When the debtor later fulfills a different favor, the digest quotes the earlier reason and the new errand.
- When that repayment is done for the creditor's friend, the story names the friend and the original reason.
- A note or a sect task inside a quiet window keeps the digest from saying 过得平常, and the summary names the other person.
- `wait-for` is absent for a stranger. After a favor partner travels away and comes back, both digests mention the reunion. A second wait inside the cooldown is refused.
- Two people can leave lines for one listener. Replying to one does not attach the other's sentence. A line that addresses a third cultivator is refused.
- Generated say, chat-up, gift, and reply lines differ across ticks, stay within 40 characters, and do not use the stiff stock phrases.
- Existing spoken-line, favor, digest, party cap, and wound tests still pass.

## Open Questions

- None for this pass. A favor that sends the helper alone into the wilderness can wait.
