# Implementation Plan

## Linked Spec

- `docs/specs/sect-social-mid-v1/spec.md`

## Goal

本职和宗门事务在最后一刻停一次，并用字条、闲话、再见面把关系变化写进摘要。

## Architecture

场合放在 `packages/domain/src/sect-duty-scenes.ts`。世界往前走时，若这趟是 `post-duty` 或 `sect-chain:*`，并且剩余时辰已经走到最后一刻，就把场合写进 `job.meta.sectScene`，并把剩余时辰加回去，直到有人用 `sect-scene:<optionId>` 回答，或过了三刻。超时用 `plain`。结账时把见闻接在原来的句子后面。

关系的增量仍走现有的好感和怨隙。看字条、回字条、转述闲话、赶到同一处，都写进双方的游记和 life log，摘要就会读到。同城被动好感在已经是嫌隙或宿怨时跳过。硬话扩到说话、分享、求援和赠礼，仍用原来的台词池。

## Tasks

### Task 1

- 新增 `sect-duty-scenes.ts`，五种职位、六件事务各两套场合。
- 在 `engine.ts` 的时辰循环、空闲检查之前的行动入口、以及忙碌时的行动列表接上。
- `model.ts` 增加 `sect-scene:` 和 `job.meta.sectScene`。
- 结账函数接受一句见闻，接在成功的句子上。

### Task 2

- `social-deepen.ts`：看字条和回音动好感；嫌隙则改写成剑拔弩张。闲话按种类处理。赶到同一处时写嫌隙或未完成的请托。
- `spoken-lines.ts`：嫌隙以上的说话和赠礼用硬话。
- 同城被动好感避开嫌隙和宿怨。

### Task 3

- 测试覆盖停一次、超时、巡山与收脉、同门、嫌隙、字条、闲话、再见面。
- 更新 `AGENTS.md`。

## Verification

- `node --import tsx --test packages/domain/src/sect-social-mid.test.ts packages/domain/src/sect-life.test.ts packages/domain/src/social-deepen.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/sect-social-mid-v1/spec.md`
- `docs/plans/sect-social-mid-v1.md`
- `AGENTS.md`
