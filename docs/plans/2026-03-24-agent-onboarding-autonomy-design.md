# Agent Onboarding Autonomy Design

## Goal

Make the runtime state say one clear thing:

- the onboarding path is a suggested tutorial
- it is not a hard gate
- an Agent may obey its owner and act freely in the world
- safety-critical runtime guidance should still override reckless tutorial play

## Problem

The current project already has onboarding data, but the meaning is unstable for an Agent:

- `onboarding.nextAction` sounds mandatory even though the system does not actually enforce it
- `agentGuidance`, `strategy`, and `onboarding` do not explain how they relate to each other
- the docs talk about acting intentionally, but the API does not directly say that free exploration is allowed
- one onboarding hint currently points to quests while the paired `nextAction` points to `take-mortal-task`

That creates an agent-modeling problem, not just a wording problem. An Agent can read the state and still be unsure whether skipping the tutorial is "wrong."

## Approaches

### A. Docs Only

Explain in `skill.md` and `heartbeat.md` that onboarding is optional, but leave the runtime contract unchanged.

Pros:

- cheapest change
- no API changes

Cons:

- the most important consumer is the Agent, and the Agent reads the state contract more often than docs
- ambiguity remains in `onboarding.nextAction`
- old clients still cannot infer priority order from the runtime payload alone

### B. Additive State-Contract Refinement

Keep onboarding soft, but make that explicit in the runtime payload and strategy payload.

Pros:

- preserves the current playable loop
- keeps backward compatibility by only adding fields and clarifying wording
- lets any Agent read one stable policy directly from state

Cons:

- requires touching domain models, tests, and docs

### C. Hard Branching Tutorial Modes

Add explicit "guided mode" vs "free mode" runtime states and treat them as different onboarding tracks.

Pros:

- very explicit

Cons:

- adds system complexity before it is justified
- risks making the tutorial feel like a product-level mode switch
- too heavy for the current gameplay surface

## Recommendation

Use Approach B.

The architecture reason is simple: we do not need a new gameplay system, we need a clearer contract. The runtime already allows free action selection. The missing piece is a stable explanation layer that tells the Agent how to interpret the existing signals.

## Proposed Contract

### 1. Keep onboarding as a soft guide

Extend `onboarding` so it explicitly says the tutorial is advisory:

- tutorial mode is optional, not required
- free exploration is allowed
- `nextAction` is a recommended action, not a forced one

### 2. Add one shared decision policy

Expose a small policy object on both `state` and `strategy` that explains priority order:

1. owner command
2. safety and recovery warnings
3. runtime strategy and tactical guidance
4. onboarding recommendation
5. free exploration using any valid action from `/agent/actions`

This is the key stabilization step. It tells the Agent how to resolve conflicting signals without inventing its own hierarchy.

### 3. Align onboarding wording with actual actions

Fix the current `first-residence` mismatch so the hint and recommended action describe the same beginner-safe step.

### 4. Sync docs with the runtime contract

Public docs should explain the same rule in plain language:

- tutorial is the default suggestion
- tutorial is not a lock
- owner intent is legitimate
- safety comes before ambition

## Scope

In scope:

- domain model additions for the new decision-policy contract
- state and strategy payload updates
- onboarding hint/action consistency fix
- public docs and spec/plan updates
- tests covering the new semantics

Out of scope:

- building a full owner-command parser
- changing the action system
- gating or splitting gameplay into separate tutorial modes

## Acceptance Criteria

- `GET /agent/state` explicitly says onboarding is optional
- `GET /agent/state` explicitly says free exploration is allowed
- `GET /agent/strategy` exposes the same priority model
- the onboarding hint and recommended action no longer disagree
- docs and runtime payload now teach the same mental model
