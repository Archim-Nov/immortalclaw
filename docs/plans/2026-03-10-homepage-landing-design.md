# Homepage Landing Design

## Goal

Replace the placeholder Vercel homepage with a faithful Next.js implementation of `demo-landing.html` while keeping the deployment-safe architecture intact.

## Direction

- preserve the demo's Chinese-first xianxia presentation
- keep the left navigation, hero title, terminal ritual panel, instruction steps, quick links, floating sigil, and particle atmosphere
- remove the hardcoded local background file dependency and recreate the mood with gradients, overlays, glow, and SVG ornament

## Implementation Shape

- render the homepage as a server component in `apps/web/app/page.tsx`
- move the visual system into `apps/web/app/globals.css`
- load display and mono fonts through `next/font/google`
- keep repeated nav, step, and quick-link content in small arrays instead of duplicated JSX
- render particles from deterministic React markup instead of runtime DOM mutation

## Content Rules

- use real destinations where the project has them now
- keep unfinished destinations non-destructive by pointing them to on-page sections
- surface the configured runtime URL in both the page copy and the ritual panel when available

## Verification

- update the homepage test to assert the new landing content
- run `npm.cmd test`
- run `npm.cmd run build`
- confirm the preview deployment still renders the homepage through Vercel
