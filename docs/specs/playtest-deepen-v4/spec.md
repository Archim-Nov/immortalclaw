# Playtest deepen v4

## Summary

Party partners who walk into a dungeon together should come out with a shared purse or a shared injury, and the people they meet should stay named in the diary. This batch shares one dungeon run without a second job, lets agents pin favors, rivalries, and a sect-mate on the location board, and stretches the sect chain to six beats that end in a callable favor.

## Problem

A party invite at the dungeon gate only leaves a message. The partner stays outside the risk and the reward, so two agents cannot retell the same run. Board notes republish the latest travel line and cannot say who owes a favor or who the rivalry is with. Sect errands name a mate for three beats and then reset, with no promise the other agent can later call in.

## Goals

- An idle party partner already at the dungeon shares that run: qi on the way, then stones, injury, or a joint withdrawal when it ends. They stay idle. The world tick still advances.
- Agents at a safe place can pin a journey line, a favor, a rivalry, or a named sect-mate. Another agent at that place reads the kind and the text on `state.localBoard`.
- Calling a favor spends one owed favor for stones or a promise. Pressing a rival writes a public scene on both sides and waits before the next one.
- Sect errands and sect tasks run six beats with a named mate. A real peer at the gate is written into both diaries and, on the last beat, owes one favor.

## Non-Goals

- A second dungeon job for the companion, or dragging a companion who left or started their own work.
- Free-text chat. The act API still takes only an action id.
- New dungeon ranks, or a change to rank-1 qi drain and the low-qi collapse line.
- Merging this branch.

## User-Visible Behavior

`enter-dungeon` and `start-dungeon-expedition` still share one 30-tick job. If the party partner is idle at the same gate, the run binds them. `state.sharedDungeon` names the leader, rank, and grade. Each step spends a little of the companion's qi while they remain idle at the dungeon. If they leave, both diaries say they parted, and the rest of the run is the leader's alone.

When the run ends, an idle companion still at the dungeon leaves with the leader:

- A completed run moves a fifth of the reported stone gain, when the leader has it, into the companion's purse.
- A withdrawal or collapse costs the companion stones and an injury.
- An abort walks them out together with no stone loss.

`post-board-note` and `post-board-note:journey` pin the latest travel line when the act has no `line`. A submitted `line` is pinned as written, and a later post does not wrap the previous receipt. See `docs/specs/board-note-line/spec.md`. `post-board-note:favor`, `post-board-note:rival`, and `post-board-note:sect` are listed only when there is a favor owed to the author, a rival mark, or a sect. Empty kinds are refused. A successful pin returns the Chinese `summary` already written for the travelogue, naming the place and what was pinned. The kind stays 见闻, 人情, 过节, or 同门 inside that sentence. `call-favor:<id>` is face to face and spends one favor: twelve spirit stones when the debtor has them, otherwise a promise in both diaries. `press-rival:<id>` is face to face, keeps the rival mark, and refuses a second scene for six ticks.

Six sect errands write 报名, 执事, 同门点名, 夜谈, 长老, and 同门之约, then the counter resets. The elder's beat still grants realm progress. A same-sect cultivator at the gate is the named mate and receives a diary line each beat. The last beat leaves them owing one favor. With nobody else at the gate, the mate is a stable named figure from the sect roster.

## Constraints

- Existing saves keep working. `companionId`, board `kind`, `sharedDungeon`, and `lastRivalSceneTick` are optional.
- Companion echoes and settlement swallow their own errors. A companion problem must not roll the leader's tick back.
- A busy companion is not moved and is not paid. Their own job keeps its location.
- Do not change the first chat-up affinity gain or the 4-tick chat-up cooldown.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- After a shared rank-1 run, the companion's `sharedDungeon` named the leader while the job was active, the companion never took a job, both cultivators are back in a safe place, the companion's purse matches a fifth of the reported stone gain, and both diaries mention the split.
- A healthy aggressive rank-4 run shared with an idle partner still collapses, the companion is injured and poorer, both are back in a safe place, and a later tick still advances.
- Aborting a shared run walks the companion out with the same purse and a withdrawal note, and no second job.
- After help is answered, the creditor can pin a favor note the debtor can read, then `call-favor` spends it.
- After a city duel, a rival note can be pinned, `press-rival` writes both diaries, and a second press in the same tick is refused.
- Six sect errands with a same-sect peer name that peer, reset the diary counter, grant the elder's realm progress, and leave the peer owing one favor.
