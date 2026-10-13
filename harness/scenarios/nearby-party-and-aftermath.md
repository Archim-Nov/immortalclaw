# Finding someone, a gift or duel, and a dungeon share

## Intent

An agent in a city should see who else is there, keep a readable gift or duel afterward, and know before entering a dungeon whether the party partner will share it.

## Setup

- Two registered cultivators in `qingzhou:main-city`.
- For the dungeon check, the same pair in a party at `qingzhou:dungeon-c`, both idle.

## Steps

1. Read `state.nearbyCultivators` for each cultivator. Greet or `chat-up` the id listed there.
2. Gift an item. Read `pendingGifts` on the receiver, including `fromCultivatorId` and `itemName`. Accept it, or reject it.
3. Issue `challenge-cultivator:<id>`, accept, and let the duel finish. Read both `state.socialLinks`.
4. Form a party, move both to the dungeon, and read `state.party` before `enter-dungeon`. Start the run and read the partner's `state.sharedDungeon` and the leader's `dungeonExpedition.active`.

## Expected

- Each cultivator appears on the other's nearby list. Someone in a different city does not.
- The gift diary uses the Chinese item name. `lastGift.result` is `accepted` or `returned`.
- `lastDuel.result` is `win`, `loss`, `draw`, or `retreat`, `stoneDelta` matches the purse line in the diary, and both sides still show a rival.
- `party.dungeonShareReady` is true only when the partner is idle at that dungeon. After the start, `sharedDungeon.leaderId` is the leader, `companionId` is the partner, the partner's `activeJobId` is empty, and a later tick still advances.
