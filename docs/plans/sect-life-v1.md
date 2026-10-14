# Sect Life Plan

## Linked Spec

- `docs/specs/sect-life-v1/spec.md`

## Goal

Add posts, sect merit, map nodes, raids, and tense follow-up meetings on top of the current sect and relationship code.

## Architecture

`packages/domain/src/sect-life.ts` owns the rules. `engine.ts` only lists the actions, starts the jobs, and writes the view. Merit lives on the sect record. Named tier comes from merit plus owned nodes. Player-sect merit is also added inside `buildSectLevel`, so the old contribution level still moves and old tests that leave merit at zero stay put. Veins are records on `world.spiritVeins`, anchored to the south town, the wilderness, and the neutral sect outpost. Grudge stays on the social link. 嫌隙 and 宿怨 are unchanged thresholds. A finished fight grants enough grudge to cross 嫌隙, including a draw.

## Tasks

### Task 1

- Add the post, vein, and view types, plus the new action ids, in `packages/domain/src/model.ts`.
- Expect `tsc` to accept `take-post`, `post-duty`, `sect-chain`, `gather-vein`, `declare-raid`, and `refuse-gift`.

### Task 2

- Implement posts, chains, yield, raids, and the agent view in `sect-life.ts`.
- Fold merit into `buildSectLevel`.
- Hook listing, jobs, guidance, and tick yield from `engine.ts`.

### Task 3

- Point generated speech, nearby lines, and the digest at the existing grudge. A 宿怨 gift is refused. Same-sect gifts gain a little more affinity. Wilderness fights against a cultivator add grudge.

### Task 4

- Cover post taking, the tier-up path, vein yield, raid ownership, and the tense meeting in `sect-life.test.ts`.
- Update `README.md` and `AGENTS.md` with the action ids and the material map.

## Verification

- `npx tsc -p packages/domain/tsconfig.json --noEmit` if that project exists, otherwise `npx tsc -p tsconfig.json --noEmit --pretty false`
- `node --import tsx --test packages/domain/src/sect-life.test.ts packages/domain/src/sect-level.test.ts packages/domain/src/inner-life.test.ts`

## Doc Updates

- `docs/specs/sect-life-v1/spec.md`
- `docs/plans/sect-life-v1.md`
- `README.md`
- `AGENTS.md`
