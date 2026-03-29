# Dungeon Overlay Content Fill V1

## Summary

This spec expands state-specific dungeon overlay content and adds a lightweight managed-expedition visibility surface for agents.

The batch stays intentionally narrow:

- keep the current dungeon shared packs
- keep the current event draw and composition model
- expand per-state dungeon overlays from `6` mother rows to `18`
- expose a small structured `flavorEvents` list on the final expedition report

## Problem

Dungeon node pools are no longer empty, but they are still shallow in two ways:

- state overlay volume is too light, so repeated runs hit the same regional beats too quickly
- managed expeditions resolve most internal steps server-side, so much of the authored dungeon flavor is mechanically real but weakly visible to the agent

Current state per dungeon entrance:

- `36` shared grade events
- `18` state-overlay copies generated from only `6` mother rows
- `54` total `node-specific` dungeon events

That is enough for a prototype, but not enough for stronger state identity and replay feel.

## Goals

- Expand every state dungeon overlay to `18` mother rows.
- Keep the current `1-3 / 4-6 / 7-9` rank-band replication model.
- Raise each dungeon entrance's `node-specific` pool from `54` to `90`.
- Keep authored content in `packages/domain/src/events/content/nodes/states/*`.
- Add a structured `flavorEvents: string[]` field to final expedition reports so agents can see a small sample of actual dungeon flavor that fired during the run.

## Non-Goals

- No travel overlay expansion in this batch.
- No shared dungeon pack rewrite.
- No state overlay split by `甲 / 乙 / 丙`.
- No new status families, material families, drop types, or morality branches.
- No full step-by-step expedition log surface.

## User-Visible Behavior

When this change is complete:

- each state dungeon overlay should feel materially thicker before repeating
- each dungeon entrance should still inherit the existing shared grade identity
- managed expedition reports should continue to be concise, but now include a small `flavorEvents` array listing up to three actual dungeon overlay titles encountered during search steps
- the main agent loop remains `state -> actions -> act`; agents do not need new action ids or a new expedition protocol

## Design Direction

### 1. Expand state dungeon overlays in place

Every state file under `packages/domain/src/events/content/nodes/states/*` should define `18` dungeon mother rows.

Use the same fixed slot taxonomy across all states:

- `fortune-resource`
- `fortune-status`
- `fortune-progression`
- `training-progression`
- `training-combat`
- `training-status`
- `human-resource`
- `human-status`
- `human-story`

Each slot gets two authored rows per state.

All touched rows should have both:

- `title`
- `titleCn`

Reward buckets may repeat across states when needed. The priority is content volume plus clear regional anchors, not deep mechanical differentiation in this round.

### 2. Preserve current pool assembly

Do not change:

- the `catalog-node` composition model
- rank-band filtering rules
- shared `dungeon-c / dungeon-b / dungeon-a` packs
- existing action ids
- dungeon grade unlock logic

The intended outcome is more authored content without reopening pool architecture.

### 3. Add lightweight expedition flavor exposure

Managed expeditions already resolve search and guardian steps internally. This batch adds a lightweight visibility layer rather than a full log.

Required behavior:

- `DungeonExpeditionProgress` stores internal `flavorEventTitles: string[]`
- `DungeonExpeditionReport` exposes public `flavorEvents: string[]`
- only `search` steps contribute to `flavorEvents`
- only `node-specific` dungeon events count
- keep first-seen order
- dedupe titles
- cap at `3`

The free-text `summary` remains unchanged in structure. `flavorEvents` is the structured surface for agents that want a little more narrative grounding without parsing a full step log.

### 4. Keep backward compatibility explicit

Older stored worlds may lack:

- `DungeonExpeditionProgress.flavorEventTitles`
- `DungeonExpeditionReport.flavorEvents`

Hydration must backfill both to `[]`.

## Acceptance Criteria

- every state dungeon overlay file contains exactly `18` mother rows
- each dungeon entrance now has `90` `node-specific` events after composition
- shared dungeon packs remain present
- rank-band filtering remains `1-3 / 4-6 / 7-9`
- managed expedition reports expose `flavorEvents`
- `flavorEvents` only contain node-specific dungeon titles from search steps, preserve first-seen order, are deduped, and never exceed `3`
- legacy world snapshots hydrate missing `flavorEventTitles` and `flavorEvents` to `[]`
- focused event, expedition, engine, and persistence tests pass
