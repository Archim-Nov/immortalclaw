# Quest ActionId Legibility V1

## Summary

This spec replaces opaque quest action ids with stable, readable quest action ids that agents can pattern-match and parse safely. The new format makes quest actions start with `quest:` and encodes action phase plus quest type plus slot index.

## Problem

Current quest actions are readable only to the runtime internals:

- accept actions expose long instance-derived ids
- execute actions expose long active-quest ids
- ids change across board refreshes and active-quest creation
- agent players cannot reliably infer quest type or slot from the action id alone

This weakens action legibility and makes the quest loop inconsistent with the rest of the runtime surface, where actions such as travel and dungeon entry already use readable, machine-friendly ids.

## Goals

- Make all quest-related action ids begin with `quest:`.
- Encode quest phase, quest type, and slot/index in the action id.
- Keep ids readable enough for agent parsing with simple prefix and split logic.
- Avoid collisions between board-accept actions and active-quest execute actions.
- Preserve current quest mechanics, rewards, and board refresh behavior.

## Non-Goals

- Redesigning quest templates, reward balance, or quest categories.
- Changing quest board refresh cadence.
- Adding a new quest UI surface.
- Changing onboarding logic beyond updating the returned action ids.

## User-Visible Behavior

Quest actions should use this format:

- board accept: `quest:accept:{questType}:{boardIndex}`
- active execute: `quest:execute:{questType}:{activeIndex}`

Examples:

- `quest:accept:gathering:0`
- `quest:accept:market-work:1`
- `quest:execute:gathering:0`

This keeps the action ids:

- readable
- prefix-matchable with `quest:`
- phase-aware
- compact enough for agent reasoning

The runtime should still resolve quest success/failure exactly as before.

These ids are stable within the current returned action snapshot, not forever-stable handles. Agents must always read a fresh action list before acting and should not cache old quest ids across board or active-list changes.

## Design Direction

### 1. Quest ActionId Shape

Introduce a dedicated quest action id family:

- `quest:accept:{questType}:{boardIndex}` for accepting from the current board
- `quest:execute:{questType}:{activeIndex}` for executing an already accepted quest

The phase segment is required. Without it, board and active quest actions can collide when type/index overlap.

`boardIndex` means the quest's board slot identifier, which may remain non-contiguous after accepts.

`activeIndex` means the quest's position in the current active quest list exposed by the latest action surface. It can change when active quests are completed or removed.

### 2. Quest Runtime Mapping

Quest board entries should carry enough structured data to rebuild readable action ids without exposing internal instance ids.

At minimum, quest runtime data should surface:

- `type`
- `boardIndex` for board quests

Accepted quests should preserve the original quest type and source board index, but execution ids should use the active quest list index exposed in the current state surface.

### 3. Internal IDs vs Public Action IDs

Internal persistence ids may remain opaque.

The change is specifically about the public action contract returned through:

- `listAvailableActions()`
- onboarding recommendations
- strategy recommendations
- any other agent-facing action surface

The public action contract should not leak instance ids or active quest ids anymore.

## Constraints

- Keep quest board refresh deterministic and unchanged.
- Do not require agents to inspect quest descriptions to infer quest kind.
- Preserve current action execution flow and active quest resolution semantics.
- Avoid adding compatibility aliases unless necessary; the main runtime surface should converge on the new `quest:` family.

## Acceptance Criteria

- All quest action ids returned to agents begin with `quest:`.
- Accept actions follow `quest:accept:{questType}:{boardIndex}`.
- Execute actions follow `quest:execute:{questType}:{activeIndex}`.
- Onboarding and strategy surfaces return the new quest action ids.
- Quest actions remain executable end-to-end.
- Existing quest board and golden path tests are updated and still pass.

## Verification

- Add parser/builder coverage for quest action ids.
- Add quest action generation coverage in engine tests.
- Verify onboarding returns `quest:*` action ids during the first quest step.
- Run the repository test command.

## Open Questions

- Should the quest type segment remain template-type only, or should category ever be encoded too?
- Should future public docs expose board index and active index semantics explicitly, or keep them implementation-light for now?