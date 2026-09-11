<template>
  <div class="doc-versions">
    <h3 class="versions-title">文档版本</h3>

    <button v-if="canCreate" class="add-version" data-action="add-version" @click="create">
      新增版本
    </button>

    <p v-if="message" class="v-msg">{{ message }}</p>

    <ul v-if="versions.length" class="version-list">
      <li v-for="v in versions" :key="v.id" class="version-item">
        <span class="v-no">V{{ v.version_no }}</span>
        <span class="v-summary">{{ v.change_summary || '（无说明）' }}</span>
        <span class="v-meta">编辑者：{{ v.editor_id || '-' }}</span>
        <button :data-version-del="String(v.id)" @click="remove(v.id)">删除</button>
      </li>
    </ul>
    <p v-else-if="loaded" class="v-empty">暂无版本记录</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiGet, apiPost, apiDelete } from '../api/client';

interface VersionRow {
  id: number;
  version_no: number;
  content_snapshot: string;
  change_summary: string;
  editor_id: string | null;
  created_at: string;
}

const props = defineProps<{
  documentId: number;
  canCreate?: boolean;
}>();

const versions = ref<VersionRow[]>([]);
const loaded = ref(false);
const message = ref('');

onMounted(load);

async function load() {
  versions.value = (await apiGet<VersionRow[]>(`/api/documents/${props.documentId}/versions`)) || [];
  loaded.value = true;
}

async function create() {
  try {
    await apiPost(`/api/documents/${props.documentId}/versions`, { changeSummary: '新增版本' });
    message.value = '已新增版本';
    await load();
  } catch (e: any) {
    message.value = e?.message || '操作失败';
  }
}

async function remove(id: number) {
  try {
    await apiDelete(`/api/documents/${props.documentId}/versions/${id}`);
    message.value = '已删除版本';
    await load();
  } catch (e: any) {
    message.value = e?.message || '删除失败';
  }
}
</script>

<style scoped>
.doc-versions {
  margin-top: 24px;
  border-top: 1px solid #dfe1e5;
  padding-top: 16px;
}
.versions-title {
  font-size: 16px;
  margin: 0 0 8px;
}
.add-version {
  margin-bottom: 8px;
}
.version-list {
  list-style: none;
  padding: 0;
}
.version-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed #eee;
}
.v-no {
  font-weight: 600;
  min-width: 40px;
}
.v-summary {
  flex: 1;
  color: #3c4043;
}
.v-meta {
  color: #5f6368;
  font-size: 12px;
}
.v-empty {
  color: #5f6368;
}
.v-msg {
  color: #1a73e8;
  font-size: 13px;
}
</style>