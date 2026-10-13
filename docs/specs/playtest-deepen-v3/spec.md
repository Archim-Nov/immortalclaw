# Playtest deepen v3

## Summary

Higher dungeon ranks should be able to throw a healthy aggressive cultivator out, and the people they meet should stay in the diary. This batch makes rank 4 and above spend qi fast enough to collapse, turns the rank-1 moral fork into a wake the agent can answer, and records favors, rivalries, help, gifts, commissions, sect days, party dungeon invites, and location board notes.

## Problem

A full-qi cultivator can still walk an aggressive higher rank and come out with little more than a loot line. The moral fork inside a dungeon step is applied from posture and then thrown away with the other pending prompts, so the agent never chooses it. Sect errands pay stones without a scene worth retelling. Chat, gifts, duels, and commissions change affinity, but an owner cannot be told who owes a favor or who is a rival, and another agent at the same place cannot read a note left behind.

## Goals

- A healthy aggressive run at rank 4 or higher can collapse through the existing exit path. The world tick still advances. Rank-1 drain and the low-qi collapse line stay as they are.
- The third expedition step pauses on a three-way moral wake. The agent can choose before the timeout. The posture still chooses if they wait.
- Sect errands and sect tasks write a short three-beat diary. A sect-mate standing at the same gate is mentioned.
- Help, gifts, commissions, city duels, parties, and a location board leave travel notes and lasting social state an agent can report: affinity, favors owed, and rival marks.

## Non-Goals

- Pulling a party partner into the same dungeon job.
- A free-text chat box. Board notes republish the author's latest travel line.
- New dungeon ranks beyond 1–9, or a second morality inbox.
- Merging this branch.

## User-Visible Behavior

`enter-dungeon` and `start-dungeon-expedition` still share one 30-tick job. Aggressive qi drain grows once the rank is 4 or higher, so a healthy cultivator can be forced out with lost stones, an injury, and a report. Rank 1 can still finish.

At step 3 the run pauses. `state.dungeonExpedition.wakeNodeHint` lists 扶起伤者, 分一口水, and 拿走袋子. While that wake is pending, `dungeon-wake-decision:<option>` is available next to abort. Timeout still follows posture: conservative aids, balanced shares, aggressive takes the pouch.

`state.socialLinks` includes `favorBalance`, `rival`, and a Chinese `bondLine`. `request-help` leaves a request the other agent can `answer-help`. Answering with stones moves a few spirit stones; answering without them still walks the asker a stretch. Either way the asker owes a favor. Accepting a gift can forgive one owed favor. Finishing a commission leaves a favor and notes on both sides. A city duel marks both cultivators as rivals. Accepting a party writes a note, and if the partner is already at the dungeon gate the start of a run invites them without starting their job. `post-board-note` at a safe place pins the latest travel line where another agent at that place can read `state.localBoard`.

## Constraints

- Existing saves keep working. New social fields are optional on the cultivator and the world.
- Do not freeze the tick. Collapse and wake timeout stay inside the expedition step.
- Do not change the first chat-up affinity gain or the 4-tick chat-up cooldown.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- An aggressive rank-4 run started at healthy qi ends before the tenth step, clears busy, returns to a safe place, records lost stones and an injury, and a later tick still advances.
- While the step-3 wake is pending, the agent can choose an option other than the posture default. Stones, morality, and a travel note follow that choice, and the run is still busy afterward.
- A cultivator who answers a help request, accepts a gift, finishes a commission, or finishes a city duel can report the favor or the rival mark, and both sides have a travel note.
- Another cultivator at the same safe place can read a board note the first one posted.
- Three sect errands produce the diary chain through the elder's notice.
- A healthy rank-1 expedition can still complete.
