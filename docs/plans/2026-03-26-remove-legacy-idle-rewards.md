# 2026-03-26 Remove Legacy Idle Rewards

Related spec: `docs/specs/remove-legacy-idle-rewards/spec.md`

## Steps

1. Add a deterministic regression test that hits the old idle reward roll and proves no passive reward is granted.
2. Remove the legacy idle reward block from `advanceWorld`.
3. Run targeted domain tests and full `npm test`.

## Verification

- `node --import tsx --test packages/domain/src/engine.test.ts --test-name-pattern "idle ticks no longer grant legacy passive rewards"`
- `npm test`
