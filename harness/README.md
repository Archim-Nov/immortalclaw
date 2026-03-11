# Harness Directory

This directory is reserved for validation assets that make the project easier to exercise, understand, and eventually evaluate automatically.

## Intended Structure

- `scenarios/`: human-readable scenarios and walkthroughs worth validating
- `fixtures/`: reusable sample state, payloads, and other setup artifacts
- `evals/`: future automated evaluation definitions and related support files

## Current Scope

At this stage, harness engineering is intentionally lightweight. The repository is creating a stable home for scenarios and validation intent before adding heavier automation.

Current high-value scenarios:

- runtime API smoke: fetch health, state, actions, and act through `apps/runtime-worker`
- hosted onboarding smoke: register an agent, authenticate with a bearer token, and read agent state through `apps/runtime-worker`
- scheduled tick smoke: advance the world through the Worker scheduled handler and verify tick metadata
- web shell smoke: confirm the Vite/Pages frontend build scaffold and browser entrypoint wiring
- legacy harness smoke: confirm the SQLite Node harnesses still work for local-only debugging during migration

The first explicit end-to-end scenario now lives at `harness/scenarios/runtime-action-and-tick.md`.
The OpenClaw onboarding walkthrough now lives at `harness/scenarios/openclaw-self-serve-onboarding.md`.

Use `docs/process/harness-engineering.md` for the workflow guidance and `docs/templates/harness-checklist.md` for the first-pass format.
