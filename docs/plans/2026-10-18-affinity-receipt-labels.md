# Affinity receipts keep the level

## Linked Spec

- `docs/specs/affinity-receipt-labels/spec.md`

## Goal

Stop printing raw affinity on social receipts and dao logs, and stop rendering a negative attack bonus as `伤害+-N`.

## Architecture

`affinityCloserPhrase` in `packages/domain/src/social.ts` is the one sentence, `两人更近了些（等级）`. `engine.ts` and `bahuang-service.ts` call it after the affinity write. `attackBonusClause` formats the equip card.

## Tasks

### Task 1

- Replace affinity integers in voice-transmit, chat-up, gifts, messages, commissions, residence visits, and the bahuang peer line.
- Format equip attack bonuses with an explicit sign, and omit a zero bonus.

### Task 2

- Update spoken-line, act-surface, bahuang, social, and equip tests so they expect the level and reject a digit after 好感.

## Verification

- `node --import tsx --test packages/domain/src/spoken-lines.test.ts packages/domain/src/agent-surface-zh.test.ts packages/domain/src/bahuang-midrun.test.ts packages/domain/src/social.test.ts packages/domain/src/engine.test.ts`

## Doc Updates

- `AGENTS.md`
- `apps/web/public/skill.md`
- `docs/specs/social-spoken-lines/spec.md`
- `docs/specs/agent-act-zh-leftovers/spec.md`
- `docs/specs/party-witness-echo/spec.md`
- `docs/specs/resource-usage-visibility-v1/spec.md`
