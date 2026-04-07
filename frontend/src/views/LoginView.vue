<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-hero">
        <span class="eyebrow">TEMP MAIL</span>
        <h1>登录临时邮箱控制台</h1>
        <p>默认演示账号：demo / 123456</p>
      </div>
      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.account" placeholder="用户名或邮箱" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" class="full-width" size="large" @click="handleLogin">登录</el-button>
        <div class="auth-actions">
          <RouterLink to="/register">还没有账号？去注册</RouterLink>
        </div>
      </el-form>
    </div>
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
