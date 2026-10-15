# 甲级通关遗物

Stand at 甲级 with 金丹, ranks 1–3 already open. `rankYieldHints` for rank 1 names 丹霞残页, 丹霞炉灰, and 丹霞纹屑. Rank 4 and rank 7 name the 婴火 and 神纹 sets once the realm can read those doors. A 丙 hint has no `relicLine`.

Finish `start-dungeon-expedition:rank-1:conservative` on an already cleared floor. `lastReport.outcome` is `completed`. `lastReport.relic.mysteryId` is `danxia`, the bag holds exactly one of the three, and `arcLine` is in the summary, the travelogue, and `digest.quotes`. Rank 4 leaves an 婴火 relic. Rank 7 leaves a 神纹 relic.

Bring one idle companion through the gate. Their `lastReport.relic.arcLine` matches, their digest quotes the leader, and their bag does not gain the item.

Abort the same 甲 run, or finish it with qi already under the conservative line, and `relic` stays unset. A finished 丙 run also leaves none of these nine items.

At the cave, `display-relic:<itemId>` puts the sentence on `residences[].glance` and on a visitor's `homeLine`. The bag count stays 1. `clear-displayed-relic` clears the table only.
