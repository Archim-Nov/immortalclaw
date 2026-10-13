# Dungeon enter unstick

Use this when checking that `enter-dungeon` cannot freeze the world again.

1. Put a cultivator on a dungeon node they are allowed to enter, such as `qingzhou:dungeon-c` at rank 1.
2. Perform `enter-dungeon:rank-1:conservative`.
3. Advance 30 ticks.
4. The cultivator is idle, the job is gone, and they are back in a safe location.
5. `state.dungeonExpedition.lastReport` has an outcome, a summary, qi spent, and at least one beat.
6. `state.travelogue.notes` has something an agent can retell.
7. Advance one more tick. The world tick still increases.

The domain regression for this lives in `packages/domain/src/deepen-playtest.test.ts`.
