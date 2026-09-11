<template>
  <el-card shadow="never" class="search-card">
    <h2 class="page-title">全文搜索</h2>

    <form class="search-form" @submit.prevent="doSearch">
      <div class="search-bar">
        <span class="prefix"><el-icon><Search /></el-icon></span>
        <input
          data-field="q"
          v-model="q"
          type="text"
          placeholder="输入关键词检索文档"
          class="search-input"
        />
        <el-button type="primary" native-type="submit" class="search-btn">搜索</el-button>
      </div>
    </form>

    <div v-if="searched && results.length === 0" class="empty-tip">无结果</div>

    <ul v-if="results.length" class="result-list">
      <li v-for="r in results" :key="r.id" class="result-item">
        <router-link :to="`/read/${r.id}`" class="result-title">{{ r.title }}</router-link>
        <p class="result-snippet">
          <SearchHighlight :content="r.highlight || r.content_html" />
        </p>
      </li>
    </ul>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { apiGet } from '../api/client';
import SearchHighlight from '../components/SearchHighlight.vue';

interface SearchResult {
  id: number;
  title: string;
  content_html: string;
  category_id: number;
  read_count: number;
  highlight?: string;
}

const q = ref('');
const results = ref<SearchResult[]>([]);
const searched = ref(false);

async function doSearch() {
  const keyword = q.value.trim();
  if (!keyword) return;
  const params = new URLSearchParams({ q: keyword });
  results.value = (await apiGet<SearchResult[]>(`/api/documents/search?${params}`)) || [];
  searched.value = true;
}
</script>

<style scoped>
.search-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.search-form {
  margin-bottom: 8px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  padding: 2px 4px;
  background: #fff;
  transition: border-color 0.2s;
}
.search-bar:focus-within {
  border-color: var(--el-color-primary);
}
.prefix {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  color: var(--app-text-secondary);
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px 4px;
  font-size: 14px;
  background: transparent;
}
.search-btn {
  padding: 8px 20px;
}
.result-list {
  list-style: none;
  padding: 0;
  margin-top: 16px;
}
.result-item {
  padding: 14px 4px;
  border-bottom: 1px solid var(--app-border);
}
.result-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
}
.result-title:hover {
  text-decoration: underline;
}
.result-snippet {
  color: var(--app-text-secondary);
  font-size: 13px;
  margin-top: 4px;
}
</style>