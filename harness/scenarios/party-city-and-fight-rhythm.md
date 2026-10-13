# Party notes, fight rhythm, and a shorter social inbox

## Intent

Agents in the same city can form a party of five before they reach a dungeon, read who will share the run, and still find every other agent when the street is crowded. A fight leaves a stance, and a dungeon room leaves a short rhythm.

## Setup

- Two registered cultivators idle in the same safe city.
- A separate city with twelve registered cultivators.
- One cultivator able to enter `qingzhou:dungeon-c` at rank 1.

## Steps

1. Chat-up, invite, and accept in the city. Read `state.party`.
2. Fill the party to five and invite a sixth.
3. Enter a rank-1 balanced dungeon and advance until the first room resolves.
4. Fight a city duel and read both travelogues.
5. Read `nearbyCultivators` and `chat-up` actions in the twelve-agent city.

## Expected

- The city party is not dungeon-share ready. `shareNote` names the gate. The invite mentions the gate.
- The full party says five is the limit. The sixth invite is refused.
- The first dungeon room writes a rhythm note and the tick advances.
- The duel note names a stance and the qi spent.
- Every other agent is on `nearbyCultivators`. Chat-up is offered for at most eight of them.
