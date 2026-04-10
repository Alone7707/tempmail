import 'dotenv/config';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'tempmail.db');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const mailboxSyncState = new Map();

const getMailboxSyncState = (mailboxId) => {
  if (!mailboxSyncState.has(mailboxId)) {
    mailboxSyncState.set(mailboxId, {
      running: false,
      startedAt: null,
      finishedAt: null,
      lastResult: null,
      lastError: null,
    });
  }
  return mailboxSyncState.get(mailboxId);
};

const hasColumn = (table, column) => {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
};

const ensureColumn = (table, column, definition) => {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    domain_suffix TEXT NOT NULL,
    forward_to_email TEXT NOT NULL,
    poll_interval_seconds INTEGER NOT NULL DEFAULT 10,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mailbox_provider_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    forward_to_email TEXT NOT NULL,
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_username TEXT NOT NULL,
    imap_password TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mailbox_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider_config_id INTEGER,
    alias TEXT NOT NULL,
    address TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    source_type TEXT NOT NULL DEFAULT 'mock',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(provider_config_id) REFERENCES mailbox_provider_configs(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mailbox_session_id INTEGER NOT NULL,
    sender_name TEXT,
    sender_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    snippet TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    raw_headers TEXT,
    external_message_id TEXT,
    received_at TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'low',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(mailbox_session_id) REFERENCES mailbox_sessions(id)
  );
`);

ensureColumn('mailbox_sessions', 'provider_config_id', 'INTEGER');
ensureColumn('mailbox_sessions', 'source_type', "TEXT NOT NULL DEFAULT 'mock'");
ensureColumn('messages', 'raw_headers', 'TEXT');
ensureColumn('messages', 'external_message_id', 'TEXT');
ensureColumn('messages', 'created_at', 'TEXT');

try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_unique
    ON messages(mailbox_session_id, external_message_id)
    WHERE external_message_id IS NOT NULL;
  `);
} catch {
}

const baseSettingsExists = db.prepare('SELECT id FROM app_settings WHERE id = 1').get();
if (!baseSettingsExists) {
  db.prepare(`
    INSERT INTO app_settings (id, domain_suffix, forward_to_email, poll_interval_seconds, updated_at)
    VALUES (1, ?, ?, 10, CURRENT_TIMESTAMP)
  `).run('@770733914.xyz', '1300487655@qq.com');
}

const demoUser = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
if (!demoUser) {
  const passwordHash = bcrypt.hashSync('123456', 10);
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `).run('demo', 'demo@example.com', passwordHash);

  const providerResult = db.prepare(`
    INSERT INTO mailbox_provider_configs (
      user_id, name, forward_to_email, imap_host, imap_port, imap_username, imap_password, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    result.lastInsertRowid,
    '默认 QQ 邮箱',
    '1300487655@qq.com',
    process.env.IMAP_HOST || 'imap.qq.com',
    Number(process.env.IMAP_PORT || 993),
    process.env.IMAP_USERNAME || '1300487655@qq.com',
    process.env.IMAP_PASSWORD || 'demo-password'
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const sessionResult = db.prepare(`
    INSERT INTO mailbox_sessions (user_id, provider_config_id, alias, address, expires_at, is_active, source_type)
    VALUES (?, ?, ?, ?, ?, 1, 'mock')
  `).run(result.lastInsertRowid, providerResult.lastInsertRowid, 'welcome-demo', 'welcome-demo@770733914.xyz', expiresAt);

  db.prepare(`
    INSERT INTO messages (
      mailbox_session_id, sender_name, sender_email, subject, snippet, html_body, text_body, raw_headers, received_at, risk_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionResult.lastInsertRowid,
    'GitHub',
    'noreply@github.com',
    'Welcome to TempMail',
    '这是系统初始化的演示邮件，用来打通前后端页面。',
    '<p>这是系统初始化的演示邮件，用来打通前后端页面。</p>',
    '这是系统初始化的演示邮件，用来打通前后端页面。',
    JSON.stringify({ to: 'welcome-demo@770733914.xyz', source: 'seed' }),
    new Date().toISOString(),
    'low'
  );
}

const migrateLegacyProviderConfigs = () => {
  const userRows = db.prepare('SELECT id FROM users').all();
  const baseSettings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  const legacySettingsColumns = db.prepare('PRAGMA table_info(app_settings)').all().map((item) => item.name);
  const hasLegacyImap = legacySettingsColumns.includes('imap_host');

  for (const user of userRows) {
    const countRow = db.prepare('SELECT COUNT(*) AS count FROM mailbox_provider_configs WHERE user_id = ?').get(user.id);
    if (countRow.count > 0) continue;

    const forwardToEmail = baseSettings?.forward_to_email || '1300487655@qq.com';
    const imapHost = hasLegacyImap ? (baseSettings.imap_host || process.env.IMAP_HOST || '') : (process.env.IMAP_HOST || '');
    const imapPort = hasLegacyImap ? Number(baseSettings.imap_port || process.env.IMAP_PORT || 993) : Number(process.env.IMAP_PORT || 993);
    const imapUsername = hasLegacyImap ? (baseSettings.imap_username || process.env.IMAP_USERNAME || '') : (process.env.IMAP_USERNAME || '');
    const imapPassword = hasLegacyImap ? (baseSettings.imap_password || process.env.IMAP_PASSWORD || '') : (process.env.IMAP_PASSWORD || '');

    db.prepare(`
      INSERT INTO mailbox_provider_configs (
        user_id, name, forward_to_email, imap_host, imap_port, imap_username, imap_password, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      user.id,
      '默认邮箱配置',
      forwardToEmail,
      imapHost || 'imap.qq.com',
      Number(imapPort || 993),
      imapUsername || forwardToEmail,
      imapPassword || 'demo-password'
    );
  }
};

const backfillMailboxProviderConfig = () => {
  const defaultConfigByUser = new Map(
    db.prepare(`
      SELECT user_id, id
      FROM mailbox_provider_configs
      WHERE is_default = 1
      ORDER BY id DESC
    `).all().map((item) => [item.user_id, item.id])
  );

  const sessions = db.prepare('SELECT id, user_id, provider_config_id FROM mailbox_sessions').all();
  for (const session of sessions) {
    if (session.provider_config_id) continue;
    const providerConfigId = defaultConfigByUser.get(session.user_id) || null;
    if (!providerConfigId) continue;
    db.prepare('UPDATE mailbox_sessions SET provider_config_id = ? WHERE id = ?').run(providerConfigId, session.id);
  }
};

migrateLegacyProviderConfigs();
backfillMailboxProviderConfig();

const app = new Koa();
const router = new Router({ prefix: '/api' });
const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-dev-secret';

app.use(helmet());
app.use(cors({ credentials: false, origin: '*' }));
app.use(bodyParser({ jsonLimit: '2mb' }));

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      code: 'ERROR',
      message: error.message || '服务器异常',
    };
  }
});

const authRequired = async (ctx, next) => {
  const authorization = ctx.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    ctx.status = 401;
    ctx.body = { code: 'UNAUTHORIZED', message: '未登录' };
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    ctx.state.user = payload;
    await next();
  } catch {
    ctx.status = 401;
    ctx.body = { code: 'UNAUTHORIZED', message: '登录状态已失效' };
  }
};

const createToken = (user) => jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
const response = (data, message = 'success') => ({ code: 'OK', message, data });

const getBaseSettings = () => db.prepare(`
  SELECT domain_suffix, forward_to_email, poll_interval_seconds
  FROM app_settings
  WHERE id = 1
`).get();

const listProviderConfigs = (userId) => db.prepare(`
  SELECT id, name, forward_to_email, imap_host, imap_port, imap_username,
         CASE WHEN imap_password IS NOT NULL AND imap_password != '' THEN 1 ELSE 0 END AS has_imap_password,
         is_default, created_at, updated_at
  FROM mailbox_provider_configs
  WHERE user_id = ?
  ORDER BY is_default DESC, id DESC
`).all(userId);

const getProviderConfigById = (userId, id) => db.prepare(`
  SELECT *
  FROM mailbox_provider_configs
  WHERE user_id = ? AND id = ?
`).get(userId, id);

const getDefaultProviderConfig = (userId) => db.prepare(`
  SELECT *
  FROM mailbox_provider_configs
  WHERE user_id = ? AND is_default = 1
  ORDER BY id DESC
  LIMIT 1
`).get(userId);

const getSettings = (userId) => {
  const base = getBaseSettings();
  const configs = listProviderConfigs(userId);
  return {
    ...base,
    forward_to_email: configs.find((item) => item.is_default)?.forward_to_email || base.forward_to_email,
    provider_configs: configs,
    selected_provider_config_id: configs.find((item) => item.is_default)?.id || null,
  };
};

const normalizeProviderConfigPayload = (body = {}) => ({
  name: String(body.name || '').trim(),
  forwardToEmail: String(body.forwardToEmail || '').trim(),
  imapHost: String(body.imapHost || '').trim(),
  imapPort: Number(body.imapPort || 993),
  imapUsername: String(body.imapUsername || '').trim(),
  imapPassword: typeof body.imapPassword === 'string' ? body.imapPassword : '',
});

const validateProviderConfigPayload = (payload, { requirePassword = true } = {}) => {
  if (!payload.name) return '配置名称不能为空';
  if (!payload.forwardToEmail) return '实际接收邮箱不能为空';
  if (!payload.imapHost) return 'IMAP_HOST 不能为空';
  if (!payload.imapPort || Number.isNaN(payload.imapPort)) return 'IMAP_PORT 不合法';
  if (!payload.imapUsername) return 'IMAP_USERNAME 不能为空';
  if (requirePassword && !payload.imapPassword) return 'IMAP_PASSWORD 不能为空';
  return null;
};

const detectRiskLevel = ({ fromEmail, subject, text }) => {
  const joined = `${fromEmail || ''} ${subject || ''} ${text || ''}`.toLowerCase();
  if (/verify|code|otp|验证码|登录|reset password|security/.test(joined)) return 'medium';
  if (/invoice|payment|bank|urgent|风险|转账|付款/.test(joined)) return 'high';
  return 'low';
};

const extractAliasFromAddress = (address = '', domainSuffix = '') => {
  if (!address || !domainSuffix) return null;
  const normalized = address.trim().toLowerCase();
  const suffix = domainSuffix.trim().toLowerCase();
  if (!normalized.endsWith(suffix)) return null;
  return normalized.slice(0, normalized.length - suffix.length).replace(/@$/, '') || null;
};

const pickForwardedAlias = ({ parsed, rawHeaders, domainSuffix }) => {
  const candidates = [];
  const collectAddress = (value) => {
    if (!value) return;
    if (Array.isArray(value.value)) {
      value.value.forEach((item) => item.address && candidates.push(item.address));
    }
  };

  collectAddress(parsed.to);
  collectAddress(parsed.deliveredTo);
  collectAddress(parsed.cc);

  const headersToCheck = ['x-original-to', 'x-forwarded-to', 'envelope-to', 'x-envelope-to', 'delivered-to', 'x-real-to', 'x-received-by'];
  for (const key of headersToCheck) {
    const value = parsed.headers.get(key) || rawHeaders[key];
    if (value) {
      String(value).split(/[;,\s]+/).forEach((part) => {
        if (part.includes('@')) candidates.push(part.replace(/[<>]/g, ''));
      });
    }
  }

  for (const item of candidates) {
    const alias = extractAliasFromAddress(item, domainSuffix);
    if (alias) return alias;
  }
  return null;
};

const upsertParsedMessage = ({ mailboxSessionId, parsed, rawHeaders, matchedAlias }) => {
  const from = parsed.from?.value?.[0] || {};
  const subject = parsed.subject || '(无主题)';
  const textBody = parsed.text || parsed.html || '';
  const htmlBody = typeof parsed.html === 'string' ? parsed.html : parsed.textAsHtml || null;
  const snippet = (parsed.text || parsed.subject || '').replace(/\s+/g, ' ').trim().slice(0, 160) || '无摘要';
  const externalMessageId = parsed.messageId || null;
  const riskLevel = detectRiskLevel({ fromEmail: from.address, subject, text: textBody });

  db.prepare(`
    INSERT OR IGNORE INTO messages (
      mailbox_session_id, external_message_id, sender_name, sender_email, subject, snippet, html_body, text_body, raw_headers, received_at, risk_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    mailboxSessionId,
    externalMessageId,
    from.name || null,
    from.address || 'unknown@example.com',
    subject,
    snippet,
    htmlBody,
    textBody,
    JSON.stringify({ ...rawHeaders, matchedAlias }),
    parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    riskLevel
  );
};

const syncMailboxMessages = async (mailbox) => {
  const baseSettings = getBaseSettings();
  const providerConfig = mailbox.provider_config_id ? getProviderConfigById(mailbox.user_id, mailbox.provider_config_id) : getDefaultProviderConfig(mailbox.user_id);
  if (!providerConfig || !providerConfig.imap_host || !providerConfig.imap_username || !providerConfig.imap_password) {
    return { synced: 0, mode: 'mock', reason: 'IMAP 配置未设置完整' };
  }

  const client = new ImapFlow({
    host: providerConfig.imap_host,
    port: Number(providerConfig.imap_port || 993),
    secure: Number(providerConfig.imap_port || 993) === 993,
    auth: { user: providerConfig.imap_username, pass: providerConfig.imap_password },
    logger: false,
  });

  let synced = 0;
  try {
    await client.connect();
    await client.mailboxOpen('INBOX');

    for await (const msg of client.fetch('1:*', { source: true, envelope: true, internalDate: true })) {
      const parsed = await simpleParser(msg.source);
      const rawHeaders = {};
      for (const [key, value] of parsed.headers) rawHeaders[key] = value;

      const matchedAlias = pickForwardedAlias({ parsed, rawHeaders, domainSuffix: baseSettings.domain_suffix });
      if (matchedAlias !== mailbox.alias) continue;

      upsertParsedMessage({ mailboxSessionId: mailbox.id, parsed, rawHeaders, matchedAlias });
      synced += 1;
    }

    return { synced, mode: 'imap', reason: '收件同步完成', providerConfigId: providerConfig.id, providerConfigName: providerConfig.name };
  } finally {
    if (client.usable) await client.logout();
  }
};

const runMailboxSyncInBackground = async (mailbox) => {
  const state = getMailboxSyncState(mailbox.id);
  if (state.running) {
    return state;
  }

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastError = null;

  (async () => {
    try {
      const result = await syncMailboxMessages(mailbox);
      state.lastResult = result;
    } catch (error) {
      state.lastError = error?.message || '后台同步失败';
    } finally {
      state.running = false;
      state.finishedAt = new Date().toISOString();
    }
  })();

  return state;
};

router.get('/health', (ctx) => {
  ctx.body = response({ status: 'ok', service: 'tempmail-backend', timestamp: new Date().toISOString() });
});

router.post('/auth/register', (ctx) => {
  const { username, email, password } = ctx.request.body || {};
  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: '用户名、邮箱、密码不能为空' };
    return;
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (exists) {
    ctx.status = 409;
    ctx.body = { code: 'CONFLICT', message: '用户名或邮箱已存在' };
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, passwordHash);

  db.prepare(`
    INSERT INTO mailbox_provider_configs (
      user_id, name, forward_to_email, imap_host, imap_port, imap_username, imap_password, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(result.lastInsertRowid, '默认邮箱配置', email, 'imap.qq.com', 993, email, 'demo-password');

  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = createToken(user);
  ctx.body = response({ user, token }, '注册成功');
});

router.post('/auth/login', (ctx) => {
  const { account, password } = ctx.request.body || {};
  if (!account || !password) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: '账号和密码不能为空' };
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(account, account);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    ctx.status = 401;
    ctx.body = { code: 'UNAUTHORIZED', message: '账号或密码错误' };
    return;
  }

  const token = createToken(user);
  ctx.body = response({
    user: { id: user.id, username: user.username, email: user.email, created_at: user.created_at },
    token,
  }, '登录成功');
});

router.get('/auth/me', authRequired, (ctx) => {
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(ctx.state.user.id);
  ctx.body = response(user);
});

router.get('/settings', authRequired, (ctx) => {
  ctx.body = response(getSettings(ctx.state.user.id));
});

router.put('/settings', authRequired, (ctx) => {
  const { domainSuffix, pollIntervalSeconds, selectedProviderConfigId } = ctx.request.body || {};
  if (!domainSuffix) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: '邮箱后缀不能为空' };
    return;
  }

  db.prepare(`
    UPDATE app_settings
    SET domain_suffix = ?, poll_interval_seconds = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(domainSuffix, Number(pollIntervalSeconds || 10));

  if (selectedProviderConfigId) {
    const target = getProviderConfigById(ctx.state.user.id, selectedProviderConfigId);
    if (!target) {
      ctx.status = 404;
      ctx.body = { code: 'NOT_FOUND', message: '所选邮箱配置不存在' };
      return;
    }
    db.prepare('UPDATE mailbox_provider_configs SET is_default = 0 WHERE user_id = ?').run(ctx.state.user.id);
    db.prepare('UPDATE mailbox_provider_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(selectedProviderConfigId, ctx.state.user.id);
  }

  ctx.body = response(getSettings(ctx.state.user.id), '配置已更新');
});

router.get('/provider-configs', authRequired, (ctx) => {
  ctx.body = response(listProviderConfigs(ctx.state.user.id));
});

router.post('/provider-configs', authRequired, (ctx) => {
  const payload = normalizeProviderConfigPayload(ctx.request.body);
  const validationError = validateProviderConfigPayload(payload, { requirePassword: true });
  if (validationError) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: validationError };
    return;
  }

  const exists = db.prepare('SELECT COUNT(*) AS count FROM mailbox_provider_configs WHERE user_id = ?').get(ctx.state.user.id).count;
  const isDefault = exists === 0 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO mailbox_provider_configs (
      user_id, name, forward_to_email, imap_host, imap_port, imap_username, imap_password, is_default, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    ctx.state.user.id,
    payload.name,
    payload.forwardToEmail,
    payload.imapHost,
    payload.imapPort,
    payload.imapUsername,
    payload.imapPassword,
    isDefault
  );

  ctx.body = response(getProviderConfigById(ctx.state.user.id, result.lastInsertRowid), '邮箱配置已添加');
});

router.put('/provider-configs/:id', authRequired, (ctx) => {
  const current = getProviderConfigById(ctx.state.user.id, ctx.params.id);
  if (!current) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱配置不存在' };
    return;
  }

  const payload = normalizeProviderConfigPayload(ctx.request.body);
  const validationError = validateProviderConfigPayload(payload, { requirePassword: false });
  if (validationError) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: validationError };
    return;
  }

  db.prepare(`
    UPDATE mailbox_provider_configs
    SET name = ?, forward_to_email = ?, imap_host = ?, imap_port = ?, imap_username = ?, imap_password = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    payload.name,
    payload.forwardToEmail,
    payload.imapHost,
    payload.imapPort,
    payload.imapUsername,
    payload.imapPassword || current.imap_password,
    ctx.params.id,
    ctx.state.user.id,
  );

  ctx.body = response(getProviderConfigById(ctx.state.user.id, ctx.params.id), '邮箱配置已更新');
});

router.delete('/provider-configs/:id', authRequired, (ctx) => {
  const current = getProviderConfigById(ctx.state.user.id, ctx.params.id);
  if (!current) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱配置不存在' };
    return;
  }

  const total = db.prepare('SELECT COUNT(*) AS count FROM mailbox_provider_configs WHERE user_id = ?').get(ctx.state.user.id).count;
  if (total <= 1) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: '至少保留一个邮箱配置' };
    return;
  }

  db.prepare('DELETE FROM mailbox_provider_configs WHERE id = ? AND user_id = ?').run(ctx.params.id, ctx.state.user.id);

  if (current.is_default) {
    const fallback = db.prepare('SELECT id FROM mailbox_provider_configs WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(ctx.state.user.id);
    if (fallback) {
      db.prepare('UPDATE mailbox_provider_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(fallback.id, ctx.state.user.id);
    }
  }

  ctx.body = response({ deleted: true }, '邮箱配置已删除');
});

router.post('/provider-configs/:id/select', authRequired, (ctx) => {
  const target = getProviderConfigById(ctx.state.user.id, ctx.params.id);
  if (!target) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱配置不存在' };
    return;
  }

  db.prepare('UPDATE mailbox_provider_configs SET is_default = 0 WHERE user_id = ?').run(ctx.state.user.id);
  db.prepare('UPDATE mailbox_provider_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(ctx.params.id, ctx.state.user.id);

  ctx.body = response(getProviderConfigById(ctx.state.user.id, ctx.params.id), '已切换默认邮箱配置');
});

router.get('/mailboxes/history', authRequired, (ctx) => {
  const items = db.prepare(`
    SELECT s.id, s.alias, s.address, s.expires_at, s.is_active, s.source_type, s.created_at,
           s.provider_config_id, pc.name AS provider_config_name
    FROM mailbox_sessions s
    LEFT JOIN mailbox_provider_configs pc ON pc.id = s.provider_config_id
    WHERE s.user_id = ?
    ORDER BY s.id DESC
    LIMIT 50
  `).all(ctx.state.user.id);
  ctx.body = response(items);
});

router.get('/mailboxes/current', authRequired, (ctx) => {
  const mailbox = db.prepare(`
    SELECT s.id, s.alias, s.address, s.expires_at, s.is_active, s.source_type, s.created_at,
           s.provider_config_id, pc.name AS provider_config_name
    FROM mailbox_sessions s
    LEFT JOIN mailbox_provider_configs pc ON pc.id = s.provider_config_id
    WHERE s.user_id = ? AND s.is_active = 1
    ORDER BY s.id DESC
    LIMIT 1
  `).get(ctx.state.user.id);
  ctx.body = response(mailbox);
});

router.post('/mailboxes/generate', authRequired, (ctx) => {
  const { providerConfigId } = ctx.request.body || {};
  const baseSettings = getBaseSettings();
  const providerConfig = providerConfigId ? getProviderConfigById(ctx.state.user.id, providerConfigId) : getDefaultProviderConfig(ctx.state.user.id);

  if (!providerConfig) {
    ctx.status = 400;
    ctx.body = { code: 'BAD_REQUEST', message: '请先添加邮箱配置' };
    return;
  }

  const alias = `mail${Date.now()}`;
  const address = `${alias}${baseSettings.domain_suffix}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const sourceType = providerConfig.imap_host && providerConfig.imap_username && providerConfig.imap_password ? 'imap' : 'mock';

  db.prepare('UPDATE mailbox_sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1').run(ctx.state.user.id);

  const result = db.prepare(`
    INSERT INTO mailbox_sessions (user_id, provider_config_id, alias, address, expires_at, is_active, source_type)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(ctx.state.user.id, providerConfig.id, alias, address, expiresAt, sourceType);

  db.prepare(`
    INSERT INTO messages (
      mailbox_session_id, sender_name, sender_email, subject, snippet, html_body, text_body, raw_headers, received_at, risk_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.lastInsertRowid,
    'System',
    'system@tempmail.local',
    '新邮箱已生成',
    `邮箱 ${address} 已创建，当前绑定配置：${providerConfig.name}。`,
    `<p>邮箱 <strong>${address}</strong> 已创建，当前绑定配置：<strong>${providerConfig.name}</strong>。</p>`,
    `邮箱 ${address} 已创建，当前绑定配置：${providerConfig.name}。`,
    JSON.stringify({ to: address, source: 'system-generate', providerConfigId: providerConfig.id }),
    new Date().toISOString(),
    'low'
  );

  const mailbox = db.prepare(`
    SELECT s.id, s.alias, s.address, s.expires_at, s.is_active, s.source_type, s.created_at,
           s.provider_config_id, pc.name AS provider_config_name
    FROM mailbox_sessions s
    LEFT JOIN mailbox_provider_configs pc ON pc.id = s.provider_config_id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);
  ctx.body = response(mailbox, '临时邮箱已生成');
});

router.post('/mailboxes/:id/activate', authRequired, (ctx) => {
  const mailbox = db.prepare(`
    SELECT s.id, s.alias, s.address, s.expires_at, s.is_active, s.source_type, s.created_at,
           s.provider_config_id, pc.name AS provider_config_name
    FROM mailbox_sessions s
    LEFT JOIN mailbox_provider_configs pc ON pc.id = s.provider_config_id
    WHERE s.id = ? AND s.user_id = ?
  `).get(ctx.params.id, ctx.state.user.id);

  if (!mailbox) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱不存在' };
    return;
  }

  db.prepare('UPDATE mailbox_sessions SET is_active = 0 WHERE user_id = ?').run(ctx.state.user.id);
  db.prepare('UPDATE mailbox_sessions SET is_active = 1 WHERE id = ? AND user_id = ?').run(ctx.params.id, ctx.state.user.id);

  if (mailbox.provider_config_id) {
    db.prepare('UPDATE mailbox_provider_configs SET is_default = 0 WHERE user_id = ?').run(ctx.state.user.id);
    db.prepare('UPDATE mailbox_provider_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(mailbox.provider_config_id, ctx.state.user.id);
  }

  const activeMailbox = db.prepare(`
    SELECT s.id, s.alias, s.address, s.expires_at, s.is_active, s.source_type, s.created_at,
           s.provider_config_id, pc.name AS provider_config_name
    FROM mailbox_sessions s
    LEFT JOIN mailbox_provider_configs pc ON pc.id = s.provider_config_id
    WHERE s.id = ? AND s.user_id = ?
  `).get(ctx.params.id, ctx.state.user.id);

  ctx.body = response(activeMailbox, '已切换当前邮箱');
});

router.get('/mailboxes/:id/sync-status', authRequired, (ctx) => {
  const mailbox = db.prepare('SELECT id FROM mailbox_sessions WHERE id = ? AND user_id = ?').get(ctx.params.id, ctx.state.user.id);
  if (!mailbox) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱不存在' };
    return;
  }

  ctx.body = response(getMailboxSyncState(Number(ctx.params.id)));
});

router.post('/mailboxes/:id/sync', authRequired, async (ctx) => {
  const mailbox = db.prepare(`
    SELECT *
    FROM mailbox_sessions
    WHERE id = ? AND user_id = ?
  `).get(ctx.params.id, ctx.state.user.id);

  if (!mailbox) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱不存在' };
    return;
  }

  const state = getMailboxSyncState(mailbox.id);
  if (!state.running) {
    await runMailboxSyncInBackground(mailbox);
  }

  ctx.body = response({
    accepted: true,
    running: true,
    mailboxId: mailbox.id,
    startedAt: getMailboxSyncState(mailbox.id).startedAt,
  }, '已开始后台同步');
});

router.get('/mailboxes/:id/messages', authRequired, (ctx) => {
  const mailbox = db.prepare('SELECT id FROM mailbox_sessions WHERE id = ? AND user_id = ?').get(ctx.params.id, ctx.state.user.id);
  if (!mailbox) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮箱不存在' };
    return;
  }

  const messages = db.prepare(`
    SELECT id, sender_name, sender_email, subject, snippet, received_at, is_read, risk_level
    FROM messages
    WHERE mailbox_session_id = ?
    ORDER BY datetime(received_at) DESC, id DESC
  `).all(ctx.params.id);

  ctx.body = response(messages);
});

router.get('/messages/:id', authRequired, (ctx) => {
  const message = db.prepare(`
    SELECT m.*
    FROM messages m
    JOIN mailbox_sessions s ON s.id = m.mailbox_session_id
    WHERE m.id = ? AND s.user_id = ?
  `).get(ctx.params.id, ctx.state.user.id);

  if (!message) {
    ctx.status = 404;
    ctx.body = { code: 'NOT_FOUND', message: '邮件不存在' };
    return;
  }

  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(ctx.params.id);
  ctx.body = response({ ...message, is_read: 1 });
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`TempMail backend is running at http://localhost:${port}`);
});
