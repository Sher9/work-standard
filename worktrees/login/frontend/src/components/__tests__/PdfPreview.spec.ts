import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PdfPreview from '../PdfPreview.vue';

describe('PdfPreview PDF 预览', () => {
  it('有源时渲染 iframe 预览', () => {
    const wrapper = mount(PdfPreview, {
      props: { src: '/api/files/100/preview' },
    });
    expect(wrapper.find('iframe')).toBeTruthy();
    expect(wrapper.find('iframe').attributes('src')).toBe('/api/files/100/preview');
  });

  it('无源时展示「预览不可用」兜底', () => {
    const wrapper = mount(PdfPreview, {
      props: { src: null },
    });
    expect(wrapper.text()).toContain('预览不可用');
  });
});