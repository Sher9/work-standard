import { query } from '../db/pool';
import type { DocVersionInput, DocVersionRow } from './doc-version.types';

const COLS = 'id, document_id, version_no, content_snapshot, change_summary, editor_id, created_at';

export async function findByDocument(documentId: number): Promise<DocVersionRow[]> {
  return query<DocVersionRow>(
    `SELECT ${COLS} FROM doc_version WHERE document_id = $1 ORDER BY version_no ASC`,
    [documentId],
  );
}

export async function findLatestVersionNo(documentId: number): Promise<number> {
  const rows = await query<{ max: string | null }>(
    'SELECT MAX(version_no)::text AS max FROM doc_version WHERE document_id = $1',
    [documentId],
  );
  return rows[0]?.max != null ? Number(rows[0].max) : 0;
}

export async function create(input: DocVersionInput): Promise<DocVersionRow> {
  const versionNo = (await findLatestVersionNo(input.documentId)) + 1;
  const rows = await query<DocVersionRow>(
    `INSERT INTO doc_version (document_id, version_no, content_snapshot, change_summary, editor_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLS}`,
    [
      input.documentId,
      versionNo,
      input.contentSnapshot ?? '',
      input.changeSummary ?? '',
      input.editorId ?? null,
    ],
  );
  return rows[0];
}

export async function findById(id: number): Promise<DocVersionRow | undefined> {
  const rows = await query<DocVersionRow>(`SELECT ${COLS} FROM doc_version WHERE id = $1`, [id]);
  return rows[0];
}

export async function update(
  id: number,
  input: { contentSnapshot?: string; changeSummary?: string },
): Promise<DocVersionRow | undefined> {
  const rows = await query<DocVersionRow>(
    `UPDATE doc_version
     SET content_snapshot = COALESCE($2, content_snapshot),
         change_summary = COALESCE($3, change_summary)
     WHERE id = $1 RETURNING ${COLS}`,
    [id, input.contentSnapshot ?? null, input.changeSummary ?? null],
  );
  return rows[0];
}

export async function remove(id: number): Promise<void> {
  await query('DELETE FROM doc_version WHERE id = $1', [id]);
}