import { query } from '../db/pool';
import type {
  DocumentInput,
  DocumentRow,
  DocStatus,
  StatusLogInput,
  StatusLogRow,
} from './document.types';

const COLS = 'id, category_id, title, content_html, tags, author_id, file_id, status, read_count';

export async function findAllPublished(): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT ${COLS} FROM document WHERE status = 'published' ORDER BY updated_at DESC`,
  );
}

export async function findAllForAdmin(): Promise<DocumentRow[]> {
  return query<DocumentRow>(`SELECT ${COLS} FROM document ORDER BY updated_at DESC`);
}

export async function findById(id: number): Promise<(DocumentRow & { is_published: boolean }) | undefined> {
  const rows = await query<DocumentRow & { is_published: boolean }>(
    `SELECT ${COLS}, (status = 'published') AS is_published
     FROM document WHERE id = $1`,
    [id],
  );
  return rows[0];
}

export async function searchByKeyword(keyword: string): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT ${COLS}
     FROM document
     WHERE status = 'published'
       AND (title ILIKE '%' || $1 || '%' OR content_html ILIKE '%' || $1 || '%')
     ORDER BY (title ILIKE '%' || $1 || '%') DESC, updated_at DESC`,
    [keyword],
  );
}

export async function create(input: {
  title: string;
  categoryId: number;
  contentHtml: string;
  fileId?: number | null;
  tags: string;
  authorId: string | null;
  status: DocStatus;
}): Promise<DocumentRow> {
  const rows = await query<DocumentRow>(
    `INSERT INTO document (category_id, title, content_html, file_id, tags, author_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.categoryId,
      input.title,
      input.contentHtml,
      input.fileId ?? null,
      input.tags,
      input.authorId,
      input.status,
    ],
  );
  return rows[0];
}

export async function update(id: number, input: {
  title?: string;
  contentHtml?: string;
  /** 传入即更新（null 表示移除 PDF） */
  fileId?: number | null;
  tags?: string;
  categoryId?: number;
}): Promise<DocumentRow | undefined> {
  const rows = await query<DocumentRow>(
    `UPDATE document
     SET title = COALESCE($2, title),
         content_html = COALESCE($3, content_html),
         file_id = CASE WHEN $6::boolean THEN $4::int ELSE file_id END,
         tags = COALESCE($5, tags),
         category_id = COALESCE($7, category_id),
         updated_at = now()
     WHERE id = $1
     RETURNING ${COLS}`,
    [
      id,
      input.title ?? null,
      input.contentHtml ?? null,
      input.fileId ?? null,
      input.tags ?? null,
      input.fileId !== undefined,
      input.categoryId ?? null,
    ],
  );
  return rows[0];
}

export async function updateStatus(id: number, status: DocStatus): Promise<DocumentRow | undefined> {
  const rows = await query<DocumentRow>(
    `UPDATE document SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING ${COLS}`,
    [id, status],
  );
  return rows[0];
}

export async function incrementReadCount(id: number): Promise<DocumentRow | undefined> {
  const rows = await query<DocumentRow>(
    `UPDATE document SET read_count = read_count + 1, updated_at = now()
     WHERE id = $1
     RETURNING ${COLS}`,
    [id],
  );
  return rows[0];
}

export async function remove(id: number): Promise<void> {
  await query('DELETE FROM document WHERE id = $1', [id]);
}

const LOG_COLS = 'id, document_id, from_status, to_status, action, comment, operator_id, created_at';

export async function insertStatusLog(input: StatusLogInput): Promise<StatusLogRow> {
  const rows = await query<StatusLogRow>(
    `INSERT INTO document_status_log (document_id, from_status, to_status, action, comment, operator_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${LOG_COLS}`,
    [
      input.documentId,
      input.fromStatus,
      input.toStatus,
      input.action,
      input.comment || '',
      input.operatorId ?? null,
    ],
  );
  return rows[0];
}

export async function findStatusLogs(documentId: number): Promise<StatusLogRow[]> {
  return query<StatusLogRow>(
    `SELECT ${LOG_COLS} FROM document_status_log
     WHERE document_id = $1
     ORDER BY created_at DESC, id DESC`,
    [documentId],
  );
}