# Residence Clarity V1

## Summary

This spec makes residence feel like a concrete place in the world rather than a pure conversion menu. It adds a lightweight residence context layer to state and logs: place description, current time-sense, and low-frequency passive ambient events tied to Jiuzhou flavor.

## Problem

The current residence loop is mechanically usable but conceptually flat:

- the runtime exposes residence actions, but the residence rarely reads like a lived-in place
- `activeResidence.description` exists in data, yet the moment-to-moment state does not foreground the current residence scene
- residence completion logs explain numbers, but not the feeling of staying there through time
- there are no lightweight ambient beats that reinforce the idea that a cultivator is dwelling somewhere between outer-loop runs

This makes `居` feel more like a backend action menu than an in-world stopping point.

## Goals

- Surface current residence context directly in state when the cultivator is at a residence.
- Add lightweight time-sense so residence actions feel like time spent somewhere.
- Add low-frequency passive ambient events for residence actions.
- Reuse Jiuzhou flavor anchors so each state's residence atmosphere feels regionally distinct.
- Preserve the current actions -> act loop and keep the feature legible for agent players.

## Non-Goals

- Adding new mandatory residence decision branches.
- Adding residence ownership progression, expansion, or upgrades.
- Adding multi-residence management UX beyond existing ownership data.
- Creating a separate heavy residence event subsystem.
- Reworking P1-R2 action id readability in this change.

## User-Visible Behavior

When the cultivator is currently at a residence:

- `GET /agent/state` includes a dedicated residence context block that names the active residence, restates its location identity, shows its place description, and gives a current time-sense / scene line.
- residence actions read like they are happening inside that place, not in an abstract menu.
- after residence actions resolve, logs may include a lightweight ambient beat such as weather, sounds, visitors, or omens tied to the current state flavor and current time slice.
- ambient beats are informative and atmospheric only; they do not require the agent to choose a new branch.

When the cultivator is not at a residence:

- the residence context block is omitted or null.
- no residence ambient events are emitted.

## Design Direction

### 1. Residence Context In State

Add an additive `residenceContext` view to the cultivator state output when `isAtResidence(cultivator)` is true.

The view should include:

- residence identity: `id`, `stateId`, `locationId`, `name`
- canonical description: reuse the current residence `description`
- time-sense: a short label such as `清晨`, `午后`, `薄暮`, `深夜`
- scene line: one short sentence that combines current time-sense with state-specific residence flavor
- recent ambient events: a short list of the most recent passive residence ambient beats, if any

This keeps the change additive and avoids changing existing `activeResidence` semantics.

### 2. Time-Sense Layer

Residence time-sense is descriptive, not a new simulation system.

- derive it from the current world tick using a small fixed cycle
- use it in `residenceContext.scene`
- also use it in residence completion logs so action results feel like time spent somewhere

### 3. Passive Ambient Events

Residence ambient events should be:

- low-frequency
- passive
- short
- state-flavored
- safe for agent interpretation

They may be triggered after these residence actions:

- `residence-meditate`
- `residence-heal`
- `residence-recover-qi`
- `residence-socialize`
- optionally `residence-produce:*`

Ambient events should not:

- add required follow-up actions
- alter the main decision surface
- replace normal recovery / cultivation logs

### 4. Event Content Shape

Ambient events should cover at least two semantic families such as:

- atmosphere: weather, light, scent, sound, architecture
- human-presence: distant voices, passing visitors, nearby activity
- omen: qi movement, talisman flicker, subtle spiritual resonance

The exact runtime output can remain log-based, but tags should let tests and future consumers identify these entries as residence ambient events.

## Constraints

- Preserve current residence ownership rules and current residence action ids.
- Keep the feature additive to the current API contract where possible.
- Do not make ambient events part of onboarding, guidance, or next-action recommendations.
- Reuse existing Jiuzhou flavor anchors rather than inventing a disconnected residence lore layer.
- Keep the implementation lightweight enough for P1 polish scope.
- If public agent docs mention new state fields, update the public docs in the same workstream.

## Acceptance Criteria

- When the cultivator is at a residence, state includes a non-null `residenceContext` with residence description and current time-sense.
- When the cultivator is away from residence, `residenceContext` is null or absent.
- Completing residence actions produces logs that include a residence time / scene cue.
- Repeated residence actions can produce at least two distinct ambient event kinds.
- Ambient events are tagged and testable without introducing new required actions.
- Existing engine tests continue to pass.

## Verification

- Add domain tests for state-level residence context visibility.
- Add domain tests for residence ambient event emission and distinct event kinds.
- Run targeted domain tests for residence and state output.
- Run the relevant repository test command used for current local validation.

## Open Questions

- Should `residence-produce:*` receive ambient beats in this batch or stay purely functional?
- Should the public docs describe `residenceContext` as stable now, or treat it as advisory flavor surface?