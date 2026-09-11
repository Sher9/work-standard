import { query } from '../db/pool';
import { hashPassword } from '../common/password';
import type { Role } from './auth.types';

export interface EmployeeRow {
  employee_no: string;
  name: string;
  password: string;
  role: Role;
}

export interface TokenRow {
  employee_no: string;
  role: Role;
}

export async function findByNo(employeeNo: string): Promise<EmployeeRow | null> {
  const rows = await query<EmployeeRow>('SELECT * FROM employee WHERE employee_no = $1', [
    employeeNo,
  ]);
  return rows[0] ?? null;
}

/** 写入演示账户：已存在则跳过（ON CONFLICT DO NOTHING） */
export async function upsertSeed(
  employeeNo: string,
  name: string,
  password: string,
  role: Role,
): Promise<void> {
  await query(
    `INSERT INTO employee (employee_no, name, password, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (employee_no) DO NOTHING`,
    [employeeNo, name, hashPassword(password), role],
  );
}

export async function createToken(
  token: string,
  employeeNo: string,
  role: Role,
  expiresAt: Date,
): Promise<void> {
  await query(
    'INSERT INTO auth_token (token, employee_no, role, expires_at) VALUES ($1, $2, $3, $4)',
    [token, employeeNo, role, expiresAt],
  );
}

export async function findToken(token: string): Promise<TokenRow | null> {
  const rows = await query<TokenRow>(
    'SELECT employee_no, role FROM auth_token WHERE token = $1 AND expires_at > now()',
    [token],
  );
  return rows[0] ?? null;
}

export async function deleteToken(token: string): Promise<void> {
  await query('DELETE FROM auth_token WHERE token = $1', [token]);
}

export async function deleteExpiredTokens(): Promise<void> {
  await query('DELETE FROM auth_token WHERE expires_at <= now()');
}
