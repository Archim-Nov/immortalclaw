> **Status: Completed.** The `startingPath` field was fully removed on 2026-03-18.

# Deprecate Starting Path For New Registrations

## Summary

Keep `startingPath` as a compatibility field, but stop letting it shape new character creation.

New registrations should receive one unified starter package regardless of whether callers still send `startingPath: "sword"`, `"alchemy"`, `"array"`, or `"wanderer"`. Existing saved characters must stay unchanged, and the field should be clearly marked as deprecated so it can be removed gradually.

## Problem

`startingPath` currently behaves like a hidden starter-class system:

1. Registration callers can still send it.
2. New characters receive different techniques, inventory, currency, and faction reputation based on it.
3. The field is still surfaced through state and persona sync.

That creates two product problems:

- it pushes new players into pre-labeled openings such as sword/alchemy/array before the game has a chance to let their identity emerge through questionnaire results and later choices
- it encourages new development to keep treating `startingPath` as a real gameplay axis even though the intended direction is to phase it out

## Goals

- preserve backward compatibility for existing callers and stored data
- stop `startingPath` from changing the starter package for newly created characters
- keep existing saved characters and current gameplay loops intact
- mark `startingPath` as deprecated in code and docs
- document that future work should gradually remove the field from API, plugin, and persistence surfaces

## Non-Goals

- deleting the `startingPath` field from every type in this change
- migrating or rewriting existing saved cultivators
- removing the database column in this change
- redesigning the questionnaire, registration modifiers, or mid-game progression

## User-Visible Behavior

- callers may still send `startingPath` during registration or persona sync
- new characters receive the same starter package no matter which `startingPath` value is supplied
- compatibility views may still return `startingPath`, but it is informational only
- public docs explicitly state that `startingPath` is deprecated and ignored for new registrations

## Requirements

### Domain

- replace path-specific starter package selection with one unified starter package for new character creation
- continue storing `startingPath` on newly created cultivators for compatibility only
- keep existing cultivators untouched

### Runtime And Plugin Compatibility

- continue accepting `startingPath` in registration/persona-sync inputs
- document that the field is deprecated and does not affect starter loadout anymore
- avoid introducing any new gameplay logic that branches on `startingPath`

### Documentation

- update registration-facing docs to mark `startingPath` as deprecated
- note that it is accepted only for compatibility and ignored for starter package selection
- add a short removal note so future cleanup can proceed in stages

## Acceptance Criteria

- two newly created cultivators with different `startingPath` values receive the same initial:
  - techniques
  - inventory
  - spirit stones
  - reputation
  - faction reputation
- the stored/displayed `startingPath` metadata can still differ between those cultivators
- existing tests for current gameplay continue to pass
- docs clearly describe `startingPath` as deprecated compatibility-only metadata

## Follow-Up Removal Path

Future work should remove `startingPath` in stages:

1. stop surfacing it in public API responses
2. stop parsing it from plugin persona files
3. remove it from repository/profile persistence
4. drop the storage column after old data is no longer needed

