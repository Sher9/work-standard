import request from 'supertest';
import app from '../../src/app';

const CRED = {
  admin: { employeeNo: 'E10001', password: 'admin123' },
  user: { employeeNo: 'E10002', password: 'user123' },
};

/** 以指定角色登录并返回 Bearer Token（演示账户由 globalSetup 写入） */
export async function login(role: 'admin' | 'user' = 'admin'): Promise<string> {
  const c = CRED[role];
  const res = await request(app).post('/api/auth/login').send(c);
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
