# Combat Gameplay V2 Gap-Closure Plan

**Goal:** Close the remaining alignment gaps between the implemented combat loadout layer and the intended V2 design, without reopening the broader weapons / spells / status scope.

**Relationship:** This file is a supplement to `docs/plans/2026-04-05-combat-gameplay-v2.md`. The main V2 plan defines the combat loadout layer. This supplement only covers the four concrete gaps discovered after implementation review.

## Summary

The current V2 loadout implementation is mostly in place, but four behaviors are still out of alignment with the intended design:

1. Damage channel selection is currently decided once at combat initialization, instead of being resolved per damage action / per round.
2. `combatProfile.attackChannel` is still hardcoded to `"weapon"` and does not reflect the actual loadout-aware combat model.
3. Enemy combat still uses a fixed `basic_attack` action instead of sharing the same action-layer decision logic as the player.
4. The docs are out of sync: the V1 combat spec still states `coreSkillSpiritCost = max(1, round(maxSpirit * 0.10))`, which conflicts with the implemented loadout-fixed spirit cost rule.

This follow-up plan only closes those four gaps.

## Implementation Changes

### 1. Move channel selection from combat init to per-round damage-action resolution

- Keep `AttackChannel = "weapon" | "spell"` as the only runtime attack-channel enum.
- Stop freezing the player channel at `initializeCombatJobState()`.
- Instead, for each round:
  - choose `playerAction`
  - if it is a damage action, evaluate legal channels from the currently equipped weapon/spell loadouts
  - choose the better channel for that specific action using the existing deterministic comparison rule
  - bind route after the channel is known
- Use the chosen channel to derive:
  - attack value
  - `coreSkillSpiritCost`
  - `coreSkillCategory`
  - loadout-linked status hook context
- Persist the chosen player channel into `CombatRoundLog`, so replay can show whether that round used weapon or spell.

### 2. Make state-view attack-channel output match the real model

- Remove the hardcoded `combatProfile.attackChannel: "weapon"` behavior.
- Freeze the state-view meaning of `attackChannel` to: "the cultivator's current preferred default channel outside round resolution".
- Derive it from the currently equipped loadouts using the same deterministic comparison rule already used for channel scoring:
  - if only weapon loadout exists, report `weapon`
  - if only spell loadout exists, report `spell`
  - if both exist, compare their expected raw attack and report the stronger default channel
  - ties resolve deterministically and consistently with combat selection rules
- Do not make state-view `attackChannel` pretend to be the live per-round channel; that belongs in combat logs, not the static state panel.

### 3. Unify enemy combat with the same action-layer logic

- Remove the fixed `enemyAction = "basic_attack"` shortcut from round resolution.
- Let enemies use the same action-layer selector as players, with the current V1/V2 constraints:
  - legal enemy actions: `basic_attack` and `core_skill`
  - current PVE enemies still do not choose `escape`
- Enemy damage actions must also choose a channel per round from their equipped loadouts, not once at template initialization.
- Enemy `core_skill` must:
  - respect fixed `coreSkillSpiritCost`
  - lock to the chosen loadout's `coreSkillCategory`
  - spend spirit on resolve
- Encounter templates must continue to support simple enemies; a template with only one equipped loadout should still work with no extra branching logic.

### 4. Sync spec and plan docs to the implemented V2 rule set

- Update `docs/specs/combat-gameplay-v1/spec.md` so the currently live rule no longer claims core skill cost is `10% maxSpirit`.
- Replace that rule with the correct staged wording:
  - V1 action-layer document originally used `10% maxSpirit`
  - current runtime after V2 loadout integration uses fixed `coreSkillSpiritCost` from the chosen concrete loadout
- Add one short cross-reference from the V1 spec to:
  - `docs/plans/2026-04-05-combat-gameplay-v2.md`
  - this gap-closure supplement
- Do not expand the V1 spec into a full V2 rewrite; only sync the parts that are now objectively stale.

## Test Plan

- Add a round-level test proving that two different rounds in the same combat can choose different channels if the better action context changes.
- Add a state-view test proving `combatProfile.attackChannel` is no longer always `"weapon"`.
- Add an enemy combat test proving an enemy can legally choose `core_skill` when it has enough spirit and a configured loadout.
- Add an enemy resource test proving enemy `core_skill` spends the configured fixed spirit cost.
- Add a log test proving each round records the chosen player/enemy channel.
- Keep the existing loadout-cost, equip-action, and hydration tests green.

## Assumptions

- This supplement does not add real status execution; it only keeps carrying loadout-linked status hook context.
- This supplement does not expand PvP, party combat, or the full status system.
- Channel choice remains deterministic and server-local; it does not become a user-selected per-round action.
