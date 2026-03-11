# OpenClaw Agent 接入说明

## 目标

把当前仓库里的修仙世界 API 接到 `OpenClaw`，并且直接复用 `OpenClaw` 工作区里的 `IDENTITY.md` 和 `SOUL.md` 作为角色人格来源。

现在的接入方式已经改成：

- 不再手动建角
- 不再切换多角色
- agent 首次读取世界状态时，插件会自动读取人格文件
- 插件会把人格信息同步成一个世界内角色

## 当前接入结构

- 世界内核：`packages/domain`
- 世界 API：`apps/world-api`
- 自动推进 worker：`apps/world-worker`
- OpenClaw 插件：`packages/openclaw-immortal-plugin`

## 启动世界服务

这些命令是跨平台的，在 PowerShell、macOS Terminal、Linux shell 和 WSL 里都可以直接运行：

```text
npm install
npm run dev:api
npm run dev:worker
```

默认地址：

- `http://127.0.0.1:8787`

## 插件路径

把下面这个目录作为本地插件路径加入 `OpenClaw`：

`/absolute/path/to/immortal-claw/packages/openclaw-immortal-plugin`

如果你在 Windows 上配置 JSON 路径，推荐也统一使用正斜杠，例如 `C:/work/immortal-claw/packages/openclaw-immortal-plugin`。

## OpenClaw 配置示例

```json5
{
  plugins: {
    load: {
      paths: [
        "/absolute/path/to/immortal-claw/packages/openclaw-immortal-plugin"
      ]
    },
    entries: {
      "immortal-realm": {
        enabled: true,
        config: {
          worldBaseUrl: "http://127.0.0.1:8787",
          agentId: "openclaw-main",
          personaDir: "/absolute/path/to/openclaw/workspace",
          requestTimeoutMs: 8000
        }
      }
    }
  }
}
```

`personaDir` 要指向 OpenClaw 的工作区根目录，里面需要有：

- `IDENTITY.md`
- `SOUL.md`

如果不填，插件会默认读当前进程工作目录。Windows 示例同样建议写成 `C:/path/to/openclaw/workspace`，避免反斜杠转义问题。

当前支持的人格文件格式包括：

- YAML front matter，例如 `name:`、`gender:`、`pronouns:`、`path:`
- 行内字段，例如 `- gender: female`
- 分段式模板，例如 `## Background`、`## Core Values`、`## Communication Style`

## agent 可用工具

- `immortal_state`
- `immortal_strategy`
- `immortal_actions`
- `immortal_messages`
- `immortal_tribulation`
- `immortal_sect`
- `immortal_dao_logs`
- `immortal_act`
- `immortal_tick`

## 推荐调用顺序

1. `immortal_state`
2. `immortal_strategy`
3. `immortal_actions`
4. 选择真实存在的 `actionId`
5. `immortal_act`
6. 如需测试推进时间，再调用 `immortal_tick`
7. 最后重新 `immortal_state`

## 现在的关键约束

- 插件会先根据 `IDENTITY.md` 和 `SOUL.md` 自动同步角色
- agent 不需要自己建角
- `immortal_act` 前必须先查 `immortal_state` 或 `immortal_strategy`
- `immortal_act` 前也必须先查 `immortal_actions`
- agent 不能自己编不存在的 `actionId`

## 后续方向

如果继续往正式版本推进，下一步建议是：

1. 补更多 persona 字段映射规则
2. 做世界事件驱动的 agent 唤醒
3. 做多 agent 并发调度
4. 做更完整的日志与 GM 面板
