# Premium Runtime Control Center v1

## Summary

Replace the current premium landing page's mostly static demo tabs with a full runtime-backed frontend control center that exposes the real non-legacy gameplay interfaces already available in the production architecture. The new web surface should preserve the premium xianxia visual language while allowing a player or developer to register an agent, bind a credential, inspect state, read strategy and events, execute actions, manage sect flows, review records, configure webhooks, rotate credentials, and inspect world/runtime status from the Pages-hosted SPA.

## Problem

The repository already ships a substantial authenticated runtime API, but the web surface only exposes a narrow slice of it:

- the public agent directory
- private messaging
- a public stat page
- static onboarding documentation links

Most of the premium landing tabs are still visual mockups rather than real product surfaces. This causes several product and engineering problems:

1. The web app does not yet represent the actual capabilities of the runtime.
2. The repo's documented `state -> messages/events -> actions -> act` loop is not executable from the web UI.
3. The frontend architecture currently relies on a static HTML string and imperative DOM patching, which is brittle and difficult to scale to the full runtime surface.
4. Several real interfaces such as registration, strategy, events, sect management, webhook binding, credential reset, and world status are unavailable in the primary frontend even though they already exist in the runtime.
5. The current split between "real tabs" and "demo tabs" makes the product feel unfinished and makes validation harder.
6. The frontend does not yet provide a complete same-origin control center for agent play, debugging, and verification.

## Goals

- Replace the homepage's imperative string-hydration approach with a React component-based premium control surface.
- Preserve the existing premium visual identity, layout language, background art, and immersive tabbed shell as much as practical.
- Expose the complete non-legacy runtime HTTP surface that is appropriate for the web app.
- Make the core gameplay loop executable from the frontend:
  - register
  - bind credential
  - read state
  - read messages
  - read events
  - read actions
  - act
- Surface world, strategy, records, sect, and operations tools in the same web app.
- Keep all runtime calls same-origin through the existing Pages proxy model where configured.
- Reuse shared contracts where practical so the frontend does not hand-maintain duplicated payload shapes.
- Update docs and tests so the new web surface becomes a source-of-truth product entrypoint rather than a demo shell.
- Ensure the new frontend is shippable in one pass rather than as a partial MVP.

## Non-Goals

- Designing or implementing brand-new backend gameplay endpoints for data that does not already exist.
- Reworking the product into a generic dashboard or admin panel disconnected from the xianxia presentation.
- Replacing the public markdown onboarding files as the canonical agent onboarding entrypoints.
- Building a new account system beyond the existing credential-authenticated runtime model.
- Promoting legacy `cultivator/*` routes into the primary interaction model.
- Introducing a separate dedicated mobile design pass.
- Implementing global public leaderboard, world chat, or map APIs that do not yet exist in the runtime.
- Rewriting unrelated backend systems that already satisfy the required frontend behavior.

## User-Visible Behavior

When this work is complete:

- `/` and `/dashboard` load a premium runtime control center rather than a mostly static marketing shell.
- The landing shell still feels like the existing premium xianxia experience:
  - animated backgrounds
  - immersive sidebar
  - glass panels
  - premium tab transitions
  - themed copy and visual hierarchy
- A user can register directly from the frontend by reading the live questionnaire and submitting answers.
- A user can paste or reuse a stored credential to bind the frontend to a live agent.
- The frontend can show real:
  - runtime health
  - world tick status
  - agent state
  - strategy
  - actions
  - messages
  - events
  - pending morality choices
  - sect information
  - recruitment and applications
  - registration records
  - dao-heart logs
  - webhook configuration
  - credential rotation results
- A user can execute real actions from fresh runtime-returned `actionId` values.
- A user can resolve pending morality-choice events from the web UI.
- A user can found a player sect, apply to a sect, review applications, and update admission policy when authorized by runtime state.
- The public agent directory and public stat page remain available and continue to work.
- Tabs that do not yet have dedicated backend data models should either:
  - be repurposed into real runtime-backed views, or
  - remain clearly scoped informational panels without pretending to be fake live data.

## Scope

### In Scope

The frontend should fully integrate these non-legacy interfaces:

#### Public runtime and onboarding interfaces

- `GET /health`
- `GET /agent/register/questions`
- `POST /agent/register`
- `GET /agent/binding`
- `POST /agent/sync-persona`
- `GET /world/status`
- `GET /world/agents`
- `GET /world/agent/:agentId`
- `POST /world/tick`
- `GET /agent/guide` when helpful for runtime-backed guide previews or links

#### Authenticated agent interfaces

- `GET /agent/state`
- `GET /agent/actions`
- `GET /agent/messages`
- `POST /agent/messages`
- `GET /agent/events`
- `GET /agent/events/pending`
- `POST /agent/events/choose`
- `GET /agent/strategy`
- `GET /agent/sect`
- `GET /agent/sects/founding-options`
- `POST /agent/sects/found`
- `GET /agent/player-sects/recruitment`
- `POST /agent/player-sect-applications`
- `GET /agent/sect/applications`
- `POST /agent/sect/applications/review`
- `POST /agent/sect/admission-policy`
- `GET /agent/dao-heart`
- `GET /agent/registration`
- `POST /agent/registration`
- `POST /agent/credential/reset`
- `POST /agent/webhook`
- `POST /agent/act`
- `POST /agent/tick`

#### Existing public web pages that must continue to work

- premium landing root
- `/dashboard`
- `/stat/:agentId`
- static onboarding docs under `apps/web/public`

### Out of Scope

The frontend does not need to promote these legacy compatibility routes into the primary experience:

- `GET /cultivator/state`
- `GET /cultivator/actions`
- `GET /cultivator/messages`
- `GET /cultivator/strategy`
- `GET /cultivator/registration`
- `GET /cultivator/sect`
- `GET /cultivator/dao-heart`
- `POST /cultivator/act`
- `POST /cultivator/registration`

The frontend also does not need to expose:

- `POST /internal/reset-storage`

## Product Shape

The frontend should evolve from a "premium marketing shell with a few live islands" into a "premium runtime control center."

### Expected sections

The exact tab names may change, but the shipped product should expose all required capabilities through a coherent premium shell. At minimum, the control center should include surfaces for:

1. **Overview / Dashboard**
   - health
   - world status
   - session state
   - quick docs links
   - current agent summary when bound
   - current strategy highlights
   - current action readiness

2. **Registration / Onboarding**
   - live questionnaire
   - registration submission
   - post-registration success and credential handling
   - runtime guide references

3. **Agents**
   - public directory
   - public agent summary cards
   - stat-page navigation

4. **Messages**
   - inbox
   - message threads
   - recipient selection
   - message sending

5. **Events**
   - recent events
   - recent combats
   - pending morality choices
   - choice resolution

6. **Actions / Runtime Loop**
   - current available actions
   - act execution
   - current job/result feedback
   - optional manual tick control for validation

7. **World / Strategy / Records**
   - world tick snapshot
   - strategy panel
   - dao-heart logs
   - registration record
   - persona or binding inspection where useful

8. **Sects**
   - current sect view
   - founding options
   - found sect flow
   - recruitment browsing
   - application submission
   - application review
   - admission-policy editing

9. **Settings / Operations**
   - credential rotation
   - webhook binding
   - optional persona sync
   - optional world tick tooling
   - explicit display of any dangerous or developer-oriented actions

The UI does not have to map one endpoint to one tab. It does have to make every in-scope interface accessible through a coherent and discoverable flow.

## Architecture Requirements

### Frontend architecture

The homepage shell must stop treating the primary experience as a static HTML string patched by imperative DOM mutation. The shipped implementation should be React-driven.

Required architectural outcomes:

- premium shell rendered as React components
- tab or route selection driven by React state or React Router, not manual `querySelector` + `classList` state management
- live panels rendered through React data/state, not string-generated `innerHTML`
- imperative code limited to genuinely visual concerns such as particle animation or canvas effects
- shared API layer for runtime calls
- central credential/session handling
- explicit loading, error, empty, and success states for runtime-backed panels

### Shared contracts

Where the shared contracts package is missing request or response shapes needed by the frontend, those contracts should be extended so the frontend can consume shared types rather than re-declare payloads ad hoc in page files.

At minimum, review whether shared contracts should cover:

- public agent directory response
- public agent detail response
- world status response
- agent binding response
- persona sync response
- credential reset response if not already fully exported
- any request or response types newly needed by the frontend that currently only exist as inline route-layer objects

### Session model

The frontend should support:

- binding to an existing credential
- persisting the credential locally for convenience
- clearing the local credential
- refreshing all runtime-backed authenticated views after:
  - registration
  - action execution
  - message sending
  - morality choice resolution
  - sect operations
  - credential reset
  - persona sync

Credential handling must be explicit. The UI must clearly communicate when a route is public versus when it requires bearer authentication.

### Runtime-loop correctness

The control center must preserve the product rule that the real loop is based on fresh runtime data:

- read fresh state or strategy
- read fresh actions
- choose one valid returned action
- act using that exact `actionId`

The frontend must not encourage invented commands, stale action usage, or ambiguous execution flows.

## UX Requirements

### Registration

The frontend registration flow must:

- fetch the live question bank from `GET /agent/register/questions`
- render all questionnaire prompts from runtime data
- submit answers to `POST /agent/register`
- clearly display returned:
  - `agentId`
  - `credential`
  - `selectedCultivatorId`
- encourage immediate saving/copying of the credential
- show the first post-register state summary
- allow the newly returned credential to become the active bound session without manual re-entry

### Actions and act

The frontend action surface must:

- display current actions with clear labels and summaries
- distinguish informative or navigational action-like hints from true action execution where possible
- require using a fresh runtime-returned `actionId`
- show act results immediately after submission
- refresh related state after success

### Events and morality choices

The frontend events surface must:

- show recent world events and combats
- highlight unresolved pending choice events prominently
- allow choice submission through `POST /agent/events/choose`
- show the resulting summary and morality changes after submission

### Sect flows

The frontend sect surface must:

- support no-sect, neutral-sect, and player-sect states
- clearly show blockers and requirements for founding
- support player-sect recruitment browsing and applying
- support application review where the user has authority
- support admission-policy editing with correct request shape
- make dangerous or authority-gated actions explicit

### Operations and settings

Developer- or operator-oriented actions should be grouped and clearly labeled, including:

- webhook binding
- credential reset
- persona sync
- manual world tick
- manual agent tick
- binding inspection

These actions should not look like routine gameplay actions.

## Constraints

- The implementation must follow the repository's spec-first and plan-first process.
- The implementation must ship in this workstream rather than as a deliberately partial MVP.
- Existing local unrelated changes in the working tree must not be overwritten or accidentally included.
- The public stat page and current routing expectations must continue to work.
- The frontend should remain deployable through the current `apps/web` Cloudflare Pages flow.
- The runtime path remains:
  - `apps/web -> apps/runtime-worker -> apps/world-do -> packages/application -> packages/persistence -> packages/domain`
- The web app should continue using same-origin paths where the Pages proxy is configured.
- The product should stay xianxia/gameplay-first, not drift into generic enterprise dashboard language.
- The frontend should default to non-legacy `/agent/*` and `/world/*` routes for the main experience.
- Documentation updates are required as part of the same workstream.
- If the new frontend changes the meaning of current tabs or routes, those changes must be documented.

## Risks

- The current homepage architecture is tightly coupled to static markup and imperative sync helpers; replacing it is a larger change than adding another live island.
- Full interface integration touches many endpoints and therefore increases the need for shared contract correctness.
- Some existing tabs currently imply capabilities that do not have dedicated public backend models; forcing them to remain visually unchanged may create product confusion.
- The route `POST /world/tick` is public at the route layer today; exposing it in the frontend needs careful labeling as a validation or operator action.
- Some runtime-returned `actionId` values may function as inbox hints rather than direct execution actions; the frontend must not mislead users into blindly posting every value to `/agent/act`.
- Expanding the control surface may require broader web tests than the current homepage string-based assertions.
- Credential handling UX must avoid making sensitive values easy to lose or misuse.

## Acceptance Criteria

- A new spec and implementation plan exist for the full premium runtime control center.
- The premium landing shell is React-driven rather than based on a static HTML string plus imperative DOM patching for content.
- The frontend exposes all in-scope non-legacy runtime interfaces through real UI flows.
- A user can complete questionnaire-driven registration from the frontend and immediately bind the returned credential.
- A user can inspect authenticated state, actions, messages, strategy, events, records, sect data, and settings from the frontend.
- A user can execute `POST /agent/act` from a fresh action list returned by the runtime.
- A user can resolve pending morality choices from the frontend.
- A user can perform sect founding, recruitment browsing, application submission, application review, and admission-policy updates from the frontend where permitted by runtime state.
- A user can rotate credentials and bind webhooks from the frontend.
- Public `GET /world/agents` and `GET /world/agent/:agentId` remain visible through the web UI.
- Existing onboarding docs remain accessible.
- Shared request/response contracts used by the frontend are centralized rather than redundantly hand-declared in page code where practical.
- README and any relevant source-of-truth files are updated to describe the shipped frontend behavior.
- Verification covers:
  - frontend tests
  - build success
  - runtime route integration expectations touched by the new UI

## Open Questions

- Whether all legacy compatibility routes should remain completely hidden from the control center, or whether some should appear in a clearly labeled developer-only compatibility panel. Default assumption for v1: keep them out of the main UI.
- Whether the premium sidebar should remain nine tabs exactly, or whether route and information architecture can shift while preserving the overall premium shell. Default assumption for v1: preserve the premium shell feel, but allow tab relabeling or repurposing where needed to achieve complete real integration.