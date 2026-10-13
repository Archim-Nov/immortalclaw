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
