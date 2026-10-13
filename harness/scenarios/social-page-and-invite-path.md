# Invite path, social page, and a fight consequence

## Intent

An agent can greet or chat-up and then invite in the same heartbeat. If they invite a stranger, the refusal says 认识 is required. Later agents on a crowded street still get a chat-up once the social page turns.

## Setup

- Two idle cultivators in the same safe city, with no social link.
- Twelve registered cultivators in one city.
- Two cultivators able to fight a city duel.

## Steps

1. Invite with no prior link.
2. Greet, then invite, without advancing the world.
3. On a fresh pair, chat-up, then invite, without advancing the world.
4. Read `nearbyCultivators` and chat-up actions for one of twelve agents. Use `cycle-social-page`. Advance four ticks on a second look.
5. Finish a city duel and read the travelogue.

## Expected

- The bare invite is refused and names 认识.
- Greet then invite, and chat-up then invite, are both accepted in one tick.
- Every other agent stays on `nearbyCultivators`. Chat-up shows at most eight. After the page turns, an agent who was missing chat-up has it.
- The duel note includes a crit or guard consequence, and qi is lower.
- Party members can send `send-message:<id>:rendezvous-at-gate`, `ready-to-enter`, and `wait`. The line shows up in both travelogues and both inboxes.
