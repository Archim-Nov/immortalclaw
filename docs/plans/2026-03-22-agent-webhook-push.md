# Agent Webhook Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the server to push minimal wake signals to OpenClaw agents via webhooks when relevant game events occur (job completion, tribulation, direct message).

**Architecture:** New `webhook-dispatch` module in the application layer handles event routing and HMAC-signed outbound requests. The runtime-worker fires dispatches via `waitUntil()` after ticks and message sends. Persistence adds `webhook_url` and `webhook_secret` columns to `agent_profiles`. The OpenClaw plugin registers a webhook endpoint, verifies signatures, and wakes the agent via the heartbeat system.

**Tech Stack:** TypeScript, node:test, Cloudflare Workers (`waitUntil`), HMAC-SHA256 (Web Crypto API), Supabase Postgres.

**Spec:** `docs/specs/agent-webhook-push/spec.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260322_agent_webhook_url.sql`

- [ ] **Step 1: Write the migration**

```sql
alter table agent_profiles add column webhook_url text;
alter table agent_profiles add column webhook_secret text;
```

- [ ] **Step 2: Verify migration syntax**

Run: `npx supabase db lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322_agent_webhook_url.sql
git commit -m "feat(persistence): add webhook_url and webhook_secret columns to agent_profiles"
```

---

### Task 2: Persistence Layer — `AgentProfileRecord` and Repository Updates

**Files:**
- Modify: `packages/persistence/src/world-repository.ts:45-56` (AgentProfileWriteInput, AgentProfileRecord)
- Modify: `packages/persistence/src/supabase-world-repository.ts:62-73` (AgentProfileRow)
- Modify: `packages/persistence/src/supabase-world-repository.ts:619-647` (toAgentProfileRow, fromAgentProfileRow)
- Modify: `packages/persistence/src/supabase-world-repository.ts:123-130` (listAgentProfiles SELECT fields)
- Modify: `packages/persistence/src/in-memory-world-repository.ts:133-167` (saveAgentProfile)

- [x] **Step 1: Add fields to `AgentProfileRecord` and `AgentProfileWriteInput`**

In `packages/persistence/src/world-repository.ts`, add to `AgentProfileRecord`:

```typescript
webhookUrl: string | null;
webhookSecret: string | null;
```

Add to `AgentProfileWriteInput`:

```typescript
webhookUrl?: string;
webhookSecret?: string;
```

- [x] **Step 2: Add fields to `AgentProfileRow`**

In `packages/persistence/src/supabase-world-repository.ts`, add to the `AgentProfileRow` interface (line 62):

```typescript
webhook_url?: string | null;
webhook_secret?: string | null;
```

- [x] **Step 3: Update `toAgentProfileRow` and `fromAgentProfileRow`**

In `toAgentProfileRow` (line 619), add:

```typescript
webhook_url: profile.webhookUrl ?? null,
webhook_secret: profile.webhookSecret ?? null,
```

In `fromAgentProfileRow` (line 634), add:

```typescript
webhookUrl: row.webhook_url ?? null,
webhookSecret: row.webhook_secret ?? null,
```

- [x] **Step 4: Update SELECT field lists**

Find `listAgentProfiles` (line 123) and `getAgentProfile` (line 132) — add `webhook_url,webhook_secret` to the `select` field string. Also update `readAgentProfile` (line 607) if it has its own select string.

- [x] **Step 5: Update in-memory repository**

In `packages/persistence/src/in-memory-world-repository.ts`, ensure `saveAgentProfile` (line 133) passes through `webhookUrl` and `webhookSecret` fields when constructing the stored record. Set defaults:

```typescript
webhookUrl: input.webhookUrl ?? existing?.webhookUrl ?? null,
webhookSecret: input.webhookSecret ?? existing?.webhookSecret ?? null,
```

- [x] **Step 6: Run existing tests to verify no regressions**

Run: `node --import tsx --test "packages/persistence/**/*.test.ts" "packages/application/**/*.test.ts" "apps/runtime-worker/**/*.test.ts"`
Expected: All existing tests pass. The new nullable fields have defaults, so no existing code should break.

- [x] **Step 7: Commit**

```bash
git add packages/persistence/src/world-repository.ts packages/persistence/src/supabase-world-repository.ts packages/persistence/src/in-memory-world-repository.ts
git commit -m "feat(persistence): add webhookUrl and webhookSecret to agent profile storage"
```

---

### Task 3: Contracts — `WebhookWakePayload` Type

**Files:**
- Modify: `packages/contracts/src/runtime-api.ts`

- [x] **Step 1: Add optional `webhookUrl` to `AgentRegistrationRequest`**

In `packages/contracts/src/runtime-api.ts`, update the existing `AgentRegistrationRequest` (line 76):

```typescript
export interface AgentRegistrationRequest extends Omit<AgentRegistrationInput, "record"> {
  answers?: Record<RegistrationQuestionId, RegistrationAnswer>;
  record?: CultivationRegistrationRecord;
  webhookUrl?: string;
}
```

- [x] **Step 2: Add new types**

At the end of `packages/contracts/src/runtime-api.ts`, add:

```typescript
export interface WebhookWakePayload {
  event: "tick" | "message" | "tribulation";
  tick: number;
  reason: string;
}

export interface AgentWebhookBindResponse {
  ok: true;
  webhookUrl: string;
  webhookSecret: string;
}
```

- [x] **Step 3: Export from index**

Ensure the types are exported from `packages/contracts/src/index.ts` (if it re-exports from `runtime-api.ts`, this may already work).

- [x] **Step 4: Commit**

```bash
git add packages/contracts/src/runtime-api.ts
git commit -m "feat(contracts): add WebhookWakePayload and AgentWebhookBindResponse types"
```

---

### Task 4: Application Layer — Webhook Dispatch Module (Tests First)

**Files:**
- Create: `packages/application/src/webhook-dispatch.test.ts`
- Create: `packages/application/src/webhook-dispatch.ts`

- [x] **Step 1: Write failing tests for `resolveWebhookTargets`**

Create `packages/application/src/webhook-dispatch.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, syncCultivatorFromPersona } from "../../domain/src/runtime.js";
import type { TickSummary } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { resolveWebhookTargets, resolveMessageWebhookTarget, signPayload } from "./webhook-dispatch.js";

function createProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "c-1",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
    lastSeenAt: null,
    webhookUrl: "https://example.com/hooks/immortal-realm",
    webhookSecret: "whsec_test",
    ...overrides,
  };
}

test("resolveWebhookTargets returns targets for completed jobs", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Meditation completed." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].agentId, "agent-1");
  assert.equal(targets[0].payload.event, "tick");
  assert.equal(targets[0].payload.tick, 10);
  assert.ok(targets[0].payload.reason.includes("Meditation completed."));
});

test("resolveWebhookTargets returns targets for tribulations", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 20,
    advancedTicks: 1,
    completedJobs: [],
    tribulations: [{ cultivatorId: sync.selectedCultivatorId, success: true, summary: "Survived tribulation." }],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].payload.event, "tribulation");
});

test("resolveWebhookTargets excludes agents without webhookUrl", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId, webhookUrl: null })];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Done." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 0);
});

test("resolveWebhookTargets excludes unrelated agents", () => {
  const world = createSeedWorld();
  syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const sync2 = syncCultivatorFromPersona(world, { agentId: "agent-2", name: "Li Aotian" });
  const profiles = [
    createProfile({ agentId: "agent-1", webhookUrl: "https://a.com/hook" }),
    createProfile({ agentId: "agent-2", selectedCultivatorId: sync2.selectedCultivatorId, webhookUrl: "https://b.com/hook" }),
  ];
  const summary: TickSummary = {
    tick: 10,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync2.selectedCultivatorId, actionId: "meditate", summary: "Done." }],
    tribulations: [],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].agentId, "agent-2");
});

test("resolveWebhookTargets returns multiple targets for multiple events", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];
  const summary: TickSummary = {
    tick: 30,
    advancedTicks: 1,
    completedJobs: [{ cultivatorId: sync.selectedCultivatorId, actionId: "meditate", summary: "Meditation done." }],
    tribulations: [{ cultivatorId: sync.selectedCultivatorId, success: false, summary: "Failed tribulation." }],
    triggeredEvents: [],
  };

  const targets = resolveWebhookTargets(world, summary, profiles);
  assert.equal(targets.length, 2);
});

test("resolveMessageWebhookTarget returns target for recipient agent", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId })];

  const target = resolveMessageWebhookTarget(world, sync.selectedCultivatorId, "Su Mingyue", 5, profiles);
  assert.ok(target);
  assert.equal(target.agentId, "agent-1");
  assert.equal(target.payload.event, "message");
});

test("signPayload returns sha256= prefixed hex string", async () => {
  const sig = await signPayload('{"event":"tick"}', "test-secret");
  assert.ok(sig.startsWith("sha256="));
  assert.match(sig, /^sha256=[0-9a-f]{64}$/);
});

test("signPayload produces different signatures for different secrets", async () => {
  const body = '{"event":"tick"}';
  const sig1 = await signPayload(body, "secret-a");
  const sig2 = await signPayload(body, "secret-b");
  assert.notEqual(sig1, sig2);
});

test("resolveMessageWebhookTarget returns null when recipient has no webhook", () => {
  const world = createSeedWorld();
  const sync = syncCultivatorFromPersona(world, { agentId: "agent-1", name: "Su Mingyue" });
  const profiles = [createProfile({ agentId: "agent-1", selectedCultivatorId: sync.selectedCultivatorId, webhookUrl: null })];

  const target = resolveMessageWebhookTarget(world, sync.selectedCultivatorId, "Someone", 5, profiles);
  assert.equal(target, null);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test packages/application/src/webhook-dispatch.test.ts`
Expected: FAIL — module `./webhook-dispatch.js` not found.

- [x] **Step 3: Implement `resolveWebhookTargets` and `resolveMessageWebhookTarget`**

Create `packages/application/src/webhook-dispatch.ts`:

```typescript
import type { TickSummary, WorldState } from "../../domain/src/runtime.js";
import type { WebhookWakePayload } from "../../contracts/src/runtime-api.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface WebhookTarget {
  agentId: string;
  webhookUrl: string;
  webhookSecret: string;
  payload: WebhookWakePayload;
}

function buildCultivatorToAgentMap(world: WorldState): Map<string, string> {
  const map = new Map<string, string>();
  for (const binding of Object.values(world.agentBindings)) {
    for (const cultivatorId of binding.cultivatorIds) {
      map.set(cultivatorId, binding.agentId);
    }
  }
  return map;
}

function buildAgentLookup(profiles: AgentProfileRecord[]): Map<string, AgentProfileRecord> {
  const map = new Map<string, AgentProfileRecord>();
  for (const profile of profiles) {
    map.set(profile.agentId, profile);
  }
  return map;
}

export function resolveWebhookTargets(
  world: WorldState,
  tickSummary: TickSummary,
  agentProfiles: AgentProfileRecord[],
): WebhookTarget[] {
  const cultivatorToAgent = buildCultivatorToAgentMap(world);
  const agentLookup = buildAgentLookup(agentProfiles);
  const targets: WebhookTarget[] = [];

  for (const job of tickSummary.completedJobs) {
    const agentId = cultivatorToAgent.get(job.cultivatorId);
    if (!agentId) continue;
    const profile = agentLookup.get(agentId);
    if (!profile?.webhookUrl || !profile.webhookSecret) continue;
    targets.push({
      agentId,
      webhookUrl: profile.webhookUrl,
      webhookSecret: profile.webhookSecret,
      payload: { event: "tick", tick: tickSummary.tick, reason: job.summary },
    });
  }

  for (const trib of tickSummary.tribulations) {
    const agentId = cultivatorToAgent.get(trib.cultivatorId);
    if (!agentId) continue;
    const profile = agentLookup.get(agentId);
    if (!profile?.webhookUrl || !profile.webhookSecret) continue;
    targets.push({
      agentId,
      webhookUrl: profile.webhookUrl,
      webhookSecret: profile.webhookSecret,
      payload: { event: "tribulation", tick: tickSummary.tick, reason: trib.summary },
    });
  }

  return targets;
}

export function resolveMessageWebhookTarget(
  world: WorldState,
  recipientCultivatorId: string,
  senderName: string,
  tick: number,
  agentProfiles: AgentProfileRecord[],
): WebhookTarget | null {
  const cultivatorToAgent = buildCultivatorToAgentMap(world);
  const agentId = cultivatorToAgent.get(recipientCultivatorId);
  if (!agentId) return null;
  const agentLookup = buildAgentLookup(agentProfiles);
  const profile = agentLookup.get(agentId);
  if (!profile?.webhookUrl || !profile.webhookSecret) return null;
  return {
    agentId,
    webhookUrl: profile.webhookUrl,
    webhookSecret: profile.webhookSecret,
    payload: { event: "message", tick, reason: `You received a message from ${senderName}.` },
  };
}

export async function signPayload(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

export async function dispatchWebhooks(
  targets: WebhookTarget[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await Promise.allSettled(
    targets.map(async (target) => {
      const body = JSON.stringify(target.payload);
      const signature = await signPayload(body, target.webhookSecret);
      await fetchImpl(target.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Immortal-Signature": signature,
        },
        body,
      });
    }),
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test packages/application/src/webhook-dispatch.test.ts`
Expected: All tests pass.

- [x] **Step 5: Export from application index**

Add to `packages/application/src/index.ts`:

```typescript
export {
  resolveWebhookTargets,
  resolveMessageWebhookTarget,
  dispatchWebhooks,
  signPayload,
  type WebhookTarget,
} from "./webhook-dispatch.js";
```

- [x] **Step 6: Commit**

```bash
git add packages/application/src/webhook-dispatch.ts packages/application/src/webhook-dispatch.test.ts packages/application/src/index.ts
git commit -m "feat(application): add webhook dispatch module with event routing and HMAC signing"
```

---

### Task 5: Application Layer — `updateAgentWebhookUrl` Use Case

**Files:**
- Create: `packages/application/src/agent-webhook.ts`
- Create: `packages/application/src/agent-webhook.test.ts`

- [x] **Step 1: Write failing test**

Create `packages/application/src/agent-webhook.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import type { AgentProfileRecord, AgentProfileWriteInput } from "../../persistence/src/world-repository.js";
import { updateAgentWebhookUrl } from "./agent-webhook.js";

function createProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "c-1",
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
    lastSeenAt: null,
    webhookUrl: null,
    webhookSecret: null,
    ...overrides,
  };
}

test("updateAgentWebhookUrl stores URL and returns a new secret", async () => {
  let savedInput: AgentProfileWriteInput | undefined;
  const repository = {
    saveAgentProfile: async (input: AgentProfileWriteInput) => {
      savedInput = input;
      return createProfile({
        webhookUrl: input.webhookUrl ?? null,
        webhookSecret: input.webhookSecret ?? null,
      });
    },
  };

  const result = await updateAgentWebhookUrl({
    repository,
    agent: createProfile(),
    webhookUrl: "https://example.com/hooks/immortal-realm",
  });

  assert.equal(result.ok, true);
  assert.equal(result.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.ok(result.webhookSecret.startsWith("whsec_"));
  assert.ok(savedInput);
  assert.equal(savedInput.webhookUrl, "https://example.com/hooks/immortal-realm");
  assert.ok(savedInput.webhookSecret?.startsWith("whsec_"));
});

test("updateAgentWebhookUrl rejects non-HTTPS URLs in production", async () => {
  const repository = {
    saveAgentProfile: async (input: AgentProfileWriteInput) => createProfile(),
  };

  await assert.rejects(
    updateAgentWebhookUrl({
      repository,
      agent: createProfile(),
      webhookUrl: "http://evil.com/hook",
      allowInsecure: false,
    }),
    /HTTPS/,
  );
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --import tsx --test packages/application/src/agent-webhook.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement `updateAgentWebhookUrl`**

Create `packages/application/src/agent-webhook.ts`:

```typescript
import type { AgentWebhookBindResponse } from "../../contracts/src/runtime-api.js";
import type { AgentProfileRecord, AgentProfileWriteInput } from "../../persistence/src/world-repository.js";
import { createApplicationError } from "./errors.js";

export interface AgentWebhookRepository {
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
}

export async function updateAgentWebhookUrl(options: {
  repository: AgentWebhookRepository;
  agent: AgentProfileRecord;
  webhookUrl: string;
  allowInsecure?: boolean;
}): Promise<AgentWebhookBindResponse> {
  const { repository, agent, webhookUrl, allowInsecure } = options;

  const trimmed = webhookUrl.trim();
  if (trimmed.length > 2048) {
    throw createApplicationError(400, "webhookUrl must be at most 2048 characters.");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw createApplicationError(400, "webhookUrl must be a valid URL.");
  }
  if (!allowInsecure && parsed.protocol !== "https:") {
    throw createApplicationError(400, "webhookUrl must use HTTPS.");
  }

  const webhookSecret = `whsec_${crypto.randomUUID()}`;

  await repository.saveAgentProfile({
    agentId: agent.agentId,
    name: agent.name,
    selectedCultivatorId: agent.selectedCultivatorId,
    genderPresentation: agent.genderPresentation,
    pronouns: agent.pronouns,
    origin: agent.origin,
    temperament: agent.temperament,
    webhookUrl: trimmed,
    webhookSecret,
  });

  return { ok: true, webhookUrl: trimmed, webhookSecret };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `node --import tsx --test packages/application/src/agent-webhook.test.ts`
Expected: All tests pass.

- [x] **Step 5: Export from application index**

Add to `packages/application/src/index.ts`:

```typescript
export { updateAgentWebhookUrl } from "./agent-webhook.js";
```

- [x] **Step 6: Commit**

```bash
git add packages/application/src/agent-webhook.ts packages/application/src/agent-webhook.test.ts packages/application/src/index.ts
git commit -m "feat(application): add updateAgentWebhookUrl use case with secret generation"
```

---

### Task 6: Runtime Worker — `POST /agent/webhook` Endpoint

**Files:**
- Modify: `apps/runtime-worker/src/routes.ts`

- [ ] **Step 1: Add the endpoint**

In `apps/runtime-worker/src/routes.ts`, after the existing `POST /agent/credential/reset` handler, add:

```typescript
app.post("/agent/webhook", async (context) => {
  const repository = resolveRepository(context.env, options.repository);
  const agent = await readAuthenticatedAgent(context.req.raw, repository);
  const body = (await context.req.json()) as Record<string, unknown>;
  const webhookUrl = readRequiredBodyString(body.webhookUrl, "Body must include webhookUrl.");
  const allowInsecure = !context.env.FRONTEND_ORIGIN || context.env.FRONTEND_ORIGIN.includes("localhost");
  return context.json(
    await updateAgentWebhookUrl({ repository, agent, webhookUrl, allowInsecure }),
  );
});
```

Add `updateAgentWebhookUrl` to the imports from application.

- [ ] **Step 2: Run existing tests**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/runtime-worker/src/routes.ts
git commit -m "feat(runtime-worker): add POST /agent/webhook endpoint"
```

---

### Task 7: Runtime Worker — Webhook Dispatch After Ticks

**Files:**
- Modify: `apps/runtime-worker/src/scheduler.ts`
- Modify: `apps/runtime-worker/src/routes.ts` (POST /agent/tick handler)

- [ ] **Step 1: Update `runScheduledTick` to dispatch webhooks**

In `apps/runtime-worker/src/scheduler.ts`, update the function to capture the tick summary, read world and profiles, and dispatch:

```typescript
import { createRuntimeService, resolveWebhookTargets, dispatchWebhooks } from "../../../packages/application/src/index.js";
import type { WorldRepository } from "../../../packages/persistence/src/index.js";
import type { RuntimeWorkerBindings } from "./env.js";
import { readTickSteps, resolveRepository } from "./env.js";

export interface ScheduledController {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ScheduledEventLike {
  cron: string;
}

export async function runScheduledTick(
  event: ScheduledEventLike,
  bindings: RuntimeWorkerBindings,
  controller: ScheduledController,
  repository?: WorldRepository,
): Promise<void> {
  const resolvedRepository = resolveRepository(bindings, repository);
  const lockOwner = `scheduled:${event.cron}`;
  const lock = await resolvedRepository.acquireTickLock(lockOwner);

  if (!lock) {
    return;
  }

  try {
    const service = createRuntimeService({ repository: resolvedRepository });
    const tickSummary = await service.advanceWorld(readTickSteps(bindings), "scheduled");
    const [world, profiles] = await Promise.all([
      resolvedRepository.readWorld(),
      resolvedRepository.listAgentProfiles(),
    ]);
    const targets = resolveWebhookTargets(world, tickSummary, profiles);
    if (targets.length > 0) {
      controller.waitUntil(dispatchWebhooks(targets));
    }
  } finally {
    await resolvedRepository.releaseTickLock(lock.lockId);
  }
}
```

- [ ] **Step 2: Update `POST /agent/tick` to dispatch webhooks**

In `apps/runtime-worker/src/routes.ts`, update the `/agent/tick` handler (line 538):

```typescript
app.post("/agent/tick", async (context) => {
  const repository = resolveRepository(context.env, options.repository);
  await readAuthenticatedAgent(context.req.raw, repository);
  const body = (await context.req.json()) as Partial<AdvanceWorldRequest>;
  const steps = typeof body.steps === "number" ? body.steps : 1;
  const tickSummary = await advanceAuthenticatedAgentWorld({ repository, steps });
  const [world, profiles] = await Promise.all([
    repository.readWorld(),
    repository.listAgentProfiles(),
  ]);
  const targets = resolveWebhookTargets(world, tickSummary, profiles);
  if (targets.length > 0) {
    context.executionCtx.waitUntil(dispatchWebhooks(targets));
  }
  return context.json(tickSummary);
});
```

Add `resolveWebhookTargets` and `dispatchWebhooks` to the imports from application.

- [ ] **Step 3: Run existing tests**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/runtime-worker/src/scheduler.ts apps/runtime-worker/src/routes.ts
git commit -m "feat(runtime-worker): dispatch webhooks after scheduled and manual ticks"
```

---

### Task 8: Runtime Worker — Webhook Dispatch After Message Send

**Files:**
- Modify: `apps/runtime-worker/src/routes.ts` (POST /agent/messages handler)

- [ ] **Step 1: Update the message handler to dispatch**

In `apps/runtime-worker/src/routes.ts`, update the `POST /agent/messages` handler (line 455). After the message is sent, read the recipient's cultivator ID from the response and dispatch:

```typescript
app.post("/agent/messages", async (context) => {
  const repository = resolveRepository(context.env, options.repository);
  const agent = await readAuthenticatedAgent(context.req.raw, repository);
  const body = (await context.req.json()) as AgentSendMessageRequest & Record<string, unknown>;
  const content = readRequiredBodyString(body.content, "Body must include content.");
  const response = await sendAuthenticatedAgentMessage({
    repository,
    agent,
    request: {
      toAgentId: readOptionalBodyString(body.toAgentId),
      toCultivatorId: readOptionalBodyString(body.toCultivatorId),
      subject: readOptionalBodyString(body.subject),
      content,
    },
  });
  const recipientCultivatorId = response.message.toCultivatorId;
  if (recipientCultivatorId) {
    const [world, profiles] = await Promise.all([
      repository.readWorld(),
      repository.listAgentProfiles(),
    ]);
    const target = resolveMessageWebhookTarget(world, recipientCultivatorId, agent.name, world.tick, profiles);
    if (target) {
      context.executionCtx.waitUntil(dispatchWebhooks([target]));
    }
  }
  return context.json(response);
});
```

Add `resolveMessageWebhookTarget` to the imports from application.

- [ ] **Step 2: Run existing tests**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/runtime-worker/src/routes.ts
git commit -m "feat(runtime-worker): dispatch webhook to recipient after message send"
```

---

### Task 9: Integration Test — Webhook Dispatch After Tick

**Files:**
- Modify: `apps/runtime-worker/src/index.test.ts`

- [ ] **Step 1: Write integration test**

Add a test that registers an agent with a webhook URL, performs an action, advances a tick, and verifies an outbound webhook fetch was made. The test should use the in-memory repository and a mock `fetch` injected via the dispatch module.

The test needs to:
1. Register an agent via `POST /agent/register`
2. Bind a webhook URL via `POST /agent/webhook`
3. Perform an action via `POST /agent/act`
4. Advance a tick via `POST /agent/tick`
5. Verify the tick response includes the completed job
6. Verify the webhook URL received a POST with a valid `X-Immortal-Signature` header

**Note on `executionCtx.waitUntil`:** The Hono test client does not provide a real `executionCtx`. The test should verify webhook dispatch by either: (a) providing a mock `executionCtx` with a `waitUntil` that captures promises and awaits them, or (b) injecting a mock `fetch` that records outbound calls and asserting against it after the tick response. Consult existing tests in `apps/runtime-worker/src/index.test.ts` for the exact app creation pattern — you may need to pass a custom `waitUntil` in the test factory.

- [ ] **Step 2: Run the test**

Run: `node --import tsx --test apps/runtime-worker/src/index.test.ts`
Expected: All tests pass including the new one.

- [ ] **Step 3: Commit**

```bash
git add apps/runtime-worker/src/index.test.ts
git commit -m "test(runtime-worker): integration test for webhook dispatch after tick"
```

---

### Task 10: OpenClaw Plugin — Extend Types and Add Webhook Handler

**Files:**
- Modify: `packages/openclaw-immortal-plugin/index.ts`

- [ ] **Step 1: Extend `OpenClawPluginApiLike` type**

Add the webhook and heartbeat surfaces to the type. Since the actual OpenClaw SDK APIs may not be available in all environments, model them as optional:

```typescript
type OpenClawPluginApiLike = {
  pluginConfig?: Record<string, unknown>;
  logger?: PluginLogger;
  registerTool: (tool: ToolDefinition) => void;
  on?: (
    event: string,
    handler: (...args: unknown[]) => Promise<PromptHookResult> | PromptHookResult,
  ) => void;
  registerWebhookHandler?: (path: string, handler: (req: { body: string; headers: Record<string, string> }) => Promise<{ status: number; body?: string }>) => void;
  requestHeartbeatNow?: (opts: { reason: string; agentId?: string }) => void;
};
```

- [ ] **Step 2: Add `webhookBaseUrl` to `PluginConfig`**

```typescript
type PluginConfig = {
  // ... existing fields
  webhookBaseUrl?: string;
};
```

Update `resolvePluginConfig` to read it.

- [ ] **Step 3: Add HMAC verification helper**

```typescript
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const expectedHex = signature.replace("sha256=", "");
  const expectedBytes = new Uint8Array(expectedHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  return crypto.subtle.verify("HMAC", key, expectedBytes, encoder.encode(body));
}
```

- [ ] **Step 4: Register webhook handler on bootstrap**

Inside `register(api)`, after existing tool registrations, add. Note: step 6 below adds `webhookSecret` to `AgentSession`, so the handler uses proper typing — no `as any` casts needed.

```typescript
let lastWakeReason: string | undefined;

if (api.registerWebhookHandler && api.requestHeartbeatNow) {
  api.registerWebhookHandler("/hooks/immortal-realm", async (req) => {
    const session = loadSession();
    if (!session) return { status: 401 };
    const secret = session.webhookSecret;
    if (!secret) return { status: 401 };
    const sig = req.headers["x-immortal-signature"] ?? "";
    const valid = await verifyWebhookSignature(req.body, sig, secret);
    if (!valid) return { status: 403 };
    const payload = JSON.parse(req.body);
    lastWakeReason = payload.reason;
    api.requestHeartbeatNow!({ reason: payload.reason, agentId: session.agentId });
    return { status: 200, body: '{"ok":true}' };
  });
}
```

- [ ] **Step 5: Add `webhookSecret` to `AgentSession` type**

This must come before the webhook handler (step 4) and bootstrap registration (step 6) since both reference `session.webhookSecret`.

```typescript
type AgentSession = {
  // ... existing fields
  webhookSecret?: string;
};
```

Update `coerceAgentSession` to read `webhookSecret` from the input object.

- [ ] **Step 6: Add webhook URL registration on bootstrap**

After `ensureAgentSession()` succeeds and the session is cached, call `POST /agent/webhook` if `webhookBaseUrl` is configured:

```typescript
if (config.webhookBaseUrl && session) {
  const webhookUrl = `${config.webhookBaseUrl}/hooks/immortal-realm`;
  try {
    const result = await requestAgentWorld(session, "/agent/webhook", {
      method: "POST",
      body: JSON.stringify({ webhookUrl }),
    });
    if (result && typeof result === "object" && "webhookSecret" in result) {
      const updated: AgentSession = {
        ...session,
        webhookSecret: String((result as { webhookSecret: unknown }).webhookSecret),
      };
      cacheSession(updated);
    }
  } catch {
    log.warn?.("[immortal-realm] Failed to register webhook URL.");
  }
}
```

- [ ] **Step 7: Add system prompt injection for wake reason**

In the existing `before_prompt_build` hook (already wired via `api.on?.("before_prompt_build", ...)`), add the wake reason to the prepended system context when available:

```typescript
// Inside the existing before_prompt_build handler:
const wakeContext = lastWakeReason
  ? `\nYou were woken by the world server: ${lastWakeReason} Call immortal_state to see your current situation, then decide your next action.`
  : "";
// Append wakeContext to the existing prependSystemContext string
// Clear lastWakeReason after injecting it so it's not repeated on subsequent turns
lastWakeReason = undefined;
```

This is the mechanism that gives the LLM contextual awareness of why it was woken. The `lastWakeReason` variable is set by the webhook handler (step 4) and by the fallback poll (step 8).

- [ ] **Step 8: Add fallback poll timer**

Inside `register(api)`, add a 60-second interval that polls state and messages:

```typescript
let lastSeenTick = 0;
let lastSeenStatus = "";
let lastSeenNextTribTick = 0;
let lastSeenMessageCount = 0;

const pollInterval = setInterval(async () => {
  try {
    const session = loadSession();
    if (!session || !api.requestHeartbeatNow) return;
    const state = await requestAgentWorld(session, "/agent/state") as any;
    const messages = await requestAgentWorld(session, "/agent/messages") as unknown[];
    const tick = state?.tick ?? 0;
    const status = state?.cultivator?.status ?? "";
    const nextTribTick = state?.tribulation?.nextTribulationTick ?? 0;
    const messageCount = Array.isArray(messages) ? messages.length : 0;

    if (lastSeenTick > 0) {
      const stateChanged = (lastSeenStatus === "busy" && status === "idle")
        || (status === "injured" && lastSeenStatus !== "injured")
        || (nextTribTick !== lastSeenNextTribTick && lastSeenNextTribTick > 0);
      const newMessages = messageCount > lastSeenMessageCount;
      if (stateChanged || newMessages) {
        lastWakeReason = "Fallback poll detected state change.";
        api.requestHeartbeatNow({ reason: lastWakeReason });
      }
    }
    lastSeenTick = tick;
    lastSeenStatus = status;
    lastSeenNextTribTick = nextTribTick;
    lastSeenMessageCount = messageCount;
  } catch {
    // Silently ignore poll failures
  }
}, 60_000);
if (pollInterval.unref) pollInterval.unref();
```

- [ ] **Step 9: Run existing plugin tests**

Run: `node --import tsx --test packages/openclaw-immortal-plugin/index.test.ts`
Expected: All existing tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/openclaw-immortal-plugin/index.ts
git commit -m "feat(openclaw-plugin): add webhook handler, HMAC verification, fallback poll, and bootstrap registration"
```

---

### Task 11: Plugin Test — Webhook Receipt Triggers Heartbeat

**Files:**
- Modify: `packages/openclaw-immortal-plugin/index.test.ts`

- [ ] **Step 1: Add test for webhook handler**

Add a test that creates the plugin with a mock `registerWebhookHandler` and `requestHeartbeatNow`, sends a webhook with a valid HMAC signature, and verifies `requestHeartbeatNow` was called with the correct reason.

Consult `packages/openclaw-immortal-plugin/index.test.ts` for the existing test setup pattern (mock API, mock fetch, plugin creation).

- [ ] **Step 2: Run the test**

Run: `node --import tsx --test packages/openclaw-immortal-plugin/index.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/openclaw-immortal-plugin/index.test.ts
git commit -m "test(openclaw-plugin): verify webhook receipt triggers heartbeat wake"
```

---

### Task 12: Full Test Suite and Cleanup

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Fix any regressions**

If any test fails, investigate and fix. Common issues:
- Missing `webhookUrl`/`webhookSecret` fields in test fixtures that construct `AgentProfileRecord` objects. Add `webhookUrl: null, webhookSecret: null` to those fixtures.

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "fix: add webhook fields to test fixtures"
```
