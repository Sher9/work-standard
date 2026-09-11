import { errorApp } from '../middleware/errorHandler';
import * as repo from './category.repository';
import type { CategoryInput, CategoryRow, CategoryTreeNode, CategoryDetail, SortItem } from './category.types';

function buildTree(rows: CategoryRow[]): CategoryTreeNode[] {
  const nodeById = new Map<number, CategoryTreeNode>();
  rows.forEach((r) => nodeById.set(r.id, { ...r, children: [] }));

  const roots: CategoryTreeNode[] = [];
  nodeById.forEach((node) => {
    const pid = node.parent_id;
    if (pid != null && nodeById.has(pid)) {
      nodeById.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export async function getTree(): Promise<CategoryTreeNode[]> {
  const rows = await repo.findAll();
  return buildTree(rows);
}

export async function getCategoryDetail(id: number): Promise<CategoryDetail> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '分类不存在');
  const [children, documentCount] = await Promise.all([
    repo.findChildren(id),
    repo.countDocuments(id),
  ]);
  return { ...current, children, documentCount };
}

export async function searchCategories(keyword: string): Promise<CategoryRow[]> {
  const q = (keyword || '').trim();
  if (!q) throw errorApp(400, '搜索关键词不能为空');
  return repo.searchByKeyword(q);
}

export async function createCategory(input: CategoryInput): Promise<CategoryRow> {
  const name = (input.name || '').trim();
  if (!name) throw errorApp(400, '分类名称不能为空');
  const parentId = input.parentId ?? null;
  if (parentId != null) {
    const parent = await repo.findById(parentId);
    if (!parent) throw errorApp(400, '父级分类不存在');
  }
  const exists = await repo.findByName(name, parentId);
  if (exists) throw errorApp(409, '同级下已存在同名分类');
  return repo.create({ name, parentId, icon: input.icon ?? null });
}

export async function updateCategory(
  id: number,
  input: { name?: string; icon?: string | null },
): Promise<CategoryRow> {
  const trimmed = (input.name ?? '').trim();
  if (input.name != null && !trimmed) throw errorApp(400, '分类名称不能为空');
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '分类不存在');
  if (input.name != null) {
    const exists = await repo.findByName(trimmed, current.parent_id);
    if (exists && exists.id !== id) throw errorApp(409, '同级下已存在同名分类');
  }
  const updated = await repo.update(id, {
    name: input.name != null ? trimmed : undefined,
    icon: input.icon,
  });
  if (!updated) throw errorApp(404, '分类不存在');
  return updated;
}

export async function sortCategories(items: SortItem[]): Promise<void> {
  if (!Array.isArray(items)) throw errorApp(400, 'items 必须为数组');
  await repo.applySort(items);
}

export async function deleteCategory(id: number): Promise<{ message: string }> {
  const current = await repo.findById(id);
  if (!current) throw errorApp(404, '分类不存在');
  const childCount = await repo.countChildren(id);
  if (childCount > 0) {
    throw errorApp(409, '需先移除该分类下的子级分类或文档');
  }
  const docCount = await repo.countDocuments(id);
  if (docCount > 0) {
    throw errorApp(409, '需先移除该分类下的子级分类或文档');
  }
  await repo.remove(id);
  return { message: '删除成功' };
}