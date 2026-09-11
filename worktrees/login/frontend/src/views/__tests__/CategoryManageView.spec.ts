import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ElementPlus from 'element-plus';
import CategoryManageView from '../CategoryManageView.vue';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>();
  return {
    ...actual,
    ElMessageBox: {
      confirm: vi.fn().mockResolvedValue('confirm'),
    },
  };
});

const tree = [
  {
    id: 1,
    name: '产品手册',
    parent_id: null,
    sort_order: 0,
    icon: null,
    level: 0,
    children: [
      { id: 2, name: '结算手册', parent_id: 1, sort_order: 0, icon: null, level: 1, children: [] },
    ],
  },
  { id: 3, name: '政策法规', parent_id: null, sort_order: 1, icon: null, level: 0, children: [] },
];

function mockApi() {
  (client.apiGet as Mock).mockResolvedValue(tree);
  (client.apiPost as Mock).mockResolvedValue({ id: 99, name: 'x' });
  (client.apiPut as Mock).mockResolvedValue({ ok: true });
  (client.apiDelete as Mock).mockResolvedValue({ message: '删除成功' });
}

describe('CategoryManageView 分类管理', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockApi();
  });

  it('渲染目录树与操作按钮', async () => {
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('产品手册');
    expect(text).toContain('政策法规');
    expect(wrapper.find('[data-cat-create="1"]').exists()).toBe(true);
    expect(wrapper.find('[data-cat-sort="1"]').exists()).toBe(true);
  });

  it('新增一级分类调用 apiPost', async () => {
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    await wrapper.find('[data-cat-create="1"]').trigger('click');
    await flushPromises();
    const nameInput = wrapper.find('[data-field="name"]');
    expect(nameInput.exists()).toBe(true);
    await nameInput.setValue('新分类');
    await flushPromises();
    await wrapper.find('[data-cat-save="1"]').trigger('click');
    await flushPromises();
    expect(client.apiPost).toHaveBeenCalledWith('/api/categories', {
      name: '新分类',
      icon: null,
      parentId: null,
    });
  });

  it('编辑分类调用 apiPut', async () => {
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    await wrapper.find('[data-cat-edit="1"]').trigger('click');
    await flushPromises();
    const nameInput = wrapper.find('[data-field="name"]');
    expect((nameInput.element as HTMLInputElement).value).toBe('产品手册');
    await nameInput.setValue('修改后');
    await flushPromises();
    await wrapper.find('[data-cat-save="1"]').trigger('click');
    await flushPromises();
    expect(client.apiPut).toHaveBeenCalledWith('/api/categories/1', {
      name: '修改后',
      icon: null,
    });
  });

  it('删除分类调用 apiDelete', async () => {
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    await wrapper.find('[data-cat-del="1"]').trigger('click');
    await flushPromises();
    expect(client.apiDelete).toHaveBeenCalledWith('/api/categories/1');
  });

  it('选中分类加载详情', async () => {
    (client.apiGet as Mock)
      .mockResolvedValueOnce(tree)
      .mockResolvedValueOnce({
        id: 1,
        name: '产品手册',
        parent_id: null,
        sort_order: 0,
        icon: null,
        level: 0,
        children: [{ id: 2, name: '结算手册', parent_id: 1, sort_order: 0, icon: null, level: 1 }],
        documentCount: 5,
      });
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    await wrapper.find('[data-cat="1"] .cat-name').trigger('click');
    await flushPromises();
    expect(client.apiGet).toHaveBeenCalledWith('/api/categories/1');
    expect(wrapper.text()).toContain('文档数量');
  });

  it('三级分类详情展示层级与完整路径', async () => {
    const deep = [
      {
        id: 1,
        name: '产品手册',
        parent_id: null,
        sort_order: 0,
        icon: null,
        level: 0,
        children: [
          {
            id: 2,
            name: '结算手册',
            parent_id: 1,
            sort_order: 0,
            icon: null,
            level: 1,
            children: [
              {
                id: 3,
                name: '对公结算',
                parent_id: 2,
                sort_order: 0,
                icon: null,
                level: 2,
                children: [],
              },
            ],
          },
        ],
      },
    ];
    (client.apiGet as Mock)
      .mockResolvedValueOnce(deep)
      .mockResolvedValueOnce({
        id: 3,
        name: '对公结算',
        parent_id: 2,
        sort_order: 0,
        icon: null,
        level: 2,
        children: [],
        documentCount: 0,
      });
    const wrapper = mount(CategoryManageView, { global: { plugins: [ElementPlus] } });
    await flushPromises();

    // 逐层展开后选中三级分类
    await wrapper.find('[data-cat="1"] .cat-toggle').trigger('click');
    await wrapper.find('[data-cat="2"] .cat-toggle').trigger('click');
    await wrapper.find('[data-cat="3"] .cat-name').trigger('click');
    await flushPromises();

    expect(client.apiGet).toHaveBeenCalledWith('/api/categories/3');
    expect(wrapper.text()).toContain('第 3 级分类');
    const crumbs = wrapper.findAll('[data-cat-crumb="1"]').map((c) => c.text());
    expect(crumbs).toEqual(['产品手册', '结算手册', '对公结算']);
  });

  it('在任意层级节点上新增子级', async () => {
    (client.apiGet as Mock).mockResolvedValue(JSON.parse(JSON.stringify(tree)));
    const wrapper = mount(CategoryManageView, { global: { plugins: [ElementPlus] } });
    await flushPromises();

    await wrapper.find('[data-cat="1"] [data-cat-create-child="1"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-cat-parent="1"]').text()).toContain('产品手册');

    await wrapper.find('[data-field="name"]').setValue('信贷手册');
    await wrapper.find('[data-cat-save="1"]').trigger('click');
    await flushPromises();
    expect(client.apiPost).toHaveBeenCalledWith('/api/categories', {
      name: '信贷手册',
      icon: null,
      parentId: 1,
    });
  });

  it('拖拽调整同级顺序后可保存排序', async () => {
    (client.apiGet as Mock).mockResolvedValue(JSON.parse(JSON.stringify(tree)));
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();

    const row1 = wrapper.find('[data-cat-row="1"]').element as HTMLElement;
    row1.getBoundingClientRect = () => ({ top: 0, height: 20 }) as DOMRect;

    // 将 政策法规(3) 拖到 产品手册(1) 之前
    await wrapper.find('[data-cat-row="3"]').trigger('dragstart');
    await wrapper.find('[data-cat-row="1"]').trigger('dragover', { clientY: 2 });
    await wrapper.find('[data-cat-row="1"]').trigger('drop', { clientY: 2 });
    await flushPromises();

    expect(wrapper.find('[data-cat-sort-dirty="1"]').exists()).toBe(true);
    await wrapper.find('[data-cat-sort="1"]').trigger('click');
    await flushPromises();
    expect(client.apiPut).toHaveBeenCalledWith('/api/categories/sort', {
      items: [
        { id: 3, sortOrder: 0 },
        { id: 1, sortOrder: 1 },
        { id: 2, sortOrder: 0 },
      ],
    });
  });

  it('关键字搜索分类', async () => {
    (client.apiGet as Mock)
      .mockResolvedValueOnce(tree) // loadTree
      .mockResolvedValueOnce([{ id: 3, name: '政策法规', parent_id: null, sort_order: 1 }]); // search
    const wrapper = mount(CategoryManageView, {
      global: { plugins: [ElementPlus] },
    });
    await flushPromises();
    await wrapper.find('[data-field="q"]').setValue('政策');
    const buttons = wrapper.findAll('button');
    const searchBtn = buttons.find((b) => b.text() === '搜索');
    await searchBtn!.trigger('click');
    await flushPromises();
    expect(client.apiGet).toHaveBeenCalledWith('/api/categories/search?q=%E6%94%BF%E7%AD%96');
  });
});