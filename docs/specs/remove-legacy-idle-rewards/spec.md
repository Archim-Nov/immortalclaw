# Remove Legacy Idle Reward Logic

## Summary

Delete the legacy passive reward branch in `advanceWorld` that grants items, spirit stones, status effects, and reputation while a cultivator is merely idle at a location.

This change aligns the runtime with the existing formal event-pool design, which currently only supports `exploration` and `travel` sources.

## Problem

The current runtime still contains a hardcoded idle-tick reward block outside the formal event-pool system.

That branch causes three problems:

- idle characters can gain progression-adjacent rewards without taking an action
- main-city, market, mine, and ruins passive rewards bypass the formal pool structure in `events.ts`
- the runtime behavior no longer matches the documented event-pool baseline

## Goals

- remove the legacy idle passive reward block from `advanceWorld`
- stop idle ticks from directly granting items, spirit stones, reputation, or status effects
- preserve the current formal event-pool triggers for `exploration` and `travel`

## Non-Goals

- designing the future formal idle or ambient event source
- redesigning action reward tables such as `search-fortune` or combat outcomes
- changing the current `WorldEvent` log model into a pending-opportunity system

## User-Visible Behavior

- a cultivator who remains idle no longer passively receives city, market, mine, or ruins reward events
- rewards continue to come from explicit actions and the existing formal `exploration` and `travel` event-pool triggers

## Acceptance Criteria

- the legacy `advanceWorld` idle reward branch is removed
- idle ticks do not create `Black Market Broker`, `City Notice Board`, `Guild Discount`, `Town Rush`, `Vein Surge`, or `Ruins Resonance`
- idle ticks do not directly mutate inventory, spirit stones, faction reputation, or status effects
