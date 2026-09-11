import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FavoriteList from '../FavoriteList.vue';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));
import { apiGet, apiDelete } from '../../api/client';

const favs = [
  { id: 1, document_id: 11, title: '结算业务手册', category_id: 1, status: 'enabled', read_count: 5 },
  { id: 2, document_id: 12, title: '信贷产品手册', category_id: 1, status: 'enabled', read_count: 8 },
];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('FavoriteList 收藏列表页', () => {
  it('进入页面调用 GET /api/favorites 并渲染收藏标题', async () => {
    (apiGet as any).mockResolvedValue(favs);
    const wrapper = mount(FavoriteList);
    await flushPromises();
    expect(apiGet).toHaveBeenCalledWith('/api/favorites');
    expect(wrapper.text()).toContain('结算业务手册');
    expect(wrapper.text()).toContain('信贷产品手册');
  });

  it('点击取消收藏调用 DELETE 并即时移除该项', async () => {
    (apiGet as any).mockResolvedValue(favs);
    (apiDelete as any).mockResolvedValue({});
    const wrapper = mount(FavoriteList);
    await flushPromises();
    await wrapper.find('[data-fav-remove="11"]').trigger('click');
    await flushPromises();
    expect(apiDelete).toHaveBeenCalledWith('/api/favorites/11');
    expect(wrapper.text()).not.toContain('结算业务手册');
    expect(wrapper.text()).toContain('信贷产品手册');
  });

  it('无收藏展示空态提示', async () => {
    (apiGet as any).mockResolvedValue([]);
    const wrapper = mount(FavoriteList);
    await flushPromises();
    expect(wrapper.text()).toContain('暂无收藏');
  });
});