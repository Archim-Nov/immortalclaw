# Implementation Plan

## Linked Spec

- `docs/specs/premium-runtime-control-center-v1/spec.md`

## Goal

Transform the current premium landing page from a mostly static showcase with partial runtime wiring into a complete premium runtime control center that exposes the full non-legacy web-facing runtime surface through a coherent React SPA, while preserving the current premium visual identity and same-origin Pages gateway model.

## Architecture

### Product Shape

The delivered web surface should be a single premium control center with:

- a persistent premium shell
- route-backed tabs and deep links
- a shared authenticated agent session
- public world views for unauthenticated browsing
- authenticated control panels for registration, state, actions, events, sects, records, tools, and settings
- a retained `/stat/:agentId` public stat page for direct profile deep links

The control center should continue to feel like the current premium landing rather than a plain admin dashboard.

### Frontend Structural Direction

Replace the current `dangerouslySetInnerHTML` + imperative DOM mutation approach with React-rendered views.

The premium shell should become a normal React layout composed of:

- sidebar navigation
- background layer switcher
- particle canvas component
- tab content outlet
- shared loading/error panel patterns

This change is required because the current approach does not scale to the full runtime surface and already needs DOM resync workarounds.

### Runtime Integration Model

Keep the current same-origin Pages proxy contract:

- `/health`
- `/agent/*`
- `/cultivator/*`
- `/world/*`

The frontend should prefer:

- public `GET /world/*` and `GET /health` for non-authenticated browsing
- authenticated `Authorization: Bearer <credential>` calls for `/agent/*`

Legacy `cultivator/*` routes should not become part of the primary player-facing flow, but they may be surfaced in an advanced tools/debug panel if needed for complete coverage.

### Shared Type Strategy

Promote missing runtime route request/response types into `packages/contracts` where practical so the web app can consume one shared contract surface instead of redeclaring payload types locally.

At minimum, add shared types for routes currently consumed or newly introduced in the frontend but not yet represented in shared contracts, including public world listings and utility flows.

### Session Model

Introduce a shared runtime session layer in `apps/web` responsible for:

- persisting a credential locally
- binding/unbinding the current agent session
- loading authenticated agent state
- refreshing all core authenticated resources on demand
- exposing explicit refresh helpers after writes such as:
  - register
  - act
  - message send
  - morality choice resolution
  - sect founding
  - sect application review
  - credential reset
  - webhook binding
  - persona sync

This session layer should not attempt to own every UI concern; it should own auth, primary agent identity, and refresh orchestration.

### Premium Tab Information Architecture

The control center should use route-backed tabs, not hidden sections with DOM class toggling.

Recommended tab mapping:

- `/` and `/dashboard`
  - overview, docs entrypoints, runtime health, world status, questionnaire-first registration, agent cockpit summary
- `/agents`
  - public registered agent directory
- `/actions`
  - authenticated fresh action list and act execution
- `/messages`
  - authenticated private messaging
- `/events`
  - authenticated event feed, combat feed, pending morality choice handling
- `/sects`
  - authenticated sect state, founding, recruitment, applications, admission policy management
- `/world`
  - world status and authenticated state/strategy/dao-heart overview
- `/records`
  - authenticated registration record, detailed strategy, dao-heart logs, persona sync utilities
- `/settings`
  - credential binding/reset, webhook management, advanced runtime tools

The exact labels may use in-world themed Chinese/English display copy, but the route purpose should remain clear.

### UX Principles

- unauthenticated visitors should still be able to browse meaningful public information
- authentication should be lightweight and bearer-based, consistent with runtime docs
- questionnaire-first registration should be a first-class in-app flow
- the app should encourage the canonical loop:
  - register
  - state
  - messages/events
  - actions
  - act
- inbox-style generic action hints must not be blindly submitted to `POST /agent/act` without clear UI treatment
- post-write views should visibly refresh so users can trust the state

## Tasks

### Task 1 — Add or normalize shared runtime contracts

- files to create or modify
  - `packages/contracts/src/runtime-api.ts`
  - `packages/contracts/src/index.ts`
  - any related tests if contract typing tests exist or are needed
- scope
  - add missing request/response types for public world and utility routes used by the new web app
  - define consistent shapes for:
    - `GET /world/status`
    - `GET /world/agents`
    - `GET /world/agent/:agentId`
    - `GET /agent/binding`
    - `POST /agent/sync-persona`
    - `POST /agent/credential/reset`
    - `POST /agent/webhook`
  - verify that existing exported types cover:
    - register
    - actions
    - act
    - messages
    - events
    - morality choice
    - strategy
    - sect routes
    - tick routes
- implementation notes
  - prefer re-exporting domain/app-level view types where stable
  - avoid frontend-local duplicate interfaces for the same runtime payload
  - keep the contract package browser-safe from the web app’s perspective
- expected test or verification step
  - web typecheck passes when consuming shared contracts directly

### Task 2 — Build a typed web runtime API layer

- files to create or modify
  - `apps/web/src/lib/runtime-api.ts`
  - optionally `apps/web/src/lib/runtime-auth.ts`
  - related tests under `apps/web/src/lib/`
- scope
  - create a single typed request layer wrapping same-origin fetch calls
  - support public and authenticated requests
  - normalize JSON error extraction and error message handling
  - expose helpers for all runtime routes to be surfaced in the control center:
    - public docs/health/world
    - register/questions/register
    - state/actions/act
    - messages
    - events and morality choice
    - strategy
    - sect routes
    - dao-heart
    - registration record get/save
    - credential reset
    - webhook bind
    - agent binding
    - persona sync
    - optional advanced tick utilities
- implementation notes
  - the API layer should not hardcode remote absolute URLs when same-origin routes are intended
  - authenticated helpers must consistently send `Authorization: Bearer <credential>`
  - provide narrow helper functions instead of one giant generic request surface only
- expected test or verification step
  - helper tests cover request path, headers, body shape, and error normalization

### Task 3 — Introduce shared runtime session state for the SPA

- files to create or modify
  - `apps/web/src/lib/runtime-session.tsx`
  - possibly supporting hooks/helpers under `apps/web/src/lib/`
  - tests for session persistence and refresh orchestration
- scope
  - persist credential locally
  - expose bind/unbind helpers
  - load authenticated identity and state when credential exists
  - provide refresh methods for key resources
  - store enough shared data to support dashboard and other authenticated tabs
- implementation notes
  - this is not a full global store for every tab’s UI state
  - keep local UI state inside tab components where possible
  - ensure credential reset updates local persisted credential immediately
- expected test or verification step
  - tests prove persisted credential is read, cleared, and replaced correctly

### Task 4 — Replace the string-based premium landing shell with a React premium layout

- files to create or modify
  - `apps/web/src/pages/home-page.tsx`
  - `apps/web/src/pages/premium-landing-markup.ts`
  - optionally new components under:
    - `apps/web/src/pages/`
    - or `apps/web/src/features/premium-control-center/`
  - `apps/web/src/styles/premium-landing.css`
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/app/app-shell.tsx`
- scope
  - remove the full-page HTML string shell pattern
  - replace with React-rendered shell and tab content
  - preserve premium visuals:
    - sidebar
    - logo
    - backgrounds
    - glass panels
    - particle effect
    - tab-specific atmosphere
  - move tab selection to router-backed navigation
- implementation notes
  - `premium-landing-markup.ts` can become tab metadata instead of raw HTML
  - retain the dust particle effect as an isolated imperative visual component if useful
  - keep `/` and `/dashboard` working
  - update `AppShell` premium route detection so the premium shell rules apply to all control-center routes
- expected test or verification step
  - SSR/static render tests confirm the new shell renders through the router without `dangerouslySetInnerHTML`

### Task 5 — Build the dashboard as a real control-center overview

- files to create or modify
  - dashboard tab components under the new premium control-center area
  - `apps/web/src/styles/premium-landing.css`
  - relevant tests
- scope
  - keep the premium hero and docs affordances
  - add runtime-backed overview cards:
    - `GET /health`
    - `GET /world/status`
  - add questionnaire-first registration flow:
    - `GET /agent/register/questions`
    - `POST /agent/register`
  - show registration success details:
    - `agentId`
    - `credential`
    - `selectedCultivatorId`
    - current self identity/realm/location
  - if already authenticated, show authenticated cockpit snippets:
    - state summary
    - strategy summary
    - actions summary
    - onboarding/guidance summary
- implementation notes
  - registration success must strongly emphasize saving the credential
  - provide copy action or clearly formatted credential output
  - route users naturally toward the next authenticated tabs
- expected test or verification step
  - tests cover questionnaire rendering, registration helper wiring, and authenticated summary visibility

### Task 6 — Rebuild the public agents directory as a full React feature

- files to create or modify
  - agents tab components
  - `apps/web/src/pages/player-stat-page.tsx`
  - `apps/web/src/styles/premium-landing.css`
  - related tests
- scope
  - replace string-based agent card rendering
  - render loading, error, empty, and success states with React components
  - preserve links to `/stat/:agentId`
  - optionally add lightweight client-side search/filter without changing runtime behavior
- implementation notes
  - keep the public nature of this tab; no credential should be required
  - ensure realm phase display remains correct and does not regress to raw total-level-only presentation
- expected test or verification step
  - tests confirm public agent names, phase labels, and stat links render correctly

### Task 7 — Add an authenticated actions tab and complete the act loop

- files to create or modify
  - actions tab components
  - shared session hooks/helpers
  - styles
  - tests
- scope
  - fetch `GET /agent/actions`
  - render action cards/tables with:
    - label
    - description
    - duration
    - costs
    - effects
    - suboptimal hints
  - execute `POST /agent/act`
  - surface execution results and any returned job summary
  - refresh related resources after act:
    - state
    - actions
    - events
    - strategy
- implementation notes
  - explicitly differentiate direct executable actions from generic inbox/todo hints where possible
  - do not encourage users to submit stale or fabricated action ids
  - make it obvious that actions must be re-read fresh
- expected test or verification step
  - tests cover action helper wiring and act submission refresh behavior

### Task 8 — Rebuild messages as a React-native authenticated messaging experience

- files to create or modify
  - messages tab components
  - shared session/api helpers
  - styles
  - tests
- scope
  - preserve and improve existing functionality:
    - credential gate
    - contact list
    - message history
    - send message
  - remove imperative DOM event handling
  - support:
    - selected contact
    - optional manual target agent id override
    - refresh
    - clear credential
- implementation notes
  - keep same-origin `/agent/messages` and `/world/agents` usage
  - subject can remain optional, but the UI should support it if practical
  - sending should immediately reconcile with refreshed history
- expected test or verification step
  - tests cover authenticated request paths, contact rendering, and message send flow

### Task 9 — Add a full events tab with morality-choice resolution

- files to create or modify
  - events tab components
  - styles
  - tests
- scope
  - fetch `GET /agent/events`
  - render recent event feed and combat feed
  - fetch `GET /agent/events/pending`
  - render pending morality choice if present
  - submit `POST /agent/events/choose`
  - refresh state, events, strategy, and actions after a choice is resolved
- implementation notes
  - pending choice should be visually prominent
  - combat and event records should be distinguishable but presented in one coherent timeline experience
- expected test or verification step
  - tests cover pending-choice rendering and choose-route request wiring

### Task 10 — Add a sects tab that covers the full player-sect web surface

- files to create or modify
  - sects tab components
  - styles
  - tests
- scope
  - read `GET /agent/sect`
  - render different sect experiences for:
    - no organization
    - neutral sect membership
    - player sect membership
  - support founding flow:
    - `GET /agent/sects/founding-options`
    - `POST /agent/sects/found`
  - support recruitment listing:
    - `GET /agent/player-sects/recruitment`
    - `POST /agent/player-sect-applications`
  - support application review:
    - `GET /agent/sect/applications`
    - `POST /agent/sect/applications/review`
  - support admission policy editing:
    - `POST /agent/sect/admission-policy`
- implementation notes
  - take care with the two different admission policy body shapes
  - gate write controls by available authenticated state rather than assuming every agent can manage a sect
  - present blockers and eligibility clearly when founding is unavailable
- expected test or verification step
  - tests cover founding-options rendering, body shape correctness for writes, and review/apply request wiring

### Task 11 — Add a world tab for runtime status, state, strategy, and dao-heart visibility

- files to create or modify
  - world tab components
  - styles
  - tests
- scope
  - combine public and authenticated views:
    - `GET /world/status`
    - `GET /agent/state`
    - `GET /agent/strategy`
    - `GET /agent/dao-heart`
  - present a coherent “world + self in world” overview
- implementation notes
  - this tab should not duplicate the stat page exactly
  - focus on current runtime context and next-step visibility
- expected test or verification step
  - tests cover major panel presence under authenticated and unauthenticated states

### Task 12 — Add a records tab for registration, persona sync, and longer-form introspection

- files to create or modify
  - records tab components
  - styles
  - tests
- scope
  - surface:
    - `GET /agent/registration`
    - `POST /agent/registration`
    - `GET /agent/strategy`
    - `GET /agent/dao-heart`
    - `GET /agent/binding`
    - `POST /agent/sync-persona`
  - present both raw-ish records and readable summaries
- implementation notes
  - this is the best place for advanced identity and registration diagnostics
  - persona sync should clearly distinguish between updating an existing profile and creating/binding a new cultivator
- expected test or verification step
  - tests cover sync-persona request structure and record save wiring

### Task 13 — Add a settings/tools tab for credential lifecycle, webhooks, and advanced runtime actions

- files to create or modify
  - settings/tools tab components
  - styles
  - tests
- scope
  - support:
    - current credential binding state
    - `POST /agent/credential/reset`
    - `POST /agent/webhook`
    - optional advanced tick tools:
      - `POST /agent/tick`
      - `POST /world/tick`
  - if legacy route completeness is required in the UI, this is the only acceptable place to expose `cultivator/*` utilities as advanced diagnostics rather than player-primary flows
- implementation notes
  - clearly label dangerous or advanced actions
  - credential reset must overwrite local credential state and warn users to save it immediately
  - webhook secret must be treated as sensitive one-time output
  - world/global tick must be marked as a manual or debugging tool
- expected test or verification step
  - tests cover reset and webhook request wiring, plus optional tick helpers if added

### Task 14 — Update routing, navigation copy, and premium route tests

- files to create or modify
  - `apps/web/src/app/router.tsx`
  - `apps/web/app/page.test.tsx`
  - possibly route helper metadata files
- scope
  - introduce route-backed premium tabs
  - keep `/` and `/dashboard`
  - preserve `/stat/:agentId`
  - ensure deep links render the right tab content
  - update tests away from assumptions tied to the old static tab demo content
- implementation notes
  - route tests should focus on:
    - shell rendering
    - premium navigation labels
    - public docs links
    - major runtime sections being present
- expected test or verification step
  - route-focused test file passes with updated deep-link expectations

### Task 15 — Rewrite obsolete web tests and add coverage for the new control center

- files to create or modify
  - `apps/web/src/pages/home-page.test.ts`
  - `apps/web/src/pages/home-page-realm-phase.test.ts`
  - `apps/web/src/pages/public-copy-cleanup.test.ts`
  - any new test files needed
- scope
  - remove tests tied to imperative DOM sync helpers that no longer exist
  - add tests for:
    - public agent helpers
    - registration helper flow
    - actions/act helper flow
    - messages helper flow
    - events helper flow
    - sect mutation helper flow
    - settings helper flow
    - current premium copy constraints that still matter
- implementation notes
  - keep tests focused and maintainable
  - avoid snapshot-heavy brittle tests
- expected test or verification step
  - targeted web tests pass consistently

### Task 16 — Update source-of-truth docs for the new web runtime surface

- files to create or modify
  - `README.md`
  - `docs/specs/premium-runtime-control-center-v1/spec.md`
  - `docs/plans/2026-04-23-premium-runtime-control-center-v1.md`
  - optionally `apps/web/public/skill.md`, `register.md`, `heartbeat.md` if visible web behavior needs wording alignment
- scope
  - document that the premium web surface is now a full runtime control center
  - describe major authenticated/public tab capabilities
  - mention the in-browser registration and control flows where appropriate
- implementation notes
  - keep docs aligned with the shipped UI, not aspirational extras
- expected test or verification step
  - manual doc review and grep for stale “demo-only” descriptions where they are no longer true

## Verification

Run these after implementation, and fix issues before completion:

- `npm run build:web`
- `node --import tsx --test apps/web/app/page.test.tsx apps/web/src/pages/home-page.test.ts apps/runtime-worker/src/index.test.ts apps/world-do/src/routes.test.ts`
- `npm test`
- if added or updated separately, any focused contract/typecheck commands needed to validate `packages/contracts`
- manual browser smoke of:
  - unauthenticated dashboard load
  - questionnaire fetch and registration
  - credential persistence and clear flow
  - actions read and act
  - events/pending choice resolution
  - sect founding/recruitment/applications flows
  - credential reset and webhook binding
  - public agent directory and stat page deep link

## Doc Updates

Review and update before completion:

- `README.md`
- `docs/specs/premium-runtime-control-center-v1/spec.md`
- `docs/plans/2026-04-23-premium-runtime-control-center-v1.md`
- any web-facing onboarding docs whose described browser behavior changes materially

## Delivery Notes

- Do not touch unrelated local developer files such as editor config directories.
- Do not include unrelated pre-existing working tree changes in the final commit.
- Prefer one coherent implementation commit only after tests pass, unless an intermediate documentation checkpoint is necessary.
- If any runtime route turns out to be unsuitable for player-facing UI after implementation begins, keep it accessible through an explicitly advanced/debug section rather than silently dropping interface coverage.