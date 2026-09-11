import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchView from '../SearchView.vue';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
}));
import { apiGet } from '../../api/client';

const results = [
  {
    id: 11,
    title: '结算业务手册',
    content: '',
    category_id: 1,
    read_count: 5,
    highlight: '本手册介绍<em>结算</em>流程',
  },
];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('SearchView 检索页', () => {
  it('提交搜索调用接口并渲染结果', async () => {
    (apiGet as any).mockResolvedValue(results);
    const wrapper = mount(SearchView);
    await wrapper.find('[data-field="q"]').setValue('结算');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('q=%E7%BB%93%E7%AE%97'));
    expect(wrapper.text()).toContain('结算业务手册');
  });

  it('无结果展示空状态提示', async () => {
    (apiGet as any).mockResolvedValue([]);
    const wrapper = mount(SearchView);
    await wrapper.find('[data-field="q"]').setValue('xyz');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.text()).toContain('无结果');
  });
});