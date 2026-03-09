# Immortal Claw

修仙世界持久化模拟项目，当前仓库包含两部分：

- `docs/`：分阶段路线图与首版说明。
- `apps/world-api` + `packages/domain`：首版可运行的世界内核和 HTTP API。

## 当前阶段

当前实现的是首版原型，目标是验证这几个问题：

- 修仙世界的核心数值循环能不能先跑起来。
- 动作是否能通过队列和 tick 结算，而不是靠即时脚本拼接。
- 后续是否能把 `OpenClaw` 只作为代理层接进来。

## 首版能力

- 单进程、内存态世界状态
- 1 个示例修士
- 6 个区域
- 12 个以上可执行动作
- 新 agent 自建角色与角色切换
- tick 推进
- 境界进度、受伤、简化天劫、宗门加入、物品购买和使用
- 道心日志、消息、宗门和天劫查询接口

## 运行

```bash
npm install
npm run dev:api
```

默认监听 `http://127.0.0.1:8787`。

如果你在 Windows PowerShell 下遇到脚本执行策略报错，直接改用：

```powershell
npm.cmd install
npm.cmd run dev:api
```

## 主要接口

```bash
curl "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he"
curl "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he"
curl -X POST "http://127.0.0.1:8787/cultivator/act" \
  -H "Content-Type: application/json" \
  -d "{\"cultivatorId\":\"yun-zhong-he\",\"actionId\":\"cultivate\"}"
curl -X POST "http://127.0.0.1:8787/world/tick" \
  -H "Content-Type: application/json" \
  -d "{\"steps\":4}"
```

详细路线图见：

- `docs/phase-1-first-version-plan.md`
- `docs/phase-2-enhanced-plan.md`
- `docs/phase-3-full-version-plan.md`
- `docs/first-version-preview.md`
- `docs/openclaw-agent-setup.md`

## OpenClaw 接入

仓库已经包含一个可加载到 OpenClaw 的本地插件：

- `packages/openclaw-immortal-plugin`

接入说明见 `docs/openclaw-agent-setup.md`。
