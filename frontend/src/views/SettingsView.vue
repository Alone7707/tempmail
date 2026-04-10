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
        <div class="shell-breadcrumb">设置 / 全局配置管理</div>
      </header>

      <div class="shell-content shell-content-wide">
        <section class="settings-overview-grid">
          <div class="settings-overview-card settings-overview-card-main">
            <div class="section-kicker">Configuration</div>
            <h1 class="section-title">配置控制中心</h1>
            <p class="section-desc">管理默认域名、轮询频率和多套真实收件配置。这里决定新邮箱的生成方式与同步来源。</p>
            <div class="settings-overview-stats">
              <div class="settings-overview-stat">
                <span>默认域名</span>
                <strong>{{ form.domainSuffix || '-' }}</strong>
              </div>
              <div class="settings-overview-stat">
                <span>轮询间隔</span>
                <strong>{{ form.pollIntervalSeconds }}s</strong>
              </div>
              <div class="settings-overview-stat">
                <span>配置数量</span>
                <strong>{{ tempMailStore.providerConfigs.length }}</strong>
              </div>
            </div>
          </div>

          <div class="settings-overview-card settings-overview-card-side">
            <div class="settings-overview-side-icon">⚙</div>
            <h3>默认配置</h3>
            <p>{{ defaultConfigName }}</p>
          </div>
        </section>

        <section class="settings-section-title-row">
          <div>
            <div class="section-kicker">Base Settings</div>
            <h2 class="section-title">基础设置</h2>
            <p class="section-desc">决定新邮箱的默认域名、轮询节奏和默认驱动配置。</p>
          </div>
        </section>

        <section class="settings-base-panel settings-base-panel-refined">
          <el-form label-position="top" class="settings-form-grid">
            <el-form-item label="域名后缀">
              <el-input v-model="form.domainSuffix" placeholder="例如 @770733914.xyz" />
            </el-form-item>
            <el-form-item label="轮询间隔（秒）">
              <el-input-number v-model="form.pollIntervalSeconds" :min="5" :max="300" class="full-width" />
            </el-form-item>
            <el-form-item label="默认配置选择">
              <el-select v-model="form.selectedProviderConfigId" placeholder="请选择默认邮箱配置" class="full-width">
                <el-option
                  v-for="item in tempMailStore.providerConfigs"
                  :key="item.id"
                  :label="`${item.name} · ${item.forward_to_email}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <div class="form-actions">
            <el-button type="primary" @click="saveBaseSettings">保存基础设置</el-button>
          </div>
        </section>

        <section class="settings-section-title-row">
          <div>
            <div class="section-kicker">Mail Drivers</div>
            <h2 class="section-title">邮箱配置管理</h2>
            <p class="section-desc">连接并维护你的 IMAP 邮件驱动源，支持新增、编辑、删除和设为默认。</p>
          </div>
          <el-button type="primary" @click="resetEditor">新增配置</el-button>
        </section>

        <section class="provider-config-layout settings-layout-redesign">
          <div class="provider-config-list settings-provider-list">
            <div
              v-for="item in tempMailStore.providerConfigs"
              :key="item.id"
              class="provider-config-item redesign-provider-item redesign-provider-item-rich"
              :class="{ active: editingId === item.id }"
            >
              <div class="provider-card-main">
                <div class="provider-config-title-row provider-config-title-row-wide">
                  <div>
                    <strong>{{ item.name }}</strong>
                    <div class="mail-item-meta">{{ item.forward_to_email }}</div>
                  </div>
                  <div class="provider-title-tags">
                    <el-tag v-if="item.is_default" type="success">默认</el-tag>
                    <el-tag :type="item.has_imap_password ? 'info' : 'warning'">
                      {{ item.has_imap_password ? '已存密码' : '未存密码' }}
                    </el-tag>
                  </div>
                </div>

                <div class="provider-config-detail-grid">
                  <div class="provider-detail-item">
                    <span>IMAP 主机</span>
                    <strong>{{ item.imap_host }}</strong>
                  </div>
                  <div class="provider-detail-item">
                    <span>端口</span>
                    <strong>{{ item.imap_port }}</strong>
                  </div>
                  <div class="provider-detail-item provider-detail-item-wide">
                    <span>用户名</span>
                    <strong>{{ item.imap_username }}</strong>
                  </div>
                </div>
              </div>
              <div class="provider-config-actions redesign-provider-actions">
                <el-button size="small" @click="fillEditForm(item)">编辑</el-button>
                <el-button size="small" type="primary" plain @click="chooseDefault(item.id)" :disabled="item.is_default">设为默认</el-button>
                <el-button size="small" type="danger" plain @click="removeConfig(item.id)">删除</el-button>
              </div>
            </div>
            <el-empty v-if="!tempMailStore.providerConfigs.length" description="暂无邮箱配置" />
          </div>

          <el-card shadow="never" class="provider-editor-card redesign-editor-card redesign-editor-card-rich">
            <template #header>
              <div class="card-header">
                <div>
                  <span>{{ editingId ? '编辑配置' : '新增配置' }}</span>
                  <div class="mail-item-meta">{{ editingId ? '正在修改现有邮箱驱动' : '创建一组新的收件配置' }}</div>
                </div>
                <el-button text @click="resetEditor">重置更改</el-button>
              </div>
            </template>
            <el-form label-position="top">
              <div class="settings-editor-grid">
                <el-form-item label="配置名称" class="grid-span-2">
                  <el-input v-model="editor.name" placeholder="例如 QQ 主邮箱 / Gmail 备用箱" />
                </el-form-item>
                <el-form-item label="转发至邮箱" class="grid-span-2">
                  <el-input v-model="editor.forwardToEmail" placeholder="例如 1300487655@qq.com" />
                </el-form-item>
                <el-form-item label="IMAP 主机">
                  <el-input v-model="editor.imapHost" placeholder="例如 imap.qq.com" />
                </el-form-item>
                <el-form-item label="端口">
                  <el-input-number v-model="editor.imapPort" :min="1" :max="65535" class="full-width" />
                </el-form-item>
                <el-form-item label="用户名">
                  <el-input v-model="editor.imapUsername" placeholder="例如 1300487655@qq.com" />
                </el-form-item>
                <el-form-item :label="editingId ? '密码（留空表示保持原值）' : '密码'">
                  <el-input v-model="editor.imapPassword" type="password" show-password placeholder="填写授权码" />
                </el-form-item>
              </div>
              <div class="settings-editor-tip">
                建议使用邮箱授权码，而不是网页登录密码。编辑已有配置时，密码留空即可保留原值。
              </div>
              <div class="form-actions provider-editor-actions">
                <el-button type="primary" :loading="tempMailStore.isSavingProviderConfig" @click="saveProviderConfig">
                  {{ editingId ? '保存配置' : '添加配置' }}
                </el-button>
              </div>
            </el-form>
          </el-card>
        </section>

        <section class="settings-notice-stack">
          <el-alert
            type="warning"
            :closable="false"
            title="如果你修改实际接收邮箱，必须同步修改 Cloudflare 邮件转发，否则新邮箱不会真正收到邮件。"
            show-icon
          />
          <el-alert
            type="info"
            :closable="false"
            title="工作台现在支持通过 Select 选择当前使用的邮箱配置；新生成邮箱会绑定到该配置。"
            show-icon
          />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useTempMailStore, type ProviderConfig } from '../stores/tempMail';

const tempMailStore = useTempMailStore();
const editingId = ref<number | null>(null);

const form = reactive({
  domainSuffix: '@770733914.xyz',
  pollIntervalSeconds: 10,
  selectedProviderConfigId: null as number | null,
});

const editor = reactive({
  name: '',
  forwardToEmail: '',
  imapHost: 'imap.qq.com',
  imapPort: 993,
  imapUsername: '',
  imapPassword: '',
});

const defaultConfigName = computed(() => {
  const current = tempMailStore.providerConfigs.find((item) => item.id === form.selectedProviderConfigId) || tempMailStore.providerConfigs.find((item) => item.is_default);
  return current ? `${current.name} · ${current.forward_to_email}` : '未选择';
});

const resetEditor = () => {
  editingId.value = null;
  editor.name = '';
  editor.forwardToEmail = '';
  editor.imapHost = 'imap.qq.com';
  editor.imapPort = 993;
  editor.imapUsername = '';
  editor.imapPassword = '';
};

const fillEditForm = (item: ProviderConfig) => {
  editingId.value = item.id;
  editor.name = item.name;
  editor.forwardToEmail = item.forward_to_email;
  editor.imapHost = item.imap_host;
  editor.imapPort = item.imap_port;
  editor.imapUsername = item.imap_username;
  editor.imapPassword = '';
};

const saveBaseSettings = async () => {
  await tempMailStore.saveSettings(form);
  ElMessage.success('基础设置已保存');
};

const saveProviderConfig = async () => {
  if (editingId.value) {
    await tempMailStore.updateProviderConfig(editingId.value, editor);
    ElMessage.success('邮箱配置已更新');
  } else {
    const created = await tempMailStore.addProviderConfig(editor);
    ElMessage.success('邮箱配置已添加');
    if (!form.selectedProviderConfigId && created?.id) {
      form.selectedProviderConfigId = created.id;
    }
  }
  await tempMailStore.loadSettings();
  form.selectedProviderConfigId = tempMailStore.selectedProviderConfigId;
  resetEditor();
};

const chooseDefault = async (id: number) => {
  await tempMailStore.selectProviderConfig(id);
  form.selectedProviderConfigId = id;
  ElMessage.success('默认邮箱配置已切换');
};

const removeConfig = async (id: number) => {
  await ElMessageBox.confirm('删除后此邮箱配置将不可继续用于新邮箱生成，确认删除？', '删除邮箱配置', {
    type: 'warning',
  });
  await tempMailStore.deleteProviderConfig(id);
  form.selectedProviderConfigId = tempMailStore.selectedProviderConfigId;
  if (editingId.value === id) {
    resetEditor();
  }
  ElMessage.success('邮箱配置已删除');
};

onMounted(async () => {
  const settings = await tempMailStore.loadSettings();
  await tempMailStore.loadProviderConfigs();
  form.domainSuffix = settings.domain_suffix;
  form.pollIntervalSeconds = settings.poll_interval_seconds;
  form.selectedProviderConfigId = settings.selected_provider_config_id || tempMailStore.selectedProviderConfigId;
});
</script>
