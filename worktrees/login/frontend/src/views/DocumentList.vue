<template>
  <div class="doc-list">
    <div class="layout">
      <aside class="sidebar">
        <el-card shadow="never" class="side-card">
          <div class="side-title">知识分类</div>
          <CategoryTree
            v-if="tree.length"
            :tree="tree"
            :active-id="activeId"
            @select="selectCategory"
            @sort="onSort"
          />
          <div v-else-if="!loading" class="empty-tip">暂无分类</div>
        </el-card>
      </aside>

      <main class="content">
        <el-card shadow="never" class="list-card">
          <div class="list-head">
            <h2 class="page-title">{{ categoryTitle }}</h2>
            <el-input
              v-model="searchKw"
              placeholder="按标题搜索"
              clearable
              class="kw-input"
              @keyup.enter="loadDocs"
            >
              <template #append>
                <el-button @click="loadDocs">搜索</el-button>
              </template>
            </el-input>
          </div>

          <p v-if="docs.length === 0" class="empty-tip">暂无文档</p>

          <ul v-else class="doc-list-items">
            <li v-for="d in docs" :key="d.id" class="doc-row">
              <router-link :to="`/read/${d.id}`" class="doc-row-title">{{ d.title }}</router-link>
              <p class="doc-row-meta">
                <span>{{ categoryName(d.category_id) }}</span>
                <span v-if="d.tags"> · {{ d.tags }}</span>
                <span> · 阅读 {{ d.read_count }} 次</span>
              </p>
            </li>
          </ul>
        </el-card>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet } from '../api/client';
import CategoryTree from '../components/CategoryTree.vue';
import type { CategoryNode } from '../stores/catalog';

interface Doc {
  id: number;
  category_id: number;
  title: string;
  content_html: string;
  tags: string;
  read_count: number;
  status: string;
}

const tree = ref<CategoryNode[]>([]);
const docs = ref<Doc[]>([]);
const activeId = ref<number | null>(null);
const loading = ref(false);
const searchKw = ref('');

const categoryTitle = computed(() => {
  if (!activeId.value) return '全部文档';
  const f = flatten(tree.value).find((n) => n.id === activeId.value);
  return f ? f.name : '全部文档';
});

onMounted(async () => {
  loading.value = true;
  try {
    tree.value = (await apiGet<CategoryNode[]>('/api/categories/tree')) || [];
  } finally {
    loading.value = false;
  }
  await loadDocs();
});

function flatten(nodes: CategoryNode[], parent = ''): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const n of nodes) {
    const item = { ...n, name: parent && n.name ? `${parent}/${n.name}` : n.name };
    out.push(item);
    if (n.children) out.push(...flatten(n.children, item.name));
  }
  return out;
}

async function loadDocs() {
  const q = new URLSearchParams({ view: 'published' });
  if (activeId.value) q.set('categoryId', String(activeId.value));
  if (searchKw.value.trim()) q.set('q', searchKw.value.trim());
  docs.value = (await apiGet<Doc[]>(`/api/documents?${q}`)) || [];
}

function selectCategory(id: number) {
  activeId.value = id;
  loadDocs();
}

function onSort() {
  loadDocs();
}

function categoryName(id: number): string {
  return flatten(tree.value).find((n) => n.id === id)?.name ?? '-';
}
</script>

<style scoped>
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.sidebar {
  width: 260px;
  flex-shrink: 0;
}
.side-card,
.list-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-secondary);
  margin-bottom: 10px;
}
.content {
  flex: 1;
  min-width: 0;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.kw-input {
  width: 300px;
}
.doc-list-items {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
}
.doc-row {
  padding: 14px 4px;
  border-bottom: 1px solid var(--app-border);
}
.doc-row:last-child {
  border-bottom: none;
}
.doc-row-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--app-text);
}
.doc-row-title:hover {
  color: var(--el-color-primary);
}
.doc-row-meta {
  color: var(--app-text-secondary);
  font-size: 13px;
  margin-top: 4px;
}

@media (max-width: 900px) {
  .layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
  }
  .kw-input {
    width: 100%;
  }
}
</style>