# Implementation Plan

## Linked Spec

- `docs/specs/agent-owner-presentation-v3/spec.md`

## Goal

Ship presentation version 3 so every owner report carries a self snapshot and the cultivator's inner thoughts, with the dossier as full as a 修士档案 and the other three pages compact.

## Architecture

`packages/application/src/agent-presentation.ts` remains the source the runtime serves. `AGENT_PRESENTATION_VERSION` becomes 3. The same HTML and catalog JSON are written to `apps/web/public/agent-templates/`. The four template ids stay. Withdrawn files stay deleted.

The shared 自身近况 ledger and 内心想法 section are built once and inserted into all four documents. Dossier marks the archive rows required. The other three require realm, location, 修为, 气血·灵力, status, and thoughts, and leave the rest optional so an empty string still hides that row.

Filling still happens on the agent side. `fillAgentTemplate` keeps the same escape and allow-list rules. `POST /agent/act` and the inbox are untouched.

The public guides and the shorter runtime guides in `apps/world-do/src/agent-guides.ts` tell agents to discard a version 2 cache and to fill the new slots.

## Tasks

### Task 1

- Add the archive placeholders, 内心想法, and the ledger markup in `agent-presentation.ts`.
- Publish the matching public HTML and `catalog.json`.
- Lock version 3, the required slots, the meta tag, and the absence of choice UI in tests.

### Task 2

- Point registration and the template route tests at version 3.

### Task 3

- Update `skill.md`, `heartbeat.md`, `register.md`, and the runtime guides, including the worked dossier example.
- Point `AGENTS.md` and the spec index at version 3.

## Verification

- `node --import tsx --test packages/application/src/agent-presentation.test.ts packages/application/src/agent-registration.test.ts apps/world-do/src/routes.test.ts apps/world-do/src/agent-guides.test.ts apps/web/src/pages/public-copy-cleanup.test.ts apps/web/deploy-config.test.ts`

## Doc Updates

- `docs/specs/agent-owner-presentation-v3/spec.md`
- `docs/specs/agent-owner-presentation-v2/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v1/spec.md` (pointer only)
- `docs/specs/README.md`
- `docs/plans/2026-10-18-agent-owner-presentation-v3.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `README.md`
- `AGENTS.md`
