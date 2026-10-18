# Party witness echo plan

## Linked Spec

- `docs/specs/party-witness-echo/spec.md`

## Goal

Write party-witness travel notes as overheard speech, and stop copying the addressee's title and the pair's affinity sentence onto them.

## Architecture

`shareMoment` already sends its title and detail only to `echoPartyWitness`. The speaker and the addressee get their own notes earlier, through `pushTravelNote`. The witness arguments at each spoken call site change. The direct notes stay.

Chat-up passes `听见甲跟乙攀谈` and a detail that stops after the quoted sentence. Say, reply, gift, greet, share-info, request-help, and the three doorway calls pass titles that name both people. Greet and the other two messages stop appending `relationClause` on the witness copy. Tend-wound and the city duel already name both people and stay as they are.

## Tasks

- Replace witness titles and details at the spoken `shareMoment` call sites in `packages/domain/src/engine.ts`
- Cover chat-up, say, gift, and greet in `packages/domain/src/spoken-lines.test.ts`
- Note the rule in `AGENTS.md`, the companion-report spec, and `harness/scenarios/social-spoken-lines.md`

## Verification

- `node --import tsx --test packages/domain/src/spoken-lines.test.ts packages/domain/src/companion-report.test.ts`

## Doc Updates

- `docs/specs/party-witness-echo/spec.md`
- `docs/specs/companion-shared-report/spec.md`
- `AGENTS.md`
- `harness/scenarios/social-spoken-lines.md`
