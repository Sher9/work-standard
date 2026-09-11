import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DocumentManageView from '../DocumentManageView.vue';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));
import { apiGet, apiPost, apiDelete } from '../../api/client';

const docs = [
  {
    id: 1,
    category_id: 1,
    title: '结算业务手册',
    content_html: '<p>内容</p>',
    file_id: null,
    status: 'published',
    read_count: 0,
  },
  {
    id: 2,
    category_id: 1,
    title: '已归档手册',
    content_html: '<p>旧版</p>',
    file_id: null,
    status: 'archived',
    read_count: 3,
  },
  {
    id: 3,
    category_id: 1,
    title: '待审核手册',
    content_html: '<p>待审</p>',
    file_id: null,
    status: 'pending',
    read_count: 0,
  },
];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('DocumentManageView 文档管理页', () => {
  it('加载并渲染文档列表（含维护视图已归档文档）', async () => {
    (apiGet as any).mockResolvedValue(docs);
    const wrapper = mount(DocumentManageView);
    await flushPromises();
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('view=admin'));
    expect(wrapper.text()).toContain('结算业务手册');
    expect(wrapper.text()).toContain('已归档手册');
  });

  it('通过流转按钮提交处理意见', async () => {
    (apiGet as any).mockResolvedValue(docs);
    (apiPost as any).mockResolvedValue({});
    const wrapper = mount(DocumentManageView);
    await flushPromises();

    await wrapper.find('[data-doc-action="approve"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-flow-dialog="1"]').exists()).toBe(true);

    await wrapper.find('[data-field="flow-comment"]').setValue('内容无误，同意通过');
    await wrapper.find('[data-flow-submit="1"]').trigger('click');
    await flushPromises();
    expect(apiPost).toHaveBeenCalledWith('/api/documents/3/transition', {
      action: 'approve',
      comment: '内容无误，同意通过',
    });
  });

  it('驳回未填写处理意见时阻止提交', async () => {
    (apiGet as any).mockResolvedValue(docs);
    (apiPost as any).mockResolvedValue({});
    const wrapper = mount(DocumentManageView);
    await flushPromises();

    await wrapper.find('[data-doc-action="reject"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-flow-submit="1"]').trigger('click');
    await flushPromises();

    expect(apiPost).not.toHaveBeenCalled();
    expect(wrapper.find('[data-flow-error="1"]').text()).toContain('必须填写处理意见');
  });

  it('查看状态流转记录展示处理意见', async () => {
    (apiGet as any).mockImplementation((url: string) => {
      if (url.includes('status-logs')) {
        return Promise.resolve([
          {
            id: 9,
            document_id: 1,
            from_status: 'draft',
            to_status: 'pending',
            action: 'submit',
            comment: '请尽快审核',
            operator_id: 'E10001',
            created_at: '2026-09-07T10:00:00.000Z',
          },
        ]);
      }
      return Promise.resolve(docs);
    });
    const wrapper = mount(DocumentManageView);
    await flushPromises();

    await wrapper.find('[data-doc-logs="1"]').trigger('click');
    await flushPromises();

    expect(apiGet).toHaveBeenCalledWith('/api/documents/1/status-logs');
    const dialogText = wrapper.find('[data-log-dialog="1"]').text();
    expect(dialogText).toContain('提交审核');
    expect(dialogText).toContain('请尽快审核');
  });

  it('点击删除调用 DELETE', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (apiGet as any).mockResolvedValue(docs);
    (apiDelete as any).mockResolvedValue({ deleted: true });
    const wrapper = mount(DocumentManageView);
    await flushPromises();
    await wrapper.find('[data-doc-delete="1"]').trigger('click');
    await flushPromises();
    expect(apiDelete).toHaveBeenCalledWith('/api/documents/1');
  });
});