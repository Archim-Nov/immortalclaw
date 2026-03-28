# 2026-03-29 Dungeon Expedition V1

## Scope

Implement the managed dungeon expedition loop described in `docs/specs/dungeon-expedition-v1/spec.md`.

## Work Items

1. Extend the domain model with managed expedition policy, progress, report, and state-view types.
2. Add world-shape hydration defaults for expedition progress and reports.
3. Introduce managed dungeon helpers for:
   - action-id parsing
   - per-rank yield hints
   - policy step choice
   - retreat and catastrophe checks
   - report generation
4. Change `/agent/actions` to expose managed dungeon expeditions instead of dungeon micro-actions.
5. Allow `abort-dungeon-expedition` while a cultivator is busy.
6. Run internal expedition steps during world advancement without emitting per-step action-complete wakes.
7. Return one summary report and one summary world event when the expedition ends.
8. Keep legacy `search-fortune` and `challenge-guardian` execution paths callable for compatibility.
9. Update agent-facing docs and plugin guidance to describe the new dungeon flow.

## Verification

- Domain tests for:
  - action surface
  - 30-tick job creation
  - busy-time abort visibility
  - manual abort
  - catastrophic early end
- Application test for:
  - generic inbox actions not leaking into an active expedition action surface
- Persistence tests for:
  - migrated worlds backfilling expedition state fields
- Run targeted package tests and a broader repo verification pass when time permits.
