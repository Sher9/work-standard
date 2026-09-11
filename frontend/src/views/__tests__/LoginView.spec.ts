import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import ElementPlus from 'element-plus';
import LoginView from '../LoginView.vue';
import { useEmployeeStore } from '../../stores/employee';

vi.mock('../../api/client', () => ({
  apiLogin: vi.fn(),
}));
import { apiLogin } from '../../api/client';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/documents' },
    { path: '/documents', name: 'documents', component: { template: '<div />' } },
    { path: '/login', name: 'login', component: { template: '<div />' } },
  ],
});

describe('LoginView 登录页', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('渲染登录表单与演示账号提示', () => {
    const wrapper = mount(LoginView, { global: { plugins: [router, ElementPlus] } });
    expect(wrapper.text()).toContain('金融知识库');
    expect(wrapper.text()).toContain('E10001');
  });

  it('登录成功：写入状态并跳转首页', async () => {
    (apiLogin as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'abc',
      employee: { employee_no: 'E10001', name: '管理员', role: 'admin' },
    });
    const wrapper = mount(LoginView, { global: { plugins: [router, ElementPlus] } });
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('E10001');
    await inputs[1].setValue('admin123');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const store = useEmployeeStore();
    expect(store.isLoggedIn).toBe(true);
    expect(store.token).toBe('abc');
    expect(store.role).toBe('admin');
    expect(router.currentRoute.value.name).toBe('documents');
  });

  it('登录失败：显示错误信息且不写入状态', async () => {
    (apiLogin as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('工号或密码错误'),
    );
    const wrapper = mount(LoginView, { global: { plugins: [router, ElementPlus] } });
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('E10001');
    await inputs[1].setValue('wrong');
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('工号或密码错误');
    expect(useEmployeeStore().isLoggedIn).toBe(false);
  });
});
