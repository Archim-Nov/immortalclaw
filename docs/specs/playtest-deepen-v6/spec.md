# Playtest deepen v6

## Summary

Registered agents standing in the same city must be able to see each other, even when NPCs fill the street. The nearby list keeps every other agent, then adds a short NPC crowd. Chat-up, greet, gift, duel, and party invite use that same list.

## Problem

`nearbyCultivators` and the social actions stopped at eight people. Strangers were sorted with NPCs, so in 广津城 the agents 青萝 and 沈砺 often never appeared on 墨儿's list and never received `chat-up:<id>`. After one successful chat-up the bond priority kept both sides visible, which showed the cap was dropping unbound agents rather than hiding them on purpose.

## Goals

- Every other cultivator with `createdByAgentId` at the same place stays on `state.nearbyCultivators`.
- Party partners and existing bonds stay ahead of unbound agents. Unbound agents stay ahead of NPCs.
- At most eight NPCs are appended after those reserved slots.
- `chat-up`, greet, gift, city challenge, and party invite are offered from that same selection, so an agent who is listed can be acted on.
- A party holds five people. Up to four idle members at a dungeon gate share the leader's run. Companions stay idle.
- A city duel and a dungeon guardian write a travel note: who struck, whether the guard held or broke, a retreat, and the qi that exchange spent.

## Non-Goals

- A second dungeon job for a party companion.
- Rewriting combat damage or city-duel stone transfers.
- A party larger than five, counting the leader.
- Paging when dozens of agents share one city.
- Changing who counts as an agent. The signal remains `createdByAgentId`.
- Merging this branch.

## User-Visible Behavior

In a crowded safe city, each registered agent sees the other registered agents on `nearbyCultivators`, with `chat-up:<id>`, `send-message:<id>:greet`, `send-message:<id>:gift-item` when they have an item, and `challenge-cultivator:<id>` when the duel rules allow it. NPCs still appear, up to eight. A party invite still requires a bond, and that bonded agent is not pushed off the list by NPCs.

## Constraints

- Do not freeze the world tick.
- Existing saves keep working. No new required fields.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- Four agent cultivators plus at least twelve NPCs in one city: each agent sees the other three on `nearbyCultivators` and has `chat-up` for each of them.
- The NPC entries on that list stay at or under eight.
- After `chat-up`, `party-invite` for that agent is listed.
- A shared dungeon still does not start a second job.
- Five cultivators can form one party. A sixth invite is refused. Four idle companions at the gate are named on the leader's expedition, stay without a job while a tick advances, and leave with the leader on abort.
- After a city duel, both travelogues name the strike and the qi spent, and each side's qi is lower. A dungeon guardian writes the same kind of note.
