# Implementation Plan: Guidance Context Awareness v1

**Spec**: `docs/specs/guidance-context-awareness-v1/spec.md`
**Date**: 2026-04-11

## Overview

重构 `guidance()` 函数，从平铺 if/else 改为三层情境规则系统（恢复 > 突破/材料 > 地点/行程），统一输出风格为中文叙事化描述，并扩展测试覆盖。

## Task Breakdown

### Task 1: 重构 guidance() 为三层结构

**文件**: `packages/domain/src/engine.ts`

将现有 `guidance()` 函数拆分为三个内部辅助函数：
- `guidanceRecoveryLayer()` — 恢复层，安全硬优先
- `guidanceBreakthroughLayer()` — 突破/材料层
- `guidanceLocationLayer()` — 地点/行程层

合并逻辑：
1. 依次调用三层
2. warnings = recovery.warnings ++ breakthrough.warnings
3. priorities = recovery.priorities ++ breakthrough.priorities ++ location.priorities
4. suggestedActions = deduplicate(recovery ++ breakthrough ++ location).slice(0, 4)
5. 现有的 registration bonus / unlock-loadout / residence-crafting 逻辑归入 location 层
6. 最终仍经 `filterToAvailable` 过滤

### Task 2: 统一输出风格为中文叙事化

**文件**: `packages/domain/src/engine.ts`

- 所有 warnings 改为中文情境描述
- 所有 priorities 改为中文建议
- 保留 ActionId 不变（suggestedActions 仍为机器可读 id）

### Task 3: 扩展 guidance 测试

**文件**: `packages/domain/src/guidance.test.ts`

新增至少 4 个测试（加上现有 3 个共 7+）：
1. 受伤在荒野 → Layer1 触发，suggestedActions[0] 为安全旅行
2. 中毒在居所 → suggestedActions 含 residence-heal
3. 健康在主城 → 仅 Layer3，priorities 含主城描述
4. 受伤 + 突破就绪 → suggestedActions[0] 是恢复动作
5. 位置感知差异 → 同一状态在不同位置有不同输出
6. suggestedActions ⊆ availableActions 回归测试

### Task 4: 文档同步

**文件**: `apps/web/public/heartbeat.md`, `apps/web/public/skill.md`

- 如 guidance 语义变化，更新 agent 文档说明 warnings 现在为中文叙事化
- 明确 guidance 是"情境顾问层"而非强制托管

### Task 5: 注册到 roadmap

**文件**: `docs/specs/remaining-work-roadmap-v1/spec.md`

- 在 P1-R3 条目添加子 spec 和实现计划链接

## Execution Order

1. Task 1 + Task 2（同步，重构 + 风格统一一起做）
2. Task 3（测试验证重构正确性）
3. Task 4（文档同步）
4. Task 5（注册）

## Verification

- `npm test` 全量通过
- 新增测试 ≥ 4 个
- 至少 5 种差异化情境输出
- suggestedActions[0] 安全硬优先
