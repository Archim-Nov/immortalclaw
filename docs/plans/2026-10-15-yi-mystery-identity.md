# 乙级秘境身份

## Linked Spec

- `docs/specs/yi-mystery-identity/spec.md`

## Goal

让筑基在乙级一到三、四到六、七到九层读到三处不同的地方，并在战报和失败时讲得出来。甲级掉落和守关公式保持原样。

## Architecture

新文件 `packages/domain/src/yi-mystery.ts` 只管名字、从者、一种现成状态和短的失败句子。`high-realm.ts` 的秘境表和 `high-realm-dungeon.ts` 的甲级系数不接收乙级。

队伍战在甲级成型之后，才给乙级和丙级七到九层换从者名字并挂上状态。状态用第二档，不额外抽灵，不改血量。失败结算先走甲级那一笔，没有时再走这处的短句和很少的灵石。伤的时长仍由原来的公式决定。

`advice`、`mysteryLine` 和筑基、炼气后期的 `realmPath` 读这张表。丙级七到九层再按所在州补一句。

## Tasks

### Task 1

- 写下三处乙级和旧驿石廊的名字、状态、从者、短句。
- 丙级七到九层按九州各补一句门口的话。

### Task 2

- 队伍战换从者名字并挂状态。战报保留能看见状态的那一句。
- 失败结算写下短句。乙级扣很少的灵石。丙级七到九层不扣。

### Task 3

- `advice`、`mysteryLine`、`realmPath`、`skill.md` 和运行时指引写出这三处。
- 领域测试覆盖血量不变、三处从者不同、甲级名字仍在。`npm run build:web` 通过。

## Verification

- `node --import tsx --test packages/domain/src/high-realm-dungeon.test.ts`
- `npm test`
- `npm run build:web`

## Doc Updates

- `docs/specs/yi-mystery-identity/spec.md`
- `docs/plans/2026-10-15-yi-mystery-identity.md`
- `harness/scenarios/yi-mystery-identity.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `apps/world-do/src/agent-guides.ts`
