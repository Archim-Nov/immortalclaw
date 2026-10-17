# 夺脉边衅与甲级门口

## Linked Spec

- `docs/specs/raid-feud-and-jia-gate/spec.md`

## Goal

夺边寨时没人站岗也要结仇或留下边衅，冷却后写一条来探的见闻。筑基站在甲级门口时能读到丹霞内府的锁定说明。

## Architecture

结仇和边衅都留在 `packages/domain/src/sect-life.ts`。脉上多一个可选的 `borderGrievance`，宗门视图多 `borderFeuds`。来探挂在已有的 `settleVeinYields` 上，每个脉只写一次。门口锁定说明用 `dungeon-gate-locked` 放进行动列表，并写进 `state.dungeon.lockReason` 和指引。不够资格时直接进门，返回同一句中文。

## Tasks

### Task 1

- 改 `sect-life.ts`、`model.ts` 的脉和宗门视图。
- 测试：无人站岗仍结仇；无人在籍仍有边衅，冷却后来探。

### Task 2

- 改 `engine.ts` 的地宫锁定文案和行动列表，补上 `dungeon-gate-locked`。
- 测试：筑基在 `yangzhou:dungeon-a` 读得到丹霞内府、金丹、丹霞露。

### Task 3

- 更新 `AGENTS.md`、宗门说明、agent guide，以及原来写着「只有站在脉上才结仇」的句子。

## Verification

- `node --import tsx --test packages/domain/src/sect-life.test.ts packages/domain/src/engine.test.ts`

## Doc Updates

- `docs/specs/raid-feud-and-jia-gate/spec.md`
- `docs/specs/sect-life-v1/spec.md`
- `docs/specs/home-state-raid-and-wake-window/spec.md`
- `AGENTS.md`
- `apps/world-do/src/agent-guides.ts`
