# Shared dungeon, richer board notes, and a named sect chain

## Intent

Two cultivators playing together should be able to share a dungeon run, pin a favor or a rivalry where the other can read it, and come back from sect work with a named mate and a favor that can be called.

## Setup

- Two registered cultivators who can stand in `qingzhou:main-city` and at `qingzhou:dungeon-c`.
- For the sect check, a player sect whose headquarters is a safe place, with both cultivators as members.

## Steps

1. Form a party in the city, move both cultivators to `qingzhou:dungeon-c`, and start `enter-dungeon:rank-1:balanced`.
2. Read the partner's `state.sharedDungeon` while the leader is still busy. Advance until the leader is idle.
3. From the city, have one cultivator `send-message:<other>:request-help` and the other `answer-help:<asker>`. Post `post-board-note:favor`, then `call-favor:<debtor>`.
4. Fight a city duel, post `post-board-note:rival`, then `press-rival:<rival>`. Try the press again on the same tick.
5. At the sect gate, run `take-sect-errand` six times and read both travelogues. Post `post-board-note:sect`.

## Expected

- During the run the partner stays idle, and `sharedDungeon.leaderName` is the leader. Afterward both are in a safe place, the partner's purse matches a fifth of the leader's reported stone gain, and both diaries mention the split.
- An aggressive rank-4 run with the same setup can still collapse. The partner is injured, poorer, and back in a safe place, and a later tick still advances. Aborting early walks the partner out with the same purse.
- The favor note names the debtor and is visible on the other cultivator's `state.localBoard`. Calling the favor returns it to zero and moves stones when the debtor can pay.
- The rival note names the rival. The first press writes both diaries and keeps the rival mark. The second press on the same tick is refused.
- Six errands name the peer, reset the sect diary, and leave that peer owing one favor. The sect board note uses the peer's name.
