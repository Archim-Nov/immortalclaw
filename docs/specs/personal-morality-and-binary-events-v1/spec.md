# Personal Morality And Binary Event Choices V1

## Summary

Add a personal `moralityScore` to every cultivator and use it as the first shared foundation for:

- righteous vs demonic identity
- player-sect founding alignment checks
- player-sect application alignment checks
- explicit binary event choices that let the player knowingly move toward `正道` or `魔道`

This version must stay small and persistence-friendly:

- one bounded integer on the cultivator
- one small pending-choice record per cultivator at most
- no full morality history stored in the world snapshot
- no per-tick global cleanup scans

## Problem

Player sects now support founding and approval, but sect alignment is still only a sect-level label. There is no personal righteous/demonic system yet, so:

- a cultivator's personal stance is not modeled
- sect alignment and founder identity can drift apart logically
- applications cannot check whether the applicant fits the sect's path
- current event pools mostly auto-resolve and do not give a direct moral choice

That leaves `正道 / 魔道` as flavor instead of a system.

## Goals

- add one explicit personal morality score with a stable sign-based interpretation
- keep the system easy to explain:
  - `>= 0` means `正道`
  - `< 0` means `魔道`
- use current organization behavior as the first stable score source
- add new binary event choices into the existing event pool so morality can also move through explicit player decisions
- make player-sect founding and applications respect sect alignment immediately
- expose pending moral choices through dedicated agent routes and one generic inbox hint

## Non-Goals

- no time decay or passive drift toward zero
- no neutral band around zero
- no configurable morality thresholds for sects in this version
- no long-term morality history ledger in the snapshot
- no full event-system rewrite
- no automatic sect-master removal if a founder later flips sign

## User-Visible Behavior

### Personal Morality

- every cultivator has `moralityScore`
- score is clamped to `-100 .. 100`
- alignment is derived, not stored separately:
  - `score >= 0 => 正道`
  - `score < 0 => 魔道`
- exact `0` counts as `正道`
- player-facing state shows:
  - raw score
  - derived alignment

### Organization Sources

- founding a `正道` player sect: `+12`
- founding a `魔道` player sect: `-12`
- joining a `正道` player sect: `+8`
- joining a `魔道` player sect: `-8`
- completing a `正道` sect errand: `+2`
- completing a `魔道` sect errand: `-2`
- neutral-sect join, leave, and duty do not change morality in v1

### Player-Sect Rules

- founding a player sect requires the cultivator's current personal alignment to match the declared sect alignment
- `正道` player sects only accept cultivators with `moralityScore >= 0`
- `魔道` player sects only accept cultivators with `moralityScore < 0`
- approval revalidates morality alignment at review time
- if a sect master later flips sign through later actions, v1 does not auto-remove the title or rewrite sect alignment

### Binary Event Choices

- current event pools remain mostly auto-resolved
- v1 adds a subset of new binary moral-choice events into the existing pools
- each such event has exactly two options
- the two options must point in opposite moral directions
- both options must still give a normal gameplay outcome, with light tradeoffs
- default morality deltas:
  - normal choice event: `+3 / -3`
  - stronger choice event: `+5 / -5`
- tradeoff direction:
  - righteous option leans toward order, protection, reputation, or safer outcomes
  - demonic option leans toward immediate stones, selfish gain, or harsher shortcuts

## API Requirements

### `GET /agent/events/pending`

- authenticated route
- returns only the current cultivator's single pending moral-choice event
- returns `choice: null` if none is pending

### `POST /agent/events/choose`

Request body:

- `choiceId`
- `optionId`

Success response must include:

- `tick`
- `cultivatorId`
- `choiceId`
- `optionId`
- `moralityScore`
- `moralityAlignment`
- `summary`

### `GET /agent/actions`

- add at most one generic inbox hint:
  - `resolve-morality-event-choice`
- do not expand one action per pending option

### `GET /agent/state`

- include `cultivator.moralityScore`
- include `cultivator.moralityAlignment`

## Data Model Requirements

### Cultivator

Add:

- `moralityScore: number`
- `pendingMoralityChoiceId: string | null`

### WorldState

Add:

- `pendingMoralityChoices: Record<choiceId, PendingMoralityChoice>`
- `nextMoralityChoiceSequence`

### EventTemplate

Allow an optional `moralityChoice` payload with:

- `title`
- `prompt`
- `expiresInTicks`
- `options[2]`

Each option contains:

- `id`
- `label`
- `summary`
- `moralityDelta`
- `effectBundle`

## Performance Constraints

- no per-tick full scan of all pending moral choices
- a cultivator may have at most one pending moral choice at a time
- expiry must be lazy:
  - when reading pending choice
  - when resolving choice
  - when trying to queue a new choice
- read-only pending-choice queries must not mutate the world only because they noticed expiry
- resolved or expired choices must not become long-lived snapshot history

## Acceptance Criteria

- `moralityScore` is clamped to `-100 .. 100`
- `0` is treated as `正道`
- righteous founders cannot found demonic sects, and demonic founders cannot found righteous sects
- player-sect applications fail when personal alignment does not match sect alignment
- review rechecks morality before approval
- joining and sect-errand flows move morality by the configured deltas
- neutral sect flows remain unchanged
- new binary event choices can appear through the existing event-pool pipeline
- only one pending moral choice exists per cultivator at a time
- `GET /agent/actions` exposes only one generic moral-choice inbox hint
- `GET /agent/events/pending` returns the current pending choice without expanding history
- `POST /agent/events/choose` applies the chosen effect bundle and morality delta, then clears the pending choice
