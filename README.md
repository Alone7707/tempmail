# TempMail

一个基于 **Vue 3 + Element Plus + Pinia + Koa + SQLite** 的临时邮箱项目。

## 当前能力

- 用户注册 / 登录
- 生成临时邮箱地址
- 工作台查看当前邮箱与邮件详情
- 历史邮箱地址查看
- 设置页修改邮箱后缀、转发邮箱、轮询间隔
- 可选 IMAP 同步真实收件箱

## 技术栈

### 前端
- Vue 3
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios

### 后端
- Koa
- better-sqlite3
- JWT
- imapflow
- mailparser

## 目录结构

```text
frontend/   前端项目
backend/    后端项目
```

## 快速启动

### 1. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`
后端默认地址：`http://localhost:3000`

## 默认演示账号

- 用户名：`demo`
- 密码：`123456`

## 环境变量

后端 `.env` 示例：

```env
PORT=3000
JWT_SECRET=tempmail-dev-secret
IMAP_HOST=imap.qq.com
IMAP_PORT=993
IMAP_USERNAME=
IMAP_PASSWORD=
```

## 真实收件说明

### 必须理解的一点

- **SMTP 只能发信**
- **IMAP 才能读收件箱**

所以如果你要做“临时邮箱收件轮询”，必须配置 IMAP，而不是只配 SMTP。

### Cloudflare 转发链路

推荐链路：

1. 用户访问系统，生成临时邮箱地址，例如 `mail123@770733914.xyz`
2. Cloudflare 邮件转发把这个地址转发到真实邮箱，例如 `1300487655@qq.com`
3. 后端用 IMAP 轮询真实邮箱
4. 从邮件头中识别原始收件地址，并筛出属于当前临时邮箱的邮件

### 注意事项

- 如果你修改“实际接收邮箱”，必须同步修改 Cloudflare 邮件转发规则
- 建议使用 QQ 邮箱授权码，不要直接使用登录密码
- 不同转发链路保留的邮件头可能不同，必要时要根据真实样本调整识别逻辑

## 已实现 API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/mailboxes/current`
- `GET /api/mailboxes/history`
- `POST /api/mailboxes/generate`
- `POST /api/mailboxes/:id/sync`
- `GET /api/mailboxes/:id/messages`
- `GET /api/messages/:id`
- `GET /api/health`

## 当前限制

- 附件解析还没单独落表
- 当前通过 headers 猜测原始临时邮箱地址，后续可能需要针对真实样本增强
- 没做管理员后台和多租户能力

## 下一步建议

- 增加附件表与附件下载
- 增加自动清理过期邮箱任务
- 增加更可靠的原始收件人识别规则
- 增加测试与部署脚本
