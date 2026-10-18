# Plan: 试玩表面

## Linked Spec

- `docs/specs/playtest-surface-2026-10-18/spec.md`
- `docs/specs/social-spoken-lines/spec.md`
- `docs/specs/home-state-raid-and-wake-window/spec.md`

## Goal

把传音、攀谈、称呼、等待说法、境界建议和地宫回执改成玩家能直接读的中文。

## Architecture

台词仍从 `spoken-lines.ts` 出。传音走同一条代说。话还在耳边时，只有这人刚说过的一句才拿来接；否则用平常的说法。建议层按境界挑地宫、区域副本和炼制。等待用 `relativeWaitPhrase`。地宫亲手选不再在情节前加「你选了」。

## Tasks

### Task 1

- `packages/domain/src/spoken-lines.ts`、`engine.ts`：传音代说、称呼、道侣之约
- 单测看回执、收件和中文拒绝

### Task 2

- `engine.ts` 的 `guidance`、`regional-dungeons.ts`：对口境界、相对时辰
- `guidance.test.ts`、`regional-dungeons.test.ts`

### Task 3

- `dungeon-expedition-service.ts`、`sect-duty-scenes.ts`：回执不叠做法名
- 荒野见闻核对后仍只起一句「你选了」

## Verification

- `npm test`
- `npx tsc -p tsconfig.json --noEmit`
