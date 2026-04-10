<template>
  <div class="shell-page shell-page-simple">
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
    </aside>

    <main class="shell-main">
      <header class="shell-topbar">
        <div class="shell-breadcrumb">历史记录 / 邮箱会话</div>
        <div class="shell-topbar-right">
          <div class="shell-status-pill is-ok">
            <span class="shell-status-dot"></span>
            <span>支持历史邮箱快速切换</span>
          </div>
        </div>
      </header>

      <div class="shell-content shell-content-wide">
        <section class="history-hero-grid history-hero-grid-refined">
          <div class="history-overview-card history-overview-card-refined">
            <div class="section-kicker">Session Overview</div>
            <h1 class="section-title">邮箱会话历史</h1>
            <p class="section-desc">这里保存你生成过的所有临时邮箱。每条记录都绑定具体邮箱配置，可直接切回并继续查看收件内容。</p>
            <div class="history-stats-row history-stats-row-refined">
              <div class="history-stat-box">
                <div class="history-stat-value">{{ tempMailStore.history.length }}</div>
                <div class="history-stat-label">总会话数</div>
              </div>
              <div class="history-stat-box">
                <div class="history-stat-value is-primary">{{ activeCount }}</div>
                <div class="history-stat-label">当前激活</div>
              </div>
              <div class="history-stat-box">
                <div class="history-stat-value">{{ archivedCount }}</div>
                <div class="history-stat-label">历史地址</div>
              </div>
            </div>
          </div>

          <div class="history-side-card history-side-card-refined">
            <div class="history-side-icon">⟳</div>
            <h3>快速回切</h3>
            <p>切换历史邮箱后，工作台当前地址、邮件列表和配置上下文都会一起切换。</p>
            <div class="history-side-note">适合回看旧 alias 的真实来信。</div>
          </div>
        </section>

        <section v-if="tempMailStore.history.length" class="history-grid history-grid-refined">
          <article class="history-grid-card history-grid-card-rich" v-for="item in tempMailStore.history" :key="item.id">
            <div class="history-grid-head">
              <div class="history-badges">
                <el-tag size="small" :type="item.source_type === 'imap' ? 'success' : 'warning'">{{ item.source_type.toUpperCase() }}</el-tag>
                <el-tag size="small" :type="item.is_active ? 'success' : 'info'">{{ item.is_active ? '当前邮箱' : '历史地址' }}</el-tag>
              </div>
            </div>

            <h3 class="history-address">{{ item.address }}</h3>
            <p class="history-config-line">绑定配置：{{ item.provider_config_name || '未绑定配置' }}</p>

            <div class="history-detail-grid">
              <div class="history-detail-item">
                <span>创建时间</span>
                <strong>{{ formatTime(item.created_at) }}</strong>
              </div>
              <div class="history-detail-item">
                <span>过期时间</span>
                <strong>{{ formatTime(item.expires_at) }}</strong>
              </div>
            </div>

            <el-button
              class="history-switch-btn"
              type="primary"
              :plain="!item.is_active"
              :disabled="item.is_active || tempMailStore.isSwitchingMailbox"
              :loading="tempMailStore.isSwitchingMailbox && switchingId === item.id"
              @click="activateMailbox(item.id)"
            >
              {{ item.is_active ? '当前邮箱使用中' : '切换到此邮箱' }}
            </el-button>
          </article>
        </section>

        <div v-else class="dashboard-empty-panel dashboard-empty-panel-large">
          <div class="dashboard-empty-icon">🕘</div>
          <h3>还没有历史邮箱记录</h3>
          <p>当你在工作台生成第一个邮箱后，这里会自动开始沉淀历史会话，并支持随时切回。</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useTempMailStore } from '../stores/tempMail';

const router = useRouter();
const tempMailStore = useTempMailStore();
const switchingId = ref<number | null>(null);

const formatTime = (value?: string) => value ? new Date(value).toLocaleString() : '-';
const activeCount = computed(() => tempMailStore.history.filter((item) => item.is_active).length);
const archivedCount = computed(() => Math.max(0, tempMailStore.history.length - activeCount.value));

const activateMailbox = async (id: number) => {
  switchingId.value = id;
  try {
    await tempMailStore.switchMailbox(id);
    ElMessage.success('已切换到该邮箱');
    router.push('/app');
  } finally {
    switchingId.value = null;
  }
};

onMounted(async () => {
  await tempMailStore.loadHistory();
});
</script>
