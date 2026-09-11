import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEmployeeStore, DEFAULT_EMPLOYEE_ID } from '../employee';

describe('员工标识 store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('getEmployeeId() 返回默认员工常量', () => {
    const store = useEmployeeStore();
    expect(store.getEmployeeId()).toBe(DEFAULT_EMPLOYEE_ID);
  });

  it('DEFAULT_EMPLOYEE_ID 为 E10001', () => {
    expect(DEFAULT_EMPLOYEE_ID).toBe('E10001');
  });

  it('login 写入 token/角色并持久化到本地', () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10001', name: '管理员', role: 'admin' });
    expect(store.isLoggedIn).toBe(true);
    expect(store.token).toBe('t');
    expect(store.role).toBe('admin');
    expect(store.employeeNo).toBe('E10001');
    const saved = JSON.parse(localStorage.getItem('kb_auth') as string);
    expect(saved.token).toBe('t');
    expect(saved.role).toBe('admin');
  });

  it('logout 清除登录状态与本地存储', () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10002', name: '张三', role: 'user' });
    store.logout();
    expect(store.isLoggedIn).toBe(false);
    expect(localStorage.getItem('kb_auth')).toBeNull();
  });

  it('restore 从本地存储恢复登录态', () => {
    localStorage.setItem(
      'kb_auth',
      JSON.stringify({ token: 'x', employeeNo: 'E10001', name: '管理员', role: 'admin' }),
    );
    const store = useEmployeeStore();
    store.restore();
    expect(store.isLoggedIn).toBe(true);
    expect(store.role).toBe('admin');
  });
});