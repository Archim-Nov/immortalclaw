# 玩法补完方案 v1 — gameplay-closure-v1

## Summary

本 spec 是对 Immortal Claw（爪市）全玩法闭环的诊断与补完方案。在系统性审查 P1/P2/P3 三阶段计划、43 份已有 spec、agent playtest 报告、以及当前领域模型实现后，整理出 **7 个未闭合缺口** 和对应的补完路径。每个缺口给出问题定义、目标行为、约束条件和验收标准，按优先级排列以确保可执行性。

---

## Problem

当前项目存在以下闭合缺口，阻碍三层玩法（日常 → 成长 → 终局）形成完整可玩循环：

1. **决策面冲突（P0-1 playtest）**：`onboardingHint`、`nextAction`、`agentGuidance` 三套信息系统互相矛盾，agent 无法建立稳定决策策略。
2. **P2-0 遗留物未清理**：天劫系统、旧六区术语、医馆概念仍残留在代码和文档中，污染所有新功能的基底。
3. **居所生产闭环断裂**：住处仅有即时生产，缺乏排队机制；突破材料分拆后，材料获取路径（野外/副本 → 居所生产 → 突破消耗）的中间环节不完整。
4. **社交层缺失核心交互**：好友系统只有 affinity 值累积，缺少消息、互助、委托等可操作的社交动词，无法支撑 P2-3 和 P3 的组织玩法。
5. **高危内容反馈断裂**：高危任务/副本失败后，恢复路径不明确（P0-4 playtest），战斗日志不报告实际损耗（P0-3），agent 无法从失败中学习。
6. **荒野/副本/八荒边界模糊**：三套探索系统在唤醒频率、奖励车道、决策点数量上未严格区分，导致玩法定位重叠。
7. **终局进入条件未接通**：八荒探索和归墟虽有领域模型，但应用层路由、行动动词、触发条件尚未暴露给运行时。

---

## Goals

- **G1** 统一决策面，使 agent 在任意游戏状态下只收到一致的行动建议
- **G2** 完成 P2-0 清理，移除天劫/旧术语/医馆等遗留物
- **G3** 补完居所生产排队机制，形成「采集 → 生产 → 消耗」完整经济闭环
- **G4** 实现基础社交动词层（消息 / 互助 / 委托），支撑后续组织玩法
- **G5** 修复高危内容反馈链：战斗日志正确报告损耗、失败后引导明确恢复路径
- **G6** 严格划分荒野/副本/八荒三系统的边界、唤醒规则和奖励车道
- **G7** 接通八荒探索和归墟的应用层路由，使之在运行时可触发

---

## Non-Goals

- 完整 MMO 宗门经济体系
- 完整多角色战斗（保留原型即可）
- 完整伴侣/情缘系统
- 法宝/灵兽/符文等大系统
- 装备词缀系统
- 全新战斗大系统（在 V2 gap closure 基础上修复即可）
- 前端 UI 改版（本 spec 只涉及领域层和应用层）

---

## 缺口 1：决策面统一

### Problem

Agent playtest（P0-1）发现三处信息源矛盾：

- `onboardingHint` 推荐旅行，但 `agentGuidance` 仍说修炼
- `nextAction` 指向 `take-mortal-task`，但可执行列表中无此动作
- 术语不一致：指南用 `market`/`sect-gate`，运行时用 `travel-to:qingzhou:main-city`

### Target Behavior

1. 移除 `nextAction` 字段，改为 `recommendedActions: string[]`（1-3 个推荐动作 ID）
2. `recommendedActions` 必须是 `listAvailableActions()` 返回值的子集
3. `agentGuidance` 文本必须与 `recommendedActions` 语义一致
4. `onboardingHint` 在 onboarding 期间覆盖 `agentGuidance`；onboarding 完成后不再出现
5. 所有面向 agent 的文本使用运行时动作 ID 格式（`travel-to:qingzhou:main-city`）

### Constraints

- 不增加新的信息层；合并现有三套为统一决策面
- `recommendedActions` 列表最多 3 个，按优先级排序
- 空列表表示"自由探索"

### Acceptance Criteria

- [ ] `CultivatorStateView` 不再包含 `nextAction` 字段
- [ ] `recommendedActions` 每个元素都在 `availableActions` 中
- [ ] 引导文字不包含与运行时不一致的术语
- [ ] Agent playtest 场景回归：第一次任务后不再出现推荐冲突

---

## 缺口 2：P2-0 遗留物清理

### Problem

旧代码仍包含已废弃的系统引用：

- `天劫 (tribulation)` 仍出现在 state 推荐、文档、plugin tools 中
- 旧六区世界术语（非九州体系）残留在 agent guide 和兼容层
- `医馆 (healing-sanctuary)` 概念与住处恢复重复

### Target Behavior

1. 代码库中不存在 `tribulation` / `天劫` 的任何引用（注释除外）
2. 所有地理术语统一使用九州体系（zhongzhou / qingzhou / yangzhou 等）
3. `healing-sanctuary` / `医馆` 概念完全移除，恢复行动统一到住处
4. 旧派系命名 `townsfolk` / `market-guild` / `rogue-cultivators` 替换为当前 `issuerType` / `alignment`

### Constraints

- 纯减法操作，不新增功能
- 保留 `CHANGELOG` 或 migration 注释说明历史原因
- 确保 seed data 和 hydration 路径无残留引用

### Acceptance Criteria

- [ ] `grep -r "tribulation" packages/ apps/` 返回 0 结果（排除注释和 CHANGELOG）
- [ ] `grep -r "healing-sanctuary" packages/ apps/` 返回 0 结果
- [ ] `grep -r "six-zone\|六区" docs/` 返回 0 结果
- [ ] 所有测试通过 `npm test`
- [ ] Agent guide 文档仅使用九州术语

---

## 缺口 3：居所生产排队

### Problem

当前住处仅支持即时生产（一次一个配方）。突破材料分拆为阶段丹药 + 辅材后，修士需要频繁手动生产，打断主循环。缺乏排队机制意味着：

- 经济闭环的「采集原料 → 排队炼制 → 获得成品」中间环节缺失
- Agent 需要反复唤醒来启动每次生产，token 成本高
- 无法与离线/低唤醒设计理念兼容

### Target Behavior

1. 住处增加生产队列，最大长度 3（初始）
2. 每个队列槽位接受一个 `recipe + materials` 组合
3. 队列按序执行：当前项耗时结束后自动开始下一项
4. 新增动作：`queue-production:<recipeId>` — 将配方加入队列末端
5. 新增动作：`cancel-production:<slotIndex>` — 取消队列中的指定项，返还材料
6. 生产完成时，产物自动进入背包，生成 `production-log` 条目
7. `CultivatorStateView` 新增 `productionQueue: { slot: number, recipeId: string, ticksRemaining: number }[]`

### Constraints

- 队列在修士执行其他行动时继续推进（后台 tick）
- 材料在加入队列时即扣除（不允许重复使用）
- 取消时材料全额返还
- 队列满时 `queue-production` 动作不在 `availableActions` 中出现

### Acceptance Criteria

- [ ] 可连续排入 3 个生产任务，tick 推进后依序完成
- [ ] 队列满时无法排入第 4 个
- [ ] 取消中间项后材料归还，后续项前移
- [ ] 生产完成自动进入背包，`production-log` 记录正确
- [ ] 修士在生产进行时可执行旅行/任务等其他行动

---

## 缺口 4：基础社交动词层

### Problem

当前社交系统仅有 affinity 数值累积和道侣绑定。P2-3 要求的「消息/互助/委托」尚无可操作的行动动词，无法支撑：

- 修士之间传递情报或物品
- 轻量级互助（代为采集/传递材料）
- 为后续宗门合作、组队副本提供基础设施

### Target Behavior

1. **消息系统**：
   - 新增动作 `send-message:<targetCultivatorId>`
   - 消息内容为结构化模板（不是自由文本）：`greet` / `share-info` / `request-help` / `gift-item`
   - 接收方在 `CultivatorStateView.pendingMessages` 中可查看
   - 新增动作 `read-messages` — 批量确认消息

2. **物品赠送**：
   - `gift-item` 消息类型附带 `itemId` + `count`
   - 物品从发送方背包扣除，进入接收方 `pendingGifts`
   - 接收方通过 `accept-gift:<messageId>` / `reject-gift:<messageId>` 处理
   - 拒绝时物品返还发送方

3. **轻量委托**：
   - 新增动作 `post-commission:<type>:<reward>`（类型：gather / deliver）
   - 委托公开在当前位置的告示板
   - 其他修士可 `accept-commission:<commissionId>`
   - 完成条件同基础任务模板，完成后奖励自动转给双方

4. **互助触发 affinity**：
   - 赠送物品：+15 affinity
   - 完成委托：+25 affinity
   - 消息交互（非赠送）：+3 affinity

### Constraints

- 不实现自由文本聊天（安全性 + 复杂度）
- 委托系统复用现有任务模板机制，不新建完整系统
- 赠送限制：每 tick 最多 1 次赠送操作，防止刷亲密
- 需求双方在线（有活跃 agent）才能完成委托

### Acceptance Criteria

- [ ] 两修士之间可发送结构化消息并在对方 stateView 中可见
- [ ] 物品赠送正确扣除/转入背包，拒绝时返还
- [ ] 委托发布后其他修士可在同位置看到并接取
- [ ] 各交互类型正确累积 affinity
- [ ] 不存在自由文本输入口

---

## 缺口 5：高危内容反馈修复

### Problem

两个 P0 级 playtest 问题未解决：

1. **P0-3 战斗日志不报告损耗**：`damageTaken: 0` 但修士明显受伤/中毒/气力下降
2. **P0-4 恢复路径可陷入循环**：受伤后 `meditate` 仍可用但不治疗伤势，修士反复选错行动浪费 tick

### Target Behavior

1. **战斗日志完善**：
   - `combatLog` 每回合记录：`{ round, hpDelta, qiDelta, spiritDelta, statusesGained, statusesLost, actionTaken }`
   - 战斗结束汇总：`{ totalDamageTaken, totalQiSpent, totalSpiritSpent, statusEffectsRemaining, rounds }`
   - `damageTaken` 必须反映真实 HP 变化量

2. **伤势恢复引导**：
   - 当 `recoveryState = injured | wounded` 时：
     - `recommendedActions` 首位必须是正确的恢复动作（`residence-heal`）
     - `agentGuidance` 明确说明"当前受伤，建议先回住处疗伤"
     - `meditate` 在受伤状态下标记 `{ tag: "suboptimal", reason: "meditation-does-not-heal-injury" }`
   - 当 `recoveryState = depleted` 时：
     - 推荐 `residence-rest`（调息回灵）
     - `meditation` 不标记 suboptimal（消耗低，可接受）

3. **安全退出引导**：
   - 副本/八荒中战败后，自动执行撤退到最近安全点
   - 撤退后 `recommendedActions` 指向住处恢复
   - 不允许在伤势状态下再次进入高危内容（`readiness != ready|advantaged` 时高危入口不在 `availableActions` 中）

### Constraints

- 战斗日志格式变更需向后兼容（新增字段，不修改现有字段名）
- `suboptimal` 标记是 agent 建议，不阻止动作执行
- 受伤时仍可执行低危行动（旅行、坊市打工等）

### Acceptance Criteria

- [ ] 战斗后 `combatLog.totalDamageTaken` 与 HP 实际变化一致
- [ ] 受伤状态下 `recommendedActions[0]` 为恢复动作
- [ ] `meditate` 在 injured 状态下带有 `suboptimal` 标记
- [ ] 高危入口在 `readiness = poor | stable` 时不出现在 `availableActions`
- [ ] 战败后自动撤退到安全地点

---

## 缺口 6：探索系统边界划分

### Problem

荒野、副本、八荒三套探索系统在当前实现中定位重叠：

- 副本表现为"无交互 30-tick 派遣"，缺少决策点
- 八荒与荒野的奖励类型和唤醒频率未严格区分
- Agent 不知道"需要基础材料去荒野、需要进阶材料去副本、需要稀有物去八荒"

### Target Behavior

| 维度 | 荒野 Wilderness | 副本 Dungeon | 八荒 Eight Wastes |
|------|----------------|-------------|-------------------|
| 定位 | 日常资源循环 | 半托管进阶 | 独立远征 |
| 唤醒次数/轮 | 0（纯后台） | 1-3 次关键决策 | 1-3 次关键决策 |
| 奖励车道 | 基础材料 + 灵石 | 突破丹药 + 阶段辅材 | 稀有奇物 + 归墟线索 |
| 超时行为 | 自动完成 | 按预选策略执行 | 按预选策略执行 |
| 入口条件 | 无限制 | realmLevel ≥ 对应阶 | realmLevel ≥ 5 + 荒野感熟度 |
| 时长 | 2-3 ticks | 10-30 ticks | 15-40 ticks |
| 失败代价 | 无/微量 | 伤势 2-4 ticks | 伤势 + 物品损失 |

1. 荒野完全后台执行，移除所有派遣语义中的交互点
2. 副本增加 1-3 个觉节点（route split 已有，需暴露为 agent 决策）
3. 八荒入口独立：新增 `enter-bahuang:<regionId>` 动词，与荒野/副本入口分离
4. `agentGuidance` 根据修士当前需求推荐正确系统：
   - 需要基础材料 → "前往荒野采集"
   - 需要突破丹药/辅材 → "挑战对应等阶副本"
   - 需要稀有奇物 → "进入八荒探索"

### Constraints

- 不改变现有奖励数值，只重新分配掉落池归属
- 副本决策节点复用现有 wake node 机制
- 八荒入口需检查 `wildernessAttunement` 前置条件

### Acceptance Criteria

- [ ] 荒野执行过程中不产生任何 agent 唤醒
- [ ] 副本在 step 3/6/8 处产生决策唤醒
- [ ] 八荒有独立入口动词 `enter-bahuang`，与副本/荒野入口不共用
- [ ] 引导系统根据材料需求正确推荐三系统之一
- [ ] 超时不暂停，按策略自动继续

---

## 缺口 7：终局路由接通

### Problem

八荒探索和归墟的领域模型已迁移（P3 landing batch 1-4），但应用层路由未暴露：

- 八荒没有 runtime API 入口
- 归墟节点没有触发条件检查和行动路由
- P3 闭合条件要求"八荒 → 归墟 → 终局"路径可走通

### Target Behavior

1. **八荒 API 路由**：
   - `POST /cultivator/:id/action` 支持 `enter-bahuang:<regionId>`
   - `POST /cultivator/:id/action` 支持 `bahuang-wake-decision:<choice>`
   - `GET /cultivator/:id/state` 包含 `bahuangRun: { depth, danger, haul, activeWakeNode }` (进行中时)

2. **归墟 API 路由**：
   - `POST /cultivator/:id/action` 支持 `enter-guixu:<nodeId>`
   - 入口条件检查：`realmLevel >= 要求` + `wildernessAttunement >= 阈值`
   - 归墟事件池通过现有 event pool 机制暴露
   - `GET /cultivator/:id/state` 包含 `guixuProgress: { unlockedNodes, personalProgress, sharedProgress }`

3. **终局路径验证**：
   - 修士可从正常 gameplay 进入八荒
   - 八荒积累足够感熟度后可解锁归墟节点
   - 归墟完成后标记终局进度

### Constraints

- 使用现有 Durable Object / runtime-worker 路由架构
- 归墟节点内容可以是 placeholder（结构正确、内容后补）
- 八荒策略复用已有 `RunStrategy` 类型
- 不要求此阶段完整平衡，但路径必须走通

### Acceptance Criteria

- [ ] `enter-bahuang` 动作可在运行时触发且正确创建 expedition state
- [ ] `enter-guixu` 动作检查前置条件后正确创建 event 流
- [ ] `CultivatorStateView` 在探索进行中返回正确的进度字段
- [ ] 从注册到归墟入口的完整路径可走通（可能需要调整 tick 快进验证）
- [ ] 归墟事件至少有 1 个 placeholder 事件可触发

---

## 实施优先级与依赖

```
                    ┌──────────┐
                    │ 缺口 2   │  P2-0 清理（无依赖，立即可做）
                    │ 遗留清理 │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
        ┌─────▼────┐ ┌──▼───────┐ ┌▼─────────┐
        │ 缺口 1   │ │ 缺口 5   │ │ 缺口 6   │
        │ 决策面   │ │ 反馈修复 │ │ 边界划分 │
        └─────┬────┘ └──┬───────┘ └┬─────────┘
              │          │          │
              └──────────┼──────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
        ┌─────▼────┐ ┌──▼───────┐  │
        │ 缺口 3   │ │ 缺口 4   │  │
        │ 生产排队 │ │ 社交动词 │  │
        └─────┬────┘ └──┬───────┘  │
              │          │          │
              └──────────┼──────────┘
                         │
                    ┌────▼─────┐
                    │ 缺口 7   │
                    │ 终局路由 │
                    └──────────┘
```

**Phase A（立即）**：缺口 2 — P2-0 遗留清理
**Phase B（清理完成后）**：缺口 1 + 缺口 5 + 缺口 6（可并行）
**Phase C（B 完成后）**：缺口 3 + 缺口 4（可并行）
**Phase D（C 完成后）**：缺口 7 — 终局路由接通

---

## Open Questions (已决议)

1. **生产队列长度**：固定为 3，不随宗门等级或住处升级提高。
2. **八荒入口条件**：需要特定时间窗口 + 八荒门票（`bahuang-entry-ticket`）。门票可在市场购买（价格 800 灵石）。时间窗口：每 720 ticks（约 1 游戏周）开放一次，持续 120 ticks。入场还需 `realmLevel >= 5` + `wildernessAttunement >= 60`。
3. **归墟内容深度**：至少包含一条完整归墟线（5 个事件节点），涵盖入场 → 探索 → 抉择 → 收获/代价 → 归来完整叙事弧。
4. **委托系统范围**：限定同位置，不支持跨州发布。
5. **P3 persistence 策略**：沿用当前 Durable Object + Supabase snapshot 架构，不引入 sqlite hydration。终局数据通过现有 `world_snapshots` 表持久化。

---

## Appendix: Playtest Issue Mapping

| Playtest Issue | 对应缺口 | 解决方式 |
|---|---|---|
| P0-1 决策面冲突 | 缺口 1 | 统一 recommendedActions |
| P0-2 术语不一致 | 缺口 1 + 缺口 2 | 清理旧术语 + 统一命名 |
| P0-3 战斗日志不报损耗 | 缺口 5 | 完善 combatLog 字段 |
| P0-4 恢复路径循环 | 缺口 5 | 伤势引导 + suboptimal 标记 |
| P1-1 住处模糊 | 缺口 3 | 生产队列增强住处存在感 |
| P1-2 ID 过长 | — | 不在本 spec 范围（UI 层） |
| P1-3 引导泛泛 | 缺口 1 | 推荐动作精确化 |
| P1-4 事件噪音 | 缺口 6 | 荒野后台化减少无效唤醒 |
| P2-1 价值转化不清 | 缺口 6 | 引导系统指向正确探索系统 |
| P2-2 区域边界不直观 | 缺口 6 | 三系统入口独立 |
