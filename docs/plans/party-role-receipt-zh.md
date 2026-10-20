# 站位回执改成中文

## Linked Spec

- `docs/specs/party-role-receipt-zh/spec.md`

## Goal

把 `set-party-role` 的成功回执换成中文，偏向说明留在原处。

## Architecture

`immediateAction` 里这一支只返回 summary，不写游记、近事或道录。改这一处模板就覆盖五个站位。`PARTY_ROLE_LABEL` 和 `combatLeaningView` 不动。

## Tasks

### Task 1

- `packages/domain/src/engine.ts`：成功句改成「把站位换成了」加中文站位，再接原来的 `roleHint`。
- `packages/domain/src/combat-deepen-v2.test.ts`：对能选的站位核对整句，对选不了的站位确认拒绝里没有这句英文。

### Task 2

- 记一笔到 `AGENTS.md`、`CHANGELOG.md` 和现有的组队战斗场景说明。

## Verification

- `node --import tsx --test packages/domain/src/combat-deepen-v2.test.ts`
- 全仓库再搜 `set party role`，玩家可见路径上不再有这句英文。

## Doc Updates

- `docs/specs/party-role-receipt-zh/spec.md`
- `docs/plans/party-role-receipt-zh.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `harness/scenarios/combat-party-deepen-v2.md`
