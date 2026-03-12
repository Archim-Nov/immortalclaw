# Registration Record V2

## Summary

Introduce a `registration_record` v2 shape that uses stable taxonomy IDs for temperament, behavior aspect, cultivation motive, and spirit-root kind, while keeping localized label strings as presentation data. Runtime logic must stop keying gameplay effects off human-readable labels.

## Problem

The current registration flow mixes storage and presentation:

- runtime gameplay modifiers still branch on localized Chinese substrings
- public docs and some tests still show English label examples
- the same conceptual registration result can be represented with multiple label strings

That makes localization brittle and causes onboarding examples to drift away from the runtime's real modifier logic.

## Goals

- add stable IDs for registration taxonomy fields
- let questionnaire UX and docs present English or Chinese labels without changing gameplay semantics
- keep existing v1 records working
- normalize saved records so runtime views always include both IDs and labels
- update public registration guidance to recommend the v2 shape first

## Non-Goals

- redesigning the 18-question rubric
- changing the `/agent/register` or `/agent/registration` endpoint paths
- introducing locale negotiation on API responses
- migrating historical saved records in storage with a dedicated data migration

## User-Visible Behavior

- v1 records with label-only fields still save successfully
- v2 records can carry stable IDs plus a `label_locale`
- when a v2 record omits label strings, the runtime fills them from the IDs and locale before saving
- authenticated state and registration responses now surface both the stable IDs and the display labels
- English questionnaire UIs can use the same canonical record shape without risking gameplay drift

## Requirements

### Record Shape

- `result.label_locale` indicates the locale used for any display labels
- `result.core_temperament_id` and `result.secondary_temperament_id` identify the temperament taxonomy
- `result.behavior_aspect_id` identifies the behavior-aspect taxonomy
- `result.cultivation_motive_id` identifies the motive taxonomy
- `result.spirit_root_kind_id` identifies whether the final root is single or dual
- when the final root is dual, the display label preserves the stronger of the top two elements first
- existing label fields remain in the payload for compatibility and display

### Runtime

- registration validation must normalize v1 and v2 records into a single stored shape
- gameplay modifiers must branch on stable IDs, not localized substrings
- `CultivationRegistrationView` must expose both IDs and labels

### Documentation

- registration docs must recommend v2 first and describe v1 as a compatibility format
- OpenClaw setup docs must state that English questionnaire UIs should emit v2 IDs
- the OC foundation docs must clarify that localized labels are presentation-only

## Acceptance Criteria

- a v1 English label-only record still passes through `/agent/register`
- a v2 ID-based record with empty label strings is accepted and normalized
- `GET /agent/state` returns stable IDs and labels for the saved registration
- runtime modifier logic works for both v1 compatibility input and v2 input
- smoke scripts generate v2 records by default

## Open Questions

- none
