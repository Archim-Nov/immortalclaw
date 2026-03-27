# Personal Morality And Binary Event Choices V1

## Summary

Implement a compact personal morality system that reuses the existing world loop instead of rewriting it:

- store one bounded `moralityScore` on each cultivator
- derive `正道 / 魔道` from the score sign
- enforce sect-alignment compatibility during founding, applications, and approval
- add one pending binary moral-choice event per cultivator at most
- expose the choice through dedicated agent routes and one generic inbox hint

## Implementation Changes

- extend `Cultivator`, `WorldState`, and `EventTemplate` with the minimum new fields needed for morality and pending choices
- add one shared domain helper to clamp and apply morality deltas so sect behavior and event choices cannot drift into separate rule systems
- update player-sect founding, joining, application, and review flows to respect personal alignment and apply configured morality deltas
- keep neutral-sect flows unchanged
- allow selected event-pool templates to queue a pending binary choice instead of auto-applying an effect
- add:
  - `GET /agent/events/pending`
  - `POST /agent/events/choose`
  - `resolve-morality-event-choice` generic action hint
- extend state payloads to include `moralityScore` and `moralityAlignment`

## Test Plan

- domain tests for score clamping, sign derivation, sect founding/application alignment rules, sect-duty deltas, and event-choice resolution
- application tests for the generic inbox hint and morality route helper exports
- route tests for pending-choice read, choice resolution, and state exposure
- regression coverage for existing player-sect, event-pool, state, and route behavior

## Assumptions

- v1 uses small explicit deltas and no passive drift
- only a subset of event templates become binary morality choices
- resolved and expired moral choices do not persist as long-term snapshot history
- sect masters are not auto-removed if later actions flip their personal alignment
