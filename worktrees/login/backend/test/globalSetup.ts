import { initSchema, closePool } from '../src/db/init';
import { seedEmployees } from '../src/auth/auth.service';

/**
 * 全局测试准备：建表（幂等）并写入演示账户。
 * 与测试运行在同一数据库，确保 employee / auth_token 表与种子数据就位。
 */
export async function setup(): Promise<void> {
  await initSchema();
  await seedEmployees();
  await closePool();
}

export async function teardown(): Promise<void> {}
