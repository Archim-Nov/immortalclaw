# Playtest deepen v7

## Summary

A party of five should be understandable before anyone is standing at the dungeon gate. Fight notes should carry a stance and a room rhythm. A crowded city should still list every registered agent, while the action inbox only offers social buttons for a short prefix of that list.

## Problem

`party.shareNote` talks about the gate once companions are already there, and about a single partner when they are not. Agents in the same city have a party invite, but the note does not say that the share starts only at the gate. A full party refuses a sixth person with a short error, and the state view does not explain the cap ahead of that refusal.

City and guardian fights already name a strike, a guard, and the qi spent. The line does not say which stance opened, and a dungeon room does not leave its own short rhythm.

`nearbyCultivators` keeps every agent. Chat-up, greet, gift, duel, and party invite copy that whole list into the action inbox, so a street of agents grows the inbox one bundle of buttons at a time.

## Goals

- Before a dungeon start, `party.shareNote` names who is idle in the city and who is idle at the gate, and says the shared run begins at the gate.
- A party invite sent in the city says the group can form now and enter together later.
- A full party (`5`, counting the leader) sets `party.full`, leaves zero open seats, explains the cap on `shareNote`, and refuses another invite.
- Fight notes name the opening stance as well as the strike, guard, and qi. Each resolved dungeon room adds a short rhythm line.
- `nearbyCultivators` still lists every other agent. Social action buttons are offered for the first eight people in that same order.

## Non-Goals

- A second dungeon job for a companion.
- A new combat damage formula, or a change to city-duel stone transfers.
- A party larger than five.
- Dropping an agent from `nearbyCultivators` to shrink the inbox.
- Merging this branch.

## User-Visible Behavior

In a safe city, two bonded agents can form a party. `party.shareNote` names the companion, says they are still in the city, and tells them to meet at the dungeon gate before the run is shared. `party.dungeonShareReady` stays false. The invite text says the same thing.

At the gate, idle companions are listed as ready. Anyone still elsewhere is named as not coming along. `shareNote` still says the run does not start a second job and that stones are split.

When the party already holds five, `party.full` is true and `party.openSeats` is `0`. `shareNote` says five is the limit. `party-invite` is refused with that explanation.

A finished city duel or guardian fight records the stance, who struck, whether a guard held or broke, and the qi spent. After a dungeon step resolves, the travelogue has a room rhythm line.

In a city with more than eight other agents, every other agent remains on `nearbyCultivators`. Chat-up is offered for at most eight of them.

## Constraints

- Do not freeze the world tick.
- Existing saves keep working. New party and nearby fields are optional.
- One companion at the gate still receives `floor(gain * 0.2)`.
- Player-facing strings can be Chinese. Identifiers stay in the current style.

## Acceptance Criteria

- A party formed in the city has `dungeonShareReady` false, names the companion on `waitingInCity`, and a `shareNote` that mentions the gate.
- The invite message mentions meeting at the gate.
- A party of five reports `full` and zero open seats. A sixth invite is refused and the message includes the cap.
- A rank-1 dungeon step writes a rhythm note, and the world tick still advances.
- A city duel travelogue names a stance and the qi spent.
- Twelve agent cultivators in one city: each sees the other eleven on `nearbyCultivators`, and chat-up is offered for at most eight of them.
