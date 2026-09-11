import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:123456@localhost:5432/knowledge';

export const pool = new Pool({ connectionString });

export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}