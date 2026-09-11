import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CategoryTree from '../CategoryTree.vue';

const tree = [
  {
    id: 1,
    name: '产品手册',
    parent_id: null,
    sort_order: 0,
    children: [
      { id: 2, name: '结算业务手册', parent_id: 1, sort_order: 0 },
      { id: 3, name: '信贷产品手册', parent_id: 1, sort_order: 1 },
    ],
  },
  { id: 4, name: '政策法规', parent_id: null, sort_order: 1 },
];

describe('CategoryTree 目录树', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('渲染一级与二级节点', () => {
    const wrapper = mount(CategoryTree, {
      props: { tree },
    });
    const text = wrapper.text();
    expect(text).toContain('产品手册');
    expect(text).toContain('政策法规');
    expect(text).toContain('结算业务手册');
    expect(text).toContain('信贷产品手册');
  });

  it('点击节点调用 select 事件并传递 id', async () => {
    const wrapper = mount(CategoryTree, {
      props: { tree },
    });
    await wrapper.find('[data-cat="1"] .cat-name').trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]).toEqual([1]);
  });

  it('拖拽同一父级内重排后触发 sort 事件携带 id 顺序', async () => {
    const wrapper = mount(CategoryTree, {
      props: { tree },
    });
    // 先标记拖拽节点 2，再放置到同父级节点 3 之后
    (wrapper.vm as any).start(2);
    (wrapper.vm as any).onDrop({ id: 3, position: 'after' });
    const sortEmitted = wrapper.emitted('sort');
    expect(sortEmitted).toBeTruthy();
    const payload = sortEmitted![0][0] as { ids: number[] };
    expect(Array.isArray(payload.ids)).toBe(true);
    // 有效落点会触发 sort 事件；作用域内携带 id 列表
    expect(payload.ids).toHaveLength(tree.length);
  });
});