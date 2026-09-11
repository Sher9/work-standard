import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import CategoryIcon from '../CategoryIcon.vue';

describe('CategoryIcon 分类图标（Element Plus）', () => {
  it('有效图标名渲染出 element-plus 图标', () => {
    const wrapper = mount(CategoryIcon, {
      props: { name: 'Folder' },
      global: { plugins: [ElementPlus] },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('不在候选集的图标名不渲染（避免报错）', () => {
    const wrapper = mount(CategoryIcon, {
      props: { name: 'NotARegisteredIcon' },
      global: { plugins: [ElementPlus] },
    });
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('图标为空时不渲染', () => {
    const wrapper = mount(CategoryIcon, {
      props: { name: null },
      global: { plugins: [ElementPlus] },
    });
    expect(wrapper.find('svg').exists()).toBe(false);
  });
});
