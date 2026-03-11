# Vite Pages Frontend Migration Design

## Goal

Replace the current Next.js frontend with a Vite React SPA that deploys to Cloudflare Pages while keeping the Hono runtime on a separate Cloudflare Worker and Supabase as the only durable backend store.

## Approved Decisions

- replace `apps/web` in place instead of running Next.js and Vite side by side
- keep the frontend client-rendered for this migration
- deploy the frontend to Cloudflare Pages as static assets
- call the runtime Worker origin directly from the browser instead of proxying through the frontend
- keep the backend split as `Hono + Cloudflare Workers + Supabase`

## Architecture

- `apps/web` becomes a Vite React app that outputs static assets for Cloudflare Pages
- `apps/runtime-worker` remains the Hono-based runtime API and scheduled execution surface
- `packages/contracts` remains the shared contract boundary between frontend and runtime
- Supabase remains private to the Worker and is never contacted directly from the browser

The migration should remove the current Next.js route handlers from the web app rather than attempting to preserve them through Pages Functions. The only server runtime after the migration should be the separate Cloudflare Worker.

## Frontend Shape

The frontend should be structured as a multi-route SPA, not a true Vite multi-page app with multiple HTML entrypoints.

Recommended structure:

- `apps/web/src/main.tsx` for bootstrapping
- `apps/web/src/app/` for app shell concerns such as providers and route wiring
- `apps/web/src/pages/` for route-level screens
- `apps/web/src/components/` for reusable UI pieces
- `apps/web/src/lib/` for browser-safe utilities such as environment parsing and runtime fetch helpers
- `apps/web/src/assets/` for bundled static assets

Client-side routing should be introduced now so future growth into multiple URLs does not require another architectural rewrite.

## Cloudflare Pages Best Practice

For this project, the best fit is a standard Vite SPA on Cloudflare Pages:

- build the app to `dist`
- configure the Pages project root to `apps/web`
- rely on Cloudflare Pages SPA fallback for deep links
- avoid adding a top-level `404.html`, which would override the default SPA fallback behavior
- avoid true Vite MPA configuration such as multiple HTML entrypoints unless the product later needs separate document roots

This design treats "multiple pages" as SPA routes handled by the React router instead of multiple static HTML pages.

## Runtime Integration

- the browser reads `VITE_RUNTIME_BASE_URL`
- frontend code calls the Worker origin directly
- no Pages Functions or frontend proxy layer are added in this migration
- the Worker must allow the Pages origin and local Vite dev origin through CORS

The runtime client should be centralized so route components do not own low-level fetch and error parsing behavior.

## Configuration

- replace `NEXT_PUBLIC_RUNTIME_BASE_URL` with `VITE_RUNTIME_BASE_URL`
- keep browser-exposed configuration minimal
- keep Worker secrets and Supabase credentials in the Worker environment only
- update root and app-level scripts so local development and builds use Vite instead of Next.js

## Failure Handling

The frontend should distinguish at least three error classes:

- missing frontend configuration such as an unset runtime base URL
- network failures when the Worker cannot be reached
- application or validation errors returned by the Worker as JSON

Frontend routes should render stable loading and error states instead of embedding raw fetch handling inline. Configuration failures should fail fast with a visible developer-facing message.

## Verification

Verification for the migration should cover:

- frontend unit tests for the landing route and routing bootstrapping
- tests for the browser runtime client and environment handling
- Worker tests proving CORS allows the Pages frontend origin and local dev origin
- `npm test`
- `npm run build`
- `npm run verify:worker`

## Sources

- Cloudflare Pages serving behavior: https://developers.cloudflare.com/pages/configuration/serving-pages/
- Cloudflare Pages React guide: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/
- Cloudflare Pages monorepo guidance: https://developers.cloudflare.com/pages/configuration/monorepos/
- Cloudflare Pages build configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/
- Cloudflare redirects behavior: https://developers.cloudflare.com/pages/configuration/redirects/
- Cloudflare Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/
- Cloudflare static assets routing for Workers: https://developers.cloudflare.com/workers/static-assets/
- Vite build guide: https://vite.dev/guide/build
- Vite shared options: https://vite.dev/config/shared-options
