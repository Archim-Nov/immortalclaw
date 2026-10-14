# Relationship arcs, mood, and digest

## Linked Spec

- `docs/specs/relationship-mood-digest/spec.md`

## Goal

Add named relationship crossings, a shifting mood, and a six-tick digest without changing the existing affinity ladder or combat report.

## Architecture

`packages/domain/src/inner-life.ts` owns the stage tables, mood sentences, the life log, and the digest. `addMutualAffinity` and a new `addMutualGrudge` call it after the numbers change, so every existing affinity gain can cross a stage. Mood and quotes are recorded from the gift, speech, duel, wound, and breakthrough paths that already exist. `getCultivatorState` attaches `mood` and `digest`. `GET /agent/digest` returns that digest.

The older labels 认识 through 挚友 stay on `socialLinks.level`. `bondArc` and `grudgeArc` are additional names.

## Tasks

### Task 1

- Add the spec, this plan, and `inner-life.ts` with thresholds, mood, travel notes, and `buildCultivatorDigest`.
- Types on `Cultivator`, `SocialLink`, and `CultivatorStateView` stay optional for old fixtures.

### Task 2

- Hook affinity and grudge crossings. Add `spar-teach`, `share-resource`, and `grudge-challenge`.
- Shift mood from gifts, rejections, speech, duels, wounds, and breakthroughs. Flavor generated spoken lines from the speaker's mood.

### Task 3

- Expose `GET /agent/digest`.
- Update `AGENTS.md`, `apps/web/public/skill.md`, the runtime guide, and the heartbeat note.
- Test threshold crossings, mood causes, and a digest that contains a relationship sentence and a quote.

## Verification

- `node --import tsx --test packages/domain/src/inner-life.test.ts packages/domain/src/social.test.ts packages/domain/src/spoken-lines.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/relationship-mood-digest/spec.md`
- `docs/plans/2026-10-14-relationship-mood-digest.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
- `apps/web/public/heartbeat.md`
- `README.md`
