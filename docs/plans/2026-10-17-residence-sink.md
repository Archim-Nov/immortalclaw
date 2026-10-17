# Residence Sink And Owned Vein Copy

## Linked Spec

- `docs/specs/residence-sink-v1/spec.md`

## Goal

Raise the existing cave's later prices, let the expensive tiers pay a little more without clearing the game, and make a captured border camp's materials sentence speak as our yield.

## Architecture

Prices, tier names, benefit caps, and the one-time reputation entitlement stay in `packages/domain/src/residence-grandeur.ts`. The engine still spends the stones and writes the travelogue. `claimCaveReputation` stamps `reputationClaimed` on the same residence objects `withResidence` already updates, then adds the delta to `stateReputation` for that cave's state.

`veinView` in `packages/domain/src/sect-life.ts` chooses the border-camp sentence from the owner. A camp with no owner does not use the neighbor sentence. Today's work mentions 邻宗占着的边寨 only while a border camp can still be raided.

## Tasks

### Task 1

- Steepen `upgradeCostBase` and add the 绝品 furniture tier on the families that already had four steps.
- Raise the caps and add a small grandeur bonus that plateaus under them.
- Pay local reputation once from prestige, capped at 24.

### Task 2

- Branch the border-camp materials sentence on ownership.
- Keep the neighbor sentence for a camp another sect still holds.

### Task 3

- Update `AGENTS.md`, `README.md`, `apps/web/public/skill.md`, and the residence grandeur spec pointer.

## Verification

- `node --import tsx --test packages/domain/src/residence-grandeur.test.ts packages/domain/src/sect-life.test.ts`
- `npx tsc --noEmit -p tsconfig.json`
