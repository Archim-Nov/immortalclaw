# Registration Gameplay Modifiers

## Summary

Make the saved cultivation registration affect live gameplay in the current prototype without introducing the full attribute, weapon, or spell systems.

## Problem

The repo already stores `registration_record`, but the result is mostly passive metadata. That leaves a visible gap between the OC onboarding flow and the actual cultivation loop.

## Goals

- Turn registration output into small runtime modifiers that affect current actions and risk loops.
- Surface those modifiers through cultivator state so players and agents can understand the bias.
- Keep the change lightweight and compatible with the existing action-first prototype.

## Non-Goals

- Full main-attribute implementation.
- Full five-element combat/status system.
- Weapon classes, spell trees, or large balance rework.

## User-Visible Behavior

After saving a registration record, the cultivator state should expose dominant elements and a short list of gameplay modifiers. Those modifiers should slightly change current outcomes for cultivation, meditation, healing, errands, mining, ruins exploration, and combat.

## Constraints

- Use the current domain model and action set.
- Keep bonuses additive and small enough that registration changes playstyle, not raw power tier.
- Do not add a new onboarding flow or persistence format.

## Acceptance Criteria

- `getCultivatorState` returns `registrationEffects` when a registration record exists.
- Current prototype actions receive light registration-derived modifiers without reviving retired tribulation state.
- Domain tests cover at least state surfacing, cultivation gain, and one non-cultivation outcome.

## Open Questions

- How far should this lightweight layer go before the full attribute and five-element systems replace it?
- Whether agent guidance should eventually explain exact numeric bias instead of only qualitative hints.
