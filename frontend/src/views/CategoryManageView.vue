<template>
  <div class="cat-manage">
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="输入关键字搜索分类"
          clearable
          class="search-input"
          data-field="q"
          @keyup.enter="onSearch"
        >
          <template #append>
            <el-button @click="onSearch">搜索</el-button>
          </template>
        </el-input>
        <el-button type="primary" data-cat-create="1" @click="openCreate(null)">
          + 新增一级分类
        </el-button>
      </div>

      <div v-if="searchResults.length" class="search-results">
        <span class="tip">搜索结果：</span>
        <el-tag
          v-for="r in searchResults"
          :key="r.id"
          class="search-tag"
          closable
          @click="selectResult(r)"
          @close="clearSearch"
        >
          {{ r.name }}
        </el-tag>
        <el-button link type="primary" @click="clearSearch">返回目录</el-button>
      </div>
    </el-card>

    <div class="layout">
      <aside class="sidebar">
        <el-card shadow="never" class="tree-card">
          <div class="side-title">分类目录</div>
          <p v-if="!tree.length && !loading" class="empty-tip">暂无分类，点击上方按钮新增</p>
          <ul v-if="tree.length" class="tree-root">
            <TreeNode
              v-for="node in tree"
              :key="node.id"
              :node="node"
              :expanded-ids="expandedIds"
              :active-id="selectedId"
              :actions="true"
              :dragging-id="draggingId"
              :drop-target="dropTarget"
              :drop-invalid-id="dropInvalidId"
              @toggle="toggle"
              @select="selectNode"
              @drag-start="start"
              @drag-end="end"
              @drag-over="over"
              @drag-leave="leave"
              @drop="onDrop"
              @create-child="openCreate"
              @edit="openEdit"
              @del="onDelete"
            />
          </ul>
          <div v-if="tree.length" class="sort-bar">
            <el-button
              class="sort-btn"
              data-cat-sort="1"
              :type="sortDirty ? 'primary' : 'default'"
              :disabled="!sortDirty"
              :loading="sorting"
              @click="persistSort"
            >
              保存排序
            </el-button>
            <span v-if="sortDirty" class="sort-tip" data-cat-sort-dirty="1">
              顺序已调整，尚未保存
            </span>
            <span v-else class="sort-tip">拖动分类可调整同级顺序</span>
          </div>
        </el-card>
      </aside>

      <main class="content">
        <el-card shadow="never" class="detail-card">
          <template v-if="detail">
            <div class="detail-head">
              <h2 class="page-title">{{ detail.name }}</h2>
              <el-tag type="warning">第 {{ (detail.level ?? 0) + 1 }} 级分类</el-tag>
            </div>
            <el-descriptions :column="1" border class="detail-desc">
              <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
              <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
              <el-descriptions-item label="所属路径">
                <span class="crumb">
                  <template v-for="(p, i) in detailPath" :key="p.id">
                    <span v-if="i" class="crumb-sep">/</span>
                    <button class="crumb-link" data-cat-crumb="1" @click="selectNode(p.id)">
                      {{ p.name }}
                    </button>
                  </template>
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="图标">
                <span v-if="isCategoryIcon(detail.icon)" class="ico-inline" data-cat-icon-preview="1">
                  <CategoryIcon :name="detail.icon" />
                  <span>{{ detail.icon }}</span>
                </span>
                <span v-else>无</span>
              </el-descriptions-item>
              <el-descriptions-item label="子级数量">{{ detail.children.length }}</el-descriptions-item>
              <el-descriptions-item label="文档数量">{{ detail.documentCount }}</el-descriptions-item>
            </el-descriptions>

            <div class="sub-title-row">
              <h3 class="sub-title">子级分类</h3>
              <el-button
                size="small"
                data-cat-create-child-detail="1"
                @click="openCreate(detail.id)"
              >
                + 新增子级
              </el-button>
            </div>
            <ul v-if="detail.children.length" class="child-list">
              <li v-for="c in detail.children" :key="c.id" class="child-row">
                <button class="child-link" data-cat-child="1" @click="selectNode(c.id)">
                  {{ c.name }}
                </button>
                <span class="child-badge">{{ childCount(c.id) }} 个子级</span>
              </li>
            </ul>
            <p v-else class="empty-tip">暂无子级分类，可点击「+ 新增子级」继续扩展</p>
          </template>
          <el-empty v-else description="从左侧选择一个分类查看详情" />
        </el-card>
      </main>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="420px"
    >
      <el-form label-width="70px">
        <el-form-item label="上级分类">
          <span class="parent-hint" data-cat-parent="1">
            {{ parentName || '（无，作为一级分类）' }}
          </span>
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input
            v-model="formName"
            :placeholder="editingId ? '分类名称' : '请输入分类名称'"
            data-field="name"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-select
            v-model="formIcon"
            class="icon-select"
            placeholder="请选择 Element Plus 图标（可选）"
            clearable
            filterable
            data-field="icon"
          >
            <el-option
              v-for="ico in CATEGORY_ICONS"
              :key="ico"
              :label="ico"
              :value="ico"
            >
              <span class="opt-item">
                <CategoryIcon :name="ico" />
                <span>{{ ico }}</span>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" data-cat-save="1" :loading="saving" @click="save">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import TreeNode from '../components/CategoryTreeNode.vue';
import CategoryIcon from '../components/CategoryIcon.vue';
import { CATEGORY_ICONS, isCategoryIcon } from '../constants/categoryIcons';
import type { CategoryNode } from '../stores/catalog';
import { useCategoryDrag, type DropTarget } from '../composables/useCategoryDrag';

interface CategoryDetail extends CategoryNode {
  children: CategoryNode[];
  documentCount: number;
}

const tree = ref<CategoryNode[]>([]);
const loading = ref(false);
const keyword = ref('');
const searchResults = ref<CategoryNode[]>([]);
const expandedIds = ref<Set<number>>(new Set());
const selectedId = ref<number | null>(null);
const detail = ref<CategoryDetail | null>(null);
const sortDirty = ref(false);
const sorting = ref(false);

const {
  draggingId,
  dropTarget,
  dropInvalidId,
  start,
  end,
  over,
  leave,
  drop,
} = useCategoryDrag(
  () => tree.value,
  () => {
    sortDirty.value = true;
  },
);

const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const formName = ref('');
const formIcon = ref('');
const saving = ref(false);

async function loadTree() {
  loading.value = true;
  try {
    tree.value = (await apiGet<CategoryNode[]>('/api/categories/tree')) || [];
  } finally {
    loading.value = false;
  }
}

async function loadDetail(id: number) {
  selectedId.value = id;
  expandAncestors(id);
  const data = await apiGet<CategoryDetail>(`/api/categories/${id}`);
  detail.value = data && !Array.isArray(data) && data.id ? data : null;
}

function toggle(id: number) {
  const s = expandedIds.value;
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expandedIds.value = new Set(s);
}

function expandAncestors(id: number) {
  const s = new Set(expandedIds.value);
  const nodes = flatten(tree.value);
  let cur = nodes.find((n) => n.id === id);
  while (cur && cur.parent_id != null) {
    s.add(cur.parent_id);
    cur = nodes.find((n) => n.id === cur!.parent_id);
  }
  expandedIds.value = s;
}

function selectNode(id: number) {
  loadDetail(id);
}

function selectResult(r: CategoryNode) {
  clearSearch();
  loadDetail(r.id);
}

function clearSearch() {
  keyword.value = '';
  searchResults.value = [];
}

async function onSearch() {
  const q = keyword.value.trim();
  if (!q) return;
  const params = new URLSearchParams({ q });
  searchResults.value = (await apiGet<CategoryNode[]>(`/api/categories/search?${params}`)) || [];
}

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children) out.push(...flatten(n.children));
  }
  return out;
}

/** 从根到指定分类的完整路径（支持任意层级） */
function pathOf(id: number): CategoryNode[] {
  const nodes = flatten(tree.value);
  const chain: CategoryNode[] = [];
  let cur = nodes.find((n) => n.id === id);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id != null ? nodes.find((n) => n.id === cur!.parent_id) : undefined;
  }
  return chain;
}

const detailPath = computed(() => (detail.value ? pathOf(detail.value.id) : []));

function childCount(id: number): number {
  const node = flatten(tree.value).find((n) => n.id === id);
  return node?.children?.length ?? 0;
}

function onDrop(target: DropTarget) {
  const result = drop(target);
  if (result.moved) return;
  if (result.invalid) ElMessage.warning('仅支持在同一层级内拖动排序');
}

function openCreate(parentId: number | null) {
  editingId.value = null;
  formName.value = '';
  formIcon.value = '';
  currentParent.value = parentId;
  dialogVisible.value = true;
}

function openEdit(node: CategoryNode) {
  editingId.value = node.id;
  formName.value = node.name;
  formIcon.value = node.icon || '';
  currentParent.value = node.parent_id;
  dialogVisible.value = true;
}

const currentParent = ref<number | null>(null);

const isEditMode = computed(() => editingId.value != null);

const parentName = computed(() => {
  if (currentParent.value == null) return '';
  return flatten(tree.value).find((n) => n.id === currentParent.value)?.name ?? '';
});

const dialogTitle = computed(() => {
  if (isEditMode.value) return '编辑分类';
  if (currentParent.value == null) return '新增一级分类';
  return `在「${parentName.value || currentParent.value}」下新增子分类`;
});

async function save() {
  const name = formName.value.trim();
  if (!name) {
    ElMessage.warning('请输入分类名称');
    return;
  }
  saving.value = true;
  let createdId: number | null = null;
  try {
    if (isEditMode.value) {
      await apiPut(`/api/categories/${editingId.value}`, {
        name,
        icon: formIcon.value || null,
      });
      ElMessage.success('保存成功');
    } else {
      const created = await apiPost<CategoryNode>('/api/categories', {
        name,
        icon: formIcon.value || null,
        parentId: currentParent.value,
      });
      ElMessage.success('新增成功');
      // 展开从根到新建分类的完整路径，保证任意层级下都能立即看到新节点
      createdId = created?.id ?? null;
    }
    dialogVisible.value = false;
    await loadTree();
    if (createdId) await loadDetail(createdId);
    else if (selectedId.value) await loadDetail(selectedId.value);
  } finally {
    saving.value = false;
  }
}

async function onDelete(node: CategoryNode) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${node.name}」吗？`, '删除确认', {
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await apiDelete(`/api/categories/${node.id}`);
    ElMessage.success('删除成功');
    if (selectedId.value === node.id) {
      selectedId.value = null;
      detail.value = null;
    }
    await loadTree();
  } catch {
    /* 后端会返回错误提示 */
  }
}

async function persistSort() {
  sorting.value = true;
  try {
    const rows = flatten(tree.value);
    const items = rows.map((n) => ({ id: n.id, sortOrder: n.sort_order }));
    await apiPut('/api/categories/sort', { items });
    sortDirty.value = false;
    ElMessage.success('排序已保存');
    await loadTree();
  } finally {
    sorting.value = false;
  }
}

onMounted(async () => {
  await loadTree();
});
</script>

<style scoped>
.toolbar-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.search-input {
  flex: 1;
  max-width: 480px;
}
.search-results {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tip {
  color: var(--app-text-secondary);
  font-size: 13px;
}
.layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.sidebar {
  width: 300px;
  flex-shrink: 0;
}
.tree-card,
.detail-card {
  border-radius: var(--app-radius);
  border: 1px solid var(--app-border);
}
.side-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-secondary);
  margin-bottom: 10px;
}
.tree-root {
  list-style: none;
  padding: 0;
  margin: 0;
  /* 层级较深时允许横向滚动，避免子节点被挤压 */
  overflow-x: auto;
}
.sort-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.sort-tip {
  font-size: 12px;
  color: var(--app-text-secondary);
}
.content {
  flex: 1;
  min-width: 0;
}
.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.detail-desc {
  margin-bottom: 8px;
}
.sub-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sub-title {
  font-size: 15px;
  font-weight: 600;
  margin: 16px 0 8px;
}
.crumb {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.crumb-sep {
  color: var(--app-text-secondary);
}
.crumb-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  color: var(--el-color-primary);
  cursor: pointer;
}
.child-badge {
  margin-left: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
.parent-hint {
  font-size: 14px;
  color: var(--app-text-secondary);
}
.child-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.child-row {
  padding: 8px 4px;
  border-bottom: 1px solid var(--app-border);
}
.child-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 14px;
}
.empty-tip {
  color: var(--app-text-secondary);
  font-size: 13px;
}
.icon-select {
  width: 100%;
}
.ico-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-primary, #409eff);
}
.opt-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
}
</style>