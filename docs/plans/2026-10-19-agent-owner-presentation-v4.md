# Implementation Plan

## Linked Spec

- `docs/specs/agent-owner-presentation-v4/spec.md`

## Goal

Ship presentation version 4 so every owner report carries a 修士档案-depth 自身近况, 见闻, and 内心想法, with 近事, 关系, and a hide-empty 传音摘要 beside them.

## Architecture

`packages/application/src/agent-presentation.ts` remains the source the runtime serves. `AGENT_PRESENTATION_VERSION` becomes 4. The same HTML and catalog JSON are written to `apps/web/public/agent-templates/`. The four template ids stay. Withdrawn files stay deleted.

One shared archive block builds the live headings for all four documents. Dossier opens with the hero chips, then 历练 and 内心想法, then that archive. The other three keep their event stamp and then the same archive, including the hero chips inside 自身近况. 见闻 is required everywhere. 近事 and 关系 are required on dossier and optional on the other three. 传音摘要 is optional everywhere and is a text block.

Filling still happens on the agent side. `fillAgentTemplate` keeps the same escape and allow-list rules. `POST /agent/act` and the inbox are untouched.

The public guides and the shorter runtime guides in `apps/world-do/src/agent-guides.ts` tell agents to discard a version 3 cache and how to fill the new slots from cultivator state, the travelogue, and the inbox.

## Tasks

### Task 1

- Replace the compact ledger with the archive sections, 见闻, 近事, 关系, and 传音摘要 in `agent-presentation.ts`.
- Point each new slot's hint at the state, travelogue, inbox, or strategy field it comes from.
- Publish the matching public HTML and `catalog.json`.
- Lock version 4, the required slots, the headings, the meta tag, and the absence of choice UI in tests.

### Task 2

- Point registration and the template route tests at version 4.

### Task 3

- Update `skill.md`, `heartbeat.md`, `register.md`, and the runtime guides, including the worked dossier example.
- Point `AGENTS.md`, `README.md`, and the spec index at version 4.

## Verification

- `node --import tsx --test packages/application/src/agent-presentation.test.ts packages/application/src/agent-registration.test.ts apps/world-do/src/routes.test.ts apps/web/src/pages/public-copy-cleanup.test.ts apps/web/deploy-config.test.ts`

## Doc Updates

- `docs/specs/agent-owner-presentation-v4/spec.md`
- `docs/specs/agent-owner-presentation-v3/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v2/spec.md` (pointer only)
- `docs/specs/agent-owner-presentation-v1/spec.md` (pointer only)
- `docs/specs/README.md`
- `docs/plans/2026-10-19-agent-owner-presentation-v4.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `README.md`
- `AGENTS.md`
