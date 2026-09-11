import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DocumentVersions from '../DocumentVersions.vue';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));
import { apiGet, apiPost, apiDelete } from '../../api/client';

const versions = [
  { id: 1, version_no: 1, content_snapshot: 'v1', change_summary: '首次创建', editor_id: 'E10001', created_at: '2026-01-01' },
  { id: 2, version_no: 2, content_snapshot: 'v2', change_summary: '修订', editor_id: null, created_at: '2026-01-02' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DocumentVersions 文档版本', () => {
  it('加载并渲染版本列表', async () => {
    (apiGet as any).mockResolvedValue(versions);
    const wrapper = mount(DocumentVersions, {
      props: { documentId: 5 },
    });
    await flushPromises();
    expect(apiGet).toHaveBeenCalledWith('/api/documents/5/versions');
    expect(wrapper.text()).toContain('V1');
    expect(wrapper.text()).toContain('首次创建');
  });

  it('点击新增版本调用 POST 并刷新', async () => {
    (apiGet as any).mockResolvedValue([]);
    (apiPost as any).mockResolvedValue({});
    const wrapper = mount(DocumentVersions, {
      props: { documentId: 5, canCreate: true },
    });
    await flushPromises();
    await wrapper.find('[data-action="add-version"]').trigger('click');
    await flushPromises();
    expect(apiPost).toHaveBeenCalledWith('/api/documents/5/versions', {
      changeSummary: '新增版本',
    });
  });

  it('点击删除版本调用 DELETE', async () => {
    (apiGet as any).mockResolvedValue(versions);
    (apiDelete as any).mockResolvedValue({});
    const wrapper = mount(DocumentVersions, {
      props: { documentId: 5 },
    });
    await flushPromises();
    await wrapper.find('[data-version-del="1"]').trigger('click');
    await flushPromises();
    expect(apiDelete).toHaveBeenCalledWith('/api/documents/5/versions/1');
  });
});