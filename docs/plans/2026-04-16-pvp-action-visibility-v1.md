# PVP Action Visibility V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose city-duel PVP actions only when they are truly valid in the current world snapshot, and cancel pending challenges when either duelist leaves the original location.

**Architecture:** Keep the change inside `packages/domain/src/engine.ts`, where action generation and pending-challenge cleanup already live. Add a small shared helper layer for duel-target eligibility and pending-challenge validity so action generation, cleanup, and tests all reference the same rules.

**Tech Stack:** TypeScript, Node test runner, workspace monorepo runtime in `packages/domain`

---

## Linked Spec

- `docs/specs/pvp-action-visibility-v1/spec.md`

## Tasks

### Task 1: Freeze the desired behavior with failing tests

**Files:**
- Modify: `packages/domain/src/engine.test.ts`

**Step 1: Write failing tests for duel action visibility**

Add tests that prove:

- no `challenge-cultivator:*` action appears when the actor is alone in the current safe location
- a `challenge-cultivator:*` action appears when an eligible same-location target exists
- no duel action appears for targets who are in another location or same sect

**Step 2: Write failing tests for pending response visibility**

Add tests that prove:

- `accept-pvp-challenge:*` and `reject-pvp-challenge:*` appear for the target immediately after a challenge is issued
- those response actions disappear if the challenger leaves the original location before response

**Step 3: Write failing tests for movement-based cancellation**

Add a test that proves:

- after one side leaves the original location and the world advances
- the pending challenge is removed
- the target no longer references `pendingPvpChallengeId`
- both sides receive a cancellation message

**Step 4: Run the targeted test command and confirm failure**

Run:

```bash
npm.cmd run test -- packages/domain/src/engine.test.ts --test-name-pattern "pvp|duel|challenge|sect duties move to the sect outpost|sect titles recalculate"
```

Expected:

- new visibility/cancellation tests fail
- existing duel tests continue to exercise the current path

### Task 2: Add shared PVP eligibility helpers and wire action generation

**Files:**
- Modify: `packages/domain/src/engine.ts`

**Step 1: Add small shared helper functions**

Implement focused helpers near the existing PVP helpers, for example:

- a helper that checks whether a target cultivator is currently challengeable
- a helper that checks whether a pending challenge is still valid
- a helper that cancels an invalid pending challenge and emits messages

The helpers should reuse current rules rather than redefine duel behavior in multiple places.

**Step 2: Wire duel challenge actions into `listAvailableActions()`**

In the social/action-generation section:

- gather same-location cultivators
- filter them through the helper
- add `challenge-cultivator:<id>` actions only for valid targets

Keep the surrounding style aligned with current social and party action generation.

**Step 3: Wire pending response actions into `listAvailableActions()`**

If the acting cultivator has a pending incoming challenge:

- validate the challenge with the shared helper
- if valid, add `accept-pvp-challenge:<id>` and `reject-pvp-challenge:<id>`
- if invalid, do not expose them

### Task 3: Integrate movement-based cancellation into world advancement

**Files:**
- Modify: `packages/domain/src/engine.ts`

**Step 1: Extend pending-challenge cleanup**

In the per-tick cleanup path that already handles PVP timeout:

- reuse the shared validity helper
- cancel the challenge when either duelist has left the original location
- emit cancellation messages to both sides

**Step 2: Keep `performAction` behavior defensive**

Do not remove current `performAction` validation. The action surface should become safer, but stale actions must still fail safely.

### Task 4: Run focused tests, then repository verification

**Files:**
- No code changes expected unless a failing test reveals an issue

**Step 1: Run focused engine tests**

Run:

```bash
npm.cmd run test -- packages/domain/src/engine.test.ts --test-name-pattern "pvp|duel|challenge"
```

Expected:

- all PVP-related tests pass

**Step 2: Run broader regression coverage**

Run:

```bash
npm.cmd run test -- packages/domain/src/sect-level.test.ts apps/world-do/src/routes.test.ts
```

Expected:

- sect and route summaries remain green

**Step 3: Run full repository tests**

Run:

```bash
npm.cmd run test
```

Expected:

- full suite passes

## Verification

- `npm.cmd run test -- packages/domain/src/engine.test.ts --test-name-pattern "pvp|duel|challenge"`
- `npm.cmd run test -- packages/domain/src/sect-level.test.ts apps/world-do/src/routes.test.ts`
- `npm.cmd run test`

## Doc Updates

- Create: `docs/specs/pvp-action-visibility-v1/spec.md`
- Create: `docs/plans/2026-04-16-pvp-action-visibility-v1.md`
- Review whether `apps/web/public/skill.md` needs a follow-up doc refresh only if the action contract wording becomes materially inaccurate
