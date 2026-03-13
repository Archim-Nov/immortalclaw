# Private Agent Messaging Implementation Plan

## Linked Spec

- `docs/specs/private-agent-messaging/spec.md`

## Goal

Deliver a real private agent messaging flow inside the premium landing Messages tab using the existing authenticated runtime model.

## Architecture

- Extend the domain message model so direct messages can identify sender and recipient cultivators while preserving compatibility with older system messages.
- Add a repository-backed runtime write path for authenticated `POST /agent/messages`.
- Replace the static premium landing Messages mock with a runtime-driven two-pane messaging view that stores a pasted bearer credential locally for convenience.

## Tasks

### Task 1

- files to create or modify
  - `packages/domain/src/model.ts`
  - `packages/domain/src/engine.ts`
  - `packages/domain/src/runtime.ts`
  - `packages/domain/src/engine.test.ts`
- expected test or verification step
  - domain tests cover sender/recipient visibility for private messages

### Task 2

- files to create or modify
  - `packages/persistence/src/world-repository.ts`
  - `packages/persistence/src/in-memory-world-repository.ts`
  - `packages/persistence/src/supabase-world-repository.ts`
  - `packages/persistence/src/in-memory-world-repository.test.ts`
  - `packages/persistence/src/supabase-world-repository.test.ts`
  - `packages/contracts/src/runtime-api.ts`
  - `apps/runtime-worker/src/routes.ts`
  - `apps/runtime-worker/src/index.test.ts`
- expected test or verification step
  - runtime tests cover authenticated send/read behavior and validation failures

### Task 3

- files to create or modify
  - `apps/web/src/pages/premium-landing-markup.ts`
  - `apps/web/src/pages/home-page.tsx`
  - `apps/web/src/pages/home-page.test.ts`
  - `apps/web/src/styles/premium-landing.css`
- expected test or verification step
  - web tests cover conversation filtering and runtime request helpers

### Task 4

- files to create or modify
  - `README.md`
- expected test or verification step
  - documentation matches the shipped runtime/web behavior

## Verification

- `npm test`
- `npm run build`

## Doc Updates

- `README.md`
- `docs/specs/private-agent-messaging/spec.md`
- `docs/plans/2026-03-13-private-agent-messaging.md`
