# Breakthrough Growth V1 Implementation Plan

## Linked Spec

- `docs/specs/breakthrough-growth-v1/spec.md`

## Goal

在不重做问卷、突破动作和详细属性公式的前提下，把"突破成功后有方向性的主属性成长、五行成长、当前灵根演进"接入现有 live runtime。成长方向由灵根/五行亲和决定，核心属性大涨、其余微涨。

## Architecture

实现采用"登记基线 + 持久化增量"的增量接法：

- `registrationRecord` 继续负责 origin profile
- `Cultivator.mainAttributeGrowth` 与 `Cultivator.fiveElementGrowth` 负责长期成长
- 运行时通过 helper 产出 `effectiveMainAttributes`、`effectiveFiveElementScores`、`currentSpiritRoot`
- `engine.ts` 的突破成功分支只负责授予并记录成长包，不改写登记结果
- **新增**：`BREAKTHROUGH_GROWTH_TABLE` 表驱动的可配置成长预算表 (minor=50/5/+2%, major=100/10/+5%)
- **新增**：`ELEMENT_CORE_ATTRIBUTES` 从 `ELEMENT_ATTRIBUTE_DELTAS` 派生的元素→核心属性亲和映射
- **新增**：`distributeMainAttributeGrowth()` 按 70/30 核心/非核心规则分配预算的纯函数
- **新增**：`computeEffectiveMainAttributes()` 先加固定值再乘百分比的最终值计算函数

## Tasks

### Task 1. Domain Contracts And Growth Helpers

- 修改 `packages/domain/src/model.ts`
- 修改 `packages/domain/src/attributes.ts`
- 视需要修改 `packages/domain/src/registration-taxonomy.ts`
- 新增或补充：
  - 主属性成长与五行成长零值 map
  - `BREAKTHROUGH_GROWTH_TABLE`：表驱动的可配置成长预算表 (minor=50/5/+2%, major=100/10/+5%)
  - `ELEMENT_CORE_ATTRIBUTES`：从 `ELEMENT_ATTRIBUTE_DELTAS` 派生的每元素 3 核心属性 + 权重
  - `distributeMainAttributeGrowth(total, spiritRootKind, anchorElements)`：70% 核心 / 30% 非核心分配纯函数
  - `distributeFiveElementGrowth(total, spiritRootKind, anchorElements)`：五行分配纯函数
  - `computeEffectiveMainAttributes(baseline, growth, percentageBonus)`：先加固定值再乘百分比的最终值计算函数
  - 最终主属性与最终五行 helper
  - 当前灵根运行时 helper

### Task 2. Breakthrough Resolution And State Surface

- 修改 `packages/domain/src/engine.ts`
- 在突破成功分支接入：
  - 从 `BREAKTHROUGH_GROWTH_TABLE` 读取当前槽位预算
  - 确定灵根锚点元素（登记灵根 → 或兜底实时判定）
  - 调用 `distributeMainAttributeGrowth()` 计算有方向性的主属性成长包
  - 调用 `distributeFiveElementGrowth()` 计算五行成长包
  - `mainAttributeGrowth` / `fiveElementGrowth` 累积
  - `mainAttributePercentageBonus` 累积 (minor +2, major +5)
  - `BreakthroughRecord` 成长字段与百分比字段写入
  - `state.breakthrough` 成长预览
  - `mainAttributes` / `fiveElementScores` / `detailedAttributes` 的最终值输出

### Task 3. Effective-Value Consumer Audit

- 审计所有直接消费登记主属性或登记五行的调用点
- 至少覆盖：
  - 战斗快照与战斗侧派生值
  - 事件权重与内容分发
  - `daoPotential` 与其他成长相关摘要
  - application 层对外状态输出
- 目标：避免出现“面板已经按最终值显示，但事件、潜力、推荐仍按登记基线运转”的半切换状态

### Task 4. Persistence Compatibility

- 修改 `packages/persistence/src/world-shape.ts`
- 修改相关 repository hydration 逻辑
- 确保：
  - 旧世界默认获得零增量成长 map
  - 旧角色不需要重置登记记录
  - 当前灵根可由运行时即时计算，无需额外迁移文本

### Task 5. Agent And UI Presentation

- 修改 `packages/application/src/public-agents.ts`
- 修改 `packages/application/src/agent-onboarding.ts`
- 修改前台角色面板与相关展示文件
- 明确分离：
  - 登记灵根
  - 当前灵根
  - 当前主属性 / 当前五行 / 当前详细属性

### Task 6. Regression Coverage

- 扩展 `packages/domain/src/attributes.test.ts`
- 扩展 `packages/domain/src/engine.test.ts`
- 扩展 `packages/persistence/src/in-memory-world-repository.test.ts`
- 扩展 `packages/persistence/src/sqlite-world-repository.test.ts`
- 视展示合同需要扩展 application 层测试
- 覆盖至少以下场景：
  - 单灵根成功小突破：核心属性获得约 70% 预算，非核心约 30%
  - 单灵根成功大突破：同上但总预算更大
  - 双灵根成功突破：两元素核心属性各获约 35% 预算，重叠属性叠加
  - 失败突破不授予成长
  - 当前灵根与登记灵根分离
  - 旧世界默认零增量兼容
  - `BREAKTHROUGH_GROWTH_TABLE` 数值修改后分配逻辑不变

## Verification

- `node --import tsx --test packages/domain/src/attributes.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `node --import tsx --test packages/persistence/src/in-memory-world-repository.test.ts`
- `node --import tsx --test packages/persistence/src/sqlite-world-repository.test.ts`
- `node --import tsx --test packages/application/src/*.test.ts`

## Doc Updates

- `docs/specs/breakthrough-growth-v1/spec.md`
- `docs/specs/breakthrough-materials-v1/spec.md`
- `docs/specs/remaining-work-roadmap-v1/spec.md`
- 前台 / Agent 面板文案涉及的公开说明文档