# TempMail

一个基于 **Vue 3 + Element Plus + Pinia + Koa + SQLite** 的临时邮箱系统，支持生成临时邮箱、历史邮箱切换、多邮箱配置管理，以及通过 **Cloudflare 邮件转发 + IMAP** 完成真实收件同步。

## 当前能力

- 用户注册 / 登录
- 生成临时邮箱地址
- 工作台查看当前邮箱、邮件列表与邮件详情
- 历史邮箱列表展示与一键切换当前邮箱
- 多邮箱配置管理
  - 新增 / 编辑 / 删除邮箱配置
  - 设为默认配置
  - 生成邮箱时绑定当前选中的配置
- 设置页修改：
  - 邮箱后缀
  - 默认转发邮箱
  - 轮询间隔
- 支持异步邮件同步
- 支持通过 IMAP 接入真实收件链路
- 支持使用 Docker Compose 一键启动

## 技术栈

### 前端
- Vue 3
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios
- Nginx（Docker 部署时用于静态托管和 API 反代）

### 后端
- Node.js
- Koa
- better-sqlite3
- JWT
- imapflow
- mailparser

## 目录结构

```text
frontend/   前端项目
backend/    后端项目
docker-compose.yml
```

## Docker Compose 启动（推荐）

### 1. 准备环境变量

在项目根目录复制一份 Docker 环境变量模板：

```bash
cp .env.docker.example .env
```

如果你在 PowerShell 下，可以用：

```powershell
Copy-Item .env.docker.example .env
```

至少建议填写：

```env
JWT_SECRET=tempmail-dev-secret
IMAP_HOST=imap.qq.com
IMAP_PORT=993
IMAP_USERNAME=你的真实邮箱
IMAP_PASSWORD=你的邮箱授权码
MAILBOX_SYNC_TIMEOUT_MS=45000
MAILBOX_SYNC_FETCH_WINDOW=50
```

### 2. 启动

```bash
docker compose up -d --build
```

启动后默认访问：

- 前端入口：`http://localhost`
- 后端健康检查：`http://localhost/api/health`

### 3. 停止

```bash
docker compose down
```

### 4. 数据持久化

SQLite 数据库会保存在宿主机目录：

```text
backend/data/
```

容器重建后数据不会丢。

## 本地开发启动

### 1. 启动后端

```bash
cd backend
复制 .env.example 为 .env
npm install
npm start
```

如果你在 PowerShell 下，可以用：

```powershell
Copy-Item .env.example .env
```

默认监听：`http://localhost:3000`

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

当前 Vite 已配置为监听 `0.0.0.0:5173`。

- 本机访问：`http://localhost:5173`
- 局域网 / 远端访问：`http://<宿主机IP>:5173`

### 3. 前端 API 地址

前端优先读取 `VITE_API_BASE_URL`。

如果未显式配置：
- 浏览器环境下会自动推断为 `http://当前访问主机名:3000/api`
- 非浏览器环境下回退为 `http://localhost:3000/api`

在 Docker Compose 中，前端构建时会固定使用相对地址 `/api`，由 Nginx 自动反代到后端。

如需本地开发时手动指定，可在启动前设置：

```bash
VITE_API_BASE_URL=http://<你的后端地址>:3000/api
```

## 默认演示账号

- 用户名：`demo`
- 密码：`123456`

## 环境变量

### 本地开发：`backend/.env.example`

```env
PORT=3000
JWT_SECRET=tempmail-dev-secret
IMAP_HOST=imap.qq.com
IMAP_PORT=993
IMAP_USERNAME=
IMAP_PASSWORD=
```

### Docker：`.env.docker.example`

```env
JWT_SECRET=tempmail-dev-secret
IMAP_HOST=imap.qq.com
IMAP_PORT=993
IMAP_USERNAME=
IMAP_PASSWORD=
MAILBOX_SYNC_TIMEOUT_MS=45000
MAILBOX_SYNC_FETCH_WINDOW=50
```

> 注意：真实凭证只允许放在服务端 `.env` 或 Docker 环境变量中，不要提交到前端或仓库。

## 真实收件说明

### 必须理解的一点

- **SMTP 只能发信**
- **IMAP 才能读收件箱**

所以如果要做“临时邮箱收件轮询”，必须配置 IMAP，而不是只配 SMTP。

### 推荐链路

1. 用户在系统中生成临时邮箱地址，例如：`mail123@770733914.xyz`
2. Cloudflare 邮件转发把该地址转发到真实邮箱，例如：`1300487655@qq.com`
3. 后端使用 IMAP 轮询真实邮箱
4. 后端从邮件头中识别原始收件地址，并筛出属于当前临时邮箱的邮件

### 注意事项

- 如果修改“实际接收邮箱”，必须同步修改 Cloudflare 邮件转发规则
- 建议使用邮箱授权码，不要直接使用登录密码
- 不同邮件服务商保留的转发头可能不同，必要时需根据真实样本补充识别规则

## 主要 API

### 认证
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### 设置
- `GET /api/settings`
- `PUT /api/settings`

### 邮箱配置
- `GET /api/provider-configs`
- `POST /api/provider-configs`
- `PUT /api/provider-configs/:id`
- `DELETE /api/provider-configs/:id`
- `POST /api/provider-configs/:id/select`

### 邮箱会话
- `GET /api/mailboxes/current`
- `GET /api/mailboxes/history`
- `POST /api/mailboxes/generate`
- `POST /api/mailboxes/:id/activate`
- `POST /api/mailboxes/:id/sync`
- `GET /api/mailboxes/:id/sync-status`
- `GET /api/mailboxes/:id/messages`

### 邮件
- `GET /api/messages/:id`

### 系统
- `GET /api/health`

## 当前状态

当前项目已完成：

- 前后端分离部署
- 多邮箱配置管理
- 历史邮箱切换
- 后端异步同步接口
- 前端深色控制台风格 UI
- 同步状态回写与超时兜底
- 最近邮件窗口同步，避免全量扫描 IMAP 收件箱
- Docker Compose 一键启动方案

## 当前限制

- 附件解析还没有单独落表和下载流
- 原始收件人识别仍依赖转发头，后续可能需要根据真实样本继续增强
- 暂未补充完整自动化测试

## 后续建议

- 增加附件表与附件下载
- 增加过期邮箱自动清理任务
- 增强 Cloudflare / QQ / Gmail 等不同链路下的原始收件人识别
- 增加测试、部署与运维脚本
