# Implementation Plan

## Linked Spec

- `docs/specs/home-state-raid-and-wake-window/spec.md`

## Goal

Give every state a neighbor-owned border camp a 筑基 steward can raid, and make dungeon and sect choices wait ten ticks with an explicit chosen-versus-timeout line.

## Architecture

`ensureSpiritVeins` keeps the herb field, mine, and spirit vein, then adds `{stateId}:border-camp` on the east town. The owner is the neutral sect of the first cross-state neighbor. `raidBlock` already allows an in-state vein owned by someone else, so the new node shows up as `declare-raid` without opening cross-state war. Sect tier counts only veins whose `stateId` matches the sect.

Dungeon wake timeout and sect-scene wait both become 10. `settleDungeonWakeNode` stamps `你选了` or `时辰到了，代选了` onto the beat. The manual act and the timeout path each write a dao log. The pending view adds `decisionLine`, and the digest adds `priorities`, both saying 地宫岔路待决.

`earlyWhere` appends the 金丹 sentence only at realm levels 5 and 6.

## Tasks

### Task 1

- `packages/domain/src/model.ts`, `packages/domain/src/sect-life.ts`, `packages/domain/src/sect-life.test.ts`
- Seed the border camp, count home-state veins for tier, write 见闻 on raid outcomes, and assert a 筑基 steward in 扬州 can see and an elder can win `宣战夺脉`.

### Task 2

- `packages/domain/src/dungeon-expedition-service.ts`, `packages/domain/src/engine.ts`, `packages/domain/src/inner-life.ts`, `packages/domain/src/sect-duty-scenes.ts`, `packages/domain/src/dungeon-expedition.test.ts`
- Wait 10 ticks, list the decision until then, record a manual choice on the beat and the dao log, and mark a timeout as 代选.

### Task 3

- `packages/domain/src/realm-path.ts`, `packages/domain/src/realm-path.test.ts`
- Add the 金丹 lookahead to levels 5 and 6.

## Verification

- `node --import tsx --test packages/domain/src/sect-life.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/realm-path.test.ts packages/domain/src/sect-social-mid.test.ts packages/domain/src/dungeon-midrun-sights.test.ts packages/domain/src/deepen-playtest.test.ts packages/domain/src/deepen-playtest-v2.test.ts packages/domain/src/high-realm-dungeon.test.ts`

## Doc Updates

- `docs/specs/home-state-raid-and-wake-window/spec.md`
- `docs/plans/home-state-raid-and-wake-window.md`
- `AGENTS.md`
