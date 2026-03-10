# Deployment Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Immortal Claw into a deployable Vercel + Cloudflare Workers + Supabase application without baking platform-specific assumptions into the domain rules.

**Architecture:** Keep `packages/domain` pure, add `packages/application`, `packages/contracts`, and `packages/persistence` as the shared backend core, then attach thin Vercel and Cloudflare adapters. Use Hono only inside the Worker app for routing and middleware, and replace the SQLite-backed resident-worker model with Supabase-backed repositories and bounded scheduled tick execution.

**Tech Stack:** TypeScript, Next.js on Vercel, Cloudflare Workers, Hono, Supabase Postgres, Node test runner, existing monorepo

---

## Linked Spec

- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-10-vercel-workers-supabase-design.md`

## Task 1: Establish workspace and runtime scaffolding

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/page.tsx`
- Create: `apps/runtime-worker/package.json`
- Create: `apps/runtime-worker/tsconfig.json`
- Create: `apps/runtime-worker/wrangler.jsonc`
- Create: `apps/runtime-worker/src/app.ts`
- Create: `apps/runtime-worker/src/index.ts`
- Create: `packages/application/src/index.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/persistence/src/index.ts`

**Step 1: Write the failing workspace smoke test**

Create `packages/application/src/index.test.ts` with a minimal import smoke test:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import * as application from "./index.js";

test("application package exports an object", () => {
  assert.equal(typeof application, "object");
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test packages/application/src/index.test.ts`
Expected: FAIL because the package file does not exist yet.

**Step 3: Add the minimal scaffolding**

- Convert the root package to explicit workspaces for `apps/*` and `packages/*`.
- Add root scripts for `build`, `test`, `dev:web`, and `dev:worker`.
- Add minimal package entrypoints for `apps/web`, `apps/runtime-worker`, `packages/application`, `packages/contracts`, and `packages/persistence`.
- Add Hono to `apps/runtime-worker` and scaffold a tiny app in `src/app.ts`.
- Add a placeholder Next.js app page and a placeholder Worker adapter in `src/index.ts`.

Use the smallest possible starter exports, for example:

```ts
export {};
```

and a minimal Hono app:

```ts
import { Hono } from "hono";

export const app = new Hono();
app.get("/health", (c) => c.json({ ok: true }));
```

Then bridge it from the Worker entrypoint:

```ts
import { app } from "./app";

export default {
  fetch: app.fetch,
};
```

**Step 4: Run build and targeted test**

Run:
- `node --import tsx --test packages/application/src/index.test.ts`
- `npm.cmd run build`
Expected: PASS for the targeted test and a clean TypeScript build.

**Step 5: Commit**

```bash
git add package.json tsconfig.json apps/web apps/runtime-worker packages/application packages/contracts packages/persistence
git commit -m "chore: scaffold deployable app and runtime workspaces"
```

### Task 2: Extract transport-free contracts and application use cases

**Files:**
- Create: `packages/contracts/src/runtime-api.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/application/src/runtime-service.ts`
- Create: `packages/application/src/runtime-service.test.ts`
- Modify: `packages/application/src/index.ts`
- Modify: `packages/domain/src/index.ts`

**Step 1: Write the failing application tests**

Create `packages/application/src/runtime-service.test.ts` with tests for a repository-driven service surface:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeService } from "./runtime-service.js";

test("getCultivatorState delegates through the repository", async () => {
  const service = createRuntimeService({
    repository: {
      getCultivatorState: async () => ({ cultivatorId: "yun-zhong-he", tick: 1 }),
    } as never,
  });

  const result = await service.getCultivatorState("yun-zhong-he");
  assert.equal(result.cultivatorId, "yun-zhong-he");
});
```

Add similar tests for:
- `listActions`
- `performAction`
- `advanceWorld`

**Step 2: Run tests to verify they fail**

Run: `node --import tsx --test packages/application/src/runtime-service.test.ts`
Expected: FAIL because the runtime service and contracts do not exist yet.

**Step 3: Implement the smallest useful contract boundary**

Create shared DTOs for:
- health response
- cultivator state request and response
- actions request and response
- act request and response
- tick request and response

Add an application service shaped roughly like:

```ts
export type RuntimeRepository = {
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
  performAction(cultivatorId: string, actionId: string): Promise<ActionExecutionResult>;
  advanceWorld(steps: number): Promise<TickSummary>;
};
```

Keep HTTP, SQL, Cloudflare, and Hono types out of this package.

**Step 4: Run targeted tests and the full suite**

Run:
- `node --import tsx --test packages/application/src/runtime-service.test.ts`
- `npm.cmd test`
Expected: PASS with existing domain behavior unchanged.

**Step 5: Commit**

```bash
git add packages/contracts packages/application packages/domain/src/index.ts
git commit -m "refactor: add shared runtime contracts and service layer"
```

### Task 3: Introduce persistence interfaces and Supabase schema

**Files:**
- Create: `packages/persistence/src/world-repository.ts`
- Create: `packages/persistence/src/in-memory-world-repository.ts`
- Create: `packages/persistence/src/supabase-world-repository.ts`
- Create: `packages/persistence/src/supabase-world-repository.test.ts`
- Modify: `packages/persistence/src/index.ts`
- Create: `supabase/config.toml`
- Create: `supabase/seed.sql`
- Create: `supabase/migrations/20260310_initial_world_schema.sql`

**Step 1: Write the failing repository contract tests**

Create tests for the persistence boundary that prove:
- world reads return deterministic state
- action writes persist results
- tick metadata can be stored and queried
- lock acquisition rejects overlapping execution

Start with an in-memory implementation so the contract can be tested before Postgres is wired.

**Step 2: Run tests to verify they fail**

Run: `node --import tsx --test packages/persistence/src/supabase-world-repository.test.ts`
Expected: FAIL because the repository boundary does not exist yet.

**Step 3: Implement repository interfaces and the first schema**

Define interfaces for:
- world reads
- world writes
- action and event append logs
- tick locks or tick coordination records

Create the first Supabase migration with simple, evolvable tables such as:
- `world_snapshots`
- `cultivator_records`
- `world_events`
- `world_actions`
- `world_locks`

Use a hybrid storage model first if that is fastest, but keep all SQL behind repository implementations.

**Step 4: Run repository tests and build**

Run:
- `node --import tsx --test packages/persistence/src/*.test.ts`
- `npm.cmd run build`
Expected: PASS for repository contract coverage and a clean build.

**Step 5: Commit**

```bash
git add packages/persistence supabase
git commit -m "feat: add Supabase persistence layer and schema"
```

### Task 4: Port the runtime API and scheduled ticking to Cloudflare Workers with Hono

**Files:**
- Create: `apps/runtime-worker/src/index.test.ts`
- Modify: `apps/runtime-worker/src/app.ts`
- Modify: `apps/runtime-worker/src/index.ts`
- Create: `apps/runtime-worker/src/env.ts`
- Create: `apps/runtime-worker/src/routes.ts`
- Create: `apps/runtime-worker/src/scheduler.ts`
- Create: `apps/runtime-worker/src/middleware.ts`
- Modify: `packages/contracts/src/runtime-api.ts`
- Modify: `packages/application/src/runtime-service.ts`

**Step 1: Write failing adapter tests**

Create Worker tests that cover:
- `GET /health`
- `GET /cultivator/state`
- `GET /cultivator/actions`
- `POST /cultivator/act`
- scheduled tick invocation

Use the Hono app in tests where possible, for example:

```ts
test("health route returns ok", async () => {
  const response = await app.request("https://runtime.test/health");
  assert.equal(response.status, 200);
});
```

Add one entrypoint-level test to confirm the Worker export still wires `fetch` and `scheduled` correctly.

**Step 2: Run tests to verify they fail**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: FAIL because the routes and scheduler are placeholders.

**Step 3: Implement thin Hono-based Worker adapters**

- Register routes in Hono.
- Add middleware for JSON errors, request logging, and CORS only if needed.
- Parse requests in the Worker layer only.
- Call the application service for all business behavior.
- Add a scheduled handler that runs a bounded tick batch.
- Read Supabase connection settings from Worker environment bindings.
- Return typed JSON responses using the shared contracts package.

Keep the entrypoint shape as small as possible:

```ts
import { app } from "./app";
import { runScheduledTick } from "./scheduler";

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    return runScheduledTick(event, env, ctx);
  },
};
```

**Step 4: Run adapter tests and the full suite**

Run:
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`
- `npm.cmd test`
Expected: PASS with runtime endpoints covered and no regressions in the existing domain tests.

**Step 5: Commit**

```bash
git add apps/runtime-worker packages/application packages/contracts
git commit -m "feat: move runtime API and ticks to Hono on Cloudflare Workers"
```

### Task 5: Add the Vercel web surface and integrate the runtime boundary

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/lib/runtime-client.ts`
- Create: `apps/web/lib/env.ts`
- Create: `apps/web/app/api/health/route.ts`
- Create: `apps/web/app/api/runtime-proxy/[...path]/route.ts`
- Create: `apps/web/app/page.test.tsx`

**Step 1: Write the failing integration tests**

Cover:
- landing page renders deployment status text
- health route returns a runtime-aware health payload
- optional runtime proxy forwards requests to the Worker base URL when configured

**Step 2: Run tests to verify they fail**

Run: `node --import tsx --test apps/web/app/page.test.tsx`
Expected: FAIL because the web surface is still placeholder-only.

**Step 3: Implement the minimum useful web shell**

- Replace the placeholder page with a concise deployment-ready landing page.
- Add a small runtime client wrapper that reads the Worker base URL from environment.
- Add a health endpoint and only add a proxy route if the web app needs same-origin runtime access.
- Keep simulation logic out of the Vercel app.

**Step 4: Run web tests and build**

Run:
- `node --import tsx --test apps/web/app/page.test.tsx`
- `npm.cmd run build`
Expected: PASS with the Vercel app buildable and runtime integration isolated behind a client helper.

**Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add Vercel web surface for deployment"
```

### Task 6: Remove SQLite-first assumptions, verify end to end, and sync docs

**Files:**
- Modify: `apps/world-api/src/server.ts`
- Modify: `apps/world-worker/src/worker.ts`
- Modify: `packages/domain/src/store.ts`
- Modify: `README.md`
- Modify: `docs/product/vision.md`
- Modify: `harness/README.md`
- Modify: `docs/plans/2026-03-10-vercel-workers-supabase-design.md`
- Modify: `docs/specs/deployment-platform/spec.md`

**Step 1: Write the failing migration and compatibility tests**

Add tests or checks that prove:
- the old server and worker are no longer the primary production path
- the new runtime path can seed, act, tick, and inspect world state
- local developer setup instructions point to the new commands

**Step 2: Run the failing checks**

Run the new targeted tests plus a repo-wide build and test run.
Expected: FAIL until docs and transitional compatibility code are updated.

**Step 3: Complete the migration cleanup**

- Decide whether `apps/world-api` and `apps/world-worker` become dev-only harnesses or are removed.
- Remove direct production guidance that points to SQLite and the resident worker.
- Update README and product docs to describe the Vercel + Workers + Supabase architecture.
- Update harness docs to include one end-to-end scenario for runtime action and ticking.

**Step 4: Run full verification**

Run:
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`
Expected: PASS for tests and build, and no diff hygiene issues.

**Step 5: Commit**

```bash
git add README.md docs/product/vision.md harness/README.md apps/world-api apps/world-worker packages/domain/src/store.ts
git commit -m "docs: align repo guidance with deployable platform architecture"
```

## Verification

- `node --import tsx --test packages/application/src/index.test.ts`
- `node --import tsx --test packages/application/src/runtime-service.test.ts`
- `node --import tsx --test packages/persistence/src/*.test.ts`
- `node --import tsx --test apps/runtime-worker/src/index.test.ts`
- `node --import tsx --test apps/web/app/page.test.tsx`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

## Doc Updates

- `README.md`
- `docs/product/vision.md`
- `docs/specs/deployment-platform/spec.md`
- `docs/plans/2026-03-10-vercel-workers-supabase-design.md`
- `harness/README.md`
