<template>
  <li class="cat-node" :data-cat="node.id">
    <div
      class="cat-row"
      :class="{
        selected: node.id === activeId,
        'is-dragging': isDragging,
        'drop-before': isDropBefore,
        'drop-after': isDropAfter,
        'drop-invalid': isDropInvalid,
      }"
      :draggable="draggable"
      :data-cat-row="node.id"
      :title="draggable ? '按住可拖动排序' : undefined"
      @click="$emit('select', node.id)"
      @dragstart="onDragStart($event)"
      @dragend="onDragEnd"
      @dragenter.prevent="onDragOver($event)"
      @dragover.prevent="onDragOver($event)"
      @dragleave="onDragLeave($event)"
      @drop.prevent="onDrop($event)"
    >
      <span
        v-if="node.children && node.children.length"
        class="cat-toggle"
        @click.stop="$emit('toggle', node.id)"
      >
        {{ expanded ? '▾' : '▸' }}
      </span>
      <span v-else class="cat-toggle-placeholder" />
      <CategoryIcon v-if="node.icon" :name="node.icon" class="cat-ico" />
      <span class="cat-name">{{ node.name }}</span>

      <span v-if="actions" class="cat-actions" @click.stop>
        <button class="icon-btn" title="新增子级" data-cat-create-child="1" @click="$emit('create-child', node.id)">
          +
        </button>
        <button class="icon-btn" title="编辑" data-cat-edit="1" @click="$emit('edit', node)">
          编辑
        </button>
        <button class="icon-btn danger" title="删除" data-cat-del="1" @click="$emit('del', node)">
          删除
        </button>
      </span>
    </div>

    <ul v-if="node.children && node.children.length && expanded" class="cat-children">
      <CategoryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded-ids="expandedIds"
        :active-id="activeId"
        :actions="actions"
        :draggable="draggable"
        :dragging-id="draggingId"
        :drop-target="dropTarget"
        :drop-invalid-id="dropInvalidId"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drag-over="$emit('drag-over', $event)"
        @drag-leave="$emit('drag-leave', $event)"
        @drop="$emit('drop', $event)"
        @create-child="$emit('create-child', $event)"
        @edit="$emit('edit', $event)"
        @del="$emit('del', $event)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CategoryIcon from './CategoryIcon.vue';
import type { CategoryNode } from '../stores/catalog';
import type { DropPosition, DropTarget } from '../composables/useCategoryDrag';

const props = withDefaults(
  defineProps<{
    node: CategoryNode;
    expandedIds: Set<number>;
    activeId: number | null;
    actions?: boolean;
    draggable?: boolean;
    draggingId?: number | null;
    dropTarget?: DropTarget | null;
    dropInvalidId?: number | null;
  }>(),
  {
    actions: false,
    draggable: true,
    draggingId: null,
    dropTarget: null,
    dropInvalidId: null,
  },
);

const expanded = computed(() => props.expandedIds.has(props.node.id));
const isDragging = computed(() => props.draggingId === props.node.id);
const isDropBefore = computed(
  () => props.dropTarget?.id === props.node.id && props.dropTarget?.position === 'before',
);
const isDropAfter = computed(
  () => props.dropTarget?.id === props.node.id && props.dropTarget?.position === 'after',
);
const isDropInvalid = computed(() => props.dropInvalidId === props.node.id);

const emit = defineEmits<{
  (e: 'select', id: number): void;
  (e: 'toggle', id: number): void;
  (e: 'drag-start', id: number): void;
  (e: 'drag-end'): void;
  (e: 'drag-over', target: DropTarget): void;
  (e: 'drag-leave', id: number): void;
  (e: 'drop', target: DropTarget): void;
  (e: 'create-child', id: number): void;
  (e: 'edit', node: CategoryNode): void;
  (e: 'del', node: CategoryNode): void;
}>();

/** 依据指针在行内的位置判断插入到目标之前还是之后 */
function positionOf(e: DragEvent): DropPosition {
  const el = e.currentTarget as HTMLElement | null;
  const rect = el?.getBoundingClientRect();
  const ratio = rect && rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
  return ratio < 0.5 ? 'before' : 'after';
}

function onDragStart(e: DragEvent) {
  // 未调用 setData 时部分浏览器（Chrome/Firefox）不会真正开启拖拽
  e.dataTransfer?.setData('text/plain', String(props.node.id));
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  emit('drag-start', props.node.id);
}

function onDragEnd() {
  emit('drag-end');
}

function onDragOver(e: DragEvent) {
  if (!props.draggable || props.draggingId == null) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = isDropInvalid.value ? 'none' : 'move';
  emit('drag-over', { id: props.node.id, position: positionOf(e) });
}

function onDragLeave(e: DragEvent) {
  const el = e.currentTarget as HTMLElement | null;
  const related = e.relatedTarget as Node | null;
  if (el && related && el.contains(related)) return;
  emit('drag-leave', props.node.id);
}

function onDrop(e: DragEvent) {
  emit('drop', { id: props.node.id, position: positionOf(e) });
}
</script>

<style scoped>
.cat-node {
  list-style: none;
  padding-left: 0;
}
.cat-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 4px;
}
.cat-row:hover {
  background: #eef2f7;
}
.cat-row.selected {
  background: #e0ecff;
  font-weight: 600;
}
.cat-row.is-dragging {
  opacity: 0.4;
}
.cat-row.drop-before,
.cat-row.drop-after {
  background: #f0f6ff;
}
.cat-row.drop-before::before,
.cat-row.drop-after::after {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--el-color-primary, #409eff);
}
.cat-row.drop-before::before {
  top: -1px;
}
.cat-row.drop-after::after {
  bottom: -1px;
}
.cat-row.drop-invalid {
  cursor: not-allowed;
  background: #fdecec;
}
.cat-toggle {
  display: inline-block;
  width: 14px;
  text-align: center;
  user-select: none;
}
.cat-toggle-placeholder {
  display: inline-block;
  width: 14px;
}
.cat-ico {
  display: inline-flex;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--el-color-primary, #409eff);
}
.cat-children {
  padding-left: 16px;
  margin: 0;
}
.cat-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cat-actions {
  display: inline-flex;
  gap: 2px;
  opacity: 0;
}
.cat-row:hover .cat-actions {
  opacity: 1;
}
.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-color-primary, #409eff);
  padding: 0 3px;
  line-height: 1;
}
.icon-btn.danger {
  color: var(--el-color-danger, #f56c6c);
}
</style>
