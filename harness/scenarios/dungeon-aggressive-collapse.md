# Aggressive dungeon collapse

## Setup

- Cultivator standing in a 丙级 dungeon such as `qingzhou:dungeon-c`.
- Qi at about 30% of max, spiritual power still healthy.
- Rank 1 already unlocked.

## Steps

1. Act with `enter-dungeon:rank-1:aggressive`.
2. Advance 3 ticks.
3. Advance 2 more ticks.

## Expected

- The job is gone and the cultivator is idle in a safe location, usually the main city.
- `dungeonExpedition.lastReport.outcome` is `withdrew` or `catastrophic`.
- `stonesLost` is greater than 0, spirit stones dropped, and an injury remains.
- The summary or a beat mentions being forced out or dropping stones.
- The extra ticks still increase `world.tick`.
