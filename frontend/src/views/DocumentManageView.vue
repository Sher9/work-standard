<template>
  <el-card shadow="never" class="manage-card">
    <div class="manage-head">
      <h2 class="page-title">文档维护</h2>
      <div class="head-right">
        <select v-model="statusFilter" class="status-filter" data-field="statusFilter">
          <option value="">全部状态</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ statusText(s) }}</option>
        </select>
        <el-button type="primary" :data-action="'add'" @click="openCreate">
          <el-icon><Plus /></el-icon>&nbsp;新增文档
        </el-button>
      </div>
    </div>

    <el-drawer
      v-model="formVisible"
      :title="editing?.id ? '编辑文档' : '新增文档'"
      size="640px"
      :close-on-click-modal="false"
    >
      <DocumentForm
        v-if="formVisible"
        :categories="categories"
        :initial="editing ?? undefined"
        @submit="onFormSubmit"
        @cancel="formVisible = false"
      />
    </el-drawer>

    <el-drawer v-model="previewVisible" :title="previewDoc?.title ?? '文档预览'" size="720px">
      <PdfPreview v-if="previewIsPdf" :src="previewSrc" />
      <div v-else class="preview-content" v-html="previewDoc?.content_html" />
    </el-drawer>

    <p v-if="message" class="msg" :class="{ error: messageIsError }">{{ message }}</p>

    <table v-if="filteredDocs.length" class="doc-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>分类</th>
          <th>内容</th>
          <th>阅读</th>
          <th>状态</th>
          <th>流转操作</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in filteredDocs" :key="d.id">
          <td class="title-cell">
            <a class="title-link" :data-doc-preview="String(d.id)" @click="openPreview(d)">{{ d.title }}</a>
          </td>
          <td>{{ categoryName(d.category_id) }}</td>
          <td>{{ d.file_id ? 'PDF' : '富文本' }}</td>
          <td>{{ d.read_count }}</td>
          <td>
            <el-tag :type="statusTagType(d.status)" size="small">{{ statusText(d.status) }}</el-tag>
          </td>
          <td class="ops-cell">
            <template v-if="docActions(d.status).length">
              <el-button
                v-for="a in docActions(d.status)"
                :key="a.action"
                size="small"
                :type="a.type"
                :data-doc-action="a.action"
                :data-doc-id="String(d.id)"
                @click="openFlow(d, a)"
              >
                {{ a.label }}
              </el-button>
            </template>
            <span v-else class="no-action">—</span>
          </td>
          <td class="ops-cell">
            <el-button size="small" :data-doc-logs="String(d.id)" @click="openLogs(d)">
              记录
            </el-button>
            <el-button size="small" @click="openEdit(d)">编辑</el-button>
            <el-button :data-doc-delete="String(d.id)" size="small" type="danger" plain @click="remove(d)">
              删除
            </el-button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty-tip">暂无文档</p>

    <!-- 状态流转：填写处理意见 -->
    <div v-if="flowDialog" class="modal-mask" @click.self="closeFlow">
      <div class="modal" data-flow-dialog="1">
        <h3 class="modal-title">{{ flowAction?.label }}：{{ flowDoc?.title }}</h3>
        <p class="modal-desc">
          {{ statusText(flowDoc?.status ?? '') }} → {{ statusText(flowAction?.to ?? '') }}
        </p>
        <label class="modal-label" for="flow-comment">
          处理意见
          <span v-if="flowAction?.requireComment" class="required">*</span>
        </label>
        <textarea
          id="flow-comment"
          v-model="flowComment"
          class="modal-textarea"
          rows="4"
          data-field="flow-comment"
          placeholder="请填写处理意见"
        />
        <p v-if="flowError" class="modal-error" data-flow-error="1">{{ flowError }}</p>
        <div class="modal-actions">
          <el-button size="small" @click="closeFlow">取消</el-button>
          <el-button
            size="small"
            type="primary"
            data-flow-submit="1"
            :loading="flowSaving"
            @click="submitFlow"
          >
            确定
          </el-button>
        </div>
      </div>
    </div>

    <!-- 状态流转记录 -->
    <div v-if="logDialog" class="modal-mask" @click.self="logDialog = false">
      <div class="modal" data-log-dialog="1">
        <h3 class="modal-title">状态流转记录：{{ logDoc?.title }}</h3>
        <ul v-if="logs.length" class="log-list">
          <li v-for="l in logs" :key="l.id" class="log-item" data-log-item="1">
            <div class="log-head">
              <span class="log-action">{{ actionLabel(l.action) }}</span>
              <span class="log-trans">
                {{ l.from_status ? statusText(l.from_status) : '—' }} → {{ statusText(l.to_status) }}
              </span>
              <span class="log-time">{{ formatTime(l.created_at) }}</span>
            </div>
            <p class="log-comment">处理意见：{{ l.comment || '（无）' }}</p>
            <p class="log-operator">操作人：{{ l.operator_id || '-' }}</p>
          </li>
        </ul>
        <p v-else class="empty-tip">暂无流转记录</p>
        <div class="modal-actions">
          <el-button size="small" @click="logDialog = false">关闭</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPost, apiPut, apiDelete, filePreviewUrl } from '../api/client';
import { useEmployeeStore } from '../stores/employee';
import DocumentForm from '../components/DocumentForm.vue';
import PdfPreview from '../components/PdfPreview.vue';
import {
  DOC_STATUS_LABELS,
  DOC_TRANSITIONS,
  availableActions,
  statusTagType,
  statusText,
  type AvailableAction,
  type DocAction,
} from '../constants/docFlow';

interface Doc {
  id: number;
  category_id: number;
  title: string;
  content_html: string;
  tags: string;
  author_id: string | null;
  file_id: number | null;
  status: string;
  read_count: number;
}
interface CategoryItem {
  id: number;
  name: string;
}
interface StatusLog {
  id: number;
  document_id: number;
  from_status: string | null;
  to_status: string;
  action: string;
  comment: string;
  operator_id: string | null;
  created_at: string;
}

const employeeStore = useEmployeeStore();

const docs = ref<Doc[]>([]);
const categories = ref<CategoryItem[]>([]);
const formVisible = ref(false);
const editing = ref<{
  id?: number;
  title?: string;
  categoryId?: number | null;
  contentHtml?: string;
  fileId?: number | null;
  tags?: string;
  authorId?: string | null;
  status?: string;
} | null>(null);
const message = ref('');
const messageIsError = ref(false);
const statusFilter = ref('');

const flowDialog = ref(false);
const flowDoc = ref<Doc | null>(null);
const flowAction = ref<AvailableAction | null>(null);
const flowComment = ref('');
const flowError = ref('');
const flowSaving = ref(false);

const logDialog = ref(false);
const logDoc = ref<Doc | null>(null);
const logs = ref<StatusLog[]>([]);

const previewVisible = ref(false);
const previewDoc = ref<Doc | null>(null);
const previewIsPdf = computed(() => !!previewDoc.value?.file_id);
const previewSrc = computed(() => filePreviewUrl(previewDoc.value?.file_id));

function openPreview(d: Doc) {
  previewDoc.value = d;
  previewVisible.value = true;
}

const statusOptions = Object.keys(DOC_STATUS_LABELS);

const filteredDocs = computed(() =>
  statusFilter.value ? docs.value.filter((d) => d.status === statusFilter.value) : docs.value,
);

onMounted(load);

function docActions(status: string): AvailableAction[] {
  return availableActions(status);
}

function actionLabel(action: string): string {
  return DOC_TRANSITIONS[action as DocAction]?.label ?? action;
}

function formatTime(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('zh-CN');
}

async function load() {
  const cat = await apiGet<CategoryItem[]>('/api/categories/tree');
  const flat = flattenTree(cat as any);
  categories.value = Array.isArray(flat) ? flat : [];
  docs.value = (await apiGet<Doc[]>('/api/documents?view=admin')) || [];
}

function flattenTree(nodes: any[], parent?: string): CategoryItem[] {
  const out: CategoryItem[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: parent && n.name ? `${parent}/${n.name}` : n.name });
    if (n.children) out.push(...flattenTree(n.children, n.name));
  }
  return out;
}

function categoryName(id: number): string {
  return categories.value.find((c) => c.id === id)?.name ?? '-';
}

function openCreate() {
  editing.value = { authorId: employeeStore.employeeNo };
  formVisible.value = true;
  message.value = '';
}

function openEdit(d: Doc) {
  editing.value = {
    id: d.id,
    title: d.title,
    categoryId: d.category_id,
    contentHtml: d.content_html,
    fileId: d.file_id ?? null,
    tags: d.tags,
    authorId: d.author_id,
    status: d.status,
  };
  formVisible.value = true;
  message.value = '';
}

async function onFormSubmit(payload: Record<string, unknown>) {
  try {
    if (editing.value?.id) {
      await apiPut(`/api/documents/${editing.value.id}`, payload);
      show('保存成功');
    } else {
      await apiPost('/api/documents', payload);
      show('新增成功');
    }
    formVisible.value = false;
    await load();
  } catch (e: any) {
    show(e?.message || '保存失败', true);
  }
}

function openFlow(d: Doc, action: AvailableAction) {
  flowDoc.value = d;
  flowAction.value = action;
  flowComment.value = '';
  flowError.value = '';
  flowDialog.value = true;
}

function closeFlow() {
  flowDialog.value = false;
}

async function submitFlow() {
  const d = flowDoc.value;
  const action = flowAction.value;
  if (!d || !action) return;
  const comment = flowComment.value.trim();
  if (action.requireComment && !comment) {
    flowError.value = `「${action.label}」必须填写处理意见`;
    return;
  }
  flowSaving.value = true;
  flowError.value = '';
  try {
    await apiPost(`/api/documents/${d.id}/transition`, { action: action.action, comment });
    show(`${action.label}成功`);
    flowDialog.value = false;
    await load();
  } catch (e: any) {
    flowError.value = e?.message || '操作失败';
  } finally {
    flowSaving.value = false;
  }
}

async function openLogs(d: Doc) {
  logDoc.value = d;
  logs.value = [];
  logDialog.value = true;
  try {
    logs.value = (await apiGet<StatusLog[]>(`/api/documents/${d.id}/status-logs`)) || [];
  } catch (e: any) {
    show(e?.message || '加载流转记录失败', true);
  }
}

async function remove(d: Doc) {
  if (!window.confirm(`确认删除「${d.title}」？`)) return;
  try {
    await apiDelete(`/api/documents/${d.id}`);
    await load();
  } catch (e: any) {
    show(e?.message || '删除失败', true);
  }
}

function show(msg: string, isError = false) {
  message.value = msg;
  messageIsError.value = isError;
}
</script>

<style scoped>
.manage-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.manage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-filter {
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
}
.msg.error {
  color: #f56c6c;
  margin: 8px 0;
}
.msg {
  color: #67c23a;
  margin: 8px 0;
}
.empty-tip {
  color: var(--app-text-secondary);
  font-size: 13px;
  margin: 12px 0;
}
.doc-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}
.doc-table th,
.doc-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--app-border);
  font-size: 14px;
}
.doc-table thead th {
  color: var(--app-text-secondary);
  font-weight: 500;
  background: #fafbfc;
}
.title-cell {
  font-weight: 500;
}
.title-link {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: none;
}
.title-link:hover {
  text-decoration: underline;
}
.preview-content {
  line-height: 1.8;
  font-size: 14px;
}
.ops-cell {
  white-space: nowrap;
}
.ops-cell .el-button + .el-button {
  margin-left: 6px;
}
.no-action {
  color: var(--app-text-secondary);
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: var(--app-radius);
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px;
}
.modal-desc {
  color: var(--app-text-secondary);
  font-size: 13px;
  margin: 0 0 12px;
}
.modal-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}
.required {
  color: #f56c6c;
}
.modal-textarea {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.modal-textarea:focus {
  border-color: var(--el-color-primary);
}
.modal-error {
  color: #f56c6c;
  font-size: 13px;
  margin: 8px 0 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.log-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  max-height: 320px;
  overflow-y: auto;
}
.log-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--app-border);
}
.log-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.log-action {
  font-weight: 600;
}
.log-trans {
  color: var(--app-text-secondary);
}
.log-time {
  margin-left: auto;
  color: var(--app-text-secondary);
  font-size: 12px;
}
.log-comment,
.log-operator {
  margin: 4px 0 0;
  font-size: 13px;
}
.log-operator {
  color: var(--app-text-secondary);
}
</style>
