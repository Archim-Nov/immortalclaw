# Favor chains, a social digest, and a reunion

## Linked Spec

- `docs/specs/favor-chains/spec.md`

## Goal

Keep a quotable reason on each owed favor, tell the repayment as one story in the digest, prefer social beats over an empty twelve hours, and let two people meet again after a journey. Generated speech should sound like the scene, and a reply should stay with the person who spoke.

## Architecture

`owedFavors` lives on the creditor's `SocialLink` and is copied into `state.owedFavors`. `grantOwedFavor` and `forgiveOneFavor` in `packages/domain/src/social.ts` push and pop that reason. `call-favor` and a later `fulfill-favor` both write the linked sentence through the existing travelogue and life log, so the six-tick digest can read it.

`buildCultivatorDigest` already reads `lifeLog`. The summary leads with relationship beats, names up to three people, and keeps one quote. 「过得平常」 remains only when that window has none of those beats.

`wait-for:<id>` and the arrival check live in `packages/domain/src/social-deepen.ts`. Travel resolution calls the arrival check. The reunion cooldown is twelve ticks.

`packages/domain/src/spoken-lines.ts` builds the generated sentence from the gift, the wound, the gate, the favor, or the line just heard. Mood still chooses a pool, but the lines no longer announce the mood label. A reply marks that sender's pending line answered, and a line that addresses someone else is refused before it is stored.

## Tasks

### Task 1

- Add the spec, this plan, the owed-favor types, and the reason stack.
- Teach `call-favor`, wound tending, help, commissions, sect diary, and personal favors to record a reason.

### Task 2

- Write the repayment sentence for `call-favor` and for a different favor repaid to the creditor or to their friend.
- Prefer social beats in the digest.
- Add `wait-for` and the reunion note.

### Task 3

- Replace stiff generated lines and bind replies to the speaker who is being answered.
- Document the new fields and action ids.

## Verification

- `node --import tsx --test packages/domain/src/favor-chains.test.ts packages/domain/src/spoken-lines.test.ts packages/domain/src/social-deepen.test.ts packages/domain/src/inner-life.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/favor-chains/spec.md`
- `docs/plans/2026-10-14-favor-chains.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/world-do/src/agent-guides.ts`
- `apps/web/public/heartbeat.md`
- `README.md`
- `CHANGELOG.md`
- `harness/scenarios/favor-chains.md`
