# Combat Gameplay V1 Action-Layer Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the current combat V1 so it has an explicit action layer with `普通攻击 / 核心技 / 逃跑`, instead of treating the route layer as the whole combat system.

**Architecture:** Keep the existing `action-first -> timed job -> advanceWorld()` combat skeleton, and keep the current route layer (`brute / finesse / tactic`), initiative, hit/dodge, crit/crit-damage, and triangle damage. Add a new deterministic action-selection phase before route selection: `普通攻击` and `核心技` are damage actions that must bind a route, while `逃跑` is a non-damage action that resolves its own success formula and can end the battle immediately.

**Tech Stack:** TypeScript, `packages/domain`, Node test runner via `node --import tsx --test`, deterministic `hashString`-style rolls, repo docs under `docs/specs` and `docs/plans`.

**Plan Relationship:** This file is a supplement to `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`. It does not replace the base `2026-04-04` plan. Read both together: the base plan keeps the route-layer combat math and runtime skeleton, while this supplement adds the missing action layer and its document / runtime tasks.

---

## Summary

The current combat V1 implementation and documents are still too route-centric. We already have:

- single-player PVE combat jobs
- route selection
- initiative
- hit / dodge
- crit / crit-damage
- triangle damage

But we do not yet have a fully specified action layer. This plan corrects that.

After this plan is implemented, current V1 should be understood as:

- action layer:
  - `普通攻击`
  - `核心技`
  - `逃跑`
- route layer:
  - `brute`
  - `finesse`
  - `tactic`

This means:

- the system first decides what the actor does this round
- if that action is a damage action, the system then decides how that damage is delivered
- `核心技` is no longer just a name in docs; it becomes a real action with resource cost, route binding, logging, and tests
- `逃跑` is no longer a side note; it becomes a real action with deterministic success rules and round-order consequences

## Frozen Rules

### Scope

- Single-player PVE only
- Existing action entrypoints only:
  - `hunt-mine-beast`
  - `challenge-guardian:rank-*`
- Current V1 still excludes:
  - control
  - status attachment
  - five-element combat resolution
  - full weapon family implementation
  - 18 weapon specializations
  - party dungeons / PvP / sect wars

### Action layer

Current V1 action layer is frozen to:

- `basic_attack`
- `core_skill`
- `escape`

Action meanings:

- `basic_attack`
  - baseline damage action
  - always available
  - action multiplier: `1.0`
  - spirit cost: `0`
- `core_skill`
  - current V1 high-value active damage action
  - only available when current spirit is high enough
  - action multiplier: `1.6`
  - spirit cost: `max(1, round(maxSpirit * 0.10))`
  - still uses route binding and therefore still participates in triangle combat
- `escape`
  - non-damage action
  - does not bind a combat route
  - current V1 only allows the player side to choose it
  - if successful, ends the battle immediately as retreat defeat
  - if failed, consumes the action and deals no damage

### Round order

Each round must resolve in this exact order:

1. Choose player action
2. Choose enemy action
3. If action is `basic_attack` or `core_skill`, bind a route
4. Compute initiative values
5. Initiative winner acts first
6. Resolve the first action
7. If the target dies, the target loses its round action
8. If the target survives, resolve the second action
9. Write round log
10. Check battle end

Important consequence:

- `逃跑` is not a guaranteed exit button
- if the actor chooses `逃跑` but loses initiative, the opponent may hit or kill them before the escape attempt resolves

### Action availability

- `basic_attack`
  - always available
- `core_skill`
  - available only if `currentSpirit >= coreSkillSpiritCost`
- `escape`
  - current V1 only appears in the player action set
  - current V1 player retreat is allowed in both `mine-beast` and `guardian` encounters
  - current single-player PVE enemies never choose `escape`
  - if future PvP is added, both sides may gain access to `escape`
  - leave a future-facing `escapeAllowed` encounter flag in the model so later templates can disable retreat without redesigning the action layer

### Core skill route binding

`core_skill` is an action-layer decision, but it still needs a route.

Current V1 freezes this behavior:

- after choosing `core_skill`, run the same route scorer used by damage actions
- keep the route set as:
  - `brute`
  - `finesse`
  - `tactic`
- reserve a lightweight hook for future weapon-family integration:
  - `coreSkillPreferredRoute?: CombatStyle | null`
- if `coreSkillPreferredRoute` exists, add a small affinity bonus before Top-2 route sampling:
  - affinity bonus: `+1`

This gives `核心技` a route flavor without reintroducing the old five-action design.

### Action scoring

Action selection must be deterministic and local to the server.

Freeze the action scoring formula as:

`ActionScore = actionBaseWeight + registrationActionBias + battleStateBias + resourceBias + smallRandom`

`registrationActionBias` must come from the same stable registration sources already used by route scoring:

- `core_temperament`
- `behavior_aspect`

But it must use a dedicated action-layer weight table. Do not reuse the route-layer weight table directly.

Frozen base weights:

- `basic_attack = 0`
- `core_skill = +1`
- `escape = -4`

Frozen battle-state bias:

- when `selfHpRatio <= 0.35`
  - `basic_attack = 0`
  - `core_skill = -1`
  - `escape = +4`
- when `enemyHpRatio <= 0.25`
  - `basic_attack = +1`
  - `core_skill = +2`
  - `escape = -3`
- when `battleReadiness = poor`
  - `escape = +2`
- when `battleReadiness = advantaged`
  - `core_skill = +1`
  - `escape = -1`

Frozen resource bias:

- if `currentSpirit < coreSkillSpiritCost`
  - `core_skill` is unavailable
- if `currentSpirit / maxSpirit >= 0.50`
  - `core_skill = +1`
- if `currentSpirit / maxSpirit <= 0.20`
  - `core_skill = -1`

Frozen random:

- `smallRandom = deterministic 0 ~ 1`

Sampling rule:

- score all legal actions
- keep the Top 2
- sample between them with the same weighted approach already used by route scoring

Action-layer registration bias ranges freeze to:

- `core_temperament`: `-2 ~ +2`
- `behavior_aspect`: `-1 ~ +1`

This keeps action selection and route selection aligned to the same personality source, while still letting them use different weight tables.

### Escape formula

Freeze the escape formula as:

`escapeChance = clamp(35% + speedDiff * 0.2% + disadvantageBonus + readinessModifier, 10%, 85%)`

Where:

- `speedDiff = escaperSpeed - pursuerSpeed`
- `readinessModifier` reuses the combat readiness values:
  - `poor = -20`
  - `stable = 0`
  - `ready = +10`
  - `advantaged = +20`
- `disadvantageBonus` freezes to:
  - `+20%` if `selfHpRatio <= 0.20`
  - `+10%` if `selfHpRatio <= 0.35`
  - otherwise `0%`

Escape resolution rules:

- success:
  - battle ends immediately
  - overall result counts as `defeat`
  - end reason is `retreat`
  - no normal victory reward
  - preserve the player’s current `qi`
  - preserve the player’s current remaining HP at the moment combat ends
- failure:
  - action is consumed
  - no damage is dealt
  - battle continues normally

### Core skill resource rule

Freeze the current V1 resource rule for `核心技`:

- using `core_skill` spends spirit even if the attack misses
- spirit spend happens when the action resolves, not at action selection time
- spirit spend amount is:
  - `coreSkillSpiritCost = max(1, round(maxSpirit * 0.10))`

This keeps the implementation simple and prevents “free miss fishing”.

## Files

### Create

- `docs/plans/2026-04-04-combat-gameplay-v1-action-layer-completion.md`
- `docs/specs/combat-gameplay-v1/registration-action-layer-weight-table.md`

### Modify

- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`
- `packages/domain/src/model.ts`
- `packages/domain/src/engine.ts`
- `packages/domain/src/engine.test.ts`

## Task 1: Sync The Docs To The Action-Layer Model

**Files:**

- Modify: `docs/specs/combat-gameplay-v1/spec.md`
- Modify: `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- Modify: `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`
- Create: `docs/specs/combat-gameplay-v1/registration-action-layer-weight-table.md`

**Step 1: Mark the supplement relationship clearly**

Add a short note near the top of `2026-04-04-combat-gameplay-v1-light-complete-implementation.md` saying:

- it remains the base `04-04` plan
- the action-layer supplement in `2026-04-04-combat-gameplay-v1-action-layer-completion.md` must be read together with it
- the supplement does not replace the base plan

**Step 2: Update the main spec boundary**

Change the current V1 boundary so it explicitly says:

- current V1 action layer:
  - `普通攻击`
  - `核心技`
  - `逃跑`
- current V1 route layer:
  - `蛮力`
  - `巧劲`
  - `战术`

Also make sure the spec clearly says:

- `核心技` is a current V1 action, not just a future note
- `逃跑` is a current V1 action, not a later extension
- `逃跑` only belongs to the player side in current single-player PVE
- `逃跑` counts as defeat, but preserves current `qi` and current remaining HP
- `守关者` encounter currently allows player retreat, but still grants no victory reward
- `快攻 / 轻术`
- `重招 / 大术`
- `防御 / 调息`

are not current V1 action requirements.

**Step 3: Add the action-layer rules**

Write exact rules into the spec for:

- action order before route order
- `core_skill` route binding
- `core_skill` spirit cost
- action-layer registration bias from `core_temperament + behavior_aspect`
- `escape` success / failure behavior
- `escape` formula

**Step 4: Create the action-layer registration table**

Create `registration-action-layer-weight-table.md` as the action-layer companion to the route doc.

It must freeze mappings from:

- `core_temperament`
- `behavior_aspect`

to:

- `basic_attack`
- `core_skill`
- `escape`

This prevents route weights and action weights from being mixed together.

**Step 5: Keep the route scoring doc narrowly scoped**

Update `registration-action-weight-table.md` so it stays a route-scoring document, not a mixed action-and-route document.

It should clearly say:

- this file only governs `brute / finesse / tactic`
- action-layer selection lives in the main combat spec and implementation plan
- `core_temperament + behavior_aspect` still feed route scoring, not the whole action layer by themselves

**Step 6: Verify the doc wording**

Run:

```bash
rg -n "重招|大术|快攻|轻术|防御 / 调息|五动作" docs/specs/combat-gameplay-v1/spec.md
```

Expected:

- old terms may remain only inside “not in current V1” exclusions
- they must not appear as current required actions

## Task 2: Extend The Combat Data Model For The Action Layer

**Files:**

- Modify: `packages/domain/src/model.ts`

**Step 1: Add action-layer enums and records**

Add:

- `CombatActionType = "basic_attack" | "core_skill" | "escape"`
- `CombatActionChoice`
- `EscapeResolution`
- `CoreSkillProfile`

`CombatActionChoice` should contain at least:

- `actionType`
- `boundStyle`
- `spiritCost`
- `preferredStyle`

`EscapeResolution` should contain at least:

- `attempted`
- `success`
- `chance`

`CoreSkillProfile` should contain at least:

- `spiritCost`
- `preferredStyle`
- `actionMultiplier`

**Step 2: Extend snapshots**

Extend `CombatSnapshot` with:

- `coreSkillSpiritCost`
- `coreSkillPreferredRoute`
- `escapeAllowed`

**Step 3: Extend round logs**

Extend `CombatRoundLog` and related types so a round can explain:

- chosen action
- bound route if any
- spirit spent
- escape attempt and success/failure
- attack skipped because actor died before acting

**Step 4: Keep compatibility**

Do not remove existing fields that current readers may still use. Additive changes only.

## Task 3: Implement Deterministic Action Selection

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add action availability helpers**

Implement a helper that returns legal actions for an actor:

- always include `basic_attack`
- include `core_skill` only if enough spirit
- include `escape` only if:
  - the acting side is the player side
  - the encounter allows retreat

**Step 2: Add action scoring**

Implement deterministic action scoring using the frozen formula:

`ActionScore = actionBaseWeight + registrationActionBias + battleStateBias + resourceBias + smallRandom`

Make the score output explicit in code so tests can validate it.

**Step 3: Add Top-2 weighted sampling**

Use the same style as the current route scorer:

- sort legal actions by score
- keep the top two
- convert them to positive weights
- sample deterministically

**Step 4: Write tests first**

Add failing tests for:

- `core_skill` unavailable when spirit is insufficient
- low HP makes `escape` more likely
- enemy near death makes `core_skill` more likely
- different registration profiles can change action preference
- action selection remains deterministic for a fixed world state

**Step 5: Run targeted tests**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts
```

Expected:

- new action-layer tests fail first
- then pass after implementation

## Task 4: Bind Routes Only For Damage Actions

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Split action selection from route selection**

Refactor round setup so it now does:

1. choose action
2. if action is `basic_attack` or `core_skill`, bind a route
3. if action is `escape`, skip route binding

**Step 2: Add core skill affinity bonus**

If the chosen action is `core_skill` and `coreSkillPreferredRoute` exists:

- add `+1` to that route before Top-2 route sampling

**Step 3: Keep basic attack neutral**

`basic_attack` should reuse normal route scoring without the core-skill affinity bonus.

**Step 4: Write tests**

Add failing tests for:

- `escape` does not bind a route
- `core_skill` still binds a route
- `core_skill` honors preferred route bias when one exists

## Task 5: Implement Core Skill Resolution

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Reuse the current damage pipeline**

`core_skill` should still resolve with:

- initiative order
- hit / dodge
- crit / crit damage
- triangle route damage

Do not invent a separate combat resolver for core skills.

**Step 2: Apply spirit cost on resolution**

When `core_skill` resolves:

- spend `coreSkillSpiritCost`
- spend it even if the attack misses
- do not spend it if the actor died before their action could resolve

**Step 3: Apply the action multiplier**

For `core_skill`, multiply damage by `1.6` before the final rounding step.

**Step 4: Write tests**

Add failing tests for:

- `core_skill` spends spirit on hit
- `core_skill` spends spirit on miss
- `core_skill` does not spend spirit if the actor died before acting
- `core_skill` damage is higher than a comparable `basic_attack` due to the action multiplier

## Task 6: Implement Escape Resolution

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add escape resolution helper**

Implement:

`escapeChance = clamp(35% + speedDiff * 0.2% + disadvantageBonus + readinessModifier, 10%, 85%)`

Use deterministic rolls for the success check.

**Step 2: Integrate escape into initiative order**

Important:

- if the escaping side loses initiative, the enemy acts first
- if the escaper dies before acting, no escape attempt occurs
- if the escaper survives and the roll succeeds, battle ends immediately as retreat defeat
- if the roll fails, the action is consumed and the other actor may still act if they have not acted yet

**Step 3: Suppress normal rewards on retreat**

Retreat outcome must:

- end combat
- write a retreat reason to the log
- count as defeat in the summary outcome
- not grant normal victory rewards
- preserve the player’s current `qi`
- preserve the player’s current remaining HP

**Step 4: Write tests**

Add failing tests for:

- successful escape ends the battle immediately
- failed escape consumes the round action
- only the player side can choose `escape` in current V1 single-player PVE
- retreat grants no normal victory reward
- retreat preserves current `qi` and current remaining HP
- an actor killed before their escape turn never resolves the escape attempt

## Task 7: Expand Logging So Humans Can Read The Action Layer

**Files:**

- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add action fields to round logs**

Each round log should show:

- player action
- enemy action
- player bound route if any
- enemy bound route if any
- spirit spent
- escape attempt result

**Step 2: Keep summary logs honest**

Retreat battles should produce summaries that clearly say:

- the battle ended by retreat
- the overall outcome is still defeat
- no normal victory reward was granted

**Step 3: Write tests**

Add failing tests for:

- `core_skill` rounds include action type and spirit spend
- `escape` rounds include attempted / success status
- retreat summaries do not look like normal wins

## Task 8: Verification And Handoff

**Files:**

- Modify: `packages/domain/src/engine.test.ts`
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`

**Step 1: Run the focused combat tests**

Run:

```bash
node --import tsx --test packages/domain/src/engine.test.ts
```

Expected:

- PASS for:
  - action selection
  - route binding
  - core skill spirit spend
  - escape resolution
  - initiative kill-before-action behavior

**Step 2: Run attribute tests**

Run:

```bash
node --import tsx --test packages/domain/src/attributes.test.ts
```

Expected:

- PASS with no regression to the existing stat formulas

**Step 3: Run diff formatting check**

Run:

```bash
git diff --check -- docs/specs/combat-gameplay-v1/spec.md docs/specs/combat-gameplay-v1/registration-action-weight-table.md packages/domain/src/model.ts packages/domain/src/engine.ts packages/domain/src/engine.test.ts
```

Expected:

- no whitespace or patch format errors

## Risks

- If action scoring and route scoring are mixed together again, the system will regress back into a route-only combat model.
- If `core_skill` spirit spend happens at selection time instead of resolution time, initiative kills will produce incorrect resource loss.
- If `escape` is resolved outside initiative order, it will feel like a menu command instead of a combat action.
- If logs do not record action type and spirit spend, humans and agents will not understand why a round played out the way it did.

## Assumptions

- Current V1 should now treat `普通攻击 / 核心技 / 逃跑` as the real action layer.
- Current V1 still treats `蛮力 / 巧劲 / 战术` as the route layer.
- `core_skill` uses a generic V1 template with an action multiplier and resource cost; full weapon-family specialization is a later layer.
- `escape` is currently allowed for the two existing single-player PVE encounter families unless a future encounter template explicitly disables it.
