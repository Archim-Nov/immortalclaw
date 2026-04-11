# Guidance Context Awareness v1

**Parent**: `remaining-work-roadmap-v1` → P1-R3

## Summary

将 `guidance()` 从平铺 if/else 的通用背景提示升级为分层情境规则系统：安全/恢复层硬优先，突破/材料层次之，地点/行程层兜底。输出风格从零散英文短句改为更完整的情境描述，但 `suggestedActions` 仍精简为 1-3 个，且必须全部来自当前快照的 `availableActions`。

## Problem

当前 `guidance()` 约 150 行平铺 if/else，所有情境的 warnings、priorities、suggestedActions 按代码先后顺序拼接，导致：

1. **优先级模糊**：中毒 warning 和低灵石 priority 混在同一层级，agent 无法区分紧急程度。
2. **位置无感**：无论角色在居所、主城还是荒野，guidance 用同一套模板文案。
3. **叙事断裂**：warnings 用英文短句、priorities 混搭中英文，风格不统一。
4. **安全路径被推挤**：当多个情境同时触发时，关键恢复动作可能被后续 push 挤到第 3-4 位或被截断。

## Goals

- 建立明确的三层优先级：恢复层 > 突破/材料层 > 地点/行程层
- 恢复层的 warnings + 首个 suggestedAction 必须压过所有其他建议（安全硬优先）
- 至少 5 种差异化情境下，guidance 输出（warnings / priorities / suggestedActions）显著不同
- 输出风格统一为更叙事化的中文情境描述
- 地点/行程上下文能随角色位置变化给出不同建议

## Non-Goals

- 不改造 onboarding 阶段机理
- 不新增 action 类型或扩展 availableActions 生成逻辑
- 不重做事件系统（P1-R4 范围）
- 不将 guidance 升格为自动托管决策引擎
- 不破坏 P0-1 决策面一致性契约（所有推荐 ⊆ availableActions）

## Constraints

- `suggestedActions` 必须是 `availableActions` 的子集（由 `filterToAvailable` 保证）
- guidance 仍返回 `{ warnings, priorities, suggestedActions }` 结构，不改接口签名
- 与 `getStrategySnapshot()` / onboarding 的兼容性不得回归

---

## Design

### 三层情境模型

```
Layer 1: 恢复层（安全硬优先）
  触发条件: recoveryState !== "healthy" || hasNegativeEffect || readiness === "poor"
  行为: warnings 置顶，suggestedActions[0] 必须是恢复动作

Layer 2: 突破/材料层
  触发条件: breakthrough.readyByProgress || !breakthrough.readyByMaterials
  行为: priorities 说明突破状态，suggestedActions 推荐突破/获取材料动作

Layer 3: 地点/行程层（兜底建议）
  触发条件: 无高优先级情境时，根据当前位置给出探索/挖矿/修炼建议
  行为: priorities 描述当前位置的适宜活动，suggestedActions 推荐位置相关动作
```

每层独立计算候选 warnings / priorities / suggestedActions，最后按层级合并：Layer 1 的 suggestedActions 始终排最前，Layer 3 的建议只在 Layer 1/2 未完全填满时补入。

### 情境触发器清单

#### Layer 1: 恢复组

| 情境 | 触发条件 | warning | 首选 suggestedAction |
|------|----------|---------|---------------------|
| 受伤 | `recoveryState === "injured" \|\| "wounded"` | 当前受伤，应优先疗伤 | `residence-heal` / `heal` / 安全点旅行 |
| 灵力枯竭 | `recoveryState === "depleted"` | 灵力枯竭，无法支撑高消耗行动 | `residence-recover-qi` / `heal` / 安全点旅行 |
| 中毒 | `hasEffect("poisoned")` | 中毒持续消耗灵力，须尽快解毒 | `heal` / `residence-heal` / 安全点旅行 |
| 走火入魔 | `hasEffect("deviation")` | 偏差活跃，避免高风险修炼 | `residence-recover-qi` / `heal` / 安全点旅行 |
| 远离安全点 | 恢复组触发 && 当前位置无法治疗 | 当前位置无法直接恢复，需先赶往安全地点 | `travel-to:{nearestSafe}` |

#### Layer 2: 突破/材料组

| 情境 | 触发条件 | priority | suggestedAction |
|------|----------|----------|-----------------|
| 突破就绪 | `breakthrough.readyByProgress && readyByMaterials` | 修为已满，可以尝试突破 | `breakthrough.recommendedAction` |
| 材料缺失（可买） | `!readyByMaterials && marketBuyable` | 突破材料不足，可在市场购买 | `buy-current-breakthrough-material` |
| 材料缺失（需副本） | `!readyByMaterials && !marketBuyable` | 突破材料需要通过副本获取 | `start-dungeon-expedition:rank-*` / 副本旅行 |
| 稀有奇物需求 | 高境界 + `ancient-artifact <= 0` | 需要稀有奇物，可探索八荒 | `enter-bahuang:balanced` / 八荒旅行 |

#### Layer 3: 地点/行程组

| 当前位置 | priority 描述 | suggestedAction 偏好 |
|----------|--------------|---------------------|
| 居所 | 居所适合修炼、疗伤、炼制 | `cultivate` / `residence-produce:*` / `residence-meditate` |
| 主城 | 主城可交易、接任务、领取宗门差事 | `buy-*` / `take-mortal-task` / `sect-task:*` |
| 荒野 | 荒野适合采集资源 | `mine-spirit-stones` / `hunt-mine-beast` |
| 秘境 | 秘境可挑战进阶副本 | `start-dungeon-expedition:*` / `search-fortune:*` |
| 八荒入口 | 八荒远征获取稀有资源 | `enter-bahuang:balanced` |

### 输出风格

- warnings: 中文情境描述，说明风险和原因（如"中毒持续消耗灵力，每刻损失气力，须尽快前往安全地点解毒"）
- priorities: 中文建议，说明当前处境的最优行动方向（如"修为已至瓶颈，突破材料齐备，可以尝试进阶"）
- suggestedActions: 不变，仍为 ActionId 数组，上限 4 个

### 合并规则

1. 收集三层候选
2. warnings = Layer1.warnings ++ Layer2.warnings（Layer3 无 warning）
3. priorities = Layer1.priorities ++ Layer2.priorities ++ Layer3.priorities
4. suggestedActions = deduplicate(Layer1.actions ++ Layer2.actions ++ Layer3.actions).slice(0, 4)
5. 最终经 `filterToAvailable` 过滤

---

## Acceptance Criteria

1. **情境差异化**：至少 5 种不同情境（受伤在荒野、中毒在居所、突破就绪、材料缺失、健康在主城）下，guidance 的 warnings / priorities / suggestedActions 输出显著不同。
2. **安全硬优先**：当恢复层和突破/材料层同时触发时，suggestedActions[0] 必须是恢复类动作。
3. **决策面一致性**：所有 suggestedActions 经 `filterToAvailable` 后均存在于当前 `availableActions` 中，不回归 P0-1。
4. **位置感知**：同一角色状态在居所 vs 荒野 vs 主城时，至少 priorities 或 suggestedActions 有一项不同。
5. **叙事化输出**：warnings 和 priorities 使用中文情境描述，无孤立英文短句。
6. **回归安全**：全量测试通过，现有 3 个 guidance 测试不被破坏。
7. **文档同步**：如 guidance 语义对 agent 有变化，`heartbeat.md` / `skill.md` 同步更新。

## Test Plan

| 测试 | 验证内容 |
|------|---------|
| 受伤在荒野 | Layer1 触发，warning 含受伤 + 无法就地治疗，suggestedActions[0] 为安全旅行 |
| 中毒在居所 | Layer1 触发，suggestedActions 含 `residence-heal` |
| 突破就绪（材料齐） | Layer2 触发，suggestedActions 含 breakthrough.recommendedAction |
| 材料缺失（需副本） | Layer2 触发，suggestedActions 含副本相关动作 |
| 健康在主城 | 仅 Layer3，priorities 含主城活动描述 |
| 受伤 + 突破就绪同时 | suggestedActions[0] 是恢复动作，不是突破动作 |
| suggestedActions ⊆ availableActions | 任意场景下推荐动作均存在于可用列表 |
