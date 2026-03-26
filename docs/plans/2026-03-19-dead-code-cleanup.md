# Dead Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code left behind by the architecture boundary reset: legacy apps, unused domain exports, dead persistence methods, the SQLite store file, stale npm scripts, and all docs/tests that reference the deleted code.

**Architecture:** The official production path is `apps/web -> apps/runtime-worker -> packages/application -> packages/persistence -> packages/domain`. Everything outside this path that has zero production callers is removed. All source-of-truth docs, boundary tests, and specs that describe the deleted code are updated to reflect the current state.

**Tech Stack:** TypeScript monorepo, Node test runner with `tsx`

---

### Task 1: Delete Legacy Harness Apps And Update All References

These apps were reclassified as legacy harnesses in the architecture boundary reset and have zero production imports. Deleting them requires updating every doc, test, and spec that mentions them.

**Files:**
- Delete: `apps/world-api/` (entire directory)
- Delete: `apps/world-worker/` (entire directory)
- Modify: `apps/architecture-boundary-docs.test.ts` (remove or rewrite test on lines 9-10 and 26-35)
- Modify: `AGENTS.md` (line 21: remove stale prototype reference)
- Modify: `README.md` (lines 22, 28-29, 253-272)
- Modify: `docs/specs/architecture-boundary-reset/spec.md` (line 25)
- Modify: `docs/specs/deployment-platform/spec.md` (lines 44 and 82)
- Modify: `package.json` (remove `dev:api`, `dev:legacy-api`, `dev:legacy-worker` scripts)

- [ ] **Step 1: Delete `apps/world-api/` and `apps/world-worker/`**

```bash
rm -rf apps/world-api
rm -rf apps/world-worker
```

- [ ] **Step 2: Remove stale npm scripts from root `package.json`**

Remove these three lines:

```json
"dev:api": "tsx apps/world-api/src/server.ts",
"dev:legacy-api": "tsx apps/world-api/src/server.ts",
"dev:legacy-worker": "tsx apps/world-worker/src/worker.ts",
```

Verify valid JSON:

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Update `apps/architecture-boundary-docs.test.ts`**

The second test (`"legacy world api and worker notices say they are outside product architecture"`, lines 26-35) asserts that `apps/world-api/src/server.ts` and `apps/world-worker/src/worker.ts` exist and contain legacy notices. Those files no longer exist.

Remove lines 9-10 (the path constants):

```typescript
const legacyApiPath = path.join(repoRoot, "apps", "world-api", "src", "server.ts");
const legacyWorkerPath = path.join(repoRoot, "apps", "world-worker", "src", "worker.ts");
```

Replace the entire second test (lines 26-35) with one that asserts the directories are gone:

```typescript
test("legacy world api and worker directories have been removed", () => {
  assert.equal(existsSync(path.join(repoRoot, "apps", "world-api")), false);
  assert.equal(existsSync(path.join(repoRoot, "apps", "world-worker")), false);
});
```

- [ ] **Step 4: Update `AGENTS.md`**

**Line 21** — change from:

```markdown
- `apps/world-api` and `packages/domain`: current runnable prototype
```

to:

```markdown
- `apps/runtime-worker` and `packages/domain`: current runnable runtime
```

- [ ] **Step 5: Update `README.md`**

**Line 22** — change from:

```markdown
The older `apps/world-api` and `apps/world-worker` remain in the repo as legacy harnesses only for debugging and migration backstops. They are not part of the product architecture.
```

to:

```markdown
The older `apps/world-api` and `apps/world-worker` have been deleted. They were legacy SQLite harnesses outside the product architecture.
```

**Lines 28-29** — remove these two entries from the Packages and Apps list:

```markdown
- `apps/world-api`: legacy local Node HTTP harness only, outside the product architecture
- `apps/world-worker`: legacy local auto-tick harness only, outside the product architecture
```

**Lines 253-272** — delete the entire "Legacy SQLite Harnesses" section:

```markdown
### Legacy SQLite Harnesses

These remain available as legacy harnesses only for local debugging and migration backstops. They are not part of the official production runtime path:

...

- `PORT`
```

- [ ] **Step 6: Update `docs/specs/architecture-boundary-reset/spec.md`**

**Line 25** — change from:

```markdown
- classify `apps/world-api` and `apps/world-worker` as legacy harnesses only
```

to:

```markdown
- remove `apps/world-api` and `apps/world-worker` (formerly legacy harnesses, now deleted)
```

- [ ] **Step 7: Update `docs/specs/deployment-platform/spec.md`**

**Line 44** — change from:

```markdown
- the older SQLite server and worker remain optional local-only harnesses rather than the primary production path
```

to:

```markdown
- the older SQLite server and worker have been removed; the production path is the only runtime path
```

**Line 82** (Transition Decision) — change from:

```markdown
Keep `apps/world-api` and `apps/world-worker` as explicit local SQLite harnesses for debugging and migration backstops, but treat `apps/web` on Cloudflare Pages plus `apps/runtime-worker` on Cloudflare Workers with Supabase as the default deployment path for development guidance, validation deployment, and production.
```

to:

```markdown
The older `apps/world-api` and `apps/world-worker` SQLite harnesses have been removed. `apps/web` on Cloudflare Pages plus `apps/runtime-worker` on Cloudflare Workers with Supabase is the only deployment path for development guidance, validation deployment, and production.
```

- [ ] **Step 8: Run tests to verify everything is consistent**

Run: `npm test`
Expected: All tests pass, including the updated boundary docs test.

- [ ] **Step 9: Commit**

```bash
git add -A apps/world-api apps/world-worker apps/architecture-boundary-docs.test.ts package.json AGENTS.md README.md docs/specs/architecture-boundary-reset/spec.md docs/specs/deployment-platform/spec.md
git commit -m "$(cat <<'EOF'
chore: delete legacy harness apps and update all references

Remove apps/world-api and apps/world-worker (zero production imports).
Update README, specs, boundary tests, and npm scripts to reflect that
these legacy SQLite harnesses no longer exist.
EOF
)"
```

---

### Task 2: Delete the SQLite Store File

`packages/domain/src/store.ts` implements a local SQLite world store used only by the deleted legacy apps. Production uses Supabase via `packages/persistence`.

**Files:**
- Delete: `packages/domain/src/store.ts`
- Modify: `packages/domain/src/index.ts` (remove store re-exports, line 41)
- Modify: `packages/domain/src/boundary.test.ts` (update assertion on line 16)

- [ ] **Step 1: Delete `packages/domain/src/store.ts`**

```bash
rm packages/domain/src/store.ts
```

- [ ] **Step 2: Remove store re-exports from `packages/domain/src/index.ts`**

Remove this line:

```typescript
export { SqliteWorldStore, createSqliteWorldStore, createWorldStore } from "./store.js";
```

- [ ] **Step 3: Update `packages/domain/src/boundary.test.ts`**

The test on line 16 asserts `createSqliteWorldStore` is present in the domain index. Change it to assert absence:

```typescript
// Before:
assert.equal("createSqliteWorldStore" in domainIndex, true);
// After:
assert.equal("createSqliteWorldStore" in domainIndex, false);
```

- [ ] **Step 4: Run domain tests**

Run: `node --import tsx --test packages/domain/src/*.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/store.ts packages/domain/src/index.ts packages/domain/src/boundary.test.ts
git commit -m "$(cat <<'EOF'
chore: delete SQLite store (only used by legacy harnesses)

Production uses Supabase via packages/persistence.
The store.ts file and its re-exports from domain/index.ts are removed.
EOF
)"
```

---

### Task 3: Remove Unused Domain Function Exports

Four engine functions are exported from both `index.ts` and `runtime.ts` but have zero callers outside `packages/domain`:

| Function | Internal usage |
|---|---|
| `createCultivator` | Called internally by `syncCultivatorFromPersona` and `golden-path.test.ts` |
| `listCultivators` | Zero callers anywhere |
| `selectCultivatorForAgent` | Zero callers anywhere |
| `getCombatLogs` | Called internally by `getCultivatorState` only |

All four remain exported from `engine.ts` (the source file) so domain-internal code still works. We only remove them from the barrel exports.

**Important:** `packages/domain/src/golden-path.test.ts` imports `createCultivator` from `./index.js` (line 6). This import must be updated to `./engine.js` before the barrel export is removed, or the test will break.

**Files:**
- Modify: `packages/domain/src/golden-path.test.ts` (line 6: change import source)
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/runtime.ts`

- [ ] **Step 1: Update `packages/domain/src/golden-path.test.ts` import**

Change line 6 from:

```typescript
  createCultivator,
```

The full import block (lines 3-10) currently reads:

```typescript
import {
  advanceWorld,
  createSeedWorld,
  createCultivator,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
```

Change the import source from `"./index.js"` to `"./engine.js"`, and add `createSeedWorld` from `"./seed.js"` since `createSeedWorld` is re-exported by index from seed:

```typescript
import {
  advanceWorld,
  createCultivator,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./engine.js";
import { createSeedWorld } from "./seed.js";
```

- [ ] **Step 2: Remove from `packages/domain/src/index.ts`**

Remove these four entries from the engine re-export block:

```typescript
createCultivator,
getCombatLogs,
listCultivators,
selectCultivatorForAgent,
```

The remaining engine exports should be:

```typescript
export {
  advanceWorld,
  getCultivationRegistration,
  getAgentBindingInfo,
  getCultivatorState,
  getDaoLogs,
  getMessages,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  resolveCultivatorIdForAgent,
  saveCultivationRegistration,
  sendDirectMessage,
  syncCultivatorFromPersona,
} from "./engine.js";
```

- [ ] **Step 3: Remove from `packages/domain/src/runtime.ts`**

Remove the same four entries from the engine re-export block:

```typescript
createCultivator,
getCombatLogs,
listCultivators,
selectCultivatorForAgent,
```

The remaining engine exports should be:

```typescript
export {
  advanceWorld,
  getCultivationRegistration,
  getAgentBindingInfo,
  getCultivatorState,
  getDaoLogs,
  getMessages,
  getRecentWorldEvents,
  getSectInfo,
  getStrategySnapshot,
  listAvailableActions,
  performAction,
  resolveCultivatorIdForAgent,
  saveCultivationRegistration,
  sendDirectMessage,
  statusOf,
  syncCultivatorFromPersona,
} from "./engine.js";
```

- [ ] **Step 4: Run domain tests to confirm golden-path.test.ts still passes**

Run: `node --import tsx --test packages/domain/src/golden-path.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/index.ts packages/domain/src/runtime.ts packages/domain/src/golden-path.test.ts
git commit -m "$(cat <<'EOF'
chore: remove unused domain barrel exports

createCultivator, listCultivators, selectCultivatorForAgent, and
getCombatLogs are used only internally within packages/domain.
They remain exported from engine.ts for domain-internal use but
are removed from the public index.ts and runtime.ts barrels.
golden-path.test.ts updated to import directly from engine.js.
EOF
)"
```

---

### Task 4: Stop Re-exporting Economy Internals

Both `index.ts` and `runtime.ts` use `export * from "./economy.js"` which exposes `computeReadiness`, `computeRecoveryState`, `computeActivityContext`, and `computeDaoPotential`. All four are only consumed internally by `engine.ts` — no outside package imports them.

**Files:**
- Modify: `packages/domain/src/index.ts`
- Modify: `packages/domain/src/runtime.ts`

- [ ] **Step 1: Remove the wildcard economy re-export from `index.ts`**

Remove this line:

```typescript
export * from "./economy.js";
```

- [ ] **Step 2: Remove the wildcard economy re-export from `runtime.ts`**

`runtime.ts` line 47 also has:

```typescript
export * from "./economy.js";
```

Remove it.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/domain/src/index.ts packages/domain/src/runtime.ts
git commit -m "$(cat <<'EOF'
chore: stop re-exporting economy internals from domain barrels

computeReadiness, computeRecoveryState, computeActivityContext, and
computeDaoPotential are only used internally by engine.ts. Removed
from both index.ts and runtime.ts barrel exports.
EOF
)"
```

---

### Task 5: Remove Dead Persistence Methods (`syncAgentPersona`, `syncPersona`)

Two deprecated methods on the `WorldRepository` interface are never called in production code. `apps/runtime-worker/src/middleware.test.ts` contains stub implementations for both (`syncAgentPersona` at line 55, `syncPersona` at line 61) inside a test-double factory, but these stubs only exist to satisfy the interface shape — they throw `"not used"` and are never invoked. Removing the methods from the interface means the stubs must also be removed to keep the test double consistent.

**Files:**
- Modify: `packages/persistence/src/world-repository.ts` (interface, lines 87-91)
- Modify: `packages/persistence/src/in-memory-world-repository.ts` (lines 276-357)
- Modify: `packages/persistence/src/supabase-world-repository.ts` (lines 539-634)
- Modify: `apps/runtime-worker/src/middleware.test.ts` (lines 55-57 and 61-63: remove stubs)

- [ ] **Step 1: Remove `syncAgentPersona` and `syncPersona` from the `WorldRepository` interface**

In `packages/persistence/src/world-repository.ts`, remove:

```typescript
/** @deprecated Prefer application-owned persona sync workflows plus transactWorld/saveAgentProfile. */
syncAgentPersona(agentId: string, input: AgentPersonaInput): Promise<AgentProfileRecord>;
```

and:

```typescript
/** @deprecated Prefer application-owned persona sync workflows plus transactWorld/saveAgentProfile. */
syncPersona(agentId: string, input: AgentPersonaInput): Promise<AgentPersonaSyncResult>;
```

- [ ] **Step 2: Remove `syncAgentPersona` implementation from `in-memory-world-repository.ts`**

Delete the `async syncAgentPersona(...)` method (lines 276-309).

- [ ] **Step 3: Remove `syncPersona` implementation from `in-memory-world-repository.ts`**

Delete the `async syncPersona(...)` method (lines 324-357).

- [ ] **Step 4: Remove `syncAgentPersona` implementation from `supabase-world-repository.ts`**

Delete the `async syncAgentPersona(...)` method (lines 539-572).

- [ ] **Step 5: Remove `syncPersona` implementation from `supabase-world-repository.ts`**

Delete the `async syncPersona(...)` method (lines 602-635).

- [ ] **Step 6: Remove stubs from the runtime-worker test double**

In `apps/runtime-worker/src/middleware.test.ts`, remove the `syncAgentPersona` stub (lines 55-57) and the `syncPersona` stub (lines 61-63) from the mock repository factory.

- [ ] **Step 7: Check if `AgentPersonaSyncResult` import can be removed from `world-repository.ts`**

After removing `syncPersona`, check if `AgentPersonaSyncResult` is still used in the file. If it is only used as the return type of `syncPersona`, remove it from the import block on lines 10-15.

- [ ] **Step 8: Run persistence and runtime-worker tests**

Run:
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/supabase-world-repository.test.ts`
- `node --import tsx --test apps/runtime-worker/src/middleware.test.ts`

Expected: All tests pass.

- [ ] **Step 9: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/persistence/src/world-repository.ts packages/persistence/src/in-memory-world-repository.ts packages/persistence/src/supabase-world-repository.ts apps/runtime-worker/src/middleware.test.ts
git commit -m "$(cat <<'EOF'
chore: remove dead syncAgentPersona and syncPersona methods

Both deprecated methods had zero callers across the entire codebase.
Application-owned persona sync workflows (via transactWorld +
saveAgentProfile) have fully replaced them.
EOF
)"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run smoke tests**

Run:
- `npm run smoke:onboarding`
- `npm run smoke:questionnaire-to-register`

Expected: Both pass.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Verify no dangling references in source code and live docs**

Check source files (`.ts`, `.json`) and actively-maintained docs (`README.md`, `AGENTS.md`, live specs) for stale references. Historical plans and specs that describe past decisions are excluded — they document what happened and do not need rewriting.

Run:

```bash
grep -r "world-api\|world-worker\|createSqliteWorldStore\|SqliteWorldStore\|createWorldStore\|dev:legacy-api\|dev:legacy-worker" \
  --include="*.ts" --include="*.json" \
  packages/ apps/ scripts/ package.json
```

Expected: Zero matches.

```bash
grep -l "world-api\|world-worker\|createSqliteWorldStore\|dev:legacy-api\|dev:legacy-worker" \
  README.md AGENTS.md
```

Expected: Zero matches.

Note: Historical docs under `docs/plans/` and `docs/specs/` (e.g. `deployment-platform/spec.md:11`, `openclaw-self-serve-onboarding/spec.md:9`, older implementation plans, and this plan file itself) will still contain these strings as historical record. That is expected and correct — those files describe past decisions, not current repo state.
