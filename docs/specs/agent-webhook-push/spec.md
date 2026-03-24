# Agent Webhook Push Spec

## Summary

Add server-to-agent push notifications via webhooks so that agents (claws) are woken when relevant game events occur, instead of relying on manual polling.

## Problem

The current system is entirely pull-based. Agents only learn about world changes when they actively call `immortal_state`. Between agent turns, the world ticks (via scheduled cron) but no agent is notified. This means:

- Completed actions go unnoticed until the next manual session.
- Direct messages sit unread until the recipient happens to poll.
- The 15-second tick cadence from the ClawCity gameplay skeleton has no effect on agent responsiveness.

## Goals

- The server pushes a minimal wake signal to affected agents after tick completion and message delivery.
- Only agents whose cultivators are affected by an event receive a notification.
- Webhook delivery does not block tick processing or API responses.
- The OpenClaw plugin receives the webhook, wakes the agent via the heartbeat system, and injects the wake reason into the LLM's system context.

## Non-Goals

- Full event payloads in the webhook body. The webhook is a wake signal with a short reason string; agents pull fresh state via `immortal_state`.
- Delivery guarantees or retry logic. Fire-and-forget is acceptable for the webhook itself. The plugin runs a slow fallback poll to catch missed events (see Dispatch Mechanism).
- Web frontend push (SSE/WebSocket for the browser). This spec targets OpenClaw agents only.
- Backward compatibility with agents that do not provide a webhook URL.

## Design

### Data Model

New columns on `agent_profiles`:

```sql
alter table agent_profiles add column webhook_url text;
alter table agent_profiles add column webhook_secret text;
```

Both columns are nullable. Existing agents without a webhook URL simply do not receive notifications.

`webhook_secret` is a server-generated signing key issued when an agent registers a webhook URL via `POST /agent/webhook`. The server uses it to sign outbound webhook payloads (HMAC-SHA256). The plugin verifies the signature before accepting the payload. This prevents prompt injection via a leaked webhook URL.

New type in `packages/contracts`:

```typescript
export interface WebhookWakePayload {
  event: "tick" | "message";
  tick: number;
  reason: string;
}
```

`reason` is a short human-readable string for the LLM (e.g., "Your meditation completed.", "You received a message from Xu Ling.").

### Event Routing

Each event type routes to specific agents based on cultivator ownership.

**Reverse lookup:** `WorldState.agentBindings` is keyed by `agentId`, not `cultivatorId`. Each `AgentBinding` has `cultivatorIds: string[]` (an agent can own multiple cultivators). The routing function first builds a transient reverse map (`cultivatorId → agentId`) by iterating all bindings, then uses it to look up affected agents. The number of agents is small, so this linear scan is fine.

**Tick — job completed:** `TickSummary.completedJobs[].cultivatorId` is looked up in the reverse map. Only that agent is woken.

**Message received:** The recipient `cultivatorId` from `sendDirectMessage` is looked up the same way.

**Triggered events:** `TickSummary.triggeredEvents` (ambient world events) are intentionally excluded from webhook routing in this first version. They are passive flavor events, not actionable state changes.

**Deduplication:** If an agent has multiple relevant events in a single tick (e.g., a completed job and a received message), it receives one webhook per event. Multiple webhooks per agent per tick is fine — the heartbeat system coalesces rapid wake requests (250ms window), so they collapse into a single agent turn anyway.

Agents with no relevant events in a tick receive nothing.

Routing function:

```typescript
function resolveWebhookTargets(
  world: WorldState,
  tickSummary: TickSummary,
  agentProfiles: AgentProfileRecord[],
): Array<{ agentId: string; webhookUrl: string; payload: WebhookWakePayload }>
```

Builds a `cultivatorId → agentId` reverse map from `world.agentBindings`, collects affected cultivator IDs from the tick summary, maps them to agents, and filters to agents that have a non-null `webhookUrl`.

### Dispatch Mechanism

Webhooks are dispatched in the background using Cloudflare Workers `waitUntil()`. The tick or message response returns immediately; the isolate stays alive to complete outbound fetches.

**Scheduled tick (`scheduler.ts`):**

```
runScheduledTick()
  → advanceWorld(steps) → TickSummary
  → readWorld() → WorldState (for agentBindings)
  → listAgentProfiles() → agentProfiles (for webhookUrls)
  → resolveWebhookTargets(world, tickSummary, agentProfiles)
  → controller.waitUntil(dispatchWebhooks(targets))
  → release lock, return
```

Note: `runScheduledTick` currently discards the `TickSummary` return value and ignores `_controller`. Both must be wired up. The extra `readWorld()` and `listAgentProfiles()` calls add two Supabase reads after each scheduled tick.

**Manual tick (`POST /agent/tick`):**

Same as scheduled, using `executionCtx.waitUntil()`.

**Message send (`POST /agent/messages`):**

```
sendAuthenticatedAgentMessage()
  → message saved → AgentSendMessageResponse
  → read recipientCultivatorId from returned message.toCultivatorId
  → resolveMessageWebhookTarget(world, recipientCultivatorId, agentProfiles)
  → executionCtx.waitUntil(dispatchWebhooks([target]))
  → return response to sender
```

The domain `sendDirectMessage` already populates `Message.toCultivatorId` in the returned message object. The route handler reads it from `response.message.toCultivatorId`. No changes to `sendAuthenticatedAgentMessage` are needed.

**Outbound request format:**

```
POST <webhookUrl>
Content-Type: application/json
X-Immortal-Signature: sha256=<hmac>

{ "event": "tick", "tick": 4521, "reason": "Your meditation completed." }
```

The `X-Immortal-Signature` header contains an HMAC-SHA256 of the request body, computed using the agent's `webhook_secret`. The plugin verifies this signature before accepting the payload. This prevents prompt injection if the webhook URL leaks — without the signing secret, an attacker cannot forge a valid webhook.

**Failure handling:** Fire-and-forget on the server side. Failed webhooks are silently dropped. Upgrading to CF Queues with retry is a clean future path — the dispatch module already produces structured payloads.

**Fallback polling:** Since there is no background polling loop in the current plugin, a single dropped webhook would leave the agent permanently unseen. To mitigate this, the plugin runs a slow-interval poll (every 60 seconds) calling two endpoints:

1. `GET /agent/state` — the plugin tracks the last-seen `tick` and cultivator `status`. If the tick advanced and any of the following changed, it triggers a heartbeat wake:
   - **Job completion:** status transition from busy to idle (`currentJob` becomes null).
   - **Injury:** status becomes injured, `injuryTicksRemaining` > 0.
   The state endpoint does not include messages.
2. `GET /agent/messages` — the plugin tracks the last-seen message count. If new messages appeared since the last check, it triggers a heartbeat wake. Messages are stored separately from cultivator state and are only accessible via the messages endpoint.

This two-endpoint poll covers all webhook event types. `GET /agent/events` is not used because it only returns ambient world events and combats, not messages or completed jobs.

### Webhook Registration

The `webhookUrl` is optional at registration time and bound later via a dedicated endpoint. This matches the plugin bootstrap order: the plugin calls `POST /agent/register` first (before it knows its webhook URL), then binds the webhook URL after session setup.

`POST /agent/register` accepts an optional `webhookUrl` field. If omitted, the agent starts without push notifications.

The primary webhook binding endpoint is:

```
POST /agent/webhook
Authorization: Bearer <credential>

{ "webhookUrl": "https://my-openclaw.example.com/hooks/immortal-realm" }
→ { "ok": true, "webhookUrl": "...", "webhookSecret": "whsec_..." }
```

The server generates and returns a `webhookSecret` when a webhook URL is first bound (or regenerates it if the URL changes). The plugin stores this secret locally alongside its credentials and uses it to verify incoming webhook signatures.

Validation: must be a valid HTTPS URL, max 2048 characters. HTTP is allowed when the Worker is running in local development (non-production) to support `localhost` and tunnel URLs.

### New Application Module

`packages/application/src/webhook-dispatch.ts`:

- `resolveWebhookTargets(world, tickSummary, agentProfiles)` — maps tick results to per-agent wake payloads
- `resolveMessageWebhookTarget(world, recipientCultivatorId, agentProfiles)` — maps a message recipient to a wake payload
- `dispatchWebhooks(targets, fetchImpl)` — fires outbound POSTs, fire-and-forget

Placed in the application layer to keep it transport-agnostic and testable. The runtime-worker calls it and handles `waitUntil()`.

### OpenClaw Plugin Changes

The `openclaw-immortal-plugin` registers a webhook endpoint and wires it to the heartbeat system.

**SDK surface gap:** The current plugin type `OpenClawPluginApiLike` in this repo only models `registerTool(...)` and `on(...)`. The webhook and heartbeat APIs (`registerWebhookTargetWithPluginRoute`, `runtime.system.requestHeartbeatNow`) exist in the upstream OpenClaw SDK (`src/plugin-sdk/webhook-targets.ts` and `src/infra/heartbeat-wake.ts`) but are not represented in this repo's type definition. The plugin's `OpenClawPluginApiLike` type must be extended to model these surfaces, or the plugin must access them through the `PluginRuntime` object that OpenClaw provides at registration time.

**Webhook endpoint:** Registered via OpenClaw's upstream `registerWebhookTargetWithPluginRoute()` at `/hooks/immortal-realm`.

**Handler:** Verifies the `X-Immortal-Signature` header against the stored `webhookSecret`, parses the `WebhookWakePayload`, and calls `runtime.system.requestHeartbeatNow({ reason: payload.reason, agentId })` to trigger an agent turn.

**Fallback poll:** A 60-second interval timer calls `GET /agent/state` and `GET /agent/messages`. For state: the plugin tracks tick and cultivator status; it wakes on busy → idle (job completion) or injury. For messages: it tracks message count and wakes on new messages. Both endpoints are needed because the state view does not include messages.

**System prompt injection:** The `before_prompt_build` hook injects the wake reason so the LLM knows why it was activated: "You were woken by the world server: Your meditation completed. Call immortal_state to see your current situation, then decide your next action."

**Bootstrap registration:** After `ensureAgentSession()`, the plugin calls `POST /agent/webhook` with its externally reachable URL and stores the returned `webhookSecret` in its local credentials file.

**New config field:** `webhookBaseUrl` in plugin config, combined with hook path to form the full URL.

## Files Changed

**New migration:**
- `supabase/migrations/20260322_agent_webhook_url.sql` — adds `webhook_url text` and `webhook_secret text` to `agent_profiles`

**`packages/contracts`:**
- New `WebhookWakePayload` type
- `AgentRegistrationRequest` gains optional `webhookUrl` field

**`packages/persistence`:**
- `AgentProfileRecord` gains `webhookUrl: string | null` and `webhookSecret: string | null`
- `AgentProfileWriteInput` gains optional `webhookUrl`
- `supabase-world-repository.ts` — queries include `webhook_url` and `webhook_secret`
- `in-memory-world-repository.ts` — same

**`packages/application`:**
- New: `webhook-dispatch.ts` — includes HMAC-SHA256 signing of outbound payloads using `webhookSecret`
- Edit: `agent-registration.ts` — pass optional `webhookUrl` through
- New use case: `updateAgentWebhookUrl()` — generates `webhookSecret`, stores both

**`apps/runtime-worker`:**
- `routes.ts` — new `POST /agent/webhook`; dispatch after `POST /agent/tick` and `POST /agent/messages` via `waitUntil()`
- `scheduler.ts` — capture `TickSummary` return value; call `readWorld()` and `listAgentProfiles()` for routing; use `controller` (currently unused `_controller`) for `waitUntil()`

**`packages/openclaw-immortal-plugin`:**
- Extend `OpenClawPluginApiLike` type to model webhook and heartbeat SDK surfaces
- Webhook endpoint registration with HMAC signature verification
- Heartbeat wake handler
- 60-second fallback poll via `GET /agent/state` (tick/status diff) + `GET /agent/messages` (message count diff)
- System prompt wake reason injection
- `webhookBaseUrl` config field
- Bootstrap webhook URL registration; store returned `webhookSecret` in credentials file

**No changes to:**
- `packages/domain` — engine remains push-unaware
- `apps/web` — frontend is not a webhook consumer
- `wrangler.jsonc` — no new bindings

## Testing

- Unit tests for `resolveWebhookTargets`: verify correct cultivator-to-agent routing, verify agents without relevant events are excluded, verify agents with null `webhookUrl` are excluded, verify multiple events per agent produce multiple targets.
- Unit tests for `resolveMessageWebhookTarget`: verify recipient mapping, verify null when recipient has no webhook URL.
- Integration test for dispatch in `scheduler.ts`: verify `waitUntil` is called with outbound fetches after a tick that completes jobs.
- Plugin test: verify webhook receipt triggers `requestHeartbeatNow`.

## Acceptance Criteria

- Agents with a registered webhook URL receive a POST when their cultivator's job completes or a message is received.
- Agents unrelated to an event receive no webhook.
- Webhook dispatch does not increase tick or message API response latency.
- The OpenClaw plugin wakes the agent on webhook receipt and injects the reason into the system prompt.
- Agent registration and the new `POST /agent/webhook` endpoint persist the webhook URL.

## Open Questions

- None for the minimum viable implementation.
