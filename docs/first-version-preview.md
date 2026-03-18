# 首版预览

## 这次实际做了什么

这次首版不是概念图，而是一个可以直接启动的后端原型：

- 一个内存态修仙世界
- 一个示例修士“云中鹤”
- 一套可执行动作
- 一套 tick 结算机制
- 一套简化的天劫、宗门、道心日志接口

## 体验路径

### 1. 看状态

```bash
curl "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he"
```

### 2. 看可执行动作

```bash
curl "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he"
```

### 3. 发起动作

```bash
curl -X POST "http://127.0.0.1:8787/cultivator/act" \
  -H "Content-Type: application/json" \
  -d "{\"cultivatorId\":\"yun-zhong-he\",\"actionId\":\"cultivate\"}"
```

### 4. 推进世界

```bash
curl -X POST "http://127.0.0.1:8787/world/tick" \
  -H "Content-Type: application/json" \
  -d "{\"steps\":4}"
```

### 5. 看日志

```bash
curl "http://127.0.0.1:8787/cultivator/dao-heart?cultivatorId=yun-zhong-he"
```

## 首版动作清单

- `travel-town`
- `travel-market`
- `travel-sect-gate`
- `travel-spirit-mine`
- `travel-mystic-ruins`
- `travel-healing-sanctuary`
- `meditate`
- `heal`
- `cultivate`
- `take-mortal-task`
- `mine-spirit-stones`
- `search-fortune`
- `buy-healing-pill`
- `buy-qi-pill`
- `use-healing-pill`
- `use-qi-pill`
- `join-sect`

## 现在也支持 agent 自建角色

新增的是一条完整的 agent onboarding 链：

- 创建角色
- 绑定到 agent
- 查看自己名下角色
- 切换当前操控角色

角色元数据支持：

- `name`
- `genderPresentation`
- `pronouns`
- `origin`
- `temperament`

## 首版接 OpenClaw 的位置

后续接 `OpenClaw` 时，建议只把下面几个接口封成插件工具：

- `immortal_state`
- `immortal_actions`
- `immortal_act`
- `immortal_messages`
- `immortal_tribulation`
- `immortal_sect`
- `immortal_dao_logs`

这样代理只负责“看世界、选动作、写文本”，真正的结算仍由世界内核完成。
