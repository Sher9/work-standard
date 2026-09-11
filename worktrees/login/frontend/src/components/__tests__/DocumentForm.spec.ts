import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DocumentForm from '../DocumentForm.vue';

vi.mock('../../api/client', () => ({
  apiUpload: vi.fn(),
  filePreviewUrl: vi.fn(() => '/api/files/55/preview'),
}));
import { apiUpload } from '../../api/client';

describe('DocumentForm 文档表单', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('空标题提交展示「标题为必填项」且不 emit submit', async () => {
    const wrapper = mount(DocumentForm, {
      props: {
        categories: [{ id: 1, name: '产品手册' }],
      },
    });
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.text()).toContain('标题为必填项');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('填写标题后提交 emit submit 携带表单数据', async () => {
    const wrapper = mount(DocumentForm, {
      props: {
        categories: [{ id: 1, name: '产品手册' }],
      },
    });
    await wrapper.find('[data-field="title"]').setValue('结算业务手册');
    await wrapper.find('[data-field="categoryId"]').setValue('1');
    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit');
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as any;
    expect(payload.title).toBe('结算业务手册');
    expect(payload.categoryId).toBe(1);
  });

  it('切换到上传 PDF 后提交携带 fileId 且富文本置空', async () => {
    (apiUpload as any).mockResolvedValue({
      id: 55,
      filename: '手册.pdf',
      mime_type: 'application/pdf',
    });
    const wrapper = mount(DocumentForm, {
      props: { categories: [{ id: 1, name: '产品手册' }] },
    });

    await wrapper.find('[data-content-type="pdf"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-field="pdf"]').exists()).toBe(true);

    const input = wrapper.find('[data-field="pdf"]').element as HTMLInputElement;
    const file = new File(['%PDF-1.4 test'], '手册.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await wrapper.find('[data-field="pdf"]').trigger('change');
    await flushPromises();

    expect(apiUpload).toHaveBeenCalled();
    expect(wrapper.find('[data-pdf-file="1"]').text()).toContain('手册.pdf');

    await wrapper.find('[data-field="title"]').setValue('PDF 手册');
    await wrapper.find('[data-field="categoryId"]').setValue('1');
    await wrapper.find('form').trigger('submit.prevent');
    const payload = wrapper.emitted('submit')![0][0] as any;
    expect(payload.fileId).toBe(55);
    expect(payload.contentHtml).toBe('');
  });

  it('上传 PDF 模式下未选择文件时阻止提交', async () => {
    const wrapper = mount(DocumentForm, {
      props: { categories: [{ id: 1, name: '产品手册' }] },
    });
    await wrapper.find('[data-content-type="pdf"]').trigger('click');
    await wrapper.find('[data-field="title"]').setValue('未上传');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.find('[data-pdf-error="1"]').text()).toContain('请上传 PDF 文件');
  });

  it('富文本模式下提交清空 PDF 关联', async () => {
    const wrapper = mount(DocumentForm, {
      props: {
        categories: [{ id: 1, name: '产品手册' }],
        initial: { id: 7, title: '旧文档', fileId: 55 },
      },
    });
    // 有 PDF 时默认进入上传模式
    expect(wrapper.find('[data-pdf-file="1"]').exists()).toBe(true);

    await wrapper.find('[data-content-type="html"]').trigger('click');
    const editor = wrapper.find('[data-field="contentHtml"]').element as HTMLElement;
    editor.innerHTML = '<p>新正文</p>';
    await wrapper.find('[data-field="contentHtml"]').trigger('input');
    await wrapper.find('form').trigger('submit.prevent');

    const payload = wrapper.emitted('submit')![0][0] as any;
    expect(payload.fileId).toBe(null);
    expect(payload.contentHtml).toBe('<p>新正文</p>');
  });
});