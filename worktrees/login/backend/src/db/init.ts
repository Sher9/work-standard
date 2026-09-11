import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from './pool';

/**
 * 幂等执行建表脚本。仅在服务启动时调用一次。
 */
export async function initSchema(): Promise<void> {
  const schemaPath = resolve(process.cwd(), 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

export async function closePool(): Promise<void> {
  await pool.end();
}