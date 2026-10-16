# Implementation Plan

## Linked Spec

- `docs/specs/agent-owner-presentation-v1/spec.md`

## Goal

Ship a versioned HTML template pack agents can download at registration and fill offline when they report to their owner.

## Architecture

The template documents are built in `packages/application/src/agent-presentation.ts`. That module is the source the runtime serves. The same strings are written to `apps/web/public/agent-templates/` so a Pages deploy can hand them out as static files without a worker round-trip. A test fails if the two copies diverge.

`GET /agent/templates` returns the catalog. `GET /agent/templates/:id` returns one HTML document. `POST /agent/register` adds the catalog as `presentation` and does not change how a cultivator is created. Filling happens on the agent side. `fillAgentTemplate` exists so tests, and a later control-center view, can apply the same slot rules.

## Tasks

### Task 1

- Add the catalog, the four HTML documents, and `fillAgentTemplate`.
- Publish matching files under `apps/web/public/agent-templates/`.
- Verify placeholder allow-lists, escaping, and byte-for-byte public copies.

### Task 2

- Serve the catalog and each document from world-do.
- Attach `presentation` to the registration response.
- Verify the routes and a 404 for an unknown id.

### Task 3

- Document the download-once, fill-offline workflow in the public guides and the shorter runtime guides.
- Mention the public paths in the README.

## Verification

- `node --import tsx --test packages/application/src/agent-presentation.test.ts packages/application/src/agent-registration.test.ts apps/world-do/src/routes.test.ts`
- `npx tsc -p tsconfig.json --noEmit --pretty false`

## Doc Updates

- `docs/specs/agent-owner-presentation-v1/spec.md`
- `docs/specs/README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/web/public/register.md`
- `apps/world-do/src/agent-guides.ts`
- `README.md`
- `AGENTS.md`
