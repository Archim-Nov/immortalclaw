# Agents stay visible in a crowded city

## Intent

Several registered agents in one city, surrounded by NPCs, should still find each other for chat-up, gifts, duels, and party invites.

## Setup

- Four cultivators with `createdByAgentId` set, all idle in the same safe city.
- At least twelve NPCs in that city, named so they would sort ahead of the agents.

## Steps

1. Read `state.nearbyCultivators` for each agent.
2. Read `GET /agent/actions` and look for `chat-up:<other agent id>`.
3. `chat-up` one of them and look for `party-invite:<id>`.

## Expected

- Each agent lists the other three agents.
- NPC rows on that list stay at or under eight.
- `chat-up`, greet, and a city challenge are present for each other idle agent.
- After chat-up, `party-invite` for that agent is present.
- Starting a shared dungeon still leaves the partner without a job.

## Party of five and fight notes

- Five cultivators, the leader plus four idle companions, stand at one dungeon gate.
- The leader starts `enter-dungeon:rank-1:balanced`. Each companion stays idle, reads `sharedDungeon.leaderId`, and is named on the expedition.
- One world tick still advances, and none of the companions gain a job.
- Aborting the run walks all five back to a safe city. Companion notes include the withdrawal.
- A sixth invite is refused.
- After a city duel, both travelogues name who struck and the qi spent. A dungeon guardian writes the same kind of note.
