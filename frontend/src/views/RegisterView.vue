<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-hero">
        <span class="eyebrow">CREATE ACCOUNT</span>
        <h1>注册 TempMail 账号</h1>
        <p>先做本地账号体系，后面再接真实邮件拉取。</p>
      </div>
      <el-form :model="form" @submit.prevent="handleRegister">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.email" placeholder="邮箱" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-button type="primary" class="full-width" size="large" @click="handleRegister">注册并登录</el-button>
        <div class="auth-actions">
          <RouterLink to="/login">已有账号？去登录</RouterLink>
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
