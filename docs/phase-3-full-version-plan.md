# 仙域项目计划三：完整版

## 目标

完整版的目标是做“持久化修仙世界模拟平台”，而不是单纯文本冒险。

它要同时满足：

- 长周期世界推进
- 多角色、多宗门、多冲突线并存
- 规则层稳定
- 内容层可扩展
- 代理层可控、可观测、可限流

## 完整版范围

### 世界系统

- 全境界、全区域、全物品、全宗门类型
- 完整天劫、心魔、寿元、飞升
- 正道、魔道、散修三条完整路线
- 道侣系统
- 宗门战争
- 世界级事件和赛季机制
- 排行榜和飞升榜

### 技术系统

- 多服务部署
- PostgreSQL 权威数据
- Redis 或队列系统调度
- Worker 集群
- 回放系统
- 平衡性后台
- 指标监控、限流、熔断
- GM 管理台

### 代理系统

- 分层代理：
  - 背景修士：规则驱动
  - 重要修士：事件驱动策略代理
  - 核心修士：OpenClaw 高质量代理
- 每个代理有预算、优先级、唤醒条件、日志
- 支持多渠道观战和交互

## 完整版核心服务

### world-kernel

- 权威状态
- 规则引擎
- 经济结算
- 战斗和天劫结算

### world-worker

- tick 推进
- job 调度
- 事件触发
- 代理唤醒

### agent-orchestrator

- 代理预算控制
- 唤醒队列
- 策略选择
- OpenClaw 会话路由

### content-service

- 奇遇模板
- 宗门公告
- 道心日志润色
- 传闻生成

### ops-console

- GM 操作
- 全局事件开关
- 指标面板
- 回放和纠错

## 完整版数据域

- `cultivators`
- `cultivator_stats`
- `cultivator_techniques`
- `cultivator_effects`
- `cultivator_relationships`
- `sects`
- `sect_members`
- `sect_assets`
- `zones`
- `zone_resources`
- `items`
- `inventories`
- `recipes`
- `caves`
- `formations`
- `action_jobs`
- `combat_instances`
- `combat_rounds`
- `combat_logs`
- `tribulations`
- `world_events`
- `dao_logs`
- `messages`
- `agent_profiles`
- `agent_runs`
- `agent_budgets`
- `leaderboards`

## 关键工程原则

### 原则一

规则层先于文本层。

### 原则二

代理只能提议动作，不能直接改权威状态。

### 原则三

所有高价值动作都要可回放、可审计。

### 原则四

代理调度必须有预算，不允许“全员每 tick 一轮”。

### 原则五

赛季、平衡、内容和核心内核解耦。

## 验收标准

- 服务可持续运行
- 世界可恢复
- 代理行为可观测
- 经济系统不失控
- 大事件和冲突链能稳定落地
- 规则改动可通过回放验证

## 完整版风险

- 玩法规模过大导致系统耦合
- LLM 成本和延迟失控
- 规则和文本互相污染
- 宗门、战斗、经济数值崩坏
- 工程拆分太晚，导致后期无法重构

## 完整版启动条件

只有增强版已经证明下面几点，才应该进入完整版：

- 世界内核已经稳定
- 数据模型已经站得住
- 代理接入边界已经清晰
- 核心玩法的日活循环已被验证

