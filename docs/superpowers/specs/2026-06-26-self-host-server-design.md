# 自托管 Node 服务端设计（apps/server）

> 日期：2026-06-26
> 范围（Scope A）：把 immortal-claw 后端改成能在**普通 Node 环境独立运行**，脱离 Cloudflare（Worker + Durable Object）与 Supabase。本地验证通过即完成，**不碰真实服务器**。
>
> 后续：`apps/server` 已经是 `https://claw.archim.top` 的生产运行时（systemd `immortal-claw`，Apache 反代到 `127.0.0.1:8788`，数据在 `/opt/immortalclaw/data/world.sqlite`）。部署步骤见 `deploy/README.md`。上面的「不碰真实服务器」只约束这篇设计当时的范围。
> 成功标准（Complete）：服务能起（`/health`、`/world/status`）+ 完整玩法链路（注册 agent→查状态→执行行动→推进 tick→看事件）+ 现有 2278 测试仍全过。

## 1. 总体策略

核心是「**新增**」而非「修改」。现有平台无关层（`routes.ts`/`middleware.ts`/`runtime.ts`/`env.ts` + 整个 domain/application/persistence）**零逻辑改动**直接复用；只新增一个 Node 入口包 `apps/server`，注入本地适配器（SQLite 世界仓储 + 新写的 SQLite 认证 + setInterval 驱动的 tick 调度）。

Cloudflare 耦合本就只在两个文件（`apps/world-do/src/index.ts`、`apps/runtime-worker/src/index.ts`），自托管形态下二者均不参与运行，保留不动。

## 2. 包结构

```
apps/server/
├── package.json          依赖 @hono/node-server + 内部 @immortal-claw/{world-do,persistence,application,domain,contracts}
├── tsconfig.json
└── src/
    ├── config.ts         读环境变量 + 边界校验（缺失/非法→早失败、清晰报错）
    ├── sqlite.ts         用 node:sqlite 开库 + 建世界表（复用 createSchema）
    ├── tick-scheduler.ts setInterval 实现 WorldDoRuntimeStorage，驱动 createWorldDoRuntime（含串行护栏）
    └── index.ts          装配根：config→sqlite→world+auth→Hono app→serve→启动 tick→优雅退出
```

新增的认证适配器放在 **`packages/persistence`**（与 `SupabaseAuthClient`、`InMemoryWorldRepository` 并列，属持久化适配器）：
```
packages/persistence/src/
├── credential-utils.ts     抽出的纯函数：issueCredential / hashCredential / normalizeAgentId
└── sqlite-auth-client.ts   node:sqlite 实现 AuthClient（7 方法 + auth schema）
```

## 3. 技术决策

- **SQLite 驱动 = `node:sqlite`（内置 DatabaseSync）**，而非 better-sqlite3。理由：本地 Node v22.14 已内置；零原生编译（Windows 无需 build tools）；零新增 SQLite 依赖；其 `exec/prepare/run/all` 形状正好满足现有 `SqliteDatabaseLike` 接口，可直接喂给 `createSqliteWorldRepository({ database })`。仓储 SQL 用 `?` 占位符，与 node:sqlite 匿名参数兼容。（这是对原 better-sqlite3 设计的稳健化改良，接口形状不变。）
- **唯一现有代码改动（仅暴露、不改逻辑）**：`apps/world-do/package.json` 加 `exports` 子路径，把 `routes`/`middleware`/`runtime`/`env` 显式导出，使 apps/server 在 Node 下 import 时不触发 `index.ts` 顶部的 `import "cloudflare:workers"`。
- **凭证工具抽取**：把 `supabase-auth-client.ts` 里的私有纯函数 `issueCredential`/`hashCredential`/`normalizeAgentId` 抽到 `credential-utils.ts`，两个 AuthClient 共用，保证凭证格式（`immortal_sk_<uuid>`）与 SHA-256 哈希**完全一致**。

## 4. 组件设计

### 4.1 `config.ts`
从 `process.env` 读取并校验，缺失/非法早失败：
- `PORT`（默认 8787）
- `DB_PATH`（默认 `./data/world.sqlite`）
- `FRONTEND_ORIGIN`（默认 `http://localhost:5173`；middleware CORS 需要）
- `WORLD_TICK_STEPS`（默认 1，沿用 readTickSteps 夹 [1,20]）
- `WORLD_RESET_TOKEN`（可选）
- `TICK_INTERVAL_MS`（默认 60000，对齐 DO 的 60s）
组装成 `WorldDOEnv` 形状（SUPABASE_* 在自托管下不需要，置空字符串占位，认证走本地）。

### 4.2 `sqlite.ts`
`new DatabaseSync(dbPath)` → 开 WAL → `createSchema(asSchemaStorage(db))` 建世界表 → 返回 db。db 同时作为 `SqliteDatabaseLike` 传给世界仓储与 auth client。

### 4.3 `sqlite-auth-client.ts`（persistence）
两张表，复刻 Supabase 语义：
```sql
CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_id TEXT PRIMARY KEY, name TEXT NOT NULL, selected_cultivator_id TEXT NOT NULL,
  gender_presentation TEXT, pronouns TEXT, origin TEXT, temperament TEXT,
  webhook_url TEXT, webhook_secret TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_seen_at TEXT);
CREATE TABLE IF NOT EXISTS agent_credentials (
  credential_hash TEXT PRIMARY KEY, agent_id TEXT NOT NULL,
  created_at TEXT NOT NULL, last_seen_at TEXT, revoked_at TEXT);
CREATE INDEX IF NOT EXISTS idx_agent_credentials_agent ON agent_credentials(agent_id);
```
7 方法 1:1 映射本地 SQL，保留全部语义：`saveAgentProfile` 合并 existing 的 webhookUrl/secret/createdAt；`issueAgentCredential` 先吊销旧凭证（置 revoked_at）再插新；`resetAgentCredential` 校验旧凭证归属+未吊销，含失败回滚；`authenticateAgent` 按 hash 查未吊销凭证→回 profile（lastSeenAt 取凭证行）；`touchAgent` 更新凭证 last_seen_at。校验同源（agentId/name/selectedCultivatorId 缺失即抛）。

### 4.4 `tick-scheduler.ts`
实现 `WorldDoRuntimeStorage`（`getAlarm`/`setAlarm`/`deleteAlarm`），内部持 `alarmAt` + 定时器句柄，并提供 `start(onFire)`/`stop()`：
- `setAlarm(ts)`：记录时间戳，`setTimeout(fire, max(0, ts-now))`（先清旧定时器）
- `fire()`：**串行护栏**——若上一次 onFire 仍在跑则跳过本次（复刻 DO `blockConcurrencyWhile` 串行保证）；否则调 `onFire`（= `runtime.alarm()`），它会重排下一个 alarm 并 advance
- `deleteAlarm()`/`stop()`：清定时器、`alarmAt=null`
驱动逻辑全部复用 `createWorldDoRuntime`，本组件只当「平台计时器」。

### 4.5 `index.ts`（装配，镜像 DO 的 constructor）
1. `loadConfig()` → env
2. `openDatabase(env)` → db（建世界表）
3. `world = createSqliteWorldRepository({ database: db })`
4. `auth = createSqliteAuthClient({ database: db })`（建 auth 表）
5. `app = new Hono<WorldDOHonoEnv>()`；`app.use("*", c=>{c.set("world",world);c.set("auth",auth)})`
6. `scheduler = createTickScheduler()`；`runtime = createWorldDoRuntime({ env, storage: scheduler, world, dispatchAfterAdvance })`
7. webhook 分发回调：与 DO 完全一致（completedJobs→listAgentProfiles+readWorld→resolve/dedupe/dispatch，best-effort try/catch）
8. `/internal/reset-storage` 路由（WORLD_RESET_TOKEN 守卫，调 runtime.resetForRollout）
9. `registerMiddleware(app, env)`；`registerRoutes(app)`
10. `serve({ fetch: app.fetch, port })`（@hono/node-server）
11. `await runtime.initialize()`；`scheduler.start(() => runtime.alarm())`
12. `SIGINT/SIGTERM` → scheduler.stop() + db.close() + server.close()

## 5. 数据流

- **请求流**：HTTP →（@hono/node-server）→ Hono app → middleware(CORS/onError) → 注入 world/auth → route handler →（application 工作流）→ world/auth 适配器 → node:sqlite → 响应。与 DO 形态逐字一致，仅入口与底层 SQL 句柄不同。
- **Tick 流**：scheduler 定时器到点 → `runtime.alarm()` → `setAlarm(next)` 重排 → `advanceWorld(steps,"scheduled")` → `dispatchAfterAdvance`（webhook best-effort）。串行护栏保证不重入。

## 6. 错误处理

- 启动期：config 缺失/非法 → 抛清晰错误、进程非零退出（早失败）。
- 运行期：沿用 `middleware.ts` 的 `app.onError`（按 error.status 映射 400/401/409/500 + `{error: message}`）。
- Tick：webhook 分发 best-effort（try/catch 吞错，不影响推进），与 DO 一致。
- 退出：信号触发优雅关闭，先停定时器再关库，避免半写。

## 7. 测试策略

- **现有 2278 测试**：纯 node:test + tsx，零改动、零影响（不引入它们的依赖）。world-do exports 仅新增子路径，不动 `.` 主入口。
- **新增 SqliteAuthClient 测试**：用 `node:sqlite` 的 `:memory:` 库，覆盖 7 方法 + 凭证签发/吊销/重置/认证/touch 的语义，并与 credential-utils 的格式断言。
- **新增 tick-scheduler 测试**：用假定时器/可控 onFire，验证 initialize 设首个 alarm、fire 重排+调用、串行护栏防重入、deleteAlarm 清理。
- **端到端玩法链路**：启动 server，curl 跑 health/status/注册/行动/tick，人工确认链路通。

## 8. 非目标（YAGNI）

- 不做生产部署、不碰真实服务器、不配 systemd/nginx（那是后续独立环节）。
- 不重构 world-do 为双入口共享层（方案三，过度工程）。
- 不改前端（Scope A 聚焦后端；前端联调指向本地后端属后续）。
