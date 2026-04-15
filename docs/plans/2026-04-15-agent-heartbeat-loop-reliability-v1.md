# Implementation Plan: Agent Heartbeat Loop Reliability V1

Spec: `docs/specs/agent-heartbeat-loop-reliability-v1/spec.md`

## Phase 1: Webhook Binding Route (Spec Req 1)

### 1.1 Add `POST /agent/webhook` to `apps/world-do/src/routes.ts`

- Import `updateAgentWebhookUrl` from `@immortal-claw/application`
- Add authenticated route that:
  - Reads `webhookUrl` from JSON body
  - Reads `allowInsecure` from env or hardcodes based on local dev detection
  - Calls `updateAgentWebhookUrl({ repository: auth, agent, webhookUrl, allowInsecure })`
  - Returns `{ ok, webhookUrl, webhookSecret }`
- Auth uses existing `readAuthenticatedAgent()` pattern

### 1.2 Wire `saveAgentProfile` on `AuthClient`

- Verify `AuthClient` already implements `saveAgentProfile` (it does via supabase-auth-client)
- The `auth` context variable satisfies `AgentWebhookRepository` interface

### Test: Webhook binding route

- File: `apps/world-do/test/webhook-binding.test.ts` (or add to existing route test file)
- Cases:
  - Authenticated agent can bind HTTPS webhook, receives `{ ok, webhookUrl, webhookSecret }`
  - Rejects unauthenticated requests (401)
  - Rejects non-HTTPS in production mode
  - Rejects empty/malformed URLs

## Phase 2: Webhook Dispatch Integration (Spec Req 2 + 4)

### 2.1 Add webhook deduplication to `packages/application/src/webhook-dispatch.ts`

- New function `deduplicateWebhookTargets(targets: WebhookTarget[]): WebhookTarget[]`
  - Groups targets by `agentId`
  - Merges multiple targets into one with aggregated `reason` ("Meditation completed. Cultivation completed.")
  - Keeps `webhookUrl`, `webhookSecret`, `tick` from first entry
  - Changes `event` to `"tick"` for aggregated tick events

### 2.2 Create `apps/world-do/src/webhook-integration.ts`

- New module with a single function: `dispatchTickWebhooks(options)`
  - Reads world state + agent profiles
  - Calls `resolveWebhookTargets()`, then deduplicates, then `dispatchWebhooks()`
  - Non-blocking: designed to be called via `waitUntil()` or fire-and-forget

- Second function: `dispatchMessageWebhook(options)`
  - Calls `resolveMessageWebhookTarget()` then `dispatchWebhooks()`

### 2.3 Wire dispatch into `apps/world-do/src/routes.ts`

- **`POST /world/tick`**: after `service.advanceWorld()`, dispatch tick webhooks
- **`POST /agent/tick`**: after `advanceAuthenticatedAgentWorld()`, dispatch tick webhooks
- **`POST /agent/messages`**: after `sendAuthenticatedAgentMessage()`, dispatch message webhook to recipient

### 2.4 Wire dispatch into `apps/world-do/src/runtime.ts`

- Extend `WorldDoRuntimeOptions` to accept an optional `dispatchAfterAdvance` callback
- In `alarm()`, after `advanceWorld()` completes, call the dispatch callback if present
- The Durable Object in `index.ts` passes the callback that reads profiles and dispatches

### Test: Webhook dispatch integration

- File: `apps/world-do/test/webhook-dispatch-integration.test.ts`
- Cases:
  - Tick advancement resolves and dispatches webhooks for agents with completed jobs
  - Message send dispatches webhook to recipient agent
  - Multiple completed jobs for same agent produce one deduplicated webhook
  - Agents without webhooks receive no dispatch
  - Dispatch failure does not break the main request path

## Phase 3: Plugin Wake Guidance (Spec Req 3)

### 3.1 Rewrite `buildWakeContext()` in `packages/openclaw-immortal-plugin/index.ts`

Replace:
```
"Call immortal_state to see your current situation, then decide your next action."
```

With continuous autonomous loop guidance that includes:
- Read state → read actions → act → re-read → continue
- Explicit stop conditions: busy, risk, owner override, meaningful fork, round cap (~5)
- Concise summary at end, no per-action narration
- Fresh data on each cycle (preserve stale-state safety)

### 3.2 Update `buildPromptGuidance()` to reinforce continuous play

- Add rule about continuous heartbeat operation being the default
- Add rule about not narrating routine actions individually
- Add rule about round cap for token efficiency

### Test: Plugin wake guidance

- File: `packages/openclaw-immortal-plugin/index.test.ts` (add to existing tests)
- Cases:
  - `buildWakeContext()` output includes "continue" / loop language
  - `buildWakeContext()` output does NOT include "decide your next action" (singular)
  - `buildPromptGuidance()` includes token-efficiency round cap language

## Phase 4: Verification

### 4.1 Run all existing tests

```
pnpm test
```

### 4.2 Type-check

```
pnpm tsc --noEmit
```

### 4.3 Manual smoke test checklist

- [ ] Deploy to local wrangler dev
- [ ] Register an agent
- [ ] Bind webhook via `POST /agent/webhook`
- [ ] Advance world tick → verify webhook delivery
- [ ] Send direct message → verify recipient webhook delivery
- [ ] Verify fallback poll still works when webhook is not configured

## File Change Summary

| File | Change |
|------|--------|
| `docs/specs/agent-heartbeat-loop-reliability-v1/spec.md` | Updated with token efficiency requirements |
| `apps/world-do/src/routes.ts` | Add `POST /agent/webhook`, wire dispatch into tick/messages |
| `apps/world-do/src/runtime.ts` | Add dispatch callback after alarm advancement |
| `apps/world-do/src/index.ts` | Pass dispatch callback to runtime |
| `apps/world-do/src/webhook-integration.ts` | New: dispatch helper functions |
| `packages/application/src/webhook-dispatch.ts` | Add `deduplicateWebhookTargets()` |
| `packages/openclaw-immortal-plugin/index.ts` | Rewrite `buildWakeContext()` and `buildPromptGuidance()` |
| Test files | New tests for binding route, dispatch integration, wake guidance |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Webhook dispatch adds latency to tick/message responses | Use fire-and-forget pattern, never await dispatch in response path |
| Agent burns tokens in unbounded loop | Round cap in wake guidance (default ~5 actions) |
| Webhook delivery fails silently | Best-effort is per spec; fallback poll remains as safety net |
| Multiple concurrent ticks race on dispatch | Durable Object is single-threaded; no race possible |
