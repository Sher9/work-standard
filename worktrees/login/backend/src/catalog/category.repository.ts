import { query } from '../db/pool';
import type { CategoryRow, CategoryInput, SortItem } from './category.types';

const COLS = 'id, name, parent_id, sort_order, icon, level';

export async function findAll(): Promise<CategoryRow[]> {
  return query<CategoryRow>(
    `SELECT ${COLS} FROM category ORDER BY sort_order ASC, id ASC`,
  );
}

export async function findById(id: number): Promise<CategoryRow | undefined> {
  const rows = await query<CategoryRow>(`SELECT ${COLS} FROM category WHERE id = $1`, [id]);
  return rows[0];
}

/** 同名校验只在「同一父级下」生效，因此不同层级/不同分支下允许重名 */
export async function findByName(
  name: string,
  parentId: number | null = null,
): Promise<CategoryRow | undefined> {
  const rows = await query<CategoryRow>(
    `SELECT ${COLS} FROM category WHERE name = $1 AND parent_id IS NOT DISTINCT FROM $2`,
    [name, parentId],
  );
  return rows[0];
}

export async function findChildren(parentId: number): Promise<CategoryRow[]> {
  return query<CategoryRow>(
    `SELECT ${COLS} FROM category WHERE parent_id = $1 ORDER BY sort_order ASC, id ASC`,
    [parentId],
  );
}

export async function searchByKeyword(keyword: string): Promise<CategoryRow[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${COLS} FROM category WHERE name ILIKE '%' || $1 || '%'
     ORDER BY parent_id NULLS FIRST, sort_order ASC, id ASC`,
    [keyword],
  );
  return rows;
}

export async function countChildren(parentId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM category WHERE parent_id = $1',
    [parentId],
  );
  return Number(rows[0].count);
}

export async function create(input: CategoryInput): Promise<CategoryRow> {
  const level = input.parentId != null ? (await findLevel(input.parentId)) + 1 : 0;
  const rows = await query<CategoryRow>(
    `INSERT INTO category (name, parent_id, sort_order, icon, level)
     VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM category WHERE parent_id IS NOT DISTINCT FROM $2), $3, $4)
     RETURNING ${COLS}`,
    [input.name, input.parentId ?? null, input.icon ?? null, level],
  );
  return rows[0];
}

async function findLevel(id: number): Promise<number> {
  const rows = await query<{ level: number }>('SELECT level FROM category WHERE id = $1', [id]);
  return rows[0]?.level ?? 0;
}

export async function update(
  id: number,
  input: { name?: string; icon?: string | null },
): Promise<CategoryRow | undefined> {
  const rows = await query<CategoryRow>(
    `UPDATE category
     SET name = COALESCE($2, name),
         icon = COALESCE($3, icon),
         updated_at = now()
     WHERE id = $1 RETURNING ${COLS}`,
    [id, input.name ?? null, input.icon ?? null],
  );
  return rows[0];
}

export async function applySort(items: SortItem[]): Promise<void> {
  for (const item of items) {
    await query('UPDATE category SET sort_order = $2, updated_at = now() WHERE id = $1', [
      item.id,
      item.sortOrder,
    ]);
  }
}

export async function remove(id: number): Promise<void> {
  await query('DELETE FROM category WHERE id = $1', [id]);
}

export async function countDocuments(categoryId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM document WHERE category_id = $1',
    [categoryId],
  );
  return Number(rows[0].count);
}