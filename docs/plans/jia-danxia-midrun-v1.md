# 甲级进门到守关之间

## Linked Spec

- `docs/specs/jia-danxia-midrun-v1/spec.md`

## Goal

没开过的甲级层先走三段探路，再允许守关。门口只列出进门卡。

## Architecture

抽步仍在 `chooseDungeonExpeditionStepKind`。甲级且这一阶还没开过时，`stepIndex` 小于 3 固定返回探路。第三步结束时，现有的伤者醒时照旧排上。再下一步才按姿态抽守关。

门口的行动列表去掉 `start-dungeon-expedition` 那一轮。进门卡的说明并入原来远征卡上的三十刻和收获，甲级门口那一阶再加一句先走路。`performAction` 对旧编号的处理不动。指引改指向 `enter-dungeon`。

## Tasks

### Task 1

- `packages/domain/src/dungeon-expedition-service.ts`：甲级未开层的前三步固定探路。
- `packages/domain/src/engine.ts`：门口只列进门卡，说明写上三十刻和甲级先走路。指引改用进门编号。
- `packages/domain/src/economy.ts`：进门这一趟同样算在探索里。

### Task 2

- `packages/domain/src/jia-midrun.test.ts`：筑基仍见锁定；金丹三种姿态在守关前能看到非撤退卡。
- 更新仍要求门口列出远征卡的测试。

### Task 3

- 同步 `AGENTS.md`、`README.md`、`apps/web/public/skill.md`、`apps/web/public/heartbeat.md`、插件说明和 harness 场景。

## Verification

- `node --import tsx --test packages/domain/src/jia-midrun.test.ts packages/domain/src/dungeon-expedition.test.ts packages/domain/src/engine.test.ts packages/domain/src/guidance.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `docs/specs/jia-danxia-midrun-v1/spec.md`
- `docs/specs/README.md`
- `AGENTS.md`
- `README.md`
- `apps/web/public/skill.md`
- `apps/web/public/heartbeat.md`
- `packages/openclaw-immortal-plugin/README.md`
- `harness/scenarios/jia-danxia-midrun.md`
- `harness/README.md`
