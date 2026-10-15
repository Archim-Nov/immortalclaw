# 荒野和八荒的身份

## Linked Spec

- `docs/specs/wild-route-identity/spec.md`

## Goal

让一个人走州外、或者进八荒时，能在出门前和路上读到这一处的名字、状态和跟着的东西。地宫的乙级、丙级和甲级保持原样。

## Architecture

新文件 `packages/domain/src/wild-places.ts` 只管九州荒野和八荒三段的名字、现成状态的中文、跟着的两个称呼，以及路上、见闻、撤出的短句。它不改伤害。

路程卡、`state.wildRoute`、层里的视图和八荒视图都读这张表。猎兽只把战报里的名字和句子换掉。见闻写进游记，并用 growth 记进 digest。

## Tasks

### Task 1

- 写下九州九处和八荒三段的名字、状态、跟着的东西、路上的句子、见闻和撤出的短话。

### Task 2

- 路程卡、门口的 `wildRoute`、层里和八荒的状态读这张表。
- 路上、层里和八荒深处写见闻。撤出写短话。
- 州外打兽时，战报用这一处的兽名，句子里带上状态和旁边那个。

### Task 3

- `skill.md`、heartbeat 和运行时指引在选路之前写出这些地方。
- 领域测试覆盖青州和雷州不同、路上的见闻、猎兽名字、八荒三段，以及乙级、甲级的名字仍在。`npm run build:web` 通过。

## Verification

- `node --import tsx --test packages/domain/src/wild-places.test.ts packages/domain/src/bahuang.test.ts packages/domain/src/wilderness.test.ts packages/domain/src/high-realm-dungeon.test.ts`
- `npm test`
- `npm run build:web`

## Doc Updates

- `docs/specs/wild-route-identity/spec.md`
- `docs/plans/2026-10-15-wild-route-identity.md`
- `harness/scenarios/wild-route-identity.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
