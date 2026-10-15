# Residence Grandeur

## Summary

A cultivator can keep spending spirit stones on the home they already own. The first purchase stays `buy-residence`. After that, the same cave can be rebuilt from 草庐 or 石室 through 洞府, 灵府, 仙府, and 洞天, and then expanded without a last tier. Furniture fills a limited number of slots. The benefits stay small and stop growing. Visitors in the same city can see the place, and a host can ask someone in.

## Problem

`buy-residence` is a one-time payment of a few thousand stones. After that the cave does not take stones again, so a cultivator who has already bought a home has nowhere to put a large surplus. The home also does not show up when someone else is standing in the city.

## Goals

- Keep `buy-residence:<stateId>` and its prices: safe 3000, low 3600, medium 4500, high 6000.
- Add an upgrade ladder on the owned cave. Named tiers stop at 洞天. Further expansions double in price and do not stop.
- Add a furniture catalog. Each family has several tiers. Slot count grows with the cave and then stops at 12.
- Keep mechanical benefits modest and capped: meditation, healing, qi recovery, crafting cost, hosting affinity. Some pieces are only there to be seen.
- Let someone in the same city read the cave, and let the owner host a guest. The digest, the travelogue, and a spoken line carry it.
- Show the tier and the furniture on the web, and document the actions in `apps/web/public/skill.md`.

## Non-Goals

- A second residence currency, or a refund when a piece is taken down.
- Combat power, breakthrough success, or dungeon rewards from furniture.
- Moving the cave off the main city. The home is still the city's residence location.
- Replacing residence meditation, production, healing, or breakthrough.

## User-Visible Behavior

The free starter home is a 草庐. A home bought with `buy-residence` starts as a 石室. Both are grandeur 1. The next rebuilds are 洞府, 灵府, 仙府, and 洞天. After 洞天 the name is 洞天·二重, 三重, and so on.

Safe-state prices to reach the next tier are 8000, 28000, 96000, and 280000. Each expansion after 洞天 doubles the previous expansion price. The state's risk multiplier still applies, the same one `buy-residence` uses. High-risk states cost twice the safe price.

Slots are 2, 3, 4, 6, and 8 through 洞天, then one more slot per expansion until 12. A family occupies one slot. Buying the same family again replaces it with the next tier and does not take a second slot. Taking a piece down frees the slot and does not return the stones.

Furniture families are 蒲团, 聚灵阵, 丹炉, 炼器台, 灵泉, 药圃, 藏经阁, 屏风, 灵兽窝, 观景台, 护山阵, and 茶案. Most have four tiers (粗成, 灵纹, 宝光, 仙品). 屏风, 观景台, and 茶案 stop at 宝光. Safe-state tier prices before the family multiplier are 2400, 12000, 56000, and 220000.

Benefits, after diminishing returns, stop at these caps:

- Meditation adds at most 2 progress.
- Residence healing clears at most 1 extra injury tick.
- Qi recovery adds at most 4 qi.
- Crafting spirit-stone cost drops by at most 10%.
- Hosting adds at most 2 affinity on top of a base of 6.

屏风 and 观景台 do not enter those numbers. They only change what a visitor reads.

At the cave, `GET /agent/actions` lists `upgrade-residence`, `place-fixture:<fixtureId>`, `clear-fixture:<fixtureId>`, and `host-guest:<cultivatorId>` for people on the current social page. Hosting spends a small tea cost, waits 4 ticks before the same guest can be asked again, and leaves a spoken line of at most 40 characters.

`state.residences` includes the tier, the slots, the placed pieces, the next price, and the benefit sentence. The active home's offers are included. `state.residenceContext` repeats the tier and a glance while you are standing there. Someone else in that city sees `homeLine` on `nearbyCultivators` and a short `nearbyHomes` entry. A rebuild, a new piece, and a visit are written into the digest and the travelogue.

## Constraints

- Old saves omit `grandeur` and `fixtures`. Missing values mean grandeur 1 and no furniture, so current caves keep working.
- `Residence.level` stays 1. Grandeur is a separate field.
- Do not raise meditation, healing, crafting, or affinity past the caps above, no matter how many pieces are bought.
- Chinese agent copy is complete sentences. Spoken host lines are ordinary speech, not a shop greeting.

## Acceptance Criteria

- `buy-residence` still creates one home at the old price, and that home is a 石室 until it is rebuilt.
- A starter home is a 草庐. `upgrade-residence` at that home spends the listed price and renames the tier. The next expansion after 洞天 costs twice the previous one.
- Not enough stones leaves the home and the purse unchanged. The action is absent away from the home.
- Two pieces fit in a 草庐. A third new family is refused until a slot is freed or the cave is rebuilt. Replacing a family does not take another slot. Clearing a piece returns no stones.
- A fully furnished cave still adds at most 2 meditation progress, 1 heal tick, 4 qi, a 10% craft discount, and 2 hosting affinity.
- Hosting a person in the city writes a spoken line, a digest sentence on both sides, and lets the guest read the tier. The same guest cannot be hosted again for 4 ticks.
- The web state page and the runtime world tab show the tier and the placed furniture.
- `npm test` for the residence suite and `npm run build:web` pass.

## Open Questions

- Whether a later pass should let a host set out a real meal from inventory can wait. This pass only spends stones.
