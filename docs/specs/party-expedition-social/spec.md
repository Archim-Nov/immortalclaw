# Party Expedition Social

## Summary

Five cultivators on one shared dungeon run should leave favors, a crack, and sentences both sides can repeat. While companions are on the run, steps 3, 6, and 8 pause for a Chinese choice about a wound, a pile of stones, and an unclaimed find. The paired lines are written when the run ends, so they still sit inside the six-tick digest.

## Problem

A shared run already copies the fight report and can tend a wound at the gate. Inside the dungeon the only wakes were the solo route splits, in English, and only the leader could answer them. Five agents walking the same floors did not owe each other anything, and the digest after the exit had nothing a companion could quote back.

A cultivator who went in alone still gets the Chinese mid-run wakes: step 3 is 扶起伤者, 分一口水, or 拿走袋子, and later steps draw a fork, a relic, a fellow cultivator, or a contested pouch. 见闻 and 带出何物 stay on every run, including a shared one.

## Goals

- Pause a shared run three times: tend a companion, yield the loot or take the shortcut, and split or seize an unclaimed find.
- Let the leader and every idle companion still at the gate vote, including someone who is already wounded.
- Lock the choice once the remaining votes cannot change it. Three of five is enough.
- If the votes never lock, keep the safe side. Name the posture in the timeout sentence, and do not apply a grab or an abandoned wound from posture alone.
- Write the paired 上回 lines on both travelogues and both digests when the run ends.
- Quote a fulfilled `ask-favor:escort-gate` and a recent `rendezvous-at-gate` the same way.
- Show the pending choice on `sharedDungeon.partyWake`.

## Non-Goals

- 乙-tier mystery identity.
- 甲-tier loot chronicle.
- A new party size, a second dungeon job for companions, or a change to stone-share math on the expedition report.
- Replacing the solo step-3 moral wake.

## User-Visible Behavior

A solo run still pauses at most three times. The leader answers `dungeon-wake-decision:<optionId>`, and a timeout still follows posture. Step 3 is the wounded traveler. Later wakes are Chinese scenes with three or four choices.

When at least one companion came through the gate and is still idle at that location, those solo scenes stay off so the party choices can use the same three-wake budget. The run pauses at step 3, step 6, and step 8. 见闻 and 带出何物 still publish. The context and the option labels are Chinese. `GET /agent/actions` lists `dungeon-wake-decision:<optionId>` for the leader and for each companion who is still at the gate with no job of their own. A wound does not hide those actions. `state.sharedDungeon.partyWake` names the kind, the subject when there is one, the safe option, who has voted, and who is still expected to speak. The leader's `wakeNodeHint` carries the same fields.

Step 3 is a wound. If nobody is hurt, the first companion takes a two-tick bruise. 伸手压伤 spends a healing pill when the healer has one, otherwise a little spirit. The wounded cultivator owes 替我挡了一剑. 先顾自己 adds a small grudge and a morality step down, and the paired line is 上回你看见我挂着伤，先走了。

Step 6 is the pile of stones and the darker shortcut. 把这一份让出去 does not move stones. The richer person owes the poorer one 把灵材让给我. 走短路先拿, when that option actually wins, puts twelve stones in the taker's purse, steps morality down, and opens a grudge of 3. That is a crack. It is not yet 嫌隙.

Step 8 is the unclaimed find. 当面分开 raises each person's morality by one and leaves 上回我们把那件东西当面分开了。让给伤重的人 owes 把争到的东西让给我. 先伸手, when it wins, puts ten stones in the first seizer's purse and opens the same crack with each other person still present.

A vote replaces that person's earlier vote. The choice locks when the leading option is ahead of the next one by more than the people who have not spoken, or when everyone awaiting has voted. A single person who is the only one still at the gate can lock a harmful choice. A tie, or a timeout with no lock, resolves to the safe option: 伸手压伤, 把这一份让出去, or 当面分开. The timeout sentence says the posture and that nobody locked the grab or the abandoned wound.

The paired lines are stored during the run and written at the end, after companion stones and injuries settle, so they are not pushed out of the twelve-note travelogue by the exit report. Each witness gets the witness sentence. Both digests can quote the line because it is recorded as a relationship event on that tick. One fulfilled escort to the gate becomes 上回你把我送到地宫门口. One rendezvous said within twelve ticks before the run becomes 上回你约我在门口见. A failure while writing those memories does not roll back the expedition report.

## Constraints

- Companions still have no dungeon job. `leave-shared-expedition` still removes them.
- Stones from a shortcut or a seizure stay in the purse. They are not added to the expedition's `spiritStoneGain`, so the existing companion split is unchanged.
- Favor reasons go through `grantOwedFavor`, so a later `call-favor` can say 上回你替我挡了一剑，这次我来还这份人情。
- The digest window remains six ticks. Mid-run scene notes are not a substitute for the end-of-run pair.

## Acceptance Criteria

- Five cultivators on one rank-1 run produce a tend favor, a yielded-loot favor after an unlocked shortcut vote times out, a seize crack below 嫌隙, and paired 上回 lines on the travelogues and the digests.
- The wounded companion sees `dungeon-wake-decision:tend-companion` on `GET /agent/actions`.
- A solo step-3 wake still offers 扶起伤者, 分一口水, and 拿走袋子, and an aggressive timeout still takes the pouch.
- An aborted run that began after a fulfilled escort and a rendezvous quotes both on the two digests.
- 乙-tier mystery identity and 甲-tier loot chronicle are not implemented.

## Open Questions

- None for this package.
