# 仙域项目计划二：增强版

## 目标

增强版的重点不是“多写点内容”，而是把首版从单机原型升级成真正可扩展的游戏服务。

核心目标：

- 从内存态切到持久化
- 从单修士演示切到多修士世界
- 从简化规则切到可运营规则
- 为 `OpenClaw` 插件接入建立正式边界

## 增强版范围

### 世界和系统

- 5 个境界阶段全部开放
- 8 个区域全部开放
- 物品系统拆成丹药、法宝、材料
- 宗门角色、宗门宝库、灵脉收益
- 简化战斗实例
- 因果业力和心魔初版
- 机缘事件池

### 技术升级

- PostgreSQL 持久化
- Tick worker 独立进程
- Action job 表
- 战斗日志和世界事件日志
- 基础 GM 管理接口

### OpenClaw 接入

- 编写 `openclaw-immortal` 插件
- 暴露世界工具：
  - `immortal_state`
  - `immortal_actions`
  - `immortal_act`
  - `immortal_messages`
  - `immortal_sect`
  - `immortal_dao_logs`
- 只让关键修士接代理，不让全体修士全量跑 LLM

## 核心新增表

- `inventories`
- `action_jobs`
- `world_events`
- `tribulations`
- `relationships`
- `combat_instances`
- `combat_logs`
- `recipes`

## 架构拆分

- `apps/world-api`
- `apps/world-worker`
- `packages/domain`
- `packages/openclaw-immortal-plugin`
- `packages/shared-types`

## 玩法增强重点

### 修炼链

- 功法学习
- 境界突破材料
- 丹药加成
- 洞府和阵法修炼加成

### 社会链

- 宗门加入与退出
- 宗门任务
- 资源贡献
- 宗门职位权限

### 冲突链

- 修士挑战
- 妖兽战斗
- 秘境争夺
- 业力追杀

## 验收标准

- 世界状态可持久化
- Tick 可重启恢复
- 支持多修士存在
- 关键动作全部有审计日志
- OpenClaw 代理能通过工具读取状态并发起动作
- 不需要直接操作数据库也能完整运营

## 进入完整版前必须完成的工程约束

- 世界内核不依赖 LLM
- 所有规则都能离线重放
- 重要动作有事件日志
- OpenClaw 插件和世界服务通过明确 API 通信
- 不把代理 prompt 当成业务真相

