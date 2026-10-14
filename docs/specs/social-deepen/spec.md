# Favors, sect life, notes, and gossip

## Summary

Cultivators can ask one another for a small concrete favor, live a little of their sect in common, leave a note for someone who is away, and hear nearby gossip about the bonds, feuds, wins, and failed favors that just happened. Completion and failure change affinity, grudge, and mood, and the sentences land in both travelogues and the six-tick digest.

## Problem

Agents can already chat, gift, speak, and owe a generic 人情, but the ask is not a specific errand with an accept, a refusal, and a result. Sect membership mostly changes which solo tasks appear. A public board note is not a letter waiting for one person. Notable bonds and feuds stay between the two people involved, so a third cultivator nearby has nothing to repeat.

## Goals

- Let one cultivator ask another, in person, to fetch 云心草, escort them to a dungeon gate, stand watch for a breakthrough, or deliver 云心草 to a third person. The other accepts or declines. Fulfillment, refusal, abandonment, and expiry change affinity, grudge, and mood, owe or withhold a 人情, and write both travelogues and the digest.
- Let sect-mates post on a shared hall board, finish one small errand together, and let a senior guide a junior. Contribution and affinity move, and the sentences reach the digest.
- Let a cultivator leave a note for a person who is away, or pin one at a safe spot. The reader can reply with a line later. Both digests keep the exchange.
- Spread a 知己 bond, a new 嫌隙 or 宿怨, a city-duel win, and a failed favor to other cultivators in that place. They can mention it, and a generated line can use it.
- Rename the grudge stage 嫩隙 to 嫌隙 everywhere.

## Non-Goals

- Replacing public `post-commission` / `accept-commission`, generic `request-help` / `answer-help`, or `call-favor`.
- Changing spoken-line cooldowns, doorway cooldowns, the party cap of five, turn-based combat, wounds, companion `combatRounds`, relationship thresholds, or the six-tick digest window.
- A long-term mail archive. Notes and gossip stay in the current caps and scroll off with the travelogue and the digest.

## User-Visible Behavior

Asking requires both people in the same place. `ask-favor:<id>:fetch-herb`, `ask-favor:<id>:escort-gate`, `ask-favor:<id>:guard-breakthrough`, and `ask-favor:<id>:deliver-gift:<thirdId>` open the favor. An optional act `line` is kept, at most 40 characters. The asked cultivator sees `accept-favor:<favorId>` and `decline-favor:<favorId>`. After accepting, `fulfill-favor:<favorId>` completes it and `abandon-favor:<favorId>` fails it.

Fetch hands over one 云心草 while both are together. Escort completes when both stand at a dungeon gate. The watch completes at the asker's residence and remembers the guard for three ticks. Delivery escrows the herb from the asker and gives it to the third person even if that person is elsewhere. Success adds 12 affinity and one 人情, which `call-favor` can still repay. Refusal, abandonment, and expiry remove 6 affinity, add 8 grudge, and leave both people 心里发堵. An offer lasts 6 ticks. Accepted work lasts 8. Two open favors at a time, and the same person cannot be asked again for 4 ticks.

`state.favors` lists what is still open, with the next action ids. It is omitted when empty.

Sect-mates in a safe place can `post-sect-notice`. Other members read `state.sectBoard` wherever they are and answer with `reply-sect-notice:<id>`. `join-sect-task:<id>` does one shared errand for 8 contribution, 8 affinity, and 6 stones each, and waits 4 ticks. `guide-junior:<id>` is for a higher title, or for someone whose contribution is at least 15 ahead. It spends 4 spiritual power, gives the junior 3 realm progress and 4 contribution, and gives the senior 6 contribution.

`leave-note:<id>` writes a personal note even when the other person is away. They see `state.pendingNotes`, then `read-note:<id>` or `reply-note:<id>`. `leave-spot-note` pins a line at the current safe place. Someone who arrives later uses `reply-spot-note:<id>`. The same recipient waits 3 ticks, and three unread personal notes is the cap. A spot holds eight notes.

Gossip reaches other cultivators in the same place, not the people the story is about. `state.gossip` carries the sentence. `mention-gossip:<id>:<cultivatorId>` repeats it, and the next generated greet, chat, shared news, or `say` can use the short line once.

The grudge stage at 8 is 嫌隙. 宿怨 stays at 18.

## Constraints

- New fields and action ids are additive. Older saves hydrate without favors, notes, sect boards, or gossip.
- Player-facing sentences are complete Chinese. Existing English error strings stay as they are.
- Spoken-line limits, doorway cooldowns, party size, turn order, wound blocking, and the digest window stay as they are.
- Each new channel has a cooldown or a cap so an agent cannot fill the travelogue by repeating one button.

## Acceptance Criteria

- One cultivator can ask another to fetch 云心草. After accept and fulfill, the herb has moved, a 人情 is owed, both travelogues name it, and both digests include that sentence. `call-favor` clears the 人情.
- A decline writes 嫌隙 once grudge crosses 8, sets mood cause `rejection`, and a third cultivator nearby can see the failed favor or the feud as gossip.
- Escort completes only at a dungeon gate. A watched breakthrough completes at the asker's residence. A delivered herb reaches a third person who is in another city, and that person's digest mentions it.
- A note left while the recipient is away appears on `pendingNotes`. A reply with a line shows up in both digests. A spot note can be answered after the other person arrives.
- Two sect-mates can post a notice, reply to it, finish one joint errand that raises contribution, and have the senior guide the junior. The junior cannot guide the senior.
- Raising affinity to 知己 while a third cultivator is present puts a bond rumor on that third state. Their next generated `say` includes 知己.
- A second ask inside the cooldown, a third open favor, and a second note inside three ticks are refused.
- An offer that nobody answers becomes failed after the deadline and the digest says the favor fell through.
- The string 嫩隙 no longer appears. Grudge at 8 is 嫌隙.
- Existing spoken-line, doorway, party cap, companion `combatRounds`, wound, and digest tests still pass.

## Open Questions

- None for this pass. A favor that takes the helper out into the wilderness on their own can wait until agents ask for a longer errand.
