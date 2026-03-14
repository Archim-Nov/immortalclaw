# 玩法构建总纲实施计划

## Linked Spec

- `docs/specs/gameplay-build-foundation/spec.md`
- `docs/specs/combat-gameplay-v1/spec.md`

## Goal

把当前分散在仓库和外部文件夹里的角色基础系统与 `游 / 居 / 遇 / 势` 玩法草案，整理为一套可分阶段实施的统一产品与实现路线。

## Architecture

实现上继续围绕 `packages/domain` 的状态机、action job、tick 结算和结构化日志展开，不新建一套脱离世界模型的玩法壳。产品上采用“两层结构”：第一层是 `游 / 居 / 遇 / 势` 的世界玩法骨架，第二层是 `注册 / 属性 / 五行 / 境界 / 战斗` 的修仙差异层。所有后续功能都优先映射到这两层结构中的一个位置，再决定数据模型、动作入口和日志回写。

## Tasks

### Task 1：统一术语与 source of truth

- 确认仓库 spec 与外部玩法草案的对应关系
- 统一 `游 / 居 / 遇 / 势`、注册、属性、境界、宗门、日志等核心术语
- 把仓库 spec 明确设为实现层 source of truth

### Task 2：先落 `P0` 角色底层

- 固化 `registration_record`、角色初始化、属性、五行、境界与突破记录的运行时表达
- 完成状态接口、角色视图和派生倾向视图的统一建模
- 确保注册只决定风格，不决定天生数值碾压

### Task 3：打通 `P1` 日常可玩循环

- 把现有原型 actions 重组映射到 `游 / 居 / 遇 / 势` 四大入口
- 先实现九州基础区、闭关/恢复、日常任务、加入宗门/宗门任务
- 让玩家形成“出门获取资源 -> 回洞府转化 -> 接任务推进 -> 回写日志”的稳定基础循环

### Task 4：扩展 `P2` 高风险成长循环

- 增加高风险探索、精英内容、八荒远征、生产队列与组队副本模板
- 接入宗门贡献排序与更强的组织驱动
- 用统一战斗与事件结算底层承接高风险收益

### Task 5：推进 `P3` 终局与组织高光循环

- 规划归墟天境节点式终局内容
- 规划阵营战、宗门积分、宗门等级与集体收益
- 让终局内容与宗门长期竞争真正挂到统一世界状态上

### Task 6：文档与实现联动维护

- 后续每个子玩法块立项前，在 `docs/specs/` 下再拆专项 spec
- 每个专项 spec 都必须明确归属到 `游 / 居 / 遇 / 势` 或角色成长层中的哪个位置
- 与 README、vision、process 文档保持同步

## Verification

- 文档交付阶段：人工核对新 spec 是否完整覆盖 `注册 / 角色 / 属性 / 境界 / 游 / 居 / 遇 / 势`
- 后续实现阶段：针对 `packages/domain` 的状态、action、tick、日志与持久化模型做类型检查与 targeted tests

## Doc Updates

- `README.md`
- `docs/product/vision.md`
- `docs/specs/README.md`
- `docs/specs/gameplay-build-foundation/spec.md`
- `docs/plans/2026-03-14-gameplay-build-foundation.md`
