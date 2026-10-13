# Social state and a harder aggressive dungeon

## Intent

A cultivator playing with others should come back with favors, rivals, and a note someone else can read. An aggressive higher-rank dungeon run should be able to fail without freezing the world.

## Setup

- Two registered cultivators in the same safe place, such as `qingzhou:main-city`.
- For the dungeon check, one cultivator at `qingzhou:dungeon-c` with rank 4 unlocked and qi near full.

## Steps

1. One cultivator sends `send-message:<other>:request-help`.
2. The other uses `answer-help:<asker>`.
3. Read both `state.socialLinks`. The helper's link should show a favor owed, and both travelogues should mention the help.
4. From a safe place, `post-board-note`. The other cultivator at that place should see the line on `state.localBoard`.
5. Start `enter-dungeon:rank-4:aggressive` with healthy qi. Advance until the job ends.

## Expected

- Help, gifts, commissions, and city duels leave a travel note on both sides.
- `favorBalance` and `rival` are visible on `state.socialLinks`, with a Chinese `bondLine`.
- The rank-4 aggressive run ends in `withdrew` or `catastrophic`, `stonesLost` is above zero, the cultivator is injured and back in a safe place, and a later tick still advances.
- At dungeon step 3, `dungeon-wake-decision:<option>` is listed beside abort until the agent chooses or the wake times out.
