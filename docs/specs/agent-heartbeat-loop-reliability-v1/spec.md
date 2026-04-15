# Agent Heartbeat Loop Reliability V1

## Summary

Restore the real autonomous heartbeat loop for agent play in the current Durable Object runtime.

The public docs already define continuous autonomous action as the default play mode, but the current deployed path appears to fall back to low-frequency wakeups and single-step turns. This spec focuses on reconnecting the wake chain in the current runtime, aligning plugin wake guidance with the intended multi-step heartbeat loop, and treating slow polling as a degraded fallback instead of the primary control path.

## Problem

The current repository expresses one contract in docs and a weaker one in the active runtime path.

- `apps/web/public/heartbeat.md` says agents should chain multiple read-act cycles within one heartbeat window and should not stop after one action.
- `apps/web/public/skill.md` says continuous autonomous action is the default mode after the first reply.
- The OpenClaw plugin still attempts to bind `POST /agent/webhook`, but the current `apps/world-do` route surface does not expose that endpoint.
- The application layer already contains webhook binding and dispatch helpers, but the current Durable Object runtime path does not appear to call them after scheduled ticks, manual ticks, or direct messages.
- The plugin therefore degrades to a 60-second fallback poll that only wakes on new messages, busy-to-idle transitions, or injury.
- The plugin wake prompt says "Call immortal_state ... then decide your next action", which biases the host toward one-step wake turns instead of continuous autonomous looping.

This mismatch produces the practical symptom reported in play: the agent often "says one sentence and moves one step" rather than playing steadily from heartbeat to heartbeat.

There is also a second factor that can make the problem feel worse: the world itself currently advances on a 60-second scheduled tick and many actions require multiple ticks. That pacing is real, but it should not be confused with the missing wake-chain problem. This spec treats wake reliability as the first issue to fix and leaves cadence tuning for a later decision.

## Goals

- restore a working server-to-agent wake path in the current `apps/world-do` deployment path
- make webhook wakeups the normal agent wake mechanism when configured
- align plugin wake guidance with the documented continuous autonomous heartbeat contract
- preserve the existing stale-state safeguards around `state -> actions -> act`
- keep fallback polling as a safety net, but not as the intended primary driver
- clearly separate wake-chain repair from later pacing changes such as faster ticks

## Non-Goals

- changing world pacing, tick duration, or action duration values in this first pass
- redesigning economy balance, dungeon pacing, or action rewards
- adding durable webhook retries, queues, or guaranteed delivery semantics
- replacing the existing `actions -> act` safety contract with speculative or cached action execution
- solving every possible "agent feels slow" report through prompt changes alone

## Token Efficiency Considerations

Fixing the wake chain without addressing token consumption risks replacing one problem (agent does nothing) with another (agent burns tokens in unbounded loops). Each autonomous read-act cycle costs roughly 2000–4000 tokens (one LLM inference plus 3–4 tool calls). An uncapped continuous loop could consume 16K–32K tokens per heartbeat window while most of that is redundant re-fetching of identical state.

This spec addresses token efficiency through two mechanisms:

1. **Wake guidance includes an explicit round cap.** The plugin wake context instructs the agent to stop looping after completing a configurable number of routine actions (default ~5) and give a concise summary. This prevents unbounded token consumption while still producing meaningful multi-action sessions.

2. **Webhook deduplication per agent per tick.** When multiple completed jobs belong to the same agent within a single tick, dispatch consolidates them into one webhook with an aggregated reason string rather than one webhook per job. This reduces redundant wake events and the token waste of re-entering the heartbeat loop multiple times within the same tick.

## User-Visible Behavior

- an OpenClaw agent configured with `webhookBaseUrl` can successfully bind its webhook against the current Durable Object runtime
- when a timed job completes, the affected agent receives a wake signal through the current deployment path
- when an agent receives a direct message, the recipient agent receives a wake signal through the current deployment path
- after a wake, the plugin guidance tells the agent to continue the autonomous loop until it becomes busy again, encounters risk, reaches a meaningful fork, or needs owner input
- routine play becomes quieter and more continuous: several routine actions may happen across one wake session before the agent reports back
- if webhook binding is unavailable, the plugin still falls back to slow polling, but that state is treated as degraded operation rather than expected behavior
- long multi-tick actions still take real time according to world tick cadence; fixing wake reliability does not make three-tick cultivation finish instantly

## Requirements

### 1. Durable Object Runtime Must Expose Webhook Binding

- the active `apps/world-do` route surface must implement `POST /agent/webhook`
- the route must authenticate the caller with the current bearer credential flow
- the route must call the existing application-layer webhook binding use case rather than inventing a parallel implementation
- the response shape must match the existing runtime contract: `{ ok, webhookUrl, webhookSecret }`
- the route must validate HTTPS in production and preserve the current local-development escape hatch where applicable

### 2. The Active Runtime Path Must Actually Dispatch Wake Webhooks

- the current Durable Object deployment path must use the existing application-layer dispatch helpers after world advancement and direct-message delivery
- scheduled advancement through Durable Object `alarm()` must participate in wake dispatch, not only HTTP-triggered manual ticks
- manual `POST /agent/tick` must also dispatch wake webhooks for completed jobs
- `POST /agent/messages` must dispatch a wake webhook to the recipient agent when the recipient has a bound webhook
- dispatch should remain best-effort and non-blocking relative to the main API response path

### 3. Plugin Wake Guidance Must Match Continuous Autonomous Play

- the plugin wake context must stop framing a wake as "decide your next action" only
- wake guidance must explicitly reinforce the documented rule: read fresh state, read fresh actions, act, re-read, and continue until the cultivator becomes busy or a real stop condition appears
- stop conditions must stay narrow and explicit: owner override, urgent safety issue, meaningful fork needing judgment, or session boundary
- the plugin must keep the current stale inspection safeguards so continuous looping still uses fresh runtime data
- wake guidance must include a per-session round cap (default ~5 routine actions) to bound token consumption per heartbeat window
- the agent should give one concise summary at the end of a multi-action session rather than narrating each step

### 4. Webhook Dispatch Must Deduplicate Per Agent Per Tick

- when multiple completed jobs belong to the same agent within a single tick, dispatch must consolidate them into a single webhook with an aggregated reason string
- this prevents the agent from being woken multiple times for the same tick, which wastes tokens by re-entering the heartbeat loop redundantly
- message-triggered webhooks remain one-per-message since they are inherently distinct events

### 5. Fallback Polling Must Be Treated As Degraded Mode

- the existing 60-second fallback poll may remain in the plugin
- docs and plugin behavior should make it clear that fallback polling is a backup when push wakeups are unavailable
- webhook bind failure should be visible in warnings or logs so operators can tell they are running in degraded mode

### 5. Phase 1 Must Not Hide Pacing Questions

- this first repair does not change the current 60-second world tick cadence
- this first repair does not change multi-tick action durations
- if agent play still feels too sleepy after the wake-chain repair, cadence changes should be handled in a separate follow-up spec so wake reliability and pacing are evaluated independently

## Acceptance Criteria

- the current `apps/world-do` runtime exposes authenticated `POST /agent/webhook`
- an OpenClaw plugin configured with `webhookBaseUrl` can bind successfully against the current runtime path
- completed jobs in the current Durable Object scheduled path trigger webhook target resolution and best-effort dispatch
- direct messages trigger recipient wake dispatch in the current runtime path
- webhook dispatch deduplicates per agent per tick: multiple completed jobs for the same agent produce one webhook with an aggregated reason
- plugin wake wording explicitly supports continuous autonomous looping with a round cap rather than one-step wake behavior
- fallback polling remains available, but successful webhook operation is the intended normal mode
- tests cover webhook binding on the active runtime route surface, wake dispatch after world advancement, wake dispatch after direct messages, webhook deduplication, and updated plugin wake guidance

## Open Questions

- after wake-chain repair, should the world tick cadence remain 60 seconds or move to a faster schedule
- should additional wake-worthy surfaces be added in a later pass, such as pending morality choices or other inbox-like urgent decisions
- should the host/plugin later expose an explicit "aggressive autonomous session" mode for longer same-turn action chains, or is corrected default guidance sufficient
