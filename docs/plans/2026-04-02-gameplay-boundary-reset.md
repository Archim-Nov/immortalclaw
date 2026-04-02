# Gameplay Boundary Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Re-split wilderness, dungeon, and bahuang into three clean gameplay lines that fit an agent-led tick game with low wake frequency and clear reward identities.

**Architecture:** Keep the existing combat, tick, item, and event foundation where possible, but reassign public semantics and gameplay loops. Wilderness remains the low-attention resource loop, dungeon becomes a low-wake semi-managed dungeon loop, and bahuang becomes an independent long-expedition system with rare rewards and retreat pressure.

**Tech Stack:** TypeScript, domain runtime in `packages/domain`, application/runtime state views, markdown docs in `README.md` and `apps/web/public/*`

---

## Summary

This plan does not rebuild the whole game. It preserves usable bottom-layer systems and focuses on three kinds of changes:

1. Keep the reusable simulation bones.
2. Reposition systems whose identity is correct in code but wrong in player-facing meaning.
3. Rebuild the loops that currently violate the intended boundary, especially dungeon's over-automated expedition shell and bahuang's incorrect attachment to wilderness/dungeon semantics.

The target split after implementation:

- `荒野` = stable base-resource loop, minimal wakeups
- `地宫` = semi-managed dungeon loop, `1-3` key wake points at most
- `八荒` = independent high-risk expedition loop, `1-3` key wake points at most

## Agreed Design Rules

### Boundary and identity

- `荒野` is the daily resource line.
- `地宫` is the dungeon progression line.
- `八荒` is an independent expedition line.
- `荒野` must not carry dungeon progression identity.
- `地宫` must not behave like a harvest dispatch loop.
- `八荒` must not remain attached to wilderness-expansion or dungeon-entry semantics.

### Agent and tick constraints

- The game remains `agent-led + tick-driven`.
- Frequent wakeups are unacceptable because of token cost.
- Default wake policy:
  - wilderness: effectively `0`
  - dungeon: usually `1-3`
  - bahuang: usually `1-3`
- Ordinary combat, ordinary drops, ordinary pressure ticks, and ordinary small events should resolve without waking the agent.
- Only high-value branch points should wake the agent.
- If a key wake node times out, the run continues by the preselected strategy instead of pausing.

### Reward split

- `荒野` = base materials, base economy, regular drops
- `地宫` = progression materials, rank advancement, challenge rewards
- `八荒` = rare loot, unlock items, expedition-only rewards

### Future compatibility

- `地宫` keeps its identity as the future home of party-dungeon expansion.
- `八荒` remains a separate system even after multiplayer or boss content grows.

## Keep / Rename / Rebuild

### Keep as-is

- Keep wilderness base actions such as mining, regular beast hunting, and steady material farming.
- Keep dungeon grade, rank, unlock progression, guardian progression, and reward-band foundations.
- Keep the useful dungeon micro-step semantics internally, such as search, guardian, and push progression, even if the public action surface changes.
- Keep the useful expedition bones already present in bahuang-adjacent logic: entry requirements, ongoing pressure, retreat cost, event resolution, and rare reward tendency.
- Keep shared combat, status, item, and tick systems unless they directly force the wrong gameplay identity.

### Rename / reposition

- Move `八荒` out of wilderness-expansion framing and into an independent system framing.
- Remove the semantic dependency on `qingzhou:dungeon-a` as bahuang's host entry.
- Narrow `state.wilderness` to resource-work and light-risk state only.
- Redefine `state.dungeon` around progression, route choice, retreat posture, guardian pressure, and low-wake strategy.
- Add a dedicated `state.bahuang` view, or an equally explicit top-level state surface.
- Rewrite docs and agent-facing guidance so dungeon is described as a low-wake semi-managed dungeon flow instead of a managed yield run.
- Reposition reward messaging so the three reward lanes are obvious and non-overlapping.

### Must rebuild

- Rebuild dungeon's current primary loop:
  - stop using "start one 30-tick run, mostly wait, read final report" as the main gameplay identity
  - replace it with a low-wake semi-managed dungeon flow
- Rebuild bahuang's public shell:
  - stop treating it as a wilderness high-tier layer
  - stop treating it as a dungeon outer shell
  - give it its own entry, state surface, and expedition-facing verbs
- Rebuild entry semantics so players and agents can immediately distinguish resource, dungeon, and expedition destinations.
- Rebuild recommendation logic so runtime guidance sends the player to the correct line by need.
- Rebuild wake-node protocol so rare decisions are explicit, bounded, and strategy-backed.

## Public Interface Direction

### State surfaces

- `state.wilderness`
  - shows resource-work context only
  - does not carry main expedition identity
- `state.dungeon`
  - shows dungeon progression state instead of only managed-yield hints
  - should expose enough context for route and retreat decisions before a wake node appears
- `state.bahuang`
  - shows expedition pressure, supplies, depth, retreat threshold, and rare-opportunity state
  - must be separate from `state.wilderness` and `state.dungeonExpedition`

### Strategy contract

- Dungeon and bahuang runs should begin with an explicit run strategy.
- Strategy should cover at least:
  - conservative / balanced / aggressive posture
  - reward-first vs survival-first bias
  - push vs retreat preference under pressure
- Strategy becomes the default behavior during automatic tick advancement.
- Strategy is also the timeout fallback for key wake nodes.

### Wake-node contract

- Wake nodes should be rare and high-signal.
- Each wake node should return:
  - short context
  - limited options
  - default behavior if no answer arrives
- Dungeon wake-node examples:
  - route split
  - elite or guardian choice
  - push deeper vs bank progress
  - early retreat
- Bahuang wake-node examples:
  - continue deeper
  - spend rare supply
  - detour into rare hazard zone
  - emergency retreat

## Task Plan

### Task 1: Update source-of-truth docs

**Files:**
- Modify: `README.md`
- Modify: `apps/web/public/skill.md`
- Modify: `apps/web/public/heartbeat.md`
- Keep this plan updated if scope changes during implementation

**Step 1: Rewrite top-level gameplay wording**

- Replace any wording that treats dungeon as a mostly managed resource dispatch.
- Introduce the explicit three-line split.

**Step 2: Add the low-wake rule**

- Document the project rule that gameplay must fit an agent-led tick game with constrained token use.
- State that routine progression should not wake the agent.

**Step 3: Align reward and routing language**

- Make the base / progression / rare split explicit in player- and agent-facing docs.
- Ensure examples and suggested actions follow the new split.

**Step 4: Verify documentation consistency**

Run targeted searches for:

```text
荒野
地宫
八荒
managed dungeon expedition
wilderness expansion
abort-dungeon-expedition
```

Expected: no public-facing guidance should still imply that dungeon is basically a harvest loop or that bahuang is merely a wilderness/dungeon sub-layer.

### Task 2: Lock the boundary in state types

**Files:**
- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`

**Step 1: Write failing tests for state shape**

- Add or update tests asserting that:
  - wilderness state is resource-oriented
  - dungeon state is progression-oriented
  - bahuang state is separately surfaced

**Step 2: Run focused tests to confirm failure**

Run: targeted domain tests for state snapshots

Expected: current shape or semantics should fail the new assertions.

**Step 3: Implement minimal type and state-surface changes**

- Add or reshape public types so wilderness, dungeon, and bahuang cannot collapse into one meaning.
- Add strategy and wake-node types where needed.

**Step 4: Re-run the targeted tests**

Expected: updated snapshot/state tests pass.

### Task 3: Preserve wilderness as the low-attention economy loop

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/wilderness-service.ts` only where needed
- Test: focused wilderness tests in `packages/domain/src/wilderness.test.ts`

**Step 1: Write failing tests for wilderness identity**

- Assert that wilderness remains the stable base-resource lane.
- Assert that wilderness does not surface expedition-only semantics.

**Step 2: Run focused wilderness tests**

Expected: at least one test should fail against the new boundary rules.

**Step 3: Implement the minimal wilderness adjustments**

- Keep mining and regular hunting.
- Remove or isolate logic that makes wilderness the main host of high-risk expedition gameplay.
- Ensure wake frequency remains near zero.

**Step 4: Re-run wilderness tests**

Expected: wilderness tests pass and still cover ordinary income loops.

### Task 4: Rebuild dungeon into a low-wake semi-managed dungeon

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Modify: `packages/domain/src/dungeon-expedition-service.ts`
- Test: `packages/domain/src/dungeon-expedition.test.ts`
- Test: any related engine/domain tests

**Step 1: Write failing tests for dungeon wake behavior**

- Assert that a dungeon run no longer behaves like a single mostly silent 30-tick dispatch.
- Assert that only a bounded number of meaningful wake points appear.
- Assert that timeout continues by the chosen strategy.

**Step 2: Run targeted dungeon tests**

Expected: current dungeon expedition behavior should fail at least the wake/strategy identity assertions.

**Step 3: Implement the minimal semi-managed loop**

- Keep grade/rank/progression foundations.
- Change the public loop so normal steps stay automatic but key branches can wake the agent.
- Enforce a low wake budget, usually `1-3`.

**Step 4: Re-run dungeon tests**

Expected: dungeon tests pass with the new low-wake progression model.

### Task 5: Extract bahuang into an independent expedition system

**Files:**
- Modify: `packages/domain/src/seed.ts`
- Modify: `packages/domain/src/engine.ts`
- Modify or split: `packages/domain/src/wilderness-service.ts`
- Test: existing bahuang/wilderness tests, plus new focused tests

**Step 1: Write failing tests for independent bahuang identity**

- Assert that bahuang is no longer framed as wilderness expansion.
- Assert that bahuang is no longer semantically hosted by dungeon entry points.
- Assert that bahuang has separate expedition state and separate reward identity.

**Step 2: Run focused bahuang tests**

Expected: current setup should fail the independent-identity assertions.

**Step 3: Implement the minimal extraction**

- Move bahuang to its own entry and state surface.
- Preserve useful expedition bones such as pressure, retreat cost, and rare rewards.
- Add low-wake expedition decision nodes with strategy fallback.

**Step 4: Re-run focused tests**

Expected: bahuang tests pass and no longer depend on wilderness/dungeon shell semantics.

### Task 6: Update runtime guidance and recommendation logic

**Files:**
- Modify: `packages/domain/src/engine.ts`
- Test: any guidance/state tests that cover suggested actions

**Step 1: Write failing tests for routing logic**

- Assert:
  - need base mats -> wilderness
  - need progression -> dungeon
  - need rare expedition rewards -> bahuang

**Step 2: Run focused guidance tests**

Expected: at least some old recommendation behavior should fail.

**Step 3: Implement minimal guidance changes**

- Retune suggested-action logic to follow the new lane split.
- Keep messages concise to avoid token bloat.

**Step 4: Re-run guidance tests**

Expected: guidance now reinforces the intended boundary.

### Task 7: Run full verification

**Files:**
- No new product files unless verification exposes gaps

**Step 1: Run targeted tests**

Run focused tests for:

```text
wilderness
dungeon expedition / dungeon progression
bahuang or its replacement test surface
guidance / state snapshots
```

Expected: all focused tests pass.

**Step 2: Run broader verification**

Run:

```text
npm test
```

Expected: repo test suite passes, or any unrelated failures are clearly identified.

**Step 3: Do a final doc search**

Search for stale wording again and confirm that player-facing semantics match the new boundary.

**Step 4: Commit**

```text
git add README.md apps/web/public/skill.md apps/web/public/heartbeat.md packages/domain/src/model.ts packages/domain/src/engine.ts packages/domain/src/dungeon-expedition-service.ts packages/domain/src/wilderness-service.ts packages/domain/src/seed.ts packages/domain/src/*.test.ts docs/plans/2026-04-02-gameplay-boundary-reset.md
git commit -m "plan gameplay boundary reset"
```

Expected: commit only after docs, runtime changes, and tests are aligned.

## Verification Checklist

- Wilderness remains the low-attention base-resource loop.
- Dungeon feels like a dungeon again without becoming high-frequency interactive.
- Bahuang becomes an independent expedition system.
- Wake frequency stays within the agreed token budget.
- Timeout continues by strategy instead of pausing.
- Reward lanes remain clearly separated.
- Runtime guidance points each need to the correct system.

## Assumptions And Defaults

- The agreed top-level split is final:
  - wilderness = resource
  - dungeon = semi-managed dungeon
  - bahuang = independent expedition
- The game remains `agent-led + tick-driven`.
- Frequent wakeups are unacceptable due to token cost.
- Accepted wake policy:
  - wilderness: essentially `0`
  - dungeon: `1-3` key wake points
  - bahuang: `1-3` key wake points
- If the agent does not answer a key wake node in time, the runtime continues by the preselected strategy.
- Existing combat/tick/item/event bones should be reused unless they directly force the wrong gameplay identity.
- Documentation updates are required in the same workstream as runtime changes.
