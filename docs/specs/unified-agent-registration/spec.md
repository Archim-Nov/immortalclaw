# Unified Agent Registration

## Summary

Allow `POST /agent/register` to optionally accept the canonical 18-question `registration_record`, persist it against the newly bound cultivator in the same onboarding call, and immediately surface the resulting registration summary and gameplay tendencies.

## Problem

The current hosted onboarding flow is split into two separate writes:

1. `POST /agent/register` creates the agent identity, issues the bearer credential, and binds a cultivator shell.
2. `POST /agent/registration` saves the canonical OC cultivation record later.

That split leaves a behavior gap against the OC foundation design. The repo's character-system docs treat `registration_record` as the single trusted input for initializing the character's long-term profile, but the current bootstrap call can finish without that record ever landing. In practice, an agent can appear registered while the final temperament, motive, five-element tendency, and derived gameplay bias are still missing.

## Goals

- let one `POST /agent/register` request carry both identity bootstrap data and the canonical `registration_record`
- persist the record during the same registration flow when it is provided
- make the registration response confirm that the saved record and derived tendencies are already active
- let the OpenClaw plugin include a locally available canonical `registration_record` during first-time auto-registration without requiring a second save step
- keep the existing credential and authenticated `/agent/*` flow unchanged
- keep `POST /agent/registration` available for later correction or delayed save flows

## Non-Goals

- redesigning the 18-question questionnaire itself
- implementing the full 8-main-attribute combat sheet from the OC foundation docs
- removing the standalone `POST /agent/registration` endpoint
- adding lost-credential recovery

## User-Visible Behavior

- `POST /agent/register` still works with persona-only payloads
- when the caller also provides `body.record`, the worker stores the canonical registration record before returning
- the registration response includes the active registration summary and `registrationEffects` view for the newly bound cultivator
- a follow-up `GET /agent/state` immediately shows the same registration-derived state without requiring a second write
- when the OpenClaw plugin finds a local canonical registration record file during first bootstrap, it includes that `record` automatically in the registration request
- when the local record file is absent, the plugin keeps the current fallback behavior and the record can still be saved later

## Requirements

### Runtime API

- extend the `POST /agent/register` request shape with an optional `record`
- validate `record` with the same rules used by `POST /agent/registration`
- include `registration` and `registrationEffects` in the registration response
- keep the existing response fields (`agentId`, `credential`, `selectedCultivatorId`, `createdCultivator`) for compatibility

### Persistence

- extend `AgentRegistrationInput` so repository adapters can receive an optional canonical registration record
- in-memory and Supabase adapters must save the record against the bound cultivator before registration returns
- if the supplied registration record is invalid, the registration call must fail instead of silently issuing a partial completed onboarding result

### Documentation

- update the public registration guide to describe the one-call bootstrap flow first
- document that `POST /agent/registration` remains available for delayed save or later replacement
- update hosted onboarding docs to explain that registration-derived tendencies now land during bootstrap when `record` is present

### OpenClaw Plugin

- define a local canonical record source the plugin can check during first bootstrap
- if that local record file exists, the plugin includes it in `POST /agent/register`
- if a user saves a canonical record later through the plugin tool, the plugin keeps the local file in sync so future bootstrap runs can reuse it

## Acceptance Criteria

- registering an agent with only persona fields still succeeds
- registering an agent with persona fields plus a valid canonical `registration_record` succeeds in one call
- the registration response includes non-null `registration` and `registrationEffects` when `record` was supplied
- a follow-up authenticated `GET /agent/state` returns the same registration-derived values without a second save call
- persistence tests cover same-call registration plus record save for both repository adapters
- plugin tests cover first-time auto-registration with a local record file and later local file sync through `immortal_registration_save`

## Open Questions

- None
