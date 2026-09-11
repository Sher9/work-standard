<template>
  <el-card shadow="never" class="fav-card">
    <h2 class="page-title">我的收藏</h2>

    <div v-if="loaded && items.length === 0" class="empty-tip">暂无收藏</div>

    <ul v-else-if="items.length" class="fav-list">
      <li v-for="f in items" :key="f.document_id" class="fav-item">
        <router-link :to="`/read/${f.document_id}`" class="fav-title">{{ f.title }}</router-link>
        <el-button
          class="remove-btn"
          :data-fav-remove="String(f.document_id)"
          size="small"
          @click="remove(f)"
        >
          取消收藏
        </el-button>
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiDelete } from '../api/client';

interface FavoriteItem {
  id: number;
  document_id: number;
  title?: string;
  category_id?: number;
  status?: string;
  read_count?: number;
}

const items = ref<FavoriteItem[]>([]);
const loaded = ref(false);

onMounted(load);

async function load() {
  items.value = (await apiGet<FavoriteItem[]>('/api/favorites')) || [];
  loaded.value = true;
}

async function remove(f: FavoriteItem) {
  await apiDelete(`/api/favorites/${f.document_id}`);
  items.value = items.value.filter((x) => x.document_id !== f.document_id);
}
</script>

<style scoped>
.fav-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.fav-list {
  list-style: none;
  padding: 0;
}
.fav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
  border-bottom: 1px solid var(--app-border);
}
.fav-item:last-child {
  border-bottom: none;
}
.fav-title {
  color: var(--el-color-primary);
  font-size: 16px;
}
.fav-title:hover {
  text-decoration: underline;
}
</style>