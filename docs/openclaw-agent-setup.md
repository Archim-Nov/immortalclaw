# OpenClaw Agent 接入说明

## 目标

把当前仓库里的首版世界 API 接到 `OpenClaw`，让 agent 能直接读取修士状态、查看可执行动作并执行动作。

## 当前接入结构

- 世界内核：`packages/domain`
- 世界 API：`apps/world-api`
- OpenClaw 插件：`packages/openclaw-immortal-plugin`

## 先启动世界 API

```powershell
npm.cmd install
npm.cmd run dev:api
```

默认地址：

- `http://127.0.0.1:8787`

## OpenClaw 插件路径

把这个目录作为本地插件路径加载：

`C:/Users/Chris/Documents/GitHub/immoral claw/packages/openclaw-immortal-plugin`

## OpenClaw 配置示例

下面是一个最小配置片段，核心目的是：

- 加载本地插件
- 启用 `immortal-realm`
- 给 OpenClaw agent 一个稳定的 `agentId`

```json5
{
  plugins: {
    load: {
      paths: [
        "C:/Users/Chris/Documents/GitHub/immoral claw/packages/openclaw-immortal-plugin"
      ]
    },
    entries: {
      "immortal-realm": {
        enabled: true,
        config: {
          worldBaseUrl: "http://127.0.0.1:8787",
          agentId: "openclaw-main",
          requestTimeoutMs: 8000
        }
      }
    }
  }
}
```

## agent 使用方式

这个插件会给 agent 暴露这些工具：

- `immortal_create_character`
- `immortal_list_characters`
- `immortal_select_character`
- `immortal_state`
- `immortal_actions`
- `immortal_messages`
- `immortal_tribulation`
- `immortal_sect`
- `immortal_dao_logs`
- `immortal_act`
- `immortal_tick`

推荐 agent 行为顺序：

首次接入：

1. 先 `immortal_create_character`
2. 再 `immortal_state`
3. 再 `immortal_actions`
4. 选择一个真实存在的 `actionId`
5. 调用 `immortal_act`
6. 如果你是在做本地演示或 GM 操作，再用 `immortal_tick`
7. 最后重新 `immortal_state`

已有多个角色时：

1. 先 `immortal_list_characters`
2. 必要时 `immortal_select_character`
3. 再进入正常状态查询和动作流程

## 重要限制

### 现在已经能做的

- 新 OpenClaw agent 可以自建角色
- 角色可以带 `genderPresentation`、`pronouns`、`origin`、`temperament`、`startingPath`
- agent 和角色可以绑定
- agent 可以切换自己名下的角色
- OpenClaw agent 可以通过插件读取世界状态
- 可以读取动作列表
- 可以执行动作
- 可以主动推进 tick

### 现在还没做的

- 没有独立 worker 自动推进世界
- 没有真正的多修士调度
- 没有把 agent 唤醒机制接到世界事件上
- 没有持久化数据库

## 下一步建议

如果要把这层接得更像正式系统，下一步应做：

1. `apps/world-worker`
2. 自动 tick 和 job 推进
3. 事件触发 agent 唤醒
4. 多修士 agent 路由
