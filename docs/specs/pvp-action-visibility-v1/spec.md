# PVP Action Visibility V1

## Summary

This spec makes city-duel PVP actions visible only when they are truly valid in the current world snapshot. It prevents agent players from seeing unusable `challenge-cultivator:*` actions when no eligible target is present, and it makes pending duel responses disappear as soon as the challenge is no longer valid because one side left, or has already started leaving, the original location.

## Problem

The runtime already implements city-duel PVP execution, acceptance, rejection, timeout, and combat resolution, but the live action surface does not yet expose that behavior as a safe agent-facing contract.

Without a constrained action-surface rule:

- agents can be shown PVP actions in states where no real target is available
- pending challenge actions can remain conceptually visible longer than the duel is actually valid
- the action list becomes misleading, which is especially harmful in this repo because agents are expected to read fresh `actions` and only then `act`
- cancellation reasons become harder to understand when a duel silently becomes invalid after movement

## Goals

- Expose `challenge-cultivator:*` only when at least one valid same-location target currently exists.
- Expose `accept-pvp-challenge:*` and `reject-pvp-challenge:*` only while the pending challenge is still valid and both duelists remain at the original challenge location.
- Treat leaving, or explicitly starting to leave, the original location by either challenger or target as a duel cancellation event.
- Notify both duelists when a pending challenge is canceled because the location condition is broken.
- Keep the new rules aligned with the existing engine, social-action, and agent-action patterns instead of introducing a parallel PVP surface.

## Non-Goals

- Redesigning PVP combat balance, duel rewards, or combat-round logic.
- Adding new PVP modes such as arenas, ranked ladders, sect war battles, or cross-location duels.
- Changing the existing timeout behavior for pending city-duel challenges beyond integrating movement-based cancellation into the same validity model.
- Reworking the public docs for all combat actions beyond updating the runtime behavior and tests required for this change.

## User-Visible Behavior

### 1. Duel Challenge Visibility

When a cultivator is in a safe location, the runtime should only include `challenge-cultivator:<cultivatorId>` actions for cultivators who are all of the following at the current tick:

- at the same location
- not the acting cultivator
- not busy with an active job
- not already holding a pending incoming PVP challenge
- within the existing fair-duel realm-gap rule
- not in the same player sect as the acting cultivator

If no such target exists, the action list should not include any duel-challenge action.

### 2. Pending Response Visibility

When a cultivator has a pending incoming duel challenge, the runtime should include:

- `accept-pvp-challenge:<challengeId>`
- `reject-pvp-challenge:<challengeId>`

only if the pending challenge is still valid:

- the challenge record still exists
- the challenge has not timed out
- the challenger still exists
- the challenger is still at the original challenge location
- the target is still at the original challenge location

For this rule, a duelist who has already started a `travel-to:*` action away from the original location should be treated as no longer available for a valid pending duel response, even before the destination tick completes.

If any of those checks fail, the response actions should not be returned.

### 3. Movement-Based Cancellation

If either duelist leaves, or explicitly starts leaving, the original challenge location before the challenge is accepted or rejected:

- the pending challenge should be removed from world state
- the target cultivator should no longer reference the challenge id
- both sides should receive a cancellation message explaining that the challenge was canceled because one side left the area

This cancellation should behave like timeout cleanup in that the invalid challenge is removed before agents act on stale response actions.

## Design Direction

### 1. Shared Validity Helper

The engine should centralize pending-duel validity checks in a small helper layer so the action surface and cleanup path use the same rule source.

At minimum, the helper should answer:

- whether a duel target is currently challengeable from the acting cultivator's perspective
- whether a pending challenge is still valid for response display
- whether a pending challenge should be canceled because the location condition has been broken

### 2. Action Generation Should Mirror Real Executability

The action list is the agent-visible contract. It should not expose a duel action unless the engine currently believes that action is structurally valid.

This does not replace `performAction` validation. It complements it:

- `actions` should avoid misleading the agent
- `performAction` should still reject stale or race-lost actions safely

### 3. Cancellation Must Be Legible

Movement-based invalidation should not be silent. The world already uses system messages to explain challenge rejection and timeout. Leaving the area should follow the same pattern so the cultivator can understand why the response actions disappeared.

## Constraints

- Preserve the existing city-duel execution path in `performAction`.
- Keep the implementation inside the current engine/action-generation model; do not introduce a separate PVP action service.
- Reuse existing same-location and social-action patterns where possible.
- Keep the act loop safe: agents should still be expected to read fresh actions before acting, and the runtime should reduce stale-action exposure rather than rely on agents guessing.
- Keep tests aligned with current module boundaries so the behavior remains easy to refactor later.

## Acceptance Criteria

- `listAvailableActions()` returns no `challenge-cultivator:*` action when no eligible same-location target exists.
- `listAvailableActions()` returns `challenge-cultivator:*` only for currently eligible same-location duel targets.
- `listAvailableActions()` returns `accept-pvp-challenge:*` and `reject-pvp-challenge:*` only while the pending challenge remains valid and both sides remain at the original challenge location.
- Advancing the world after either duelist leaves the original challenge location cancels the challenge and removes pending response actions.
- Both duelists receive a cancellation message when movement invalidates the challenge.
- Existing duel execution tests continue to pass after the action-surface change.

## Verification

- Add engine-level action-generation tests for duel-challenge visibility.
- Add engine-level action-generation tests for pending response visibility.
- Add engine-level cancellation tests covering movement-based invalidation.
- Run targeted engine tests for PVP and sect action generation.
- Run the repository test command before completion.

## Open Questions

- None for this version. The user explicitly chose movement-based cancellation and same-location-only visibility.
