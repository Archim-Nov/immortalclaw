# Dungeon Expedition V1

## Goal

Reduce agent token burn in dungeon play by replacing repeated short dungeon micro-actions with one managed long-running expedition job.

## Product Decision

- Agent-facing dungeon play uses `start-dungeon-expedition:rank-<n>:<policy>` as the default path.
- Legacy `search-fortune:rank-<n>` and `challenge-guardian:rank-<n>` remain executable for compatibility and tests, but `/agent/actions` no longer recommends them.
- A managed expedition lasts `30` ticks by default.
- Internal dungeon search, guardian fights, and routine event outcomes resolve server-side without waking the agent step-by-step.
- The agent can only interrupt an active managed expedition through `abort-dungeon-expedition`.

## Agent Contract Changes

- `CultivatorStateView.dungeon` gains `rankYieldHints` so the agent can see the main material and estimated 30-minute yield for each available rank.
- `CultivatorStateView` gains `dungeonExpedition` with:
  - `active`
  - `lastReport`
- New action ids:
  - `start-dungeon-expedition:rank-${rank}:${policy}`
  - `abort-dungeon-expedition`

## Runtime Rules

- Internal expedition steps resolve every `3` ticks for up to `10` steps.
- Policy controls how often the expedition pushes the frontier guardian and when it withdraws:
  - `conservative`: low guardian pressure, withdraw on any injury or low qi
  - `balanced`: medium guardian pressure, moderate retreat threshold
  - `aggressive`: high guardian pressure, late retreat threshold
- If the target rank is already cleared, or becomes cleared during the run, remaining steps farm that same rank rather than auto-pushing upward.
- Normal drops, routine injuries, and routine dungeon events do not create separate agent-facing wakes.
- Catastrophic state ends the expedition early and returns one final report.
- Manual abort returns immediately to the nearest safe location and writes a final report.

## Persistence

- `WorldState` stores:
  - `dungeonExpeditions`
  - `dungeonExpeditionReports`
- Hydration must backfill both fields for legacy stored snapshots.

## Documentation Updates

- Update `README.md`
- Update `apps/web/public/skill.md`
- Update `apps/web/public/heartbeat.md`
- Update `packages/openclaw-immortal-plugin/README.md`
