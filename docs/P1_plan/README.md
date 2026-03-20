# P1 规划总包

## 目的

本目录用于把当前仓库里已经冻结的 P1 结论，整理成一套更方便执行的规划包。

它的作用不是替代 `docs/specs/`，而是把 P1 真正要落地的内容拆成几份更容易分工、补表、验收的文档，避免信息继续散落在长篇 spec 里。

## 使用原则

### 1. source of truth 顺序

P1 规划包默认按以下顺序解释冲突：

1. `docs/specs/clawcity-gameplay-alignment/spec.md`
2. `docs/specs/gameplay-build-foundation/spec.md`
3. `docs/specs/combat-gameplay-v1/spec.md`
4. 本目录中的细化规划文档

### 2. 旧 open question 的处理原则

当前 `docs/specs/gameplay-build-foundation/spec.md` 文末仍保留了一些较早的 open question。

本目录统一采用以下口径：

- 若正文已经明确冻结，则以正文为准
- 若正文没有冻结，而文末仍是开放问题，则在本目录中补成 P1 执行假设
- 本目录中的执行假设只服务 P1 落地，不反向改写上层产品方向

### 3. 本目录冻结的 P1 口径

本目录明确采用以下 P1 执行口径：

- P1 直接按 `完整九州` 做数据化落地，不退回到 `3-4 个代表州`
- `居` 在 P1 保留 `闭关 / 疗伤 / 调息回灵 / 基础生产 / 好友交流`
- `基础生产` 在 P1 先按轻量补给制造实现，不做重工体系
- `遇` 在 P1 既包含 `5 类寻常任务`，也包含 `单人高风险入口`
- `势` 在 P1 先做 `加入宗门 / 宗门任务 / 宗门贡献 / 宗门头衔`
- 阵营战、八荒、归墟、多人副本深机制全部留在 P2 及以后

### 4. 本目录不冻结的内容

以下内容如果上层 spec 没有明确冻结，本目录一律不擅自补成正式设定：

- 具体出生州、出生主城
- 新手补给的精确数值和最终道具清单
- 州内节点的最终命名文案
- 宗门名单、宗门前台包装命名、宗门总部归属

本目录当前只负责把 P1 的 `玩法骨架` 和 `可配置框架` 讲清楚，不负责替内容层拍板。

## 目录说明

- `01-scope-freeze.md`
  P1 范围、边界、完成定义和冲突处理。
- `02-golden-path.md`
  从新角色入界到跑通 P1 闭环的标准流程。
- `03-jiuzhou-and-events.md`
  九州结构、州内拓扑、赶路规则、事件池规划与最低内容容量。
- `04-residence-actions.md`
  `居` 模块的固定洞府、恢复、闭关、生产和好友交流参数口径。
- `05-task-and-sect-tables.md`
  `遇 + 势` 的任务模板、宗门配置框架、贡献规则、头衔规则。
- `06-economy-and-derived-views.md`
  P1 经济护栏、失败兜底、`readiness / recoveryState / activityContext / 道势` 等派生视图。

## 覆盖清单

本目录要求完整覆盖原定 P1 内容：

- `游（九州）`
- `居（闭关 / 恢复 / 基础生产）`
- `遇（日常任务 / 单人高风险内容）`
- `势（加入宗门 / 宗门任务 / 贡献 / 头衔）`
- 共享的状态、动作、日志、推荐视图、经济护栏与失败兜底

## 建议阅读顺序

1. `01-scope-freeze.md`
2. `02-golden-path.md`
3. `03-jiuzhou-and-events.md`
4. `04-residence-actions.md`
5. `05-task-and-sect-tables.md`
6. `06-economy-and-derived-views.md`

## 后续维护规则

- 若未来 P1 边界被重新调整，优先更新 `01-scope-freeze.md`
- 若新增具体条目、表格或数值，优先补到对应子文档，而不是继续堆回总 spec
- 若某条规则与上层 spec 冲突，必须先回到 `docs/specs/` 修正，再更新本目录
