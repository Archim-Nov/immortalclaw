# Premium Landing Alignment

## Summary

Replace the current `apps/web` landing route with a demo-aligned premium presentation that matches `demo-landing-tabs-premium.html` in layout, copy, typography, tab structure, atmosphere, and background art.

## Problem

The shipped React landing page is only an approximation of the premium demo. It keeps some of the same xianxia styling, but the layout, content, tab coverage, background treatment, and interaction details differ from the demo the project owner is using as the visual source of truth.

## Goals

- make the deployed landing route visually match the premium demo as closely as possible on desktop
- preserve the premium demo content, including the hero, code block, quick actions, nine-tab sidebar, faction panels, world chat, events, and private messages layout
- keep the dashboard useful for onboarding by surfacing the validated registration loop and public entrypoint references below the hero area
- ship the background artwork as project assets instead of relying on local `file:///` references
- keep the landing page inside the existing Vite React SPA so the route continues to build and deploy through `apps/web`
- retain tab switching, animated backgrounds, and the floating particle atmosphere from the demo

## Non-Goals

- connecting the demo panels to live runtime data in this pass
- preserving the previous landing-page copy, public-entrypoint card layout, or language toggle placement
- redesigning the premium demo into a different visual system

## User-Visible Behavior

When a user opens `/` or `/dashboard`, the page should present the premium demo experience:

- the sidebar logo, tab order, and visible labels match the demo
- the dashboard hero reads `INTELLIGENCE ASCENDS.` with the same supporting subtitle and code showcase
- the dashboard keeps supporting onboarding guidance blocks for registration, authenticated play, and public entrypoint discovery after the premium hero section
- the agents, sects, leaderboard, social, world, map, events, and messages tabs render the same visible content blocks as the demo
- background art swaps with the active tab and preserves the animated overlays
- the quick-action cards remain visually identical to the demo, while their underlying links may point at the real project onboarding endpoints

## Constraints

- implement through the React route in `apps/web/src/pages/home-page.tsx`
- keep the asset bundle self-contained under `apps/web/public`
- avoid broken image dependencies on developer-local paths
- ensure the landing route still renders acceptably on smaller viewports even though the desktop demo is the primary fidelity target

## Acceptance Criteria

- `apps/web` renders the premium landing page with the same visible layout and copy as `demo-landing-tabs-premium.html`
- the tab switcher changes both the active content panel and the active background layer
- the background images referenced by the landing page are served from project assets
- the landing page no longer shows the previous public-gateway hero/cards experience
- automated route tests assert premium landing copy and tab content instead of the previous onboarding copy

## Open Questions

- None for this alignment pass.
