# Vite Pages Worker Migration Implementation Plan

> Status: historical. The Vite SPA is still `apps/web`, but production hosts it on `https://claw.archim.top` with `apps/server`, not Cloudflare Pages. See `README.md`.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Next.js frontend in `apps/web` with a Vite React SPA deployed to Cloudflare Pages while preserving the separate Hono Worker runtime and direct browser-to-Worker API calls.

**Architecture:** Keep `apps/web` as a static client-rendered application with React Router and a browser-safe runtime client built around `VITE_RUNTIME_BASE_URL`. Keep `apps/runtime-worker` as the only server runtime, add CORS for Pages and local Vite development, and remove the old Next.js route-handler assumptions from the frontend.

**Tech Stack:** Vite, React, React Router, TypeScript, Cloudflare Pages, Hono, Cloudflare Workers, Supabase

---

## Linked Docs

- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-11-vite-pages-worker-design.md`

### Task 1: Replace Next.js Workspace Tooling With Vite Tooling

**Files:**
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.json`
- Delete: `apps/web/next-env.d.ts`
- Delete: `apps/web/next.config.ts`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/vite-env.d.ts`
- Test: `apps/web/deploy-config.test.ts`

**Step 1: Write the failing test**

Update `apps/web/deploy-config.test.ts` so it no longer checks Next.js-relative module resolution. Replace it with a Vite-focused config test that asserts:

- `apps/web/vite.config.ts` loads without TypeScript config errors
- the config root resolves to `apps/web`
- the build output is `dist`
- the app entrypoint resolves from `index.html` to `src/main.tsx`

Example assertion shape:

```ts
assert.equal(viteConfig.build?.outDir, "dist");
assert.match(indexHtml, /src\/main\.tsx/);
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/web/deploy-config.test.ts
```

Expected: FAIL because `vite.config.ts` and `index.html` do not exist yet.

**Step 3: Write minimal implementation**

- Replace Next.js dependencies in `apps/web/package.json` with Vite equivalents.
- Add `vite`, `@vitejs/plugin-react`, and `react-router-dom`.
- Update web scripts to:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

- Add `apps/web/vite.config.ts` with the React plugin and default static build output.
- Add `apps/web/index.html` pointing at `/src/main.tsx`.
- Remove Next-only TypeScript plugin entries from `apps/web/tsconfig.json`.
- Update root `package.json` scripts only if required to keep `npm run dev:web` and `npm run build` working with the new web workspace scripts.

**Step 4: Run test to verify it passes**

Run:

```bash
node --import tsx --test apps/web/deploy-config.test.ts
npm run build --workspace @immortal-claw/web
```

Expected: PASS and Vite emits a `dist/` build successfully.

**Step 5: Commit**

```bash
git add package.json apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html apps/web/src/vite-env.d.ts apps/web/deploy-config.test.ts
git commit -m "build: replace web workspace nextjs tooling with vite"
```

### Task 2: Rebuild `apps/web` As A Routed SPA

**Files:**
- Delete: `apps/web/app/page.tsx`
- Delete: `apps/web/app/layout.tsx`
- Delete: `apps/web/app/globals.css`
- Modify: `apps/web/app/page.test.tsx`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/pages/home-page.tsx`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/app/app-shell.tsx`

**Step 1: Write the failing test**

Convert `apps/web/app/page.test.tsx` into a routed SPA test that imports the new app shell and asserts:

- the landing route renders `IMMORTAL CLAW`
- the runtime label is visible
- a deep-link route such as `/` or `/dashboard` renders through the router without server help

Example shape:

```ts
const app = createAppForTest(["/"]);
assert.match(extractText(app), /IMMORTAL CLAW/);
```

If JSX in tests becomes awkward under the current root test glob, rename this test to a `.test.ts` file while keeping the assertions equivalent.

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/web/app/page.test.tsx
```

Expected: FAIL because the new SPA entrypoints and router do not exist.

**Step 3: Write minimal implementation**

- Move the current landing page JSX into `apps/web/src/pages/home-page.tsx`.
- Move the global styling into `apps/web/src/styles/global.css`.
- Replace `next/font/google` usage with a Vite-compatible font approach, preferably bundled `@fontsource` packages or explicit CSS font loading.
- Create `apps/web/src/main.tsx` that mounts React into `#root`.
- Create `apps/web/src/app/router.tsx` with client routing and a landing route.
- Add an `app-shell` component if shared layout or providers make the router cleaner.

**Step 4: Run test to verify it passes**

Run:

```bash
node --import tsx --test apps/web/app/page.test.tsx
npm run build --workspace @immortal-claw/web
```

Expected: PASS and the web build still completes.

**Step 5: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/app/router.tsx apps/web/src/app/app-shell.tsx apps/web/src/pages/home-page.tsx apps/web/src/styles/global.css apps/web/app/page.test.tsx
git commit -m "feat: rebuild web app as a vite spa"
```

### Task 3: Replace Next Runtime Helpers With Browser-Safe Vite Runtime Helpers

**Files:**
- Delete: `apps/web/app/api/health/route.ts`
- Delete: `apps/web/app/api/runtime-proxy/[...path]/route.ts`
- Delete: `apps/web/lib/env.ts`
- Delete: `apps/web/lib/runtime-client.ts`
- Modify: `apps/web/app/page.test.tsx`
- Create: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/lib/env.test.ts`
- Create: `apps/web/src/lib/runtime-client.ts`
- Create: `apps/web/src/lib/runtime-client.test.ts`
- Modify: `apps/web/src/pages/home-page.tsx`

**Step 1: Write the failing tests**

Add two focused tests:

1. `apps/web/src/lib/env.test.ts`
   Verify `readRuntimeBaseUrl()` reads `import.meta.env.VITE_RUNTIME_BASE_URL`, trims whitespace, and strips a trailing slash.

2. `apps/web/src/lib/runtime-client.test.ts`
   Verify the client:
   - throws a clear error when `VITE_RUNTIME_BASE_URL` is missing
   - requests `https://runtime.example/health?tick=1` when asked for `/health?tick=1`
   - normalizes JSON error payloads from the Worker

Example shape:

```ts
assert.throws(() => createRuntimeClient({ baseUrl: null }), /not configured/i);
```

**Step 2: Run tests to verify they fail**

Run:

```bash
node --import tsx --test apps/web/src/lib/env.test.ts apps/web/src/lib/runtime-client.test.ts
```

Expected: FAIL because the new browser-side modules do not exist.

**Step 3: Write minimal implementation**

- Rebuild `readRuntimeBaseUrl()` for Vite environment access.
- Rebuild `createRuntimeClient()` without Next server assumptions.
- Remove the old `/api/health` and `/api/runtime-proxy/*` links from the landing page.
- Replace them with direct Worker URLs or non-destructive SPA links.
- Keep the runtime client fetch code centralized under `src/lib`.

**Step 4: Run tests to verify they pass**

Run:

```bash
node --import tsx --test apps/web/src/lib/env.test.ts apps/web/src/lib/runtime-client.test.ts
node --import tsx --test apps/web/app/page.test.tsx
```

Expected: PASS and the landing page no longer depends on removed Next API routes.

**Step 5: Commit**

```bash
git add apps/web/src/lib/env.ts apps/web/src/lib/env.test.ts apps/web/src/lib/runtime-client.ts apps/web/src/lib/runtime-client.test.ts apps/web/src/pages/home-page.tsx apps/web/app/page.test.tsx
git commit -m "refactor: switch web runtime client to vite env and direct worker calls"
```

### Task 4: Add Worker CORS For Pages And Local Vite Development

**Files:**
- Modify: `apps/runtime-worker/src/middleware.ts`
- Modify: `apps/runtime-worker/src/middleware.test.ts`
- Modify: `apps/runtime-worker/src/index.test.ts`
- Modify: `apps/runtime-worker/src/env.ts`
- Modify: `apps/runtime-worker/wrangler.jsonc`

**Step 1: Write the failing test**

Extend `apps/runtime-worker/src/middleware.test.ts` with CORS coverage:

- `OPTIONS` preflight from the configured Pages origin returns `204` or `200` with the expected `access-control-allow-origin`
- a normal `GET /health` request from the configured Pages origin includes `access-control-allow-origin`
- a disallowed origin does not receive the allow-origin header

Example shape:

```ts
assert.equal(response.headers.get("access-control-allow-origin"), "https://immortal-claw.pages.dev");
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test apps/runtime-worker/src/middleware.test.ts
```

Expected: FAIL because the runtime middleware does not set CORS headers yet.

**Step 3: Write minimal implementation**

- Add explicit frontend origin configuration to `apps/runtime-worker/src/env.ts`.
- Register Hono CORS middleware in `apps/runtime-worker/src/middleware.ts`.
- Allow the deployed Pages origin plus the local Vite dev origin.
- Reflect the new public-origin env variable in `apps/runtime-worker/wrangler.jsonc`.

Prefer an allowlist-based approach rather than `*` so credentialed or future authenticated calls remain safe.

**Step 4: Run tests to verify they pass**

Run:

```bash
node --import tsx --test apps/runtime-worker/src/middleware.test.ts apps/runtime-worker/src/index.test.ts
npm run verify:worker
```

Expected: PASS and the worker dry-run still succeeds.

**Step 5: Commit**

```bash
git add apps/runtime-worker/src/middleware.ts apps/runtime-worker/src/middleware.test.ts apps/runtime-worker/src/index.test.ts apps/runtime-worker/src/env.ts apps/runtime-worker/wrangler.jsonc
git commit -m "feat: allow pages frontend origins through runtime cors"
```

### Task 5: Sync Docs And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/deployment-platform/spec.md`
- Modify: `docs/plans/2026-03-10-vercel-workers-supabase-design.md`
- Modify: `docs/plans/2026-03-10-deployment-platform-implementation.md`
- Modify: `apps/web/package.json`
- Modify: `package.json`

**Step 1: Write the failing doc check**

Create a short checklist in the task branch notes or commit message draft for the statements that must stop being true after implementation:

- the frontend runs on Vercel
- the web app uses Next.js route handlers
- `NEXT_PUBLIC_RUNTIME_BASE_URL` is the frontend env variable

This is the doc-sync equivalent of a failing test: the repo documentation should be considered incomplete until every one of those statements is removed or updated.

**Step 2: Run verification to expose remaining gaps**

Run:

```bash
npm test
npm run build
npm run verify:worker
```

Expected: at least one command or doc review still reflects old Vercel or Next.js assumptions before the final cleanup.

**Step 3: Write minimal implementation**

- Update `README.md` to describe `Cloudflare Pages + separate runtime Worker + Supabase` as the target architecture.
- Update older plan docs only where they are now misleading source-of-truth references.
- Confirm root scripts, install instructions, and environment variable names match the migrated frontend.

Do not rewrite unrelated historical context; only fix the parts that would mislead the next engineer.

**Step 4: Run final verification**

Run:

```bash
npm test
npm run build
npm run verify:worker
```

Expected: all commands PASS.

**Step 5: Commit**

```bash
git add README.md docs/specs/deployment-platform/spec.md docs/plans/2026-03-10-vercel-workers-supabase-design.md docs/plans/2026-03-10-deployment-platform-implementation.md package.json apps/web/package.json
git commit -m "docs: align repo guidance with vite pages frontend migration"
```

## Verification

- `node --import tsx --test apps/web/deploy-config.test.ts`
- `node --import tsx --test apps/web/app/page.test.tsx`
- `node --import tsx --test apps/web/src/lib/env.test.ts apps/web/src/lib/runtime-client.test.ts`
- `node --import tsx --test apps/runtime-worker/src/middleware.test.ts apps/runtime-worker/src/index.test.ts`
- `npm test`
- `npm run build`
- `npm run verify:worker`

## Doc Updates

- `README.md`
- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-11-vite-pages-worker-design.md`
- `docs/plans/2026-03-10-vercel-workers-supabase-design.md`
- `docs/plans/2026-03-10-deployment-platform-implementation.md`
