<template>
  <div class="shell-page">
    <aside class="shell-sidebar">
      <div class="shell-brand-block">
        <div class="shell-brand-icon">∞</div>
        <div>
          <div class="shell-brand-title">无限邮箱</div>
          <div class="shell-brand-sub">Infinite Utility</div>
        </div>
      </div>

      <nav class="shell-nav">
        <RouterLink to="/app" class="shell-nav-link">工作台</RouterLink>
        <RouterLink to="/app/history" class="shell-nav-link">历史记录</RouterLink>
        <RouterLink to="/app/settings" class="shell-nav-link">配置设置</RouterLink>
        <RouterLink to="/app/help" class="shell-nav-link">帮助中心</RouterLink>
      </nav>

      <div class="shell-user-card">
        <div class="shell-user-avatar">{{ authStore.user?.username?.slice(0, 1)?.toUpperCase() || 'A' }}</div>
        <div class="shell-user-meta">
          <div class="shell-user-name">{{ authStore.user?.username || 'Admin User' }}</div>
          <div class="shell-user-plan">Professional Plan</div>
        </div>
        <el-button text @click="logout">退出</el-button>
      </div>
    </aside>

    <main class="shell-main">
      <header class="shell-topbar">
        <div class="shell-status-pill" :class="tempMailStore.mailbox?.source_type === 'imap' ? 'is-ok' : 'is-warn'">
          <span class="shell-status-dot"></span>
          <span>IMAP 状态：{{ tempMailStore.mailbox?.source_type === 'imap' ? '已连接' : '演示模式' }}</span>
        </div>
        <div class="shell-topbar-right">
          <div class="shell-search-placeholder">搜索邮件...</div>
        </div>
      </header>

      <div class="shell-content">
        <section class="dashboard-hero-panel dashboard-hero-panel-refined">
          <div class="dashboard-hero-copy">
            <div class="section-kicker">IMAP 同步模式</div>
            <div class="hero-meta-line">
              <span>到期时间：{{ formatTime(tempMailStore.mailbox?.expires_at) }}</span>
              <span>收件模式：{{ tempMailStore.mailbox?.source_type === 'imap' ? '真实 IMAP 同步' : '演示模式' }}</span>
            </div>
            <h1 class="dashboard-address">{{ tempMailStore.mailbox?.address || '尚未生成临时邮箱' }}</h1>
            <p class="dashboard-subline">
              当前配置：{{ activeProviderName }}
            </p>

            <div class="dashboard-provider-summary" v-if="tempMailStore.activeProviderConfig">
              <div class="dashboard-provider-summary-item">
                <span class="summary-label">转发邮箱</span>
                <strong>{{ tempMailStore.activeProviderConfig.forward_to_email }}</strong>
              </div>
              <div class="dashboard-provider-summary-item">
                <span class="summary-label">IMAP</span>
                <strong>{{ tempMailStore.activeProviderConfig.imap_host }}:{{ tempMailStore.activeProviderConfig.imap_port }}</strong>
              </div>
              <div class="dashboard-provider-summary-item">
                <span class="summary-label">用户名</span>
                <strong>{{ tempMailStore.activeProviderConfig.imap_username }}</strong>
              </div>
            </div>

            <div class="dashboard-hero-actions">
              <el-button type="primary" size="large" @click="generateMailbox" :disabled="tempMailStore.isSyncing || !selectedProviderConfigId">
                生成新邮箱
              </el-button>
              <el-button size="large" @click="copyAddress" :disabled="!tempMailStore.mailbox?.address">复制地址</el-button>
              <el-button size="large" @click="syncMailbox" :loading="tempMailStore.isSyncing" :disabled="!tempMailStore.mailbox?.id || tempMailStore.isSyncing">
                手动同步
              </el-button>
            </div>
          </div>

          <div class="dashboard-hero-side">
            <div class="dashboard-config-card">
              <div class="dashboard-config-label">当前使用配置</div>
              <el-select
                v-model="selectedProviderConfigId"
                placeholder="选择一个邮箱配置"
                class="provider-select"
                :disabled="!tempMailStore.providerConfigs.length"
                @change="handleProviderChange"
              >
                <el-option
                  v-for="item in tempMailStore.providerConfigs"
                  :key="item.id"
                  :label="`${item.name} · ${item.forward_to_email}`"
                  :value="item.id"
                />
              </el-select>
              <div class="dashboard-config-tip">
                生成新邮箱会绑定当前配置；切换历史邮箱时，也会自动切到对应配置。
              </div>
            </div>

            <div class="dashboard-mini-metrics">
              <div class="dashboard-mini-metric">
                <span>邮件总数</span>
                <strong>{{ tempMailStore.messages.length }}</strong>
              </div>
              <div class="dashboard-mini-metric">
                <span>配置数量</span>
                <strong>{{ tempMailStore.providerConfigs.length }}</strong>
              </div>
              <div class="dashboard-mini-metric">
                <span>历史会话</span>
                <strong>{{ tempMailStore.history.length }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="dashboard-alert-stack">
          <el-alert
            :type="tempMailStore.mailbox?.source_type === 'imap' ? 'success' : 'warning'"
            :closable="false"
            show-icon
            :title="tempMailStore.mailbox?.source_type === 'imap'
              ? '已配置 IMAP，支持从真实邮箱同步邮件。'
              : '当前仍是演示模式；补齐 IMAP 配置后才能读取真实收件箱。'"
          />
          <el-alert
            v-if="tempMailStore.isSyncing"
            type="info"
            :closable="false"
            show-icon
            title="正在同步收件箱。IMAP 响应较慢时属正常，请勿重复点击。"
          />
        </section>

        <section class="dashboard-workspace-grid">
          <el-card class="dashboard-mail-list-panel" shadow="never">
            <template #header>
              <div class="card-header">
                <span>收件箱</span>
                <span>{{ tempMailStore.messages.length }} 封</span>
              </div>
            </template>
            <div v-if="tempMailStore.messages.length" class="mail-list">
              <button
                v-for="item in tempMailStore.messages"
                :key="item.id"
                class="mail-item dashboard-mail-item"
                :class="{ active: tempMailStore.selectedMessage?.id === item.id }"
                @click="tempMailStore.loadMessageDetail(item.id)"
              >
                <div class="mail-item-top">
                  <strong>{{ item.sender_name || item.sender_email }}</strong>
                  <span>{{ formatRelative(item.received_at) }}</span>
                </div>
                <div class="dashboard-mail-subject">{{ item.subject }}</div>
                <div class="dashboard-mail-risk-line">
                  <span class="mail-risk-badge" :class="`risk-${item.risk_level}`">{{ item.risk_level }}</span>
                </div>
                <div class="mail-item-snippet">{{ item.snippet }}</div>
              </button>
            </div>
            <div v-else class="dashboard-empty-panel">
              <div class="dashboard-empty-icon">✉</div>
              <h3>还没有邮件</h3>
              <p>先生成一个临时邮箱，或者等待上游转发过来的新邮件。</p>
            </div>
          </el-card>

          <el-card class="dashboard-mail-preview-panel" shadow="never">
            <template #header>
              <div class="card-header">
                <span>邮件预览</span>
                <span v-if="tempMailStore.selectedMessage">#{{ tempMailStore.selectedMessage.id }}</span>
              </div>
            </template>
            <div v-if="tempMailStore.selectedMessage" class="mail-preview dashboard-mail-preview">
              <div class="dashboard-mail-preview-head">
                <h2>{{ tempMailStore.selectedMessage.subject }}</h2>
                <div class="preview-meta">
                  <span>发件人：{{ tempMailStore.selectedMessage.sender_name || tempMailStore.selectedMessage.sender_email }}</span>
                  <span>时间：{{ formatTime(tempMailStore.selectedMessage.received_at) }}</span>
                  <span>风险等级：{{ tempMailStore.selectedMessage.risk_level }}</span>
                </div>
              </div>
              <div class="preview-body" v-html="tempMailStore.selectedMessage.html_body || tempMailStore.selectedMessage.text_body"></div>
            </div>
            <div v-else class="dashboard-empty-panel dashboard-empty-panel-large">
              <div class="dashboard-empty-icon">⌘</div>
              <h3>选择一封邮件查看详情</h3>
              <p>左侧选择邮件后，这里会显示主题、发件人、风险等级和正文内容。</p>
            </div>
          </el-card>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { useTempMailStore } from '../stores/tempMail';

const router = useRouter();
const authStore = useAuthStore();
const tempMailStore = useTempMailStore();

const selectedProviderConfigId = computed({
  get: () => tempMailStore.selectedProviderConfigId,
  set: (value) => {
    tempMailStore.selectedProviderConfigId = value;
  },
});

const activeProviderName = computed(() => tempMailStore.activeProviderConfig?.name || tempMailStore.mailbox?.provider_config_name || '未选择');

const generateMailbox = async () => {
  await tempMailStore.generateMailbox();
  tempMailStore.restartPolling();
  ElMessage.success('已生成新的临时邮箱');
};

const syncMailbox = async () => {
  const result = await tempMailStore.syncCurrentMailbox();
  ElMessage.success(result?.reason || '同步完成');
};

const handleProviderChange = async (id: number) => {
  await tempMailStore.selectProviderConfig(id);
  ElMessage.success('已切换邮箱配置');
};

const copyAddress = async () => {
  if (!tempMailStore.mailbox?.address) return;
  await navigator.clipboard.writeText(tempMailStore.mailbox.address);
  ElMessage.success('邮箱地址已复制');
};

const formatTime = (value?: string) => value ? new Date(value).toLocaleString() : '-';
const formatRelative = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return new Date(value).toLocaleDateString();
};

const logout = () => {
  tempMailStore.stopPolling();
  authStore.logout();
  router.push('/login');
};

onMounted(async () => {
  await authStore.fetchProfile();
  await tempMailStore.loadSettings();
  await tempMailStore.loadProviderConfigs();
  await tempMailStore.loadCurrentMailbox();
  await tempMailStore.loadHistory();
  await tempMailStore.loadMessages(true);
  tempMailStore.startPolling();
});

onUnmounted(() => {
  tempMailStore.stopPolling();
});
</script>
