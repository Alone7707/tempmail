<template>
  <div class="simple-page">
    <el-page-header content="邮箱历史" @back="$router.push('/app')" />
    <el-card shadow="never" class="simple-card">
      <div class="history-list" v-if="tempMailStore.history.length">
        <div class="history-item" v-for="item in tempMailStore.history" :key="item.id">
          <div>
            <strong>{{ item.address }}</strong>
            <div class="mail-item-meta">创建时间：{{ formatTime(item.created_at) }}</div>
            <div class="mail-item-meta">过期时间：{{ formatTime(item.expires_at) }}</div>
          </div>
          <div>
            <el-tag :type="item.is_active ? 'success' : 'info'">{{ item.is_active ? '当前使用中' : '历史地址' }}</el-tag>
            <el-tag class="history-tag" :type="item.source_type === 'imap' ? 'success' : 'warning'">{{ item.source_type }}</el-tag>
          </div>
        </div>
      </div>
      <el-empty v-else description="还没有历史邮箱记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTempMailStore } from '../stores/tempMail';

const tempMailStore = useTempMailStore();
const formatTime = (value?: string) => value ? new Date(value).toLocaleString() : '-';

onMounted(async () => {
  await tempMailStore.loadHistory();
});
</script>
