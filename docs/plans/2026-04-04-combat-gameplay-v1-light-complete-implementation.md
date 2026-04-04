# Combat Gameplay V1 Light Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the current single-roll combat into a lightweight but complete single-player PVE round combat system with initiative, hit/dodge, crit/crit-damage, and triangle-style combat.

**Architecture:** Keep the existing `action-first -> timed job -> advanceWorld()` loop, but move combat resolution into a deterministic multi-round `combat job` state machine inside `packages/domain`. Preserve the three-route core (`brute / finesse / tactic`) and use initiative-first resolution instead of simultaneous damage. Extend the state view and combat logs so agents and humans can understand both the current combat capability and why a battle ended the way it did.

**Tech Stack:** TypeScript, `packages/domain`, Node test runner via `node --import tsx --test`, existing deterministic `hashString`-based rolls.

**Plan Relationship:** This file remains the base `2026-04-04` combat V1 plan. The action-layer supplement in `docs/plans/2026-04-04-combat-gameplay-v1-action-layer-completion.md` must be read together with it. The supplement adds the missing action-layer design and tasks; it does not replace this file. Note: This file remains the primary implementation baseline, while the supplement provides specific action-layer rules and weight tables.

---

## Summary

Current V1 is no longer the ultra-minimal “damage only” version. The new target is a lightweight complete combat V1:

- Single-player PVE only
- Existing action entrypoints only:
  - `hunt-mine-beast`
  - `challenge-guardian:rank-*`
- Three combat routes only:
  - `brute`
  - `finesse`
  - `tactic`
- Keep the triangle damage core
- Add:
  - initiative
  - hit / dodge
  - crit / crit damage
- Keep out of scope:
  - control
  - status attachment
  - five-element combat resolution
  - full weapon family implementation
  - 18 weapon specializations
  - party dungeons / PvP / sect wars
  - ambush / anti-ambush
  - previous-round tempo chaining

The implementation should preserve current action ids and the general shape of `CultivatorStateView`, but extend the internal combat model and combat logs significantly.

## Frozen Rules

### Combat cadence

- `1 world tick = 1 combat round`
- `hunt-mine-beast` hard cap: `5` rounds
- `challenge-guardian` hard cap: `7` rounds
- If the round cap is reached and both sides are still alive:
  - compare remaining HP ratio
  - player higher ratio: victory
  - enemy higher ratio: defeat
  - equal ratio: defeat

### Round order

This base plan only freezes the route-layer combat order. The missing action-layer order is defined in the supplement `2026-04-04-combat-gameplay-v1-action-layer-completion.md`, and both must be read together.

Current combined round order is:

1. Choose player action
2. Choose enemy action
3. If action is a damage action, bind a route
4. Compute both initiative values
5. Initiative winner acts first
6. Resolve hit / dodge
7. If hit, resolve crit / crit damage
8. Apply damage or resolve escape
9. If target dies, target loses this round’s action
10. If target survives, target acts
11. Write round log
12. Check battle end

### Initiative formula

`initiative = speed + readinessModifier + routeInitiativeModifier + randomRoll`

Frozen values:

- readiness modifiers
  - `poor = -20`
  - `stable = 0`
  - `ready = +10`
  - `advantaged = +20`
- route initiative modifiers
  - `brute = 0`
  - `finesse = +8`
  - `tactic = 0`
- initiative random roll
  - deterministic `0 ~ 10`

No ambush bonus.  
No “active attacker bonus”.  
No previous-round tempo modifier.

### Route secondary traits

- `brute`
  - `+8%` final damage
- `finesse`
  - `+8` initiative
  - `+5` dodge
- `tactic`
  - `+5` hit
  - `+4%` crit chance

### Hit formula

`hitChance = clamp(75% + (attackerHit - defenderDodge) * 0.2%, 35%, 97%)`

Notes:

- `finesse` adds to defender dodge
- `tactic` adds to attacker hit
- miss consumes the action
- miss deals `0` damage
- miss cannot crit

### Crit formula

`critChance = clamp(attackerCrit - defenderGuardHeart * 0.7, 0%, 55%)`

Notes:

- current V1 does not use skill-based base crit
- `tactic` adds `+4%` crit chance
- crit only happens after a successful hit
- crit multiplier is `critDamage / 100`

### Damage formula

Current V1 still defaults to the weapon channel:

- `weaponAttack = 20 + 0.60 * 体魄`
- `spellAttack = 20 + 0.60 * 灵元`
- `physicalDefense = 8 + 0.45 * 根骨`
- `spellDefense = 8 + 0.45 * 神识`

Current actual combat uses:

- attack side: `weaponAttack`
- defense side: `physicalDefense`

Base damage:

`baseDamage = max(1, attack - defense * 0.5)`

Style multipliers:

- `bruteStyle = 1 + clamp((兵魄 - axisAvg) * 0.01, -0.15, 0.15)`
- `finesseStyle = 1 + clamp((身法 - axisAvg) * 0.01, -0.15, 0.15)`
- `tacticStyle = 1 + clamp((道心 - axisAvg) * 0.01, -0.15, 0.15)`
- `axisAvg = (兵魄 + 身法 + 道心) / 3`

Triangle modifiers:

- `tactic -> brute = 1.15`
- `brute -> finesse = 1.15`
- `finesse -> tactic = 1.15`
- disadvantaged side = `0.90`
- neutral = `1.00`

Route damage modifier:

- `brute = 1.08`
- `finesse = 1.00`
- `tactic = 1.00`

Final damage:

`finalDamage = round(baseDamage * styleMultiplier * triangleMultiplier * routeDamageMultiplier * critMultiplier)`

Rules:

- on hit, minimum final damage is `1`
- on miss, final damage is `0`

## Files

### Create

- `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`

### Modify

- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- `docs/plans/2026-04-03-combat-gameplay-v1-detailed-implementation.md`
- `packages/domain/src/model.ts`
- `packages/domain/src/attributes.ts`
- `packages/domain/src/engine.ts`
- `packages/domain/src/engine.test.ts`
- `packages/domain/src/attributes.test.ts`

## Task 1: Sync The Docs To The New V1

**Files:**

- Modify: `docs/specs/combat-gameplay-v1/spec.md`
- Modify: `docs/specs/combat-gameplay-v1/registration-action-weight-table.md`
- Modify: `docs/plans/2026-04-03-combat-gameplay-v1-detailed-implementation.md`
- Create: `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md`

**Step 1: Update the main combat spec boundary**

Change the V1 boundary section so it no longer says V1 excludes:

- `速度 / 先手`
- `命中 / 闪避`
- `会心 / 暴伤`

Replace that with the new light-complete V1 boundary:

- V1 includes initiative, hit/dodge, crit/crit-damage
- V1 still excludes control, status attachment, five-element combat resolution, full weapon families, PvP, and party content

Also update the initiative description in the spec:

- remove previous-round tempo chaining
- remove ambush / anti-ambush from V1
- replace the V1 initiative formula with:
  - `速度 + 准备度修正 + 路线修正 + 小随机`

**Step 2: Update the existing 2026-04-03 plan**

Treat the `2026-04-03` plan as the superseded “damage-only” V1 plan. Add a short note near the top saying:

- the current execution reference is now `2026-04-04-combat-gameplay-v1-light-complete-implementation.md`
- the previous file is preserved as the earlier reduced-scope combat draft

Do not rewrite the whole old document. Only make its status clear.

**Step 3: Update the route preference doc**

Keep the three-route scoring doc, but make sure it still matches the new V1:

- route set remains `brute / finesse / tactic`
- keep `core_temperament + behavior_aspect`
- keep `Top 2` weighted sampling
- add a short note that V1 now includes initiative / hit / crit combat resolution, but route scoring itself still remains independent from those runtime checks except for the frozen route bonuses

**Step 4: Save this plan as the new execution reference**

This file becomes the canonical implementation plan for the current combat V1.

## Task 2: Extend The Combat Data Model

**Files:**

- Modify: `packages/domain/src/model.ts`

**Step 1: Expand `CombatLogEntry`**

Add fields for:

- `encounterTemplateId`
- `totalRounds`
- `rounds`
- `damageTaken` as a real computed number

Keep old top-level summary fields that existing readers may rely on.

**Step 2: Add round and breakdown types**

Add:

- `CombatStyle`
- `AttackChannel`
- `AttackResult`
- `CombatDamageBreakdown`
- `CombatRoundLog`
- `CombatSnapshot`
- `CombatJobState`
- `EncounterTemplate`

**Step 3: Extend `CultivatorStateView`**

Add `combatProfile` with at least:

- `battleReadiness`
- `attackChannel`
- `coreCombatStats`
- `combatTraits`

`coreCombatStats` must include:

- attack / defense
- speed
- hit / dodge
- crit / critDamage / guardHeart

## Task 3: Expose The Needed Combat Stats

**Files:**

- Modify: `packages/domain/src/attributes.ts`
- Test: `packages/domain/src/attributes.test.ts`

**Step 1: Confirm the derived combat stats are available for runtime**

The runtime must be able to read:

- `speed`
- `hit`
- `dodge`
- `crit`
- `critDamage`
- `guardHeart`

Do not redesign the current attribute formulas unless a mismatch with the spec is discovered. This task is mainly about making the combat runtime consume them cleanly.

**Step 2: Make the V1-specific base attack / defense helpers explicit**

Add or expose deterministic helpers for:

- `weaponAttack`
- `spellAttack`
- `physicalDefense`
- `spellDefense`

Keep the formulas frozen to the values defined above.

**Step 3: Add tests**

Cover:

- `weaponAttack`
- `spellAttack`
- `physicalDefense`
- `spellDefense`
- existing stat formulas still returning the expected values

## Task 4: Build The Combat Runtime Skeleton

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Replace one-shot combat resolution with combat job state**

The current `hunt-mine-beast` / `challenge-guardian` resolution is still a one-shot compare block around the existing combat code path. Replace that with:

- initialize `CombatJobState`
- keep the action running across ticks
- advance one round per tick

**Step 2: Add deterministic per-round rolls**

Use the existing `hashString` approach with explicit phase suffixes:

- `:sample`
- `:initiative`
- `:initiative-tiebreak`
- `:hit`
- `:crit`

Do not use `Math.random()`.

**Step 3: Add initiative resolution**

Implement:

- readiness modifier
- route initiative modifier
- random roll
- tie-break roll

Rule:

- initiative winner acts first
- if that attack kills the target, target loses its action for the round

**Step 4: Add hit / dodge**

Implement the hit formula exactly as frozen above.

Rule:

- miss consumes the action
- miss writes an `AttackResult`
- miss writes a breakdown with `finalDamage = 0`

**Step 5: Add crit / crit damage**

Implement:

- crit chance from `crit - guardHeart * 0.7`
- route crit bonus for `tactic`
- crit only after hit
- crit multiplier from `critDamage / 100`

**Step 6: Keep triangle damage as the core**

The damage core must remain:

- base damage from attack and defense
- style multiplier
- triangle multiplier
- route damage modifier
- crit multiplier

Do not add control, state attachment, or elemental combat processing in this task.

## Task 5: Rebuild `hunt-mine-beast`

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add the `mine-beast` encounter template**

Freeze:

- `maxRounds = 5`
- style preference `brute > finesse > tactic`
- medium HP profile
- reward profile matching current mine-beast loot shape

**Step 2: Route it through the new combat runtime**

`hunt-mine-beast` must:

- create a combat job
- resolve across rounds
- stop early on death
- stop automatically at round cap
- compare HP ratio on cap if both sides survive

**Step 3: Preserve current reward / failure semantics where possible**

Keep the familiar reward shape unless the new combat outcome requires a small adjustment. Do not expand content scope here.

## Task 6: Rebuild `challenge-guardian`

**Files:**

- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add the guardian encounter template**

Freeze:

- `maxRounds = 7`
- style preference `tactic > brute > finesse`
- higher HP profile
- reward and failure shape consistent with current guardian outcomes

**Step 2: Route it through the same combat runtime**

Reuse the same initiative / hit / crit / damage / logging framework.

Do not fork a second special-case combat engine.

## Task 7: Make Combat Logs Actually Explain The Battle

**Files:**

- Modify: `packages/domain/src/model.ts`
- Modify: `packages/domain/src/engine.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Write real per-round logs**

Each round must record:

- who had initiative
- which route each side chose
- whether the attack hit
- whether it crit
- how much damage it dealt
- whether the target died
- both HP values after the round

**Step 2: Fix `damageTaken`**

The current logs still record `damageTaken: 0` even when the cultivator loses and takes real harm. Replace that with actual battle damage totals.

**Step 3: Keep summary log compact**

The top-level summary should still be short enough for agents to read quickly, while `rounds` carries the detailed breakdown.

## Task 8: Verification

**Files:**

- Test: `packages/domain/src/attributes.test.ts`
- Test: `packages/domain/src/engine.test.ts`

**Step 1: Add attribute-level tests**

Cover:

- `weaponAttack`
- `spellAttack`
- `physicalDefense`
- `spellDefense`
- `speed`
- `hit`
- `dodge`
- `crit`
- `critDamage`
- `guardHeart`

**Step 2: Add combat math tests**

Cover:

- route damage bonuses
- triangle multipliers
- initiative ordering
- hit clamping
- crit clamping
- miss behavior
- crit-after-hit behavior

**Step 3: Add round-flow tests**

Cover:

- initiative winner acts first
- first actor kill prevents second actor action
- mine beast cap resolves at `5`
- guardian cap resolves at `7`
- cap resolution by HP ratio
- equal HP ratio resolves as defeat

**Step 4: Add logging tests**

Cover:

- round logs contain initiative / hit / crit / breakdown
- summary `damageTaken` is real
- `recentCombats` still returns usable entries

**Step 5: Run verification commands**

Run:

- `node --import tsx --test packages/domain/src/attributes.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Notes For Implementation

- Preserve current action ids exactly.
- Keep deterministic seeds stable and explicit.
- Do not add unrelated content scope while refactoring the combat engine.
- If any existing tests encode the old one-shot combat semantics, replace them with the new round-based expectations instead of layering legacy compatibility behavior.
- If the current log shape is consumed elsewhere, preserve top-level summary compatibility while adding `rounds` as the detailed extension.
