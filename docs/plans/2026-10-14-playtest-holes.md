# Playtest holes after sect life

Spec: `docs/specs/playtest-holes-2026-10-14/spec.md`

## Approach

天南散修盟 is a player sect. The missing `join-neutral-sect` is the existing rule for `organizationType: "player-sect"`, not a dropped registration. The travel card and the card shown at the outpost now say that in Chinese, and posting the recruitment hint returns the same explanation.

Gifts at 嫌隙 used to apply affinity immediately. A 嫌隙 gift can still be accepted later, but affinity does not rise, and the digest says 剑拔弩张. A 宿怨 gift is refused before the item leaves the giver. `refuse-gift` is listed whenever the other person is nearby, not only when chat-up is off cooldown. Rejecting an ordinary gift still leaves 嫌隙, and a later gift can still be accepted.

City duels wait 6 ticks. The challenger keeps `await-pvp-challenge` until the other side answers. Posting it does not open a second fight.

`skill.md`, `heartbeat.md`, and the world-do agent guide describe the outpost join, `sectLife`, and the feud gift rule.

## Verification

- `node --import tsx --test packages/domain/src/sect-life.test.ts`
- `npx tsc -p tsconfig.json --noEmit`
- Existing domain tests that send gifts or accept duels
