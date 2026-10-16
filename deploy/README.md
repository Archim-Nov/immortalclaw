# 自托管部署手册（单台 VPS · 前后端同站）

把 immortal-claw 完整跑在一台 VPS 上：nginx 发前端静态页 + 反代 API 到本地后端（同源，免 CORS），后端用 systemd 守护，数据落本地 SQLite。

## 架构

```
浏览器 ──HTTPS──► nginx (VPS)
                   ├─ /                → 静态 SPA  (apps/web/dist)
                   └─ /health,/agent/*,/cultivator/*,/world/*
                                       → 反代 http://127.0.0.1:8787
                                           └─ apps/server (Node, systemd)
                                                └─ data/world.sqlite (世界状态 + 认证)
```

## 前置条件

- Ubuntu VPS，一个指向它的域名（如 `claw.example.com`，A 记录指到 VPS 公网 IP）
- **Node 22+**（后端用内置 `node:sqlite`，必须 22+）、`nginx`、`certbot`、`git`

## 步骤

```bash
# 0) 装 Node 22+（若未装），nginx、certbot
#    （nvm 或 nodesource 均可，确认 node -v >= 22）

# 1) 拉代码
sudo mkdir -p /opt/immortalclaw && sudo chown "$USER" /opt/immortalclaw
git clone https://github.com/Archim-Nov/immortalclaw.git /opt/immortalclaw
cd /opt/immortalclaw

# 2) 装依赖（含 tsx；后端直接用 tsx 运行，无需编译）
npm ci

# 3) 配后端环境
cp deploy/server.env.example server.env
#   编辑 server.env：把 FRONTEND_ORIGIN 改成 https://你的域名，
#   WORLD_RESET_TOKEN 换成 `openssl rand -hex 24` 生成的随机值。

# 4) 构建前端（指向同源域名），并放到 nginx 根目录
VITE_RUNTIME_BASE_URL=https://claw.example.com npm run build:web
sudo mkdir -p /var/www/immortalclaw
sudo bash deploy/sync-web-root.sh /var/www/immortalclaw apps/web/dist

# 5) 后端 systemd 守护
sudo cp deploy/systemd/immortal-claw.service /etc/systemd/system/
#   如 `which node` 不是 /usr/bin/node，改 ExecStart 里的路径
sudo systemctl daemon-reload
sudo systemctl enable --now immortal-claw
systemctl status immortal-claw --no-pager
curl -fsS http://127.0.0.1:8787/health        # 期望 {"ok":true,...}

# 6) nginx 站点
sudo cp deploy/nginx/immortalclaw.conf /etc/nginx/sites-available/immortalclaw.conf
#   把 server_name 改成你的域名
sudo ln -s /etc/nginx/sites-available/immortalclaw.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7) 上 TLS（certbot 会就地改上面的 conf）
sudo certbot --nginx -d claw.example.com

# 8) 验证
curl -fsS https://claw.example.com/health     # 后端通
#   浏览器打开 https://claw.example.com —— 前端加载且能调通 API
```

## 升级 / 重新部署

```bash
cd /opt/immortalclaw && git pull
npm ci
VITE_RUNTIME_BASE_URL=https://claw.example.com npm run build:web
sudo bash deploy/sync-web-root.sh /var/www/immortalclaw apps/web/dist
sudo systemctl restart immortal-claw
```

## 备份（重要：世界状态只有这一个文件）

```bash
# cron 每天备份 sqlite
0 3 * * * cp /opt/immortalclaw/data/world.sqlite /opt/immortalclaw/backups/world.$(date +\%F).sqlite
```

## 排错

- `/health` 通但站点白屏：检查 `/var/www/immortalclaw` 是否有 `index.html`、nginx `root` 是否对。
- API 404：确认 `VITE_RUNTIME_BASE_URL` 与站点同源、nginx 那条 `location ~ ^/(health$|agent/...)` 在。
- 后端起不来：`journalctl -u immortal-claw -n 50`；确认 `node -v >= 22`（node:sqlite 需要）。
- `npm run build:web` 若卡在 typecheck，可临时 `npm run build --workspace @immortal-claw/web -- --mode production` 或直接 `npx vite build`（在 apps/web 下）。
