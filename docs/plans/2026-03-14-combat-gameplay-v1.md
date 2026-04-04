# 首版可落地战斗玩法实施计划

> 当前实现请以 `docs/plans/2026-04-04-combat-gameplay-v1-light-complete-implementation.md` 为准。
> 本文代表较早阶段的完整战斗路线，保留作历史设计记录，不再作为当前施工文档。

## Linked Spec

- `docs/specs/combat-gameplay-v1/spec.md`

## Goal

把当前原型中的简化战斗升级为可承接注册、属性、五行状态和兵器家族的统一战斗底层，并保持 action-first 的世界循环不变。

## Architecture

优先在 `packages/domain` 内做增量演进，而不是新起一套战斗子系统。保留现有 `currentJob`、`combatLogs`、`CultivatorStateView` 与 timed action 入口，把战斗从单次数值比较重构为 job 内部的多回合推演。状态接口继续使用顶层 `idle | busy | injured`，新增派生 `combatProfile` 与战斗日志明细视图。

## Tasks

### Task 1：扩展战斗视图与数据模型

- 更新 `packages/domain/src/model.ts`，为状态视图补充 `combatProfile`、核心战斗统计与可复用 encounter 模板结构。
- 统一标准状态库的可落地子集命名，明确现有通用状态与五行状态的共存方式。
- 评估 `CombatLogEntry` 是否需要补充回合摘要、状态应用、战利品明细与失败成本字段。

### Task 2：冻结首版属性与注册战斗映射

- 更新 `packages/domain/src/attributes.ts`，落地主属性到详细属性的首版线性换算公式。
- 扩展注册运行时映射，让 `registration_record v2` 输出稳定的战斗倾向与元素偏向，而不是只给文本修饰。
- 确保运行时分支全部基于 taxonomy IDs，而不是中文标签字符串。

### Task 3：重构单人 PVE 战斗解析器

- 更新 `packages/domain/src/engine.ts`，把 `hunt-mine-beast` 与 `challenge-guardian` 从单次 `power vs threat` 改成 `3-5` 回合推演。
- 在战斗解析器内接入：先手、命中、暴击、控制、五行状态附着、回合末 DOT/HOT 结算。
- 先按 5 个兵器家族模板实现最小可玩骨架，20 种兵器通过数据映射进入相同底层。

### Task 4：补充内容模板与日志回写

- 为矿脉妖兽、遗迹守关者和一个可复用精英敌人模板定义行为特征、元素倾向、奖励池与失败成本。
- 更新战斗日志输出，使世界日志能够解释胜败原因、关键状态与风险来源。
- 明确与 `游 / 居 / 遇 / 势` 的接口关系，避免战斗系统脱离大世界循环。

### Task 5：验证与文档同步

- 扩展 `packages/domain/src/engine.test.ts` 与相关属性测试，覆盖注册映射、多回合战斗、状态附着与失败惩罚。
- 运行针对性的 domain 测试与类型检查。
- 同步更新 `README.md`、`docs/product/vision.md`、`docs/specs/README.md` 以及外部玩法文档 `D:\Document\ImmortalClaw\战.md`。

## Verification

- `node --import tsx --test packages/domain/src/attributes.test.ts`
- `node --import tsx --test packages/domain/src/engine.test.ts`
- `npx tsc -p tsconfig.json --noEmit`

## Doc Updates

- `README.md`
- `docs/product/vision.md`
- `docs/specs/README.md`
- `docs/specs/combat-gameplay-v1/spec.md`
- `docs/plans/2026-03-14-combat-gameplay-v1.md`
- `D:\Document\ImmortalClaw\战.md`
