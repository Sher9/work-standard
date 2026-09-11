import { ref } from 'vue';
import type { CategoryNode } from '../stores/catalog';

export type DropPosition = 'before' | 'after';

export interface DropTarget {
  id: number;
  position: DropPosition;
}

export interface DropResult {
  /** 是否真正发生了顺序调整 */
  moved: boolean;
  /** 拖拽有效，但目标位置不允许放置（如跨层级） */
  invalid: boolean;
}

export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children && n.children.length) out.push(...flattenTree(n.children));
  }
  return out;
}

function siblingsOf(tree: CategoryNode[], parentId: number | null): CategoryNode[] {
  if (parentId == null) return tree;
  const parent = flattenTree(tree).find((n) => n.id === parentId);
  return parent?.children ?? [];
}

function parentIdOf(tree: CategoryNode[], id: number): number | null {
  const node = flattenTree(tree).find((n) => n.id === id);
  return node ? (node.parent_id ?? null) : null;
}

/**
 * 分类树拖拽排序：目前仅允许在同一父级下调整顺序（跨层级移动需变更 parent_id，
 * 后端 /api/categories/sort 只接收 sortOrder，故此处不做跨层级放置）。
 */
export function useCategoryDrag(getTree: () => CategoryNode[], onReorder?: () => void) {
  const draggingId = ref<number | null>(null);
  const dropTarget = ref<DropTarget | null>(null);
  const dropInvalidId = ref<number | null>(null);

  function findNode(id: number): CategoryNode | undefined {
    return flattenTree(getTree()).find((n) => n.id === id);
  }

  function canDrop(dragId: number, targetId: number): boolean {
    if (dragId === targetId) return false;
    const drag = findNode(dragId);
    const target = findNode(targetId);
    if (!drag || !target) return false;
    return (drag.parent_id ?? null) === (target.parent_id ?? null);
  }

  function start(id: number) {
    draggingId.value = id;
  }

  function end() {
    draggingId.value = null;
    dropTarget.value = null;
    dropInvalidId.value = null;
  }

  function over(target: DropTarget) {
    if (draggingId.value == null) return;
    if (canDrop(draggingId.value, target.id)) {
      dropTarget.value = target;
      dropInvalidId.value = null;
    } else {
      dropTarget.value = null;
      dropInvalidId.value = target.id === draggingId.value ? null : target.id;
    }
  }

  function leave(id: number) {
    if (dropTarget.value?.id === id) dropTarget.value = null;
    if (dropInvalidId.value === id) dropInvalidId.value = null;
  }

  function drop(target: DropTarget): DropResult {
    const dragId = draggingId.value;
    end();
    if (dragId == null) return { moved: false, invalid: false };
    if (!canDrop(dragId, target.id)) return { moved: false, invalid: true };

    const tree = getTree();
    const siblings = siblingsOf(tree, parentIdOf(tree, target.id));
    const from = siblings.findIndex((n) => n.id === dragId);
    if (from < 0) return { moved: false, invalid: true };

    const [moved] = siblings.splice(from, 1);
    let to = siblings.findIndex((n) => n.id === target.id);
    if (to < 0) {
      siblings.splice(from, 0, moved);
      return { moved: false, invalid: true };
    }
    if (target.position === 'after') to += 1;
    siblings.splice(to, 0, moved);
    siblings.forEach((n, i) => {
      n.sort_order = i;
    });

    onReorder?.();
    return { moved: true, invalid: false };
  }

  return { draggingId, dropTarget, dropInvalidId, canDrop, start, end, over, leave, drop };
}
