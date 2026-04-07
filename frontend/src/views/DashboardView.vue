<template>
  <div class="console-page">
    <aside class="sidebar">
      <div>
        <div class="brand">TEMP MAIL</div>
        <div class="brand-sub">一次生成，立即收件</div>
      </div>
      <nav class="nav-links">
        <RouterLink to="/app">工作台</RouterLink>
        <RouterLink to="/app/history">历史</RouterLink>
        <RouterLink to="/app/settings">设置</RouterLink>
        <RouterLink to="/app/help">帮助</RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div class="user-line">{{ authStore.user?.username }}</div>
        <el-button text @click="logout">退出登录</el-button>
      </div>
    </aside>

    <main class="main-panel">
      <section class="hero-card">
        <div>
          <div class="eyebrow">CURRENT ADDRESS</div>
          <h1>{{ tempMailStore.mailbox?.address || '尚未生成临时邮箱' }}</h1>
          <p>到期时间：{{ formatTime(tempMailStore.mailbox?.expires_at) }}</p>
          <p>收件模式：{{ tempMailStore.mailbox?.source_type === 'imap' ? '真实 IMAP 同步' : '演示模式' }}</p>
        </div>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="generateMailbox">生成新邮箱</el-button>
          <el-button size="large" @click="copyAddress" :disabled="!tempMailStore.mailbox?.address">复制地址</el-button>
          <el-button size="large" @click="syncMailbox" :disabled="!tempMailStore.mailbox?.id">同步收件</el-button>
        </div>
      </section>

      <section class="status-strip">
        <el-alert
          :type="tempMailStore.mailbox?.source_type === 'imap' ? 'success' : 'warning'"
          :closable="false"
          show-icon
          :title="tempMailStore.mailbox?.source_type === 'imap'
            ? '已配置 IMAP，支持从真实邮箱同步邮件。'
            : '当前仍是演示模式；补齐 IMAP 配置后才能读取真实收件箱。'"
        />
      </section>

      <section class="content-grid">
        <el-card class="mail-list-card" shadow="never">
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
              class="mail-item"
              :class="{ active: tempMailStore.selectedMessage?.id === item.id }"
              @click="tempMailStore.loadMessageDetail(item.id)"
            >
              <div class="mail-item-top">
                <strong>{{ item.subject }}</strong>
                <span>{{ item.risk_level }}</span>
              </div>
              <div class="mail-item-meta">{{ item.sender_name || item.sender_email }}</div>
              <div class="mail-item-snippet">{{ item.snippet }}</div>
            </button>
          </div>
          <el-empty v-else description="还没有邮件，先生成邮箱或等待收件" />
        </el-card>

        <el-card class="mail-preview-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>邮件预览</span>
              <span v-if="tempMailStore.selectedMessage">#{{ tempMailStore.selectedMessage.id }}</span>
            </div>
          </template>
          <div v-if="tempMailStore.selectedMessage" class="mail-preview">
            <h2>{{ tempMailStore.selectedMessage.subject }}</h2>
            <div class="preview-meta">
              <span>发件人：{{ tempMailStore.selectedMessage.sender_name || tempMailStore.selectedMessage.sender_email }}</span>
              <span>时间：{{ formatTime(tempMailStore.selectedMessage.received_at) }}</span>
              <span>风险等级：{{ tempMailStore.selectedMessage.risk_level }}</span>
            </div>
            <div class="preview-body" v-html="tempMailStore.selectedMessage.html_body || tempMailStore.selectedMessage.text_body"></div>
          </div>
          <el-empty v-else description="选择一封邮件查看详情" />
        </el-card>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { useTempMailStore } from '../stores/tempMail';

const router = useRouter();
const authStore = useAuthStore();
const tempMailStore = useTempMailStore();

const generateMailbox = async () => {
  await tempMailStore.generateMailbox();
  tempMailStore.restartPolling();
  ElMessage.success('已生成新的临时邮箱');
};

const syncMailbox = async () => {
  const result = await tempMailStore.syncCurrentMailbox();
  ElMessage.success(result?.reason || '同步完成');
};

const copyAddress = async () => {
  if (!tempMailStore.mailbox?.address) return;
  await navigator.clipboard.writeText(tempMailStore.mailbox.address);
  ElMessage.success('邮箱地址已复制');
};

const formatTime = (value?: string) => value ? new Date(value).toLocaleString() : '-';

const logout = () => {
  tempMailStore.stopPolling();
  authStore.logout();
  router.push('/login');
};

onMounted(async () => {
  await authStore.fetchProfile();
  await tempMailStore.loadSettings();
  await tempMailStore.loadCurrentMailbox();
  await tempMailStore.loadHistory();
  await tempMailStore.loadMessages(true);
  tempMailStore.startPolling();
});

onUnmounted(() => {
  tempMailStore.stopPolling();
});
</script>
