# Combat And Party Deepen v2

Spec: `docs/specs/combat-party-deepen-v2/spec.md`.

## Approach

Keep the dungeon fight in `party-battle.ts`. Add a duel mode where the other cultivator casts their own skills instead of an enemy pattern. A close timeout is a draw. City duel jobs call that once, then the existing payout still applies stones, reputation, affinity, and rivalry.

Preferred role and skill slots live on the cultivator. The role is accepted only when a non-shared skill of this loadout lists it, or it is the inferred role. Practice is a small multiplier inside skill resolution, capped at 24 points.

`echoDungeonCompanion` no longer deletes someone because their location changed. `leave-shared-expedition` does. Parties gain one `reserveIds` seat. Kick and rotate never put six people in `memberIds`.

## Files

- `packages/domain/src/party-battle.ts` for duel mode and a slightly less sticky guard when nobody is hurt.
- `packages/domain/src/combat-skills.ts` for legal roles, slots, and practice.
- `packages/domain/src/engine.ts` for the duel job, the new actions, expedition membership, and profile fields.
- `packages/domain/src/model.ts`, `packages/domain/src/social.ts`, and `packages/persistence/src/world-shape.ts` for the additive fields.
- Agent docs: `AGENTS.md`, `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`.

## Verification

`node --import tsx --test` on the new combat test, party battle, dungeon expedition, social, combat integration, the deepen playtests, and `engine.test.ts`. `npx tsc -p tsconfig.json --noEmit`.
