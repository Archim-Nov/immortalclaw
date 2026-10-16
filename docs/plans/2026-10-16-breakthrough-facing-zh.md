# 破境见闻和境界说明里的英文

## Linked Spec

- `docs/specs/breakthrough-facing-zh-2026-10-16/spec.md`

## Goal

把破境完成时的世界见闻、道日志，以及 `realmPath` / `breakthrough` 上的中文句子，改成和生平一致的中文。行动标识留在 `recommendedAction` 和行动列表。

## Tasks

- `resolveResidenceBreakthrough` 的成功和失败共用生平那一句，标题改为「破境」和「破境未成」。
- `breakthrough-methods.ts` 的顺序、风险、拒绝和安静下一步去掉行动标识。魂灯、神纹的行动说明和拒绝语一并改掉。
- 测试改为断言中文句子，并确认这些句子里不再出现行动标识。

## Verification

- `node --import tsx --test packages/domain/src/breakthrough-methods.test.ts packages/domain/src/realm-path.test.ts packages/domain/src/agent-surface-zh.test.ts`

## Doc Updates

- `docs/specs/breakthrough-methods/spec.md`
- `docs/specs/breakthrough-facing-zh-2026-10-16/spec.md`
- `harness/scenarios/breakthrough-methods.md`
- `AGENTS.md`
