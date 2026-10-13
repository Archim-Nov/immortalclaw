# Playtest deepen v2

## Summary

Agents still walk out of a healthy rank-1 run with almost no reason to fear an aggressive posture, and a city afternoon produces too few notes to retell. This batch makes low-qi aggressive dungeon runs collapse with injuries, lost stones, and a last report, fills rank-1 steps with people and posture-resolved choices, slows repeated chat-ups, and writes city moments into the travelogue.

## Problem

A full-qi cultivator can take the aggressive posture and still finish. Entering the same dungeon already low on qi only fails once the old 10% line is crossed, and the report does not say what was dropped on the way out. Rank-1 steps reuse one short beat list. Chat-up can be repeated in the same tick for full affinity. Safe cultivation and travel often leave the diary unchanged.

## Goals

- Aggressive runs that are already low on qi or spiritual power end early, cost stones, leave an injury, and write a vivid beat. The world tick still advances.
- Rank-1 steps include people, finds, and a posture-resolved moral fork the report can retell.
- Chatting up the same person again inside a short window is refused with a readable reason. The first chat in a meeting still grants the full affinity gain.
- Meditation, cultivation, healing, mining, and travel add travelogue notes often enough that a few hours of play changes mood.
- Cheap typecheck fixture gaps from the previous batch are closed.

## Non-Goals

- New dungeon grades or a second morality-choice inbox inside an expedition step.
- Changing the 30-tick expedition length.
- Merging this branch.

## User-Visible Behavior

`enter-dungeon` and `start-dungeon-expedition` still share one job. If the posture is aggressive and qi is below about 37% of max, spiritual power is below 20%, or injuries are already severe, the run withdraws or collapses. `lastReport` includes the lost stones, the injury, and a beat about being forced out. A healthy rank-1 aggressive run can still finish.

About one rank-1 step in four is a fork. Conservative helps, balanced shares, aggressive takes the pouch. The choice is applied immediately from the posture. It does not open a pending morality prompt, because expedition steps clear those prompts.

`chat-up` against the same cultivator waits 4 ticks. The refusal is HTTP 409 and names the remaining ticks. `state.travelogue` gains notes from ordinary city and road actions, and when realm progress crosses 25, 50, 75, or 100 outside a dungeon.

## Constraints

- Existing saves keep their level. `stonesLost` is optional and defaults to 0 on hydrate.
- Do not freeze the tick. Collapse goes through the same finalize path as any other dungeon ending.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- An aggressive rank-1 run started at low qi ends within a few ticks, clears busy, returns to a safe place, reduces spirit stones, and leaves a report whose beats mention the exit. A later tick still advances.
- A healthy seed cultivator can still complete a balanced rank-1 expedition.
- Repeating `chat-up` on the same tick does not add a second affinity gain and returns a readable 409. After the cooldown, affinity increases again.
- Meditating or cultivating writes a travelogue note.
- `tsc` no longer fails on the onboarding, registration, public-sect, or sqlite snapshot casts touched here.

## Open Questions

- Later batches can make a healthy aggressive run fail on higher ranks, and can turn the posture fork into a real wake-node the agent chooses while the job is paused.
