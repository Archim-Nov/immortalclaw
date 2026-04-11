# Event Signal Quality v1

**Parent**: `remaining-work-roadmap-v1` → P1-R4

## Summary

提升旅行事件的信号质量：区分"风味事件"（纯叙事/氛围）和"决策事件"（有实质收益或风险），降低风味事件频率上限，丰富事件描述使其不再乏味，并新增若干高质量风味事件增强世界沉浸感。

## Problem

当前旅行事件系统有以下问题：

1. **风味/决策不分**：所有事件按同一 30%/tick 概率触发，`resultType: "story"` 的纯叙事事件和 `resultType: "resource"/"combat"` 的实质事件权重混合，导致 agent 频繁收到无决策影响的噪音。
2. **风味事件过度重复**：全球旅行池仅 11 个事件（其中 story 类仅 2 个），州特定旅行池每州 10 个，描述短且模板化（如"A minor find while moving"），多次旅行后感觉雷同。
3. **单次旅行无事件上限**：理论上 3 tick 旅行可触发 0-3 次主事件 + 0-3 次子事件，风味事件可能连续出现。
4. **描述风格单调**：全球事件用极简英文短句，州特定事件描述略长但仍缺乏画面感和情境细节。

## Goals

- 在 `EventTemplate` 上新增 `signalType: "flavor" | "decision"` 字段，明确区分事件性质
- 单次旅行中风味事件上限为 2 条（含子事件）
- 全池统计中决策事件占比 ≥ 40%
- 丰富现有事件描述，每条至少 2 句中文情境描写
- 新增至少 6 个高质量风味事件到全球旅行池和州特定池

## Non-Goals

- 不改变非旅行事件（exploration、dungeon、wilderness 事件不在本次范围内）
- 不新增事件 resultType 或 semanticType 枚举值
- 不改变事件效果数值（spirit stones、qi 等保持不变）
- 不改变道德选择事件（moralityChoice）的触发机制
- 不改变居所环境事件系统（R1 scope）

## Constraints

- `EventTemplate` 接口变更需向后兼容（signalType 可选或默认推导）
- 现有测试中的事件池数量断言需同步更新
- 事件内容为中文+英文双语（name + nameCn 已有字段）

---

## Design

### signalType 分类规则

```
decision 事件:
  - resultType === "resource" (spiritStones、物品奖励)
  - resultType === "combat" (战斗消耗)
  - resultType === "progression" (修为增长)
  - moralityChoice 存在
  - effects 包含显著数值变化

flavor 事件:
  - resultType === "story" 且无实质 effects（或效果极小如 reputationChange ±1）
  - resultType === "status" 且仅给正面 buff（如 clear-mind 2 ticks）
```

### 旅行事件频率控制

在 `advanceWorld` 的旅行事件触发逻辑中：
1. 维护一个 per-job 的 `travelFlavorCount` 计数器（利用 job metadata 或 seed-based 追踪）
2. 当 `travelFlavorCount >= 2` 时，跳过 flavor 类事件的触发（仍允许 decision 类事件）
3. 30% base chance 保持不变，但 flavor 事件受上限约束

### 事件描述增强

对全球旅行池 11 个事件和每州 10 个旅行事件的 `description` 字段进行扩写：
- 每条描述至少 2 句
- 融入环境细节、感官描写、角色反应
- 保持州特色风味一致性（如青州的竹林溪流、洋州的黑市码头等）

### 新增旅行风味事件

在全球旅行池新增至少 3 个 flavor 事件，在 3 个不同州各新增 1 个州特定 flavor 事件，共计 ≥ 6 个新事件。

---

## Acceptance Criteria

1. **signalType 标注**：所有旅行事件（travelPool + travelStateSpecific）均有明确的 `signalType`
2. **决策事件占比**：旅行事件池中 `signalType: "decision"` 的事件数 / 总数 ≥ 40%
3. **风味上限**：单次旅行触发的 flavor 事件不超过 2 条
4. **描述丰富度**：现有旅行事件描述全部扩写（≥ 2 句中文描述或详细英文描述）
5. **新增事件**：全球旅行池和州特定池各有新增事件
6. **回归安全**：全量测试通过

## Test Plan

| 测试 | 验证内容 |
|------|---------|
| signalType 覆盖率 | 所有旅行事件均有 signalType 字段 |
| 决策事件占比 | 统计 travelPool + travelStateSpecific 中 decision 比例 ≥ 40% |
| 风味上限 | 模拟多 tick 旅行，验证 flavor 事件不超过 2 条 |
| 描述长度 | 所有旅行事件 description 长度 ≥ 20 字符 |
| 事件池规模 | travelPool 数量 ≥ 14，travelStateSpecific 每州 ≥ 10 |
