<template>
  <div class="doc-read">
    <template v-if="doc">
      <el-card shadow="never" class="read-card">
        <div class="read-head">
          <h1 class="doc-title">{{ doc.title }}</h1>
          <el-button
            class="fav-btn"
            :class="{ active: isFav }"
            :type="isFav ? 'warning' : 'default'"
            :data-fav="String(doc.id)"
            size="small"
            circle
            @click="toggleFav"
          >
            <el-icon><StarFilled v-if="isFav" /><Star v-else /></el-icon>
          </el-button>
        </div>
        <p class="doc-meta">
          <span>阅读次数：{{ doc.read_count }}</span>
        </p>

        <PdfPreview v-if="isPdf" :src="pdfSrc" />
        <div v-else class="doc-content" v-html="doc.content_html" />
      </el-card>

      <DocumentVersions v-if="doc.id" :document-id="doc.id" class="read-versions" />
    </template>
    <el-skeleton v-else animated :rows="8" class="read-loading" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPost, apiDelete } from '../api/client';
import PdfPreview from '../components/PdfPreview.vue';
import { filePreviewUrl } from '../api/client';
import DocumentVersions from '../components/DocumentVersions.vue';

interface Doc {
  id: number;
  category_id: number;
  title: string;
  content_html: string;
  file_id: number | null;
  read_count: number;
}
interface FavoriteRow {
  id: number;
  document_id: number;
}

const props = defineProps<{ id: number }>();

const doc = ref<Doc | null>(null);
const favIds = ref<number[]>([]);
const isFav = computed(() => (doc.value ? favIds.value.includes(doc.value.id) : false));
const isPdf = computed(() => {
  const d = doc.value;
  return !!d && !d.content_html && !!d.file_id;
});
const pdfSrc = computed(() => filePreviewUrl(doc.value?.file_id));

onMounted(load);

async function load() {
  doc.value = await apiGet<Doc>(`/api/documents/${props.id}/read`);
  const favs = (await apiGet<FavoriteRow[]>('/api/favorites')) || [];
  favIds.value = favs.map((f) => f.document_id);
}

async function toggleFav() {
  const d = doc.value;
  if (!d) return;
  if (isFav.value) {
    await apiDelete(`/api/favorites/${d.id}`);
    favIds.value = favIds.value.filter((x) => x !== d.id);
  } else {
    await apiPost('/api/favorites', { documentId: d.id });
    favIds.value = [...favIds.value, d.id];
  }
}
</script>

<style scoped>
.doc-read {
  max-width: 860px;
  margin: 0 auto;
}
.read-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.read-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.doc-title {
  font-size: 22px;
  line-height: 1.4;
  margin: 4px 0;
}
.fav-btn {
  margin-top: 4px;
}
.doc-meta {
  color: var(--app-text-secondary);
  font-size: 13px;
  margin-top: 4px;
}
.doc-content {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
  line-height: 1.8;
  color: var(--app-text);
}
.read-versions {
  margin-top: 16px;
}
.read-loading {
  margin-top: 16px;
}
</style>