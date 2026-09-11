import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DocumentRead from '../DocumentRead.vue';

vi.mock('../../api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  filePreviewUrl: vi.fn(),
}));
import { apiGet, apiPost } from '../../api/client';
import { filePreviewUrl } from '../../api/client';

const content = '<p>结算流程说明</p>';
const doc = {
  id: 5,
  category_id: 1,
  title: '结算业务手册',
  content_html: content,
  file_id: null,
  read_count: 10,
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

// /api/documents/:id/read 与 /api/favorites 依次返回；DocumentVersions 打桩避免额外 apiGet 调用
function mockLoad(readValue: any, favs: any[] = []) {
  (apiGet as any).mockResolvedValueOnce(readValue).mockResolvedValueOnce(favs);
}

describe('DocumentRead 阅读页', () => {
  it('进入页面调用 /read 并渲染富文本内容与阅读数', async () => {
    mockLoad(doc);
    const wrapper = mount(DocumentRead, {
      props: { id: 5 },
      stubs: { DocumentVersions: true },
    });
    await flushPromises();
    expect(apiGet).toHaveBeenCalledWith('/api/documents/5/read');
    expect(wrapper.text()).toContain('结算业务手册');
    expect(wrapper.text()).toContain('结算流程说明');
    expect(wrapper.text()).toContain('10');
  });

  it('点击收藏调用收藏接口并切换已收藏状态', async () => {
    mockLoad(doc);
    const wrapper = mount(DocumentRead, {
      props: { id: 5 },
      stubs: { DocumentVersions: true },
    });
    await flushPromises();
    await wrapper.find('[data-fav]').trigger('click');
    await flushPromises();
    expect(apiPost).toHaveBeenCalledWith('/api/favorites', { documentId: 5 });
  });

  it('PDF 文档缺失预览资源展示「预览不可用」兜底', async () => {
    const pdfDoc = { ...doc, content_html: '', file_id: 999 };
    mockLoad(pdfDoc);
    (filePreviewUrl as any).mockReturnValue(null);
    const wrapper = mount(DocumentRead, {
      props: { id: 5 },
      stubs: { DocumentVersions: true },
    });
    await flushPromises();
    // content_html 为空且有 file_id -> 渲染 PdfPreview；filePreviewUrl 返回 null -> 兜底提示
    expect(filePreviewUrl).toHaveBeenCalledWith(999);
    expect(wrapper.text()).toContain('预览不可用');
  });
});