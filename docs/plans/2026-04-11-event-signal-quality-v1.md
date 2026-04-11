# Implementation Plan: Event Signal Quality v1

**Spec**: `docs/specs/event-signal-quality-v1/spec.md`
**Date**: 2026-04-11

## Overview

为旅行事件新增 signalType 分类，限制风味事件频率，丰富描述内容，新增风味事件。

## Task Breakdown

### Task 1: 新增 signalType 到 EventTemplate

**文件**: `packages/domain/src/events.ts`

- 新增 `EventSignalType = "flavor" | "decision"` 类型
- 在 `EventTemplate` 接口新增 `readonly signalType: EventSignalType`
- 提供 `deriveSignalType()` 辅助函数，可在未显式标注时根据 resultType/effects 推导

### Task 2: 标注所有旅行事件的 signalType

**文件**: 
- `packages/domain/src/events/content/travel/global.ts`
- `packages/domain/src/events/content/travel/states/*.ts`
- `packages/domain/src/events/content/states/template.ts`

- 为每个旅行事件添加明确的 signalType
- story 类无实质 effects → flavor
- resource/combat/progression → decision
- status 类正面 buff → flavor

### Task 3: 旅行风味事件上限

**文件**: `packages/domain/src/engine.ts`

- 在 `advanceWorld()` 中追踪 per-job 旅行风味计数
- 当已触发 ≥ 2 个 flavor 事件时跳过后续 flavor 事件（仍允许 decision）
- 利用 job 对象上的临时字段或按 seed 追踪

### Task 4: 丰富现有事件描述

**文件**: 
- `packages/domain/src/events/content/travel/global.ts`
- `packages/domain/src/events/content/travel/states/*.ts`

- 扩写所有旅行事件的 description 字段
- 每条至少 2 句情境描写
- 保持各州风味一致性

### Task 5: 新增旅行风味事件

**文件**:
- `packages/domain/src/events/content/travel/global.ts` — 新增 ≥ 3 个全球事件
- 选取 3 个州的旅行池各新增 1 个事件

### Task 6: 更新测试

**文件**: `packages/domain/src/events.test.ts`

- 更新事件池数量断言（travelPool 从 11 → 新数量）
- 新增 signalType 覆盖率验证
- 新增决策事件占比 ≥ 40% 验证
- 新增描述长度验证
- 新增风味上限集成测试

## Execution Order

1. Task 1（接口变更）
2. Task 2 + Task 4 + Task 5（同步：标注 + 扩写 + 新增）
3. Task 3（频率控制）
4. Task 6（测试）

## Verification

- `npm test` 全量通过
- 决策事件占比 ≥ 40%
- 风味事件单次旅行 ≤ 2 条
