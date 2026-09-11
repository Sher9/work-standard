import { randomBytes } from 'node:crypto';
import * as repo from './auth.repository';
import { verifyPassword } from '../common/password';
import { errorApp } from '../middleware/errorHandler';
import type { AuthUser, Employee, LoginInput, LoginResult, Role } from './auth.types';

const TOKEN_TTL_DAYS = 7;

export async function login(input: LoginInput): Promise<LoginResult> {
  const emp = await repo.findByNo(input.employeeNo);
  if (!emp || !verifyPassword(input.password, emp.password)) {
    throw errorApp(401, '工号或密码错误', 'INVALID_CREDENTIALS');
  }
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await repo.createToken(token, emp.employee_no, emp.role, expiresAt);
  return {
    token,
    employee: { employee_no: emp.employee_no, name: emp.name, role: emp.role },
  };
}

export function toAuthUser(emp: Employee): AuthUser {
  return { employeeNo: emp.employee_no, role: emp.role };
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const row = await repo.findToken(token);
  if (!row) return null;
  return { employeeNo: row.employee_no, role: row.role };
}

export async function logout(token: string): Promise<void> {
  if (token) await repo.deleteToken(token);
}

export async function getProfile(employeeNo: string): Promise<Employee> {
  const emp = await repo.findByNo(employeeNo);
  if (!emp) throw errorApp(404, '用户不存在', 'NOT_FOUND');
  return { employee_no: emp.employee_no, name: emp.name, role: emp.role };
}

/** 首次启动时写入演示账户：管理员 E10001 / 普通用户 E10002，已存在则跳过 */
export async function seedEmployees(): Promise<void> {
  await repo.upsertSeed('E10001', '管理员', 'admin123', 'admin');
  await repo.upsertSeed('E10002', '张三', 'user123', 'user');
}
