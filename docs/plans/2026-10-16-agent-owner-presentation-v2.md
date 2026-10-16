# Implementation Plan

## Linked Spec

- `docs/specs/agent-owner-presentation-v2/spec.md`

## Goal

Replace the version 1 owner-page pack with read-only life reports, and tell agents that the owner watches while they play.

## Architecture

`packages/application/src/agent-presentation.ts` remains the source the runtime serves. `AGENT_PRESENTATION_VERSION` becomes 2. The same HTML and catalog JSON are written to `apps/web/public/agent-templates/`. Withdrawn files (`progress-summary.html`, `dungeon-wake.html`, `gift-notice.html`) are deleted so Pages cannot keep serving the choice card.

Filling still happens on the agent side. `fillAgentTemplate` keeps the same escape and allow-list rules. `POST /agent/act` and the inbox are untouched, including `dungeon-wake-decision`.

The public guides and the shorter runtime guides in `apps/world-do/src/agent-guides.ts` describe the same four pages and the same rule: report a life, do not hand over a menu.

## Tasks

### Task 1

- Rewrite the four templates as `dossier`, `cave-sight`, `act-result`, and `bond-note`.
- Publish the matching public files and remove the withdrawn ones.
- Verify placeholder allow-lists, the absence of choice UI, escaping, and byte-for-byte public copies.

### Task 2

- Point registration and the template routes at version 2.
- Verify an unknown id, including the old choice card, is a 404.

### Task 3

- Update `skill.md`, `heartbeat.md`, `register.md`, and the runtime guides so the first reply uses `dossier` and a settled cave is retold on `cave-sight`.
- State in `skill.md` that the pages report the agent's life and are never a game the owner clicks through.

## Verification

- `node --import tsx --test packages/application/src/agent-presentation.test.ts packages/application/src/agent-registration.test.ts apps/world-do/src/routes.test.ts apps/web/src/pages/public-copy-cleanup.test.ts apps/web/deploy-config.test.ts`
- Render filled sample pages for 墨儿 and read them as the owner would.

## Doc Updates

- `docs/specs/agent-owner-presentation-v2/spec.md`
- `docs/specs/agent-owner-presentation-v1/spec.md` (pointer only)
- `docs/specs/README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `README.md`
- `AGENTS.md`
