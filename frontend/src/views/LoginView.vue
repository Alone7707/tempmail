<template>
  <div class="auth-shell auth-shell-login auth-shell-refined">
    <div class="auth-background-glow auth-background-glow-left"></div>
    <div class="auth-background-glow auth-background-glow-right"></div>

    <main class="auth-panel-wrap auth-panel-wrap-wide">
      <section class="auth-split-layout">
        <div class="auth-copy-panel">
          <div class="auth-brand-mark">∞</div>
          <div class="section-kicker">Secure Temporary Inbox</div>
          <h1>登录无限邮箱</h1>
          <p>深色控制台式临时邮箱系统。支持多邮箱配置、真实 IMAP 收件、历史会话回切。</p>
          <div class="auth-feature-list">
            <div class="auth-feature-item"><span>01</span><strong>多配置切换</strong></div>
            <div class="auth-feature-item"><span>02</span><strong>真实 IMAP 同步</strong></div>
            <div class="auth-feature-item"><span>03</span><strong>历史邮箱回切</strong></div>
          </div>
        </div>

        <section class="auth-panel auth-panel-login auth-panel-rich">
          <div class="auth-panel-head">
            <h2>欢迎回来</h2>
            <p>输入账号后进入你的临时邮箱工作台。</p>
          </div>

          <el-form :model="form" @submit.prevent="handleLogin" class="auth-form-modern auth-form-rich">
            <el-form-item>
              <el-input v-model="form.account" placeholder="用户名 / 邮箱" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
            </el-form-item>
            <el-button type="primary" class="full-width auth-submit-btn" size="large" @click="handleLogin">登录系统</el-button>
            <div class="auth-inline-tip auth-inline-tip-card">默认演示账号：demo / 123456</div>
            <div class="auth-actions">
              <RouterLink to="/register">还没有账号？去注册</RouterLink>
            </div>
          </el-form>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const form = reactive({
  account: 'demo',
  password: '123456',
});

const handleLogin = async () => {
  try {
    await authStore.login(form.account, form.password);
    ElMessage.success('登录成功');
    router.push('/app');
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '登录失败');
  }
};
</script>
