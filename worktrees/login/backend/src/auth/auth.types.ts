export type Role = 'admin' | 'user';

export interface Employee {
  employee_no: string;
  name: string;
  role: Role;
}

/** 登录后解析出的当前用户，挂载到 req.user */
export interface AuthUser {
  employeeNo: string;
  role: Role;
}

export interface LoginInput {
  employeeNo: string;
  password: string;
}

export interface LoginResult {
  token: string;
  employee: Employee;
}
