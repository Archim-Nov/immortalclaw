# Residence Sink And Owned Vein Copy

## Summary

The cave the cultivator already owns stays the spirit-stone sink. The later rebuilds and the top furniture tiers cost enough that a normal purse cannot fill the catalog. Those expensive steps pay a little more than the earlier ones, and the bonuses still stop. A border camp's materials sentence follows who holds it.

## Problem

Buying one mid-tier piece, or rebuilding once, already touched the old ceilings, so the expensive tiers did not change cultivation, rest, crafting, or reputation. The catalog was also cheap enough, next to a long life, that filling it did not feel like a sink. Separately, `sectLife.veins[].materials` appended 邻宗占在本州 to every border camp, including a camp the member's own sect had already taken.

## Goals

- Keep `buy-residence`, `upgrade-residence`, `place-fixture`, `clear-fixture`, and `host-guest` on the existing residence. Do not add a second home currency or a parallel grandeur field.
- Make the upgrade ladder and the furniture catalog steep. Safe-state rebuild prices are 8000, 36000, 160000, and 720000, then triple after 洞天. Furniture bases before the family multiplier are 3600, 18000, 88000, 360000, and 1600000. Filling the slots and expanding until the slot cap costs more than twenty million stones in a safe state.
- Loosen the ceilings just enough that the last paid tier is visible: meditation at most +6 progress, healing at most 3 ticks, qi recovery at most +12, crafting at most 28% off, hosting affinity at most +6, and at most 24 local reputation from that cave.
- Keep one purchase from clearing a ceiling. A 绝品 piece alone stays under the cap. The cave itself adds a little and then plateaus below the furniture ceiling. A second piece on the same path still counts half.
- Reputation from the cave is paid once, up to the amount the current prestige entitles, and is not paid again if the piece is taken down and bought back.
- When the member's sect holds a border camp, the materials sentence says the sect keeps the yield. When a neighbor still holds it, the sentence still says 邻宗占在本州. An unowned camp does not use the neighbor sentence.
- Player-facing action, travelogue, and result sentences stay in Chinese and do not name action ids or fields such as `glance` and `homeLine`.

## Non-Goals

- Combat power, breakthrough success, or dungeon rewards from furniture.
- Refunding stones when a piece is taken down.
- Renaming a captured camp. The name can still carry the old sect. The materials sentence is what changes.
- Raising the reputation cap high enough to found a sect by furnishing one cave. Founding still needs 120 local reputation.

## User-Visible Behavior

The free home is still a 草庐 and a bought home is still a 石室. Rebuild names stay 洞府, 灵府, 仙府, 洞天, then 洞天·二重 and onward. Slots still stop at 12. Risk still multiplies the price the same way `buy-residence` does.

Most families reach 绝品. 茶案 stops at 仙品. 屏风 and 观景台 stay cosmetic and stop at 宝光. Taking a piece down frees the slot and does not return the stones. Buying that family again starts at 粗成.

The benefit sentence on `state.residences` states the ceilings in Chinese. A rebuild or a new piece writes the spend into the travelogue and the life log. If that step raises local reputation, the same sentence says 本州声望涨了多少点. The same guest still waits four ticks, and hosting still speaks one ordinary line.

`sectLife.veins[].materials` for a held border camp says the camp is already the sect's, the yield stays with the sect, and there is no need to declare war. A camp another sect still holds keeps 这是邻宗占在本州的边寨，护脉收不下来，要夺就宣战. Today's work mentions 邻宗占着的边寨 only while such a camp can still be raided.

## Constraints

- Old saves omit `grandeur`, `fixtures`, and `reputationClaimed`. Missing grandeur is 1, missing furniture is none, and missing claimed reputation is 0. The next purchase can pay the entitlement that the cave has already reached, once.
- `Residence.level` stays 1.
- Do not raise meditation, healing, qi, crafting, hosting, or cave reputation past the caps above.
- Chinese sentences on the action list, the travelogue, and the act result do not contain action ids.

## Acceptance Criteria

- `buy-residence` still creates a 石室 at the old price.
- The upgrade prices and the post-洞天 triple are the numbers above. A short purse leaves the cave and the stones unchanged.
- A 绝品 蒲团 adds more meditation progress than a 粗成 蒲团 on the same sitting, and less than the cap. A 绝品 聚灵阵 or a 绝品 灵泉 alone stays under the qi and heal caps. The furnace and the bench together, or the spring and the ward together, are what touch those caps.
- A bare 洞天 is better than a 草庐 and still under every cap. Further expansions do not push the cave's own bonus through the ceiling.
- Filling the catalog and expanding to twelve slots costs more than 20,000,000 stones in a safe state.
- The first rebuild adds local reputation. Clearing a piece and buying it again does not add that reputation a second time. The cave never grants more than 24.
- A neighbor-held border camp's materials include 邻宗占在本州. After the member's sect takes it, the materials include 本宗 and 出产 and do not include 邻宗. An unowned camp does not include 邻宗.
- The display-relic card does not say `glance` or `homeLine`.
- `node --import tsx --test` for the residence and sect-life suites passes, and `tsc --noEmit` passes.

## Open Questions

- Whether a later pass should let the host spend a real meal from the bag can wait. This pass only spends stones.
