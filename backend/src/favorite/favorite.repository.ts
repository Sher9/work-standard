import { query } from '../db/pool';
import type { FavoriteRow } from './favorite.types';

export async function addFavorite(documentId: number, employeeNo: string): Promise<void> {
  await query(
    'INSERT INTO favorite (employee_no, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [employeeNo, documentId],
  );
}

export async function removeFavorite(documentId: number, employeeNo: string): Promise<void> {
  await query('DELETE FROM favorite WHERE employee_no = $1 AND document_id = $2', [
    employeeNo,
    documentId,
  ]);
}

export async function listFavorites(employeeNo: string): Promise<FavoriteRow[]> {
  return query<FavoriteRow>(
    `SELECT f.id, f.document_id, d.title, d.category_id, d.status, d.read_count, d.updated_at
     FROM favorite f
     JOIN document d ON d.id = f.document_id
     WHERE f.employee_no = $1
     ORDER BY f.created_at DESC`,
    [employeeNo],
  );
}

