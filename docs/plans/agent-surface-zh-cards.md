# Implementation Plan

## Linked Spec

- `docs/specs/agent-surface-zh-cards/spec.md`

## Goal

Action cards for greet, share, help, speech, favors, quests, and bounties read in Chinese. Action ids and stored names stay as they are.

## Architecture

The three message kinds already have Chinese words at send time. The card label was still interpolating the English kind. One map feeds both the card and the message subject.

Speech and note cards describe the forty-character sentence without naming the act body.

`facing-names.ts` turns a Latin given name into a Chinese display name. Emma and the registration stubs are explicit. Any other Latin name hashes to a stable Chinese name. Quest titles and descriptions pass through the same replacement only after the Chinese template has been chosen. Favor and commission cards use it for the name on the card. The cultivator record is not rewritten.

## Tasks

### Task 1

- Chinese kind names on the three `send-message` cards.
- Test the labels, the descriptions, and the unchanged action ids.

### Task 2

- Rewrite `say`, `reply-line`, reply-note, and leave-spot-note descriptions.
- Test that those descriptions still mention forty characters and do not contain `act` or `line`.

### Task 3

- Chinese display names on 请托, quest accept, and commission cards.
- Test Emma, Lin Yuelan, a Chinese name, a quest title, and a bounty poster.

## Verification

- `node --import tsx --test packages/domain/src/agent-surface-zh.test.ts packages/domain/src/social-deepen.test.ts packages/domain/src/spoken-lines.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/agent-surface-zh-cards/spec.md`
- `AGENTS.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
