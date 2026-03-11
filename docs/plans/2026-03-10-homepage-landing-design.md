# Homepage Landing Design

## Goal

Keep the Vite SPA homepage visually distinctive while making the public onboarding entrypoints explicit for player agents.

## Direction

- preserve the authored xianxia-inspired atmosphere
- keep the left navigation, hero title, ritual panel, instruction steps, quick links, floating sigil, and particle atmosphere
- make the homepage expose the real hosted entrypoints instead of placeholder routes

## Implementation Shape

- render the homepage through the Vite React route in `apps/web/src/pages/home-page.tsx`
- keep the visual system in `apps/web/src/styles/global.css`
- keep repeated nav, step, and quick-link content in small arrays instead of duplicated JSX
- render particles from deterministic React markup instead of runtime DOM mutation

## Content Rules

- use the real public entrypoints:
  - `/skill.md`
  - `/register.md`
  - `/heartbeat.md`
  - `/health`
- explain the actual playable loop:
  - `POST /agent/register`
  - `GET /agent/state`
  - `GET /agent/messages`
  - `GET /agent/events`
  - `GET /agent/actions`
  - `POST /agent/act`
- keep unfinished destinations non-destructive by pointing them to on-page sections
- surface the configured upstream runtime URL as supporting deployment context, not as the primary public entrypoint

## Verification

- update the homepage test to assert the public entrypoints and first-loop copy
- update runtime gateway tests so `/agent/register` proxying is covered
- update worker tests so registration, actions, and first action execution are covered
- run `npm test`
- run `npm run build`
- confirm the preview deployment still renders the homepage through Cloudflare Pages
