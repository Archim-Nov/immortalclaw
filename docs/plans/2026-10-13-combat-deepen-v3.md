# Combat Deepen v3

Spec: `docs/specs/combat-deepen-v3/spec.md`.

## Approach

Keep `runPartyBattle`. Build the guardian list in `buildGuardianPack` and pass that array through. Rank 1–2 丙 stays one elite. Harder rooms add a follower, and the highest rooms add a flanker. Injury floors live next to that helper so the expedition step can apply them without a second combat pass.

Travel notes that already exist gain one relation clause when affinity just stepped, or a favor or rivalry is present. The missing diaries are the rotate's other two people, the reserve who fills a kick, and both sides of leaving the reserve. `tend-wound:<id>` is the new action.

## Files

- `packages/domain/src/party-battle.ts` for the pack, the wound floors, and the companion wound.
- `packages/domain/src/engine.ts` for the guardian step, the notes, and `tend-wound`.
- `packages/domain/src/dungeon-expedition-service.ts` so the fight line repeats a wound when one was stored.
- `packages/domain/src/model.ts` for the action id and the optional `wound` on a combat summary.
- Agent docs: `AGENTS.md`, `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`.

## Verification

`node --import tsx --test` on the new combat test, party battle, dungeon expedition, social, combat integration, the deepen playtests, and `engine.test.ts`. `npx tsc -p tsconfig.json --noEmit`.
