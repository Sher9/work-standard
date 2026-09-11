<template>
  <div class="category-tree">
    <ul class="cat-root">
      <CategoryTreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :expanded-ids="expandedIds"
        :active-id="activeId"
        :draggable="draggable"
        :dragging-id="draggingId"
        :drop-target="dropTarget"
        :drop-invalid-id="dropInvalidId"
        @select="$emit('select', $event)"
        @toggle="toggle"
        @drag-start="start"
        @drag-end="end"
        @drag-over="over"
        @drag-leave="leave"
        @drop="onDrop"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CategoryTreeNode from './CategoryTreeNode.vue';
import type { CategoryNode } from '../stores/catalog';
import { useCategoryDrag, type DropTarget } from '../composables/useCategoryDrag';

const props = withDefaults(
  defineProps<{
    tree: CategoryNode[];
    expandedIds?: Set<number>;
    activeId?: number | null;
    draggable?: boolean;
  }>(),
  { draggable: true },
);

const emit = defineEmits<{
  (e: 'select', id: number): void;
  (e: 'sort', payload: { ids: number[] }): void;
}>();

function collectParentIds(nodes: CategoryNode[], acc = new Set<number>()): Set<number> {
  for (const n of nodes) {
    if (n.children && n.children.length) {
      acc.add(n.id);
      collectParentIds(n.children, acc);
    }
  }
  return acc;
}

const expandedIds = props.expandedIds ?? ref(collectParentIds(props.tree)).value;
const activeId = props.activeId ?? null;

const { draggingId, dropTarget, dropInvalidId, start, end, over, leave, drop } = useCategoryDrag(
  () => props.tree,
  () => emit('sort', { ids: props.tree.map((n) => n.id) }),
);

function toggle(id: number) {
  if (expandedIds.has(id)) expandedIds.delete(id);
  else expandedIds.add(id);
}

function onDrop(target: DropTarget) {
  drop(target);
}
</script>

<style scoped>
.cat-root {
  margin: 0;
  padding: 0;
  /* 支持无限级：层级较深时横向滚动 */
  overflow-x: auto;
}
</style>
