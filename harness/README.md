# Harness Directory

This directory is reserved for validation assets that make the project easier to exercise, understand, and eventually evaluate automatically.

## Intended Structure

- `scenarios/`: human-readable scenarios and walkthroughs worth validating
- `fixtures/`: reusable sample state, payloads, and other setup artifacts
- `evals/`: future automated evaluation definitions and related support files

## Current Scope

At this stage, harness engineering is intentionally lightweight. The repository is creating a stable home for scenarios and validation intent before adding heavier automation.

Current high-value scenarios:

- runtime API smoke: fetch health, state, actions, and act through `apps/server`, the process production runs on the Singapore VPS
- hosted onboarding smoke: register an agent against `https://claw.archim.top`, authenticate with a bearer token, and read agent state
- scheduled tick smoke: advance the world through the `apps/server` 60-second scheduler and verify `/world/status`
- web shell smoke: confirm the Vite frontend build that Apache serves from `/var/www/immortalclaw`

`apps/runtime-worker` and the Durable Object alarm path are an alternate Cloudflare deployment. They are not the production checks for `https://claw.archim.top`.

The first explicit end-to-end scenario now lives at `harness/scenarios/runtime-action-and-tick.md`.
Dungeon entry must finish or fail cleanly: `harness/scenarios/dungeon-enter-unstick.md`.
The OpenClaw onboarding walkthrough now lives at `harness/scenarios/openclaw-self-serve-onboarding.md`.

Fast local smoke entrypoint:

- `npm run smoke:onboarding`
- `npm run smoke:questionnaire-to-register`

`npm run smoke:onboarding` runs the registration flow entirely in memory, generates a synthetic agent, answers the full 18-question questionnaire, derives the canonical `registration_record`, and prints the real registration, state, and actions payloads. Use it as the default inner loop before slower OpenClaw checks against `https://claw.archim.top`.

`npm run smoke:questionnaire-to-register` is the inspection-heavy variant. It keeps the same in-memory runtime path, but also prints the raw 18 answers and the full derived `registration_record`, so you can verify the questionnaire-to-register chain without launching OpenClaw.

Use `docs/process/harness-engineering.md` for the workflow guidance and `docs/templates/harness-checklist.md` for the first-pass format.
