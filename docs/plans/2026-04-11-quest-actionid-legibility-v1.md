# Quest ActionId Legibility V1 Implementation Plan

## Linked Spec

- `docs/specs/quest-actionid-legibility-v1/spec.md`
- `docs/specs/remaining-work-roadmap-v1/spec.md`

## Goal

Replace opaque quest action ids with readable `quest:*` action ids while preserving the current quest board and quest execution behavior.

## Architecture

This is an action-contract change, not a quest-system redesign.

- keep internal quest instance ids and active quest ids available for runtime bookkeeping
- add a dedicated quest action id builder/parser in the quest module
- enrich quest runtime data with structured fields needed to build readable action ids
- switch all agent-facing quest action surfaces to the new format
- resolve quest execution back to the internal active quest id before job resolution

## Tasks

### Task 1: Define the quest action contract

- modify `packages/domain/src/model.ts`
- add quest action id template types and enrich quest instance / active quest runtime fields as needed
- verification: typecheck via repository tests

### Task 2: Add quest id builders and parsers

- modify `packages/domain/src/quest.ts`
- add helper functions for build/parse quest action ids
- update quest acceptance helpers to resolve board quests by readable action semantics instead of instance id exposure
- verification: parser/builder coverage in quest or engine tests

### Task 3: Rewire engine quest action generation and execution

- modify `packages/domain/src/engine.ts`
- switch available actions, onboarding recommendations, and strategy recommendations to `quest:*`
- resolve execute actions back to internal active quest ids before starting the job
- verification: quest loop and golden path tests

### Task 4: Update docs and public contract notes

- modify `apps/web/public/skill.md`
- review any public runtime docs that still mention `accept-quest:*` and `execute-quest:*`
- verification: grep sanity check for stale public references

## Verification

- `npm test`

## Doc Updates

- `docs/specs/quest-actionid-legibility-v1/spec.md`
- `docs/specs/remaining-work-roadmap-v1/spec.md`
- `apps/web/public/skill.md`