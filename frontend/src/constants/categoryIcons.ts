/**
 * 分类图标统一采用 Element Plus 图标（组件名）。
 * 存放进 category.icon 字段的是这里的组件名字符串，
 * 渲染时通过 <CategoryIcon> 依据名称动态解析出对应图标组件。
 */
export const CATEGORY_ICONS = [
  'Folder',
  'FolderOpened',
  'FolderAdd',
  'Document',
  'DocumentAdd',
  'Files',
  'Reading',
  'Notebook',
  'Collection',
  'CollectionTag',
  'Box',
  'PriceTag',
  'Tickets',
  'DataAnalysis',
  'DataLine',
  'List',
  'Menu',
  'Grid',
  'Star',
  'Suitcase',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

/** 校验图标名是否为受支持的 Element Plus 图标，避免旧数据/非法值渲染报错 */
export function isCategoryIcon(name: string | null | undefined): name is CategoryIconName {
  return !!name && (CATEGORY_ICONS as readonly string[]).includes(name);
}
