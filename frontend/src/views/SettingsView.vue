<template>
  <div class="simple-page">
    <el-page-header content="系统设置" @back="$router.push('/app')" />
    <el-card shadow="never" class="simple-card">
      <el-form label-position="top">
        <el-form-item label="邮箱后缀">
          <el-input v-model="form.domainSuffix" placeholder="例如 @770733914.xyz" />
        </el-form-item>
        <el-form-item label="实际接收邮箱">
          <el-input v-model="form.forwardToEmail" placeholder="例如 1300487655@qq.com" />
        </el-form-item>
        <el-form-item label="轮询间隔（秒）">
          <el-input-number v-model="form.pollIntervalSeconds" :min="5" :max="300" />
        </el-form-item>

        <el-divider>IMAP 收件配置</el-divider>
        <el-form-item label="IMAP_HOST">
          <el-input v-model="form.imapHost" placeholder="例如 imap.qq.com" />
        </el-form-item>
        <el-form-item label="IMAP_PORT">
          <el-input-number v-model="form.imapPort" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="IMAP_USERNAME">
          <el-input v-model="form.imapUsername" placeholder="例如 1300487655@qq.com" />
        </el-form-item>
        <el-form-item label="IMAP_PASSWORD">
          <el-input v-model="form.imapPassword" type="password" show-password placeholder="填写授权码；留空表示保持原值" />
        </el-form-item>

        <el-alert
          type="warning"
          :closable="false"
          title="如果你修改实际接收邮箱，必须同步修改 Cloudflare 邮件转发，否则新邮箱不会真正收到邮件。"
          show-icon
        />
        <el-alert
          class="mt-12"
          type="info"
          :closable="false"
          title="只有配置完整 IMAP 后，系统才会从真实收件箱同步邮件；否则仍使用演示模式。"
          show-icon
        />
        <div class="form-actions">
          <el-button type="primary" @click="save">保存配置</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useTempMailStore } from '../stores/tempMail';

const tempMailStore = useTempMailStore();
const form = reactive({
  domainSuffix: '@770733914.xyz',
  forwardToEmail: '1300487655@qq.com',
  pollIntervalSeconds: 10,
  imapHost: 'imap.qq.com',
  imapPort: 993,
  imapUsername: '',
  imapPassword: '',
});

const save = async () => {
  await tempMailStore.saveSettings(form);
  ElMessage.success('设置已保存');
};

onMounted(async () => {
  const settings = await tempMailStore.loadSettings();
  form.domainSuffix = settings.domain_suffix;
  form.forwardToEmail = settings.forward_to_email;
  form.pollIntervalSeconds = settings.poll_interval_seconds;
  form.imapHost = settings.imap_host || 'imap.qq.com';
  form.imapPort = settings.imap_port || 993;
  form.imapUsername = settings.imap_username || '';
  form.imapPassword = '';
});
</script>
