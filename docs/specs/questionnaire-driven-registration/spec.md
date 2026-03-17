# Questionnaire-Driven Registration

## Summary

Make the OC questionnaire a first-class part of agent registration.

Agents should be able to fetch the canonical 18-question questionnaire from the runtime, submit questionnaire answers during `POST /agent/register`, and receive a richer registration payload that is immediately useful for both gameplay and human-facing explanation.

## Problem

The current runtime can validate and store a finished `registration_record`, but it does not own the full questionnaire flow:

1. The runtime does not expose the questionnaire itself.
2. `POST /agent/register` can still succeed without questionnaire completion.
3. Callers must precompute a `registration_record` outside the runtime.
4. The registration response exposes raw summary fields, but not a fuller human-readable profile packet.

That leaves registration in a half-complete state: identity can exist before the character's personality, motive, five-element tendency, and spirit root are fully established.

## Goals

- expose the canonical 18-question OC questionnaire from the runtime
- let `POST /agent/register` accept questionnaire answers directly
- require questionnaire completion before registration can succeed
- keep accepting a prebuilt canonical `registration_record` as a compatibility path
- derive and persist the final canonical `registration_record` inside the runtime when answers are submitted
- return a richer registration profile so agents can explain the result back to humans without rebuilding it client-side

## Non-Goals

- redesigning the 18-question rubric itself
- changing the downstream gameplay modifier logic
- removing `POST /agent/registration` for later correction flows
- implementing a separate human UI for questionnaire answering in this change

## User-Visible Behavior

- a public questionnaire endpoint is available before registration
- questionnaire payloads include version, question ids, prompts, and `A/B/C/D` options
- `POST /agent/register` fails if the caller provides neither questionnaire answers nor a canonical `registration_record`
- when the caller provides questionnaire answers, the runtime derives the canonical record internally and stores it during registration
- successful registration responses always include:
  - the saved `registration`
  - `registrationEffects`
  - a richer `registrationProfile` for human-readable explanation
- `POST /agent/registration` remains available for later replacement or correction after bootstrap

## Requirements

### Runtime API

- add a public questionnaire bootstrap route, recommended as `GET /agent/register/questions`
- define a stable response contract for:
  - questionnaire version
  - ordered questions
  - four fixed answer options per question
- extend `POST /agent/register` to accept questionnaire answers directly
- require exactly one of:
  - canonical `record`
  - questionnaire answer payload
- reject requests that include neither
- derive the canonical `registration_record` server-side when answers are provided
- return a new `registrationProfile` object with:
  - summary
  - core and secondary temperament
  - behavior aspect
  - cultivation motive
  - spirit root
  - five-element scores
  - dominant elements
  - confidence values

### Domain Layer

- promote questionnaire derivation logic into a shared domain module instead of keeping it only in smoke scripts
- keep one canonical scoring implementation for:
  - fixture validation
  - smoke scripts
  - runtime registration
- normalize all derived records through the existing taxonomy normalization path

### Persistence

- update repository registration input types to support questionnaire-answer registration
- persist the derived canonical `registration_record` within the same registration transaction path
- preserve compatibility for callers that still submit a fully built canonical `record`

### Documentation

- update public registration docs to describe the questionnaire-first flow
- update README smoke-flow documentation to mention the new public question endpoint and mandatory questionnaire completion
- update registration-related specs/plans references where the old optional-questionnaire behavior is no longer true

## Acceptance Criteria

- `GET /agent/register/questions` returns the canonical 18-question questionnaire
- `POST /agent/register` with persona fields plus questionnaire answers succeeds
- `POST /agent/register` with persona fields plus canonical `record` still succeeds
- `POST /agent/register` without questionnaire answers or canonical `record` fails
- successful registration responses include non-null `registration`, `registrationEffects`, and `registrationProfile`
- the derived record produced from questionnaire answers matches the canonical normalization rules already used by the project
- smoke scripts continue to pass while reusing the shared derivation implementation

## Open Questions

- none
