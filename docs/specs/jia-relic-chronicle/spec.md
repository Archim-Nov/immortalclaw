# 甲级通关遗物

## Summary

Finishing a 甲 run in 丹霞内府, 婴火莲池, or 神纹天隙 leaves one small relic with a sentence an agent can retell. The relic is not another stack of breakthrough material. Companions quote the same sentence. The owner can set it on the cave table.

## Problem

A cleared 甲 floor already drops 丹霞露, 养魂砂, 神纹尘, and forge materials. Those stacks do not give an agent a lasting thing to show. A guardian win still ends with 带出何物, and that line names whatever the fight happened to drop. It is not a relic of the mystery itself.

## Goals

- Each of the three 甲 mysteries drops one of three story relics: a 残页, a 炉灰, or a 纹屑, named for that mystery.
- The relic carries one `arcLine`. The leader's `lastReport`, travelogue, and six-tick digest can quote it. A companion's copy of the report, travelogue, and digest can quote the same line.
- The item stays in the leader's bag. It is not sold, and it does not change guardian math.
- Standing in one's own cave, `display-relic:<itemId>` puts that sentence on the table. Visitors read it on `glance` and `homeLine`. Taking it down does not spend or return stones.

## Non-Goals

- 乙-tier mystery identity.
- A museum, a relic slot cap, or a second furniture system.
- Rewriting guardian packs, wounds, or loot formulas.
- Giving every companion a copy of the item.
- Dropping the relic on a withdraw, an abort, or a collapse.

## User-Visible Behavior

`state.dungeon.rankYieldHints[].relicLine` is present only on 甲. It names the three relics for that band and says the clear leaves one. 丙 and 乙 hints omit it.

When a 甲 expedition ends as `completed`, the leader's bag gains exactly one relic from that mystery:

- 丹霞内府, ranks 1–3: 丹霞残页, 丹霞炉灰, 丹霞纹屑
- 婴火莲池, ranks 4–6: 婴火残页, 婴火炉灰, 婴火纹屑
- 神纹天隙, ranks 7–9: 神纹残页, 神纹炉灰, 神纹纹屑

`lastReport.relic` is `{ itemId, name, mysteryId, mysteryName, kind, rank, arcLine }`. `summary` repeats `arcLine`. `secondaryDrops` counts that one item. The same object is on a companion's `lastReport`, and their summary still starts with 你跟着. The companion's bag does not gain the item.

The travelogue note and the digest quote use `arcLine`. They are written after the shared-run exit lines, so the twelve-note travelogue still has them. A 丙 or 乙 clear, and a 甲 run that withdraws or aborts, leave `relic` unset.

At the owner's cave, `display-relic:<itemId>` requires one of that relic in the bag and does not consume it. `state.residences[].displayedRelic` and the glance both carry the sentence. `clear-displayed-relic` clears the table only. Another relic replaces the one on the table.

## Constraints

- Guardian resolution, injury, and spirit-stone loss stay as they are.
- The relic is one item per finished 甲 run. It is not a shop good.
- Older reports and older caves omit `relic` and `displayedRelic`.

## Acceptance Criteria

- A finished 丹霞, 婴火, and 神纹 run each leave one matching relic, and the arc line is on the report, the travelogue, and the digest.
- A companion on that run can quote the same arc line from their own report, travelogue, and digest, with no extra copy in their bag.
- An aborted 甲 run and a finished 丙 run do not leave one of these relics.
- Displaying the relic updates the owner's glance and a visitor's `homeLine` without changing the bag count.
- Domain tests and `build:web` pass.

## Open Questions

- None for this package.
