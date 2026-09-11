import { query } from '../db/pool';
import type { FileMeta } from './file.types';

const COLS = 'id, filename, path, mime_type, created_at';

export async function findById(id: number): Promise<FileMeta | undefined> {
  const rows = await query<FileMeta>(
    `SELECT ${COLS} FROM file_meta WHERE id = $1`,
    [id],
  );
  return rows[0];
}

export async function create(input: {
  filename: string;
  path: string;
  mimeType: string | null;
}): Promise<FileMeta> {
  const rows = await query<FileMeta>(
    `INSERT INTO file_meta (filename, path, mime_type)
     VALUES ($1, $2, $3)
     RETURNING ${COLS}`,
    [input.filename, input.path, input.mimeType],
  );
  return rows[0];
}