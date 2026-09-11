import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * 基于 Node 内置 scrypt 的密码哈希（无需引入原生依赖）。
 * 存储格式： `<saltHex>:<hashHex>`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
