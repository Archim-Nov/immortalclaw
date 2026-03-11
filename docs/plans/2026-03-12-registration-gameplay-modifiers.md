# Registration Gameplay Modifiers Plan

## Linked Spec

- `docs/specs/registration-gameplay-modifiers/spec.md`

## Goal

Bridge OC registration into the live prototype by turning stored registration output into visible, lightweight gameplay modifiers.

## Architecture

Add a small registration-to-runtime translation layer inside `packages/domain/src/engine.ts`. Keep persistence unchanged. Expose a player-facing view through cultivator state and apply additive modifiers during existing job resolution.

## Tasks

### Task 1

- update `packages/domain/src/model.ts` with state view types for registration gameplay effects
- update `packages/domain/src/engine.ts` to derive dominant elements and runtime modifiers from registration data

### Task 2

- wire registration modifiers into guidance, tribulation preview, manual study, cultivation, errands, mining, ruins, and combat resolution
- keep modifiers small and deterministic within the existing action system

### Task 3

- extend `packages/domain/src/engine.test.ts` with registration-driven state and outcome assertions
- run targeted domain verification plus repo typecheck

## Verification

- `node --import tsx --test packages/domain/src/engine.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `README.md`
- `docs/specs/registration-gameplay-modifiers/spec.md`
- `docs/plans/2026-03-12-registration-gameplay-modifiers.md`
