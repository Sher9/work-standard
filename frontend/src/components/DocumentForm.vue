<template>
  <div class="form-card">
    <form class="doc-form" @submit.prevent="onSubmit">
      <div class="field">
        <label>标题 <span class="required">*</span></label>
        <input
          data-field="title"
          v-model="title"
          type="text"
          :class="{ invalid: error }"
          placeholder="请输入文档标题"
          @input="error = ''"
        />
        <span v-if="error" class="field-error">{{ error }}</span>
      </div>

      <div class="field">
        <label>分类</label>
        <select data-field="categoryId" v-model.number="categoryId" class="form-select">
          <option :value="''">未分类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="field">
        <label>状态</label>
        <select data-field="status" v-model="status" class="form-select">
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      <div class="field">
        <label>文档内容 <span class="required">*</span></label>
        <div class="content-tabs" data-field="contentType">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: contentType === 'html' }"
            data-content-type="html"
            @click="contentType = 'html'"
          >
            富文本编辑
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: contentType === 'pdf' }"
            data-content-type="pdf"
            @click="contentType = 'pdf'"
          >
            上传 PDF
          </button>
        </div>

        <div v-if="contentType === 'html'" class="editor">
          <div class="editor-toolbar">
            <button
              v-for="item in toolbar"
              :key="item.label"
              type="button"
              class="tool-btn"
              :data-editor="item.cmd"
              @click="execCommand(item.cmd, item.value)"
            >
              {{ item.label }}
            </button>
          </div>
          <div
            ref="editorEl"
            class="editor-area"
            contenteditable="true"
            data-field="contentHtml"
            @input="syncFromEditor"
            @blur="syncFromEditor"
          />
        </div>

        <div v-else class="pdf-field">
          <input
            type="file"
            accept="application/pdf,.pdf"
            class="pdf-input"
            data-field="pdf"
            @change="onPickPdf"
          />
          <p v-if="uploading" class="upload-tip">正在上传…</p>
          <div v-else-if="fileId" class="pdf-file" data-pdf-file="1">
            <span class="pdf-name">已上传 PDF：{{ fileName || `文件 #${fileId}` }}</span>
            <a
              class="pdf-link"
              :href="filePreviewUrl(fileId) ?? '#'"
              target="_blank"
              rel="noopener"
            >
              预览
            </a>
            <button type="button" class="pdf-remove" data-pdf-remove="1" @click="removePdf">
              移除
            </button>
          </div>
          <p v-else class="upload-tip">请选择 PDF 文件（单个不超过 20MB）</p>
          <p v-if="uploadError" class="field-error" data-pdf-error="1">{{ uploadError }}</p>
        </div>
      </div>

      <div class="field">
        <label>标签</label>
        <input data-field="tags" v-model="tags" type="text" placeholder="多个标签用逗号分隔" />
      </div>

      <div class="field">
        <label>作者</label>
        <input data-field="authorId" v-model="authorId" type="text" placeholder="员工编号，如 E10001" />
      </div>

      <div class="actions">
        <el-button type="primary" native-type="submit">{{ initial?.id ? '保存' : '新增' }}</el-button>
        <el-button v-if="initial?.id" @click="$emit('cancel')">取消</el-button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { apiUpload, filePreviewUrl } from '../api/client';
import type { CategoryNode } from '../stores/catalog';

interface UploadedFile {
  id: number;
  filename: string;
  mime_type: string | null;
}

const props = defineProps<{
  categories: Pick<CategoryNode, 'id' | 'name'>[];
  initial?: {
    id?: number;
    title?: string;
    categoryId?: number | null;
    content?: string;
    contentHtml?: string;
    fileId?: number | null;
    tags?: string;
    authorId?: string | null;
    status?: string;
  };
}>();

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, unknown>): void;
  (e: 'cancel'): void;
}>();

const toolbar = [
  { label: '加粗', cmd: 'bold' },
  { label: '斜体', cmd: 'italic' },
  { label: '下划线', cmd: 'underline' },
  { label: '标题', cmd: 'formatBlock', value: '<h3>' },
  { label: '正文', cmd: 'formatBlock', value: '<p>' },
  { label: '无序列表', cmd: 'insertUnorderedList' },
  { label: '有序列表', cmd: 'insertOrderedList' },
  { label: '清除格式', cmd: 'removeFormat' },
];

const title = ref(props.initial?.title ?? '');
const categoryId = ref<number | ''>(props.initial?.categoryId ?? '');
const contentHtml = ref(props.initial?.contentHtml ?? props.initial?.content ?? '');
const fileId = ref<number | null>(props.initial?.fileId ?? null);
const fileName = ref('');
const contentType = ref<'html' | 'pdf'>(fileId.value ? 'pdf' : 'html');
const tags = ref(props.initial?.tags ?? '');
const authorId = ref(props.initial?.authorId ?? '');
const status = ref<string>(props.initial?.status ?? 'draft');
const error = ref('');

const editorEl = ref<HTMLElement | null>(null);
const uploading = ref(false);
const uploadError = ref('');

onMounted(() => {
  fillEditor();
});

watch(contentHtml, () => {
  if (editorEl.value && editorEl.value.innerHTML !== contentHtml.value) fillEditor();
});

function fillEditor() {
  if (editorEl.value) editorEl.value.innerHTML = contentHtml.value;
}

function syncFromEditor() {
  contentHtml.value = editorEl.value?.innerHTML ?? '';
}

function execCommand(cmd: string, value?: string) {
  editorEl.value?.focus();
  try {
    // execCommand 已废弃但仍是零依赖实现富文本的最简方式，jsdom 下不存在需兜底
    (document as unknown as { execCommand?: (c: string, s?: boolean, v?: string) => boolean })
      .execCommand?.(cmd, false, value);
  } catch {
    /* 浏览器不支持时忽略 */
  }
  syncFromEditor();
}

async function onPickPdf(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    uploadError.value = '仅支持上传 PDF 文件';
    input.value = '';
    return;
  }
  uploading.value = true;
  uploadError.value = '';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const uploaded = await apiUpload<UploadedFile>('/api/files/upload', fd);
    fileId.value = uploaded.id;
    fileName.value = uploaded.filename;
  } catch (err: any) {
    uploadError.value = err?.message || '上传失败，请重试';
  } finally {
    uploading.value = false;
    input.value = '';
  }
}

function removePdf() {
  fileId.value = null;
  fileName.value = '';
  uploadError.value = '';
}

function onSubmit() {
  if (!title.value.trim()) {
    error.value = '标题为必填项';
    return;
  }
  const usePdf = contentType.value === 'pdf';
  if (usePdf && !fileId.value) {
    uploadError.value = '请上传 PDF 文件';
    return;
  }
  emit('submit', {
    title: title.value.trim(),
    categoryId: categoryId.value === '' ? null : categoryId.value,
    // 两种内容方式互斥：PDF 正文时富文本置空，反之清除文件关联
    contentHtml: usePdf ? '' : contentHtml.value,
    fileId: usePdf ? fileId.value : null,
    tags: tags.value,
    authorId: authorId.value,
    status: status.value,
  });
  if (!props.initial?.id) {
    title.value = '';
    contentHtml.value = '';
    fileId.value = null;
    fileName.value = '';
    nextTick(fillEditor);
  }
}
</script>

<style scoped>
.form-card {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  padding: 20px;
  margin: 12px 0 8px;
  background: #fafbfc;
}
.field {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}
.required {
  color: #f56c6c;
}
.field input,
.field select,
.field textarea {
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  background: #fff;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--el-color-primary);
}
.field-error {
  color: #f56c6c;
  font-size: 12px;
}
input.invalid {
  border-color: #f56c6c;
}
.content-tabs {
  display: inline-flex;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  overflow: hidden;
  width: fit-content;
  background: #fff;
}
.tab-btn {
  border: none;
  background: transparent;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--app-text);
}
.tab-btn.active {
  background: var(--el-color-primary);
  color: #fff;
}
.editor {
  border: 1px solid var(--app-border);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid var(--app-border);
  background: #f7f8fa;
}
.tool-btn {
  border: 1px solid var(--app-border);
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  padding: 3px 8px;
  cursor: pointer;
}
.tool-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
.editor-area {
  min-height: 160px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
}
.editor-area:focus {
  outline: none;
}
.pdf-field {
  border: 1px dashed var(--app-border);
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}
.pdf-input {
  font-size: 13px;
}
.upload-tip {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}
.pdf-file {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
}
.pdf-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pdf-link {
  color: var(--el-color-primary);
}
.pdf-remove {
  border: none;
  background: transparent;
  color: var(--el-color-danger, #f56c6c);
  cursor: pointer;
  font-size: 13px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
textarea {
  resize: vertical;
}
</style>
