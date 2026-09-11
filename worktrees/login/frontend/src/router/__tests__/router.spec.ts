import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import router from '../index';
import { useEmployeeStore } from '../../stores/employee';

describe('路由守卫与角色菜单', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('未登录访问受保护页跳转到登录页', async () => {
    await router.push('/documents');
    expect(router.currentRoute.value.name).toBe('login');
  });

  it('已登录可访问文档列表', async () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10001', name: '管理员', role: 'admin' });
    await router.push('/documents');
    expect(router.currentRoute.value.name).toBe('documents');
  });

  it('普通用户访问管理页被重定向到文档列表', async () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10002', name: '张三', role: 'user' });
    await router.push('/admin/categories');
    expect(router.currentRoute.value.name).toBe('documents');
  });

  it('管理员可访问分类管理页', async () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10001', name: '管理员', role: 'admin' });
    await router.push('/admin/categories');
    expect(router.currentRoute.value.name).toBe('category-manage');
  });

  it('已登录访问登录页重定向到首页', async () => {
    const store = useEmployeeStore();
    store.login({ token: 't', employeeNo: 'E10001', name: '管理员', role: 'admin' });
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('documents');
  });
});
