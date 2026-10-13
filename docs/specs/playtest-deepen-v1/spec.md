# Playtest deepen v1

## Summary

The overnight playtest stuck a cultivator inside `enter-dungeon:rank-1:conservative`. The world tick threw `Unsupported timed action`, the save rolled back, and the cultivator stayed busy. This batch makes dungeon entry finish or fail cleanly, tells an agent why an action will not run, and gives the long loop more to do: risk inside the dungeon, a reason to leave the city, notes worth retelling, and two more realms past 金丹.

## Problem

`enter-dungeon` already starts a 30-tick expedition, but job completion only recognized `start-dungeon-expedition`. The thrown error aborted `advanceWorld` before the job was deleted, so the tick never committed. Around that bug, safe city loops (sect applications, identical crafting, commissions the cultivator cannot fulfill) stayed easy to spam, mid-realm progress did not move unless the agent happened onto a dungeon, and the ladder stopped at 金丹后期.

## Goals

- A dungeon job always ends. The cultivator is idle afterward, back in a safe place when the run is over, with a report an agent can read.
- One bad job cannot freeze the world tick.
- Actions that cannot succeed are either omitted or rejected with a readable reason and HTTP 409.
- Busy status matches the job lock. A missing job does not leave someone busy forever.
- Dungeon posture changes drain, injury, and cultivation gain. The report carries short beats: finds, close calls, people, injuries, moods.
- Safe spam pays less or stops. Cultivation, combat, and dungeons still move realm progress, including from 炼气中期 in the city.
- The ladder continues through 元婴 and 化神 without remapping existing levels 1–9.

## Non-Goals

- New dungeon ranks, sect life simulation, or a second event system.
- Changing the 30-tick expedition length or the existing wake-node budget.
- Merging this branch.

## User-Visible Behavior

`enter-dungeon:rank-<N>:<posture>` behaves like the managed expedition it already starts. When the job ends, `state.dungeonExpedition.lastReport` explains the outcome, loot, cultivation gain, qi spent, and a few beats. Failure ejects the cultivator to the nearest safe location and clears `activeJobId`.

`POST /agent/act` returns 409 with the domain message when the action is refused, including "busy", "missing the commission item", and "this recipe is already queued". Those actions are also left off the available list when the refusal is knowable up front.

`state.travelogue` holds a short mood and up to twelve notes. Realm levels 1–9 stay 炼气, 筑基, and 金丹. Levels 10–12 are 元婴, 13–15 are 化神. Breakthroughs from level 9 upward are not sold in town; they come from the 甲级地宫 material band.

## Constraints

- Existing saves keep their realm level. New cultivator fields are optional and filled in on hydrate.
- Player-facing strings can be Chinese. Identifiers stay in the current code style.
- Do not put secrets in the repo.

## Acceptance Criteria

- Advancing the world after `enter-dungeon:rank-1:conservative` completes or settles the job, clears busy, and leaves a report. The tick number increases.
- A job whose action cannot be resolved is deleted, the cultivator goes idle, and later ticks still advance.
- Accepting a commission without the required item is not offered, and calling it anyway returns a readable 409.
- Queueing the same residence recipe twice is refused with a reason.
- A 炼气中期 cultivator at progress 0 gains progress from a town task, and repeating that task pays less.
- `realmStageForLevel(10)` is 元婴, level 9 has a next breakthrough, and level 15 does not.

## Open Questions

- Later batches can add sect daily life, quest chains, and dungeon ranks above 9. This batch only makes the current dungeon loop finish and feel like a trip.
