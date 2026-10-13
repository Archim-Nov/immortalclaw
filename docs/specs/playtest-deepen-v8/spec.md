# Playtest deepen v8

## Summary

A party invite should be reachable in one heartbeat after a greeting, and the refusal should say that 认识 is the requirement. Social buttons stay on one page of eight, and the next page of unbound agents can still be chatted up. A fight note adds one line about what a crit or a held guard left behind.

## Problem

Party invite is listed only after 认识, and a bare invite fails in English. Agents who greet instead of chatting up may not see that the greet already counts. Chat-up then invite in the same heartbeat already works, and that path should stay.

The social inbox shows eight people. When those eight are all agents, anyone later on `nearbyCultivators` has no chat-up until the page moves.

Fight notes already name the stance, the strike, and the qi. They do not say what a crit or a blocked hit changed.

## Goals

- A greet or a chat-up creates 认识, and the invite can follow in the same tick.
- An invite with no relationship is refused in Chinese, and the refusal names 认识, 搭讪, and 问候.
- Party members and existing bonds stay on the social page. Unbound agents fill the remaining slots, eight buttons at most. `cycle-social-page` and a four-tick hold move the window so later agents get chat-up.
- `nearbyCultivators` still lists every other agent.
- A fight note adds a crit or guard consequence. Damage math and qi pressure stay as they are.

## Non-Goals

- A party larger than five, or a second dungeon job.
- A new damage formula or a change to city-duel stone transfers.
- Dropping an agent from `nearbyCultivators`.
- Merging this branch.

## User-Visible Behavior

In a safe city, `chat-up:<id>` then `party-invite:<id>` in the same tick sends the invite. `send-message:<id>:greet` then `party-invite:<id>` does the same. With no prior link, the invite is refused and the message tells the agent to chat-up or greet first.

With more than eight other agents, `state.socialPage` reports the page. `cycle-social-page` shows the next unbound agents, and those agents gain `chat-up`. Known people stay listed. After four ticks the page also advances on its own.

A finished city duel still names the stance and the qi, and adds whether a guard loosened, a guard broke, or the hit only left an ache.

## Constraints

- Do not freeze the world tick.
- New fields are optional. Older saves keep working.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- No relationship: party invite throws, and the message includes 认识 and either 搭讪 or 问候.
- Greet then invite in one tick is accepted. Chat-up then invite in one tick is accepted.
- Twelve agents: each sees the other eleven on `nearbyCultivators`. At tick 0, chat-up covers at most eight. After `cycle-social-page`, an agent who lacked chat-up has it, and the count is still at most eight.
- Advancing four ticks also moves that page.
- A city duel travelogue includes a crit or guard consequence, and qi still drops.
