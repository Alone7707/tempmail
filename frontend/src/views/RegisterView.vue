<template>
  <div class="auth-shell auth-shell-register auth-shell-refined">
    <div class="auth-background-glow auth-background-glow-left"></div>
    <div class="auth-background-glow auth-background-glow-right"></div>

    <main class="auth-panel-wrap auth-panel-wrap-wide">
      <section class="auth-split-layout">
        <div class="auth-copy-panel">
          <div class="auth-brand-mark">∞</div>
          <div class="section-kicker">Create Account</div>
          <h1>创建新的无限邮箱账户</h1>
          <p>注册后即可进入完整控制台，管理多个真实邮箱配置，并生成可轮询同步的临时地址。</p>
          <div class="auth-feature-list">
            <div class="auth-feature-item"><span>01</span><strong>冷感终端界面</strong></div>
            <div class="auth-feature-item"><span>02</span><strong>真实邮件接收链路</strong></div>
            <div class="auth-feature-item"><span>03</span><strong>历史会话持续可追溯</strong></div>
          </div>
        </div>

        <section class="auth-panel auth-panel-register auth-panel-rich">
          <div class="auth-panel-head">
            <h2>开始使用</h2>
            <p>创建一个账户，然后立即进入你的收件控制中心。</p>
          </div>

          <el-form :model="form" @submit.prevent="handleRegister" class="auth-form-modern auth-form-rich">
            <el-form-item>
              <el-input v-model="form.username" placeholder="用户名" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.email" placeholder="注册邮箱" size="large" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.password" type="password" placeholder="设置密码" size="large" show-password />
            </el-form-item>
            <el-button type="primary" class="full-width auth-submit-btn" size="large" @click="handleRegister">创建账号</el-button>
            <div class="auth-actions">
              <RouterLink to="/login">已有账号？去登录</RouterLink>
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
  username: '',
  email: '',
  password: '',
});

const handleRegister = async () => {
  try {
    await authStore.register(form.username, form.email, form.password);
    ElMessage.success('注册成功');
    router.push('/app');
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '注册失败');
  }
};
</script>
