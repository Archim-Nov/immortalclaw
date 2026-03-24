# Agent Onboarding Autonomy Contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the tutorial explicitly optional in the runtime contract so Agents can safely choose between owner intent, risk-aware strategy, onboarding guidance, and free exploration.

**Architecture:** Add one small shared decision-policy view to the domain model and expose it from both state and strategy. Keep the existing onboarding surface for compatibility, but add explicit advisory fields and align its wording with the actual suggested action. Then sync the public docs so the docs and API teach the same rules.

**Tech Stack:** TypeScript, shared domain/contracts/application packages, markdown docs, Node test runner with `tsx`

---

### Task 1: Record The Approved Design

**Files:**
- Create: `docs/specs/agent-onboarding-autonomy/spec.md`
- Create: `docs/plans/2026-03-24-agent-onboarding-autonomy-design.md`
- Create: `docs/plans/2026-03-24-agent-onboarding-autonomy.md`

**Step 1: Save the design**

Capture:
- optional tutorial philosophy
- priority order
- additive contract strategy

**Step 2: Save the spec**

Record:
- runtime contract additions
- onboarding wording fix
- doc sync requirements

### Task 2: Write Failing Domain Tests First

**Files:**
- Modify: `packages/domain/src/engine.test.ts`
- Modify: `packages/application/src/agent-onboarding.test.ts`

**Step 1: Add a state-contract test**

Cover:
- onboarding is advisory
- free exploration is allowed
- state exposes the decision-policy order

**Step 2: Add a strategy-contract test**

Cover:
- strategy exposes the same decision-policy
- safety still outranks onboarding in the policy wording

**Step 3: Add an onboarding consistency test**

Cover:
- the `first-residence` hint and recommended action describe the same safe step

**Step 4: Run targeted tests to verify RED**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts packages/application/src/agent-onboarding.test.ts
```

Expected:
- new assertions fail because the new fields and wording do not exist yet

### Task 3: Implement The Additive Runtime Contract

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/runtime.ts`
- Modify: `packages/contracts/src/runtime-api.ts`

**Step 1: Add shared contract types**

Define:
- decision-policy view
- advisory onboarding fields

**Step 2: Populate the state payload**

Update `getCultivatorState(...)` so state returns:
- the shared decision policy
- onboarding fields that mark the tutorial as optional

**Step 3: Populate the strategy payload**

Update `getStrategySnapshot(...)` to return the same decision policy.

**Step 4: Fix the onboarding mismatch**

Make the `first-residence` hint and suggested action point at the same safe beginner step.

### Task 4: Sync Public Docs And Runtime Guides

**Files:**
- Modify: `apps/web/public/skill.md`
- Modify: `apps/web/public/heartbeat.md`
- Modify: `apps/world-do/src/agent-guides.ts`
- Modify: `docs/specs/openclaw-self-serve-onboarding/spec.md`

**Step 1: Update agent-facing docs**

Explain:
- onboarding is a suggested route
- owner intent and safety take priority
- free exploration remains valid

**Step 2: Update runtime-generated guides**

Make sure the lightweight markdown routes teach the same policy as the static docs.

### Task 5: Verify Green And Ship

**Files:**
- Review: `git diff`

**Step 1: Run targeted tests**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts packages/application/src/agent-onboarding.test.ts
```

Expected:
- targeted tests pass

**Step 2: Run full verification**

Run:

```bash
npm test
```

Expected:
- full suite passes

**Step 3: Review and ship**

Run:

```bash
git status --short
git diff --stat
git add docs/specs/agent-onboarding-autonomy/spec.md docs/plans/2026-03-24-agent-onboarding-autonomy-design.md docs/plans/2026-03-24-agent-onboarding-autonomy.md docs/specs/openclaw-self-serve-onboarding/spec.md apps/web/public/skill.md apps/web/public/heartbeat.md apps/world-do/src/agent-guides.ts packages/domain/src/model.ts packages/domain/src/engine.ts packages/domain/src/engine.test.ts packages/domain/src/runtime.ts packages/contracts/src/runtime-api.ts packages/application/src/agent-onboarding.test.ts
git commit -m "feat: clarify optional onboarding contract"
git push origin master
```

Expected:
- only intended files are committed
- the untracked local playtest issue list remains untouched
