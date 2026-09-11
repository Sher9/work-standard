import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchHighlight from '../SearchHighlight.vue';

describe('SearchHighlight 关键词高亮', () => {
  it('将 highlight 中的 <em> 包裹内容渲染为高亮标记', () => {
    const wrapper = mount(SearchHighlight, {
      props: { content: '本手册介绍<em>结算</em>流程与操作要点。' },
    });
    expect(wrapper.find('.highlight').text()).toBe('结算');
  });

  it('无高亮时原样渲染文本', () => {
    const wrapper = mount(SearchHighlight, {
      props: { content: '本手册介绍结算流程。' },
    });
    expect(wrapper.text()).toContain('结算');
    expect(wrapper.find('.highlight').exists()).toBe(false);
  });
});