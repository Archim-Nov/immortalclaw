# Spoken lines between cultivators

Spec: `docs/specs/social-spoken-lines/spec.md`.

## Approach

Keep the act body action-id based. Add an optional `line` and thread it from the routes through the application and persistence repositories into `performAction`. `openSpokenLine` trims a supplied sentence to 40 characters, or picks one from a small Chinese pool. The chosen sentence is copied onto the message as `spokenLine` and into both travelogues inside 「」.

`say:<id>` reaches someone in the same place or the same party. `reply-line:<id>` answers an unread message that already has `spokenLine`. `state.pendingDialogue` is that unread list, omitted when empty.

Party calls stay on their existing action ids. The old instructional sentence stays, and the spoken sentence is appended. Cooldown is per kind, so rendezvous, ready, and wait can still go out in one tick. Free chat counts its own turns and stops at three inside six ticks.

## Files

- `packages/domain/src/spoken-lines.ts` for the pools, the trim, and the cooldown.
- `packages/domain/src/engine.ts` for chat-up, gift, greet, party calls, `say`, and `reply-line`.
- `packages/domain/src/model.ts` for `spokenLine`, `pendingDialogue`, and the new action ids.
- `packages/domain/src/social.ts` for the link fields that remember the last line.
- Contracts, application, persistence, and both act routes, so `line` reaches the domain.
- Agent docs: `AGENTS.md`, `apps/web/public/skill.md`, `apps/web/public/heartbeat.md`, `apps/world-do/src/agent-guides.ts`.

## Verification

`node --import tsx --test` on `spoken-lines.test.ts`, the deepen playtests, combat deepen v2 and v3, party battle, dungeon expedition, social, combat integration, and `engine.test.ts`. `npx tsc -p tsconfig.json --noEmit`.
