# Affinity receipts keep the level

## Summary

Social receipts, dao logs, and the lines that land in a digest name the relationship level and leave the affinity integer off the page. A negative weapon or spell bonus prints `伤害-N`, not `伤害+-N`.

## Problem

`POST /agent/act` for `voice-transmit` answered with `好感至791（挚友）`. The same class of sentence printed `好感+15`, `好感度+3`, and `现在是762` on gifts, greetings, commissions, a bahuang conversation, and the residence visit log. Equip cards rendered a negative bonus as `伤害+-1`.

## Goals

- Player-facing social summaries and dao logs use `getAffinityLevel` and do not print the raw affinity.
- A rise reads `两人更近了些（挚友）`. A feud that does not rise still says 好感没有涨.
- Spirit-stone rewards, gift counts, and item counts stay numbered. Only the affinity figure goes.
- Equip descriptions use `伤害+N` for a gain, `伤害-N` for a loss, and omit the clause when the bonus is zero.

## Non-Goals

- Changing how much affinity an action grants.
- Changing wilderness beats. `你选了${option.label}` stays as the tests already assert it.
- Rewriting bond-crossing sentences that already use 点头之交, 好友, and 知己 without a number.

## User-Visible Behavior

A voice-transmit receipt quotes the sentence and ends `两人更近了些（挚友）`. The dao log uses the same words. A gift, a greet, a shared sighting, a request for help, a finished commission, a bahuang conversation, and a residence visit do the same with whatever level the link has after the action. 嫌隙 and 宿怨 still say 剑拔弩张 and 好感没有涨.

换上藏锋匕 says 伤害-1. 换上雁翎刀 says 伤害+2. 换上木锋剑 does not mention 伤害.

## Constraints

- The integer remains on `socialLinks`. Agents that need a threshold still read the level name.
- Copy stays in the existing plain Chinese. No explanation of the number being hidden.

## Acceptance Criteria

- A voice-transmit `summary` matches the level and does not match a digit next to 好感, 好感至, or 好感度.
- Gift, greet, and bahuang receipts no longer match `好感+N` or `好感度+N`.
- An equip card for a negative bonus contains `伤害-1` and does not contain `伤害+-`.
- A zero bonus omits 伤害. A positive bonus stays `伤害+N`.
- Domain tests for spoken lines, the Chinese act surface, bahuang meetings, and equip cards pass.

## Open Questions

- None. The stored affinity is unchanged.
