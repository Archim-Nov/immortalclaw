# Favors, sect life, notes, and gossip

## Linked Spec

- `docs/specs/social-deepen/spec.md`

## Goal

Add personal favors, a sect hall board, notes for people who are away, and nearby gossip, without changing spoken lines, party size, combat, or the six-tick digest.

## Architecture

`packages/domain/src/social-deepen.ts` owns the favor, note, sect-board, and sect-errand actions. `listAvailableActions` and `performAction` call it, and `advanceWorld` expires favors. Gossip for a new 知己, a new 嫌隙 or 宿怨, and a city win is spread from `inner-life.ts` and the city-duel note, so a neighbor's travelogue and digest pick it up. A generated spoken line uses one fresh rumor when the agent does not supply `line`.

`call-favor`, public commissions, and `request-help` stay. The grudge stage name changes from 嫩隙 to 嫌隙. Thresholds do not change.

## Tasks

### Task 1

- Add the spec, this plan, and the favor, note, sect, and gossip types.
- Rename 嫌隙 in the arc table, the sentences, and the docs that named the old typo.

### Task 2

- Ask, accept, decline, fulfill, and abandon a favor. Expiry fails it. Success owes a 人情 and writes both travelogues and the digest.
- Leave a personal note and a spot note. Read and reply with `line`.
- Post a sect notice, do one joint errand, and let a senior guide a junior.

### Task 3

- Spread gossip to other people in the same place. Let `mention-gossip` and the next generated line repeat it.
- Document the new action ids and state fields in `AGENTS.md`, `skill.md`, the runtime guide, and the heartbeat note.

## Verification

- `node --import tsx --test packages/domain/src/social-deepen.test.ts packages/domain/src/inner-life.test.ts packages/domain/src/spoken-lines.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/social-deepen/spec.md`
- `docs/plans/2026-10-14-social-deepen.md`
- `docs/specs/relationship-mood-digest/spec.md` for the stage name
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
- `apps/web/public/heartbeat.md`
- `README.md`
- `harness/scenarios/social-deepen.md`
